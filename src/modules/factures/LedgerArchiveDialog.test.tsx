import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { downloadLedgerArchive, verifyLedger } from '@/hooks/use-ledger'
import { ApiError } from '@/lib/api-client'
import type { LedgerVerification } from '@/types/api'
import { LedgerArchiveDialog } from './LedgerArchiveDialog'
import { todayInput } from './format'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-ledger', () => ({ downloadLedgerArchive: vi.fn(), verifyLedger: vi.fn() }))

const onOpenChange = vi.fn()
const year = Number(todayInput().slice(0, 4))

const verification = (over: Partial<LedgerVerification> = {}): LedgerVerification => ({
  ok: true,
  checkedAt: '2026-11-07T10:00:00.000Z',
  events: 12,
  firstSequence: 1,
  lastSequence: 12,
  lastHash: 'a'.repeat(64),
  invoices: 5,
  legacyInvoices: 0,
  problems: [],
  ...over,
})

function show(open = true) {
  return render(<LedgerArchiveDialog open={open} onOpenChange={onOpenChange} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(downloadLedgerArchive).mockResolvedValue(undefined)
  vi.mocked(verifyLedger).mockResolvedValue(verification())
})

describe('LedgerArchiveDialog — archive annuelle et contrôle du journal (ADR-038)', () => {
  it('explique ce que garde le journal et ce que demande la loi : une archive par an, six ans', () => {
    show()

    expect(screen.getByRole('heading', { name: 'Archive et contrôle du journal' })).toBeInTheDocument()
    expect(screen.getByText(/sans jamais rien modifier ni supprimer/)).toBeInTheDocument()
    expect(screen.getByText(/au moins une fois par an et de les conserver six ans/)).toBeInTheDocument()
  })

  it('propose l\'année en cours et les cinq précédentes, l\'année en cours d\'abord et choisie', () => {
    show()

    const select = screen.getByLabelText('Année') as HTMLSelectElement
    expect(Array.from(select.options).map((option) => option.value)).toEqual(
      Array.from({ length: 6 }, (_, index) => String(year - index)),
    )
    expect(select.value).toBe(String(year))
  })

  it('génère l\'archive de l\'année choisie et le dit', async () => {
    show()

    await userEvent.selectOptions(screen.getByLabelText('Année'), String(year - 1))
    await userEvent.click(screen.getByRole('button', { name: 'Générer l\'archive' }))

    expect(downloadLedgerArchive).toHaveBeenCalledWith(year - 1)
    expect(toast.success).toHaveBeenCalledWith('Archive générée')
  })

  it('un échec est dit avec son message général, sans fermer la fenêtre', async () => {
    vi.mocked(downloadLedgerArchive).mockRejectedValue(new Error('réseau'))
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Générer l\'archive' }))

    expect(toast.error).toHaveBeenCalledWith('L\'archive n\'a pas pu être générée.')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('un journal sans clé (503) n\'est pas présenté comme une panne ordinaire : message général, sans détail technique', async () => {
    vi.mocked(downloadLedgerArchive).mockRejectedValue(new ApiError(503, 'x', 'LEDGER_KEY_MISSING'))
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Générer l\'archive' }))

    expect(toast.error).toHaveBeenCalledWith('L\'archive n\'a pas pu être générée.')
  })

  describe('le contrôle', () => {
    it('un journal intact : le nombre de lignes et de factures contrôlées', async () => {
      show()

      await userEvent.click(screen.getByRole('button', { name: 'Vérifier le journal' }))

      expect(await screen.findByTestId('ledger-ok')).toHaveTextContent('Journal intact : 12 ligne(s), 5 facture(s) émise(s) contrôlée(s).')
      expect(screen.queryByTestId('ledger-problems')).not.toBeInTheDocument()
    })

    it('les factures émises avant le journal sont dites : on ne peut pas les prouver', async () => {
      vi.mocked(verifyLedger).mockResolvedValue(verification({ legacyInvoices: 3 }))
      show()

      await userEvent.click(screen.getByRole('button', { name: 'Vérifier le journal' }))

      expect(await screen.findByTestId('ledger-ok')).toHaveTextContent('3 facture(s) émise(s) avant le journal ne peuvent pas être prouvées.')
    })

    it('des anomalies : le nombre, chacune en clair avec sa facture et son numéro de ligne, et de ne rien modifier', async () => {
      vi.mocked(verifyLedger).mockResolvedValue(
        verification({
          ok: false,
          problems: [
            { code: 'STATE_MISMATCH', invoice: 'FAC-2026-0001', detail: 'état PAID, le journal dit ISSUED' },
            { code: 'HASH_MISMATCH', sequence: 7 },
            { code: 'CONTENT_ALTERED', sequence: 3, invoice: 'FAC-2026-0002' },
          ],
        }),
      )
      show()

      await userEvent.click(screen.getByRole('button', { name: 'Vérifier le journal' }))

      const alert = await screen.findByTestId('ledger-problems')
      expect(alert).toHaveTextContent('3 anomalie(s)')
      expect(alert).toHaveTextContent('Ne modifiez rien et contactez le support')
      expect(within(alert).getByText('État d\'une facture différent du journal — FAC-2026-0001')).toBeInTheDocument()
      expect(within(alert).getByText('Une ligne du journal a été modifiée (#7)')).toBeInTheDocument()
      expect(within(alert).getByText('Contenu d\'une facture modifié depuis son émission — FAC-2026-0002 (#3)')).toBeInTheDocument()
      expect(screen.queryByTestId('ledger-ok')).not.toBeInTheDocument()
    })

    it('ne liste que les vingt premières anomalies', async () => {
      vi.mocked(verifyLedger).mockResolvedValue(
        verification({
          ok: false,
          problems: Array.from({ length: 50 }, (_, index) => ({ code: 'HASH_MISMATCH' as const, sequence: index + 1 })),
        }),
      )
      show()

      await userEvent.click(screen.getByRole('button', { name: 'Vérifier le journal' }))

      const alert = await screen.findByTestId('ledger-problems')
      expect(alert).toHaveTextContent('50 anomalie(s)')
      expect(within(alert).getAllByRole('listitem')).toHaveLength(20)
    })

    it.each([
      ['SEQUENCE_GAP', 'Une ligne du journal manque'],
      ['CHAIN_BROKEN', 'La chaîne du journal est rompue'],
      ['HASH_MISMATCH', 'Une ligne du journal a été modifiée'],
      ['UNKNOWN_KEY', 'Clé de signature inconnue'],
      ['ISSUE_EVENT_MISSING', 'Facture émise sans ligne d\'émission'],
      ['CONTENT_ALTERED', 'Contenu d\'une facture modifié depuis son émission'],
      ['STATE_MISMATCH', 'État d\'une facture différent du journal'],
    ] as const)('« %s » est dit en clair', async (code, label) => {
      vi.mocked(verifyLedger).mockResolvedValue(verification({ ok: false, problems: [{ code }] }))
      show()

      await userEvent.click(screen.getByRole('button', { name: 'Vérifier le journal' }))

      expect(await screen.findByText(label)).toBeInTheDocument()
    })

    it('un contrôle qui échoue le dit, sans afficher de résultat', async () => {
      vi.mocked(verifyLedger).mockRejectedValue(new Error('réseau'))
      show()

      await userEvent.click(screen.getByRole('button', { name: 'Vérifier le journal' }))

      expect(toast.error).toHaveBeenCalledWith('Le contrôle n\'a pas pu être fait.')
      expect(screen.queryByTestId('ledger-ok')).not.toBeInTheDocument()
      expect(screen.queryByTestId('ledger-problems')).not.toBeInTheDocument()
    })

    it('rouvrir la fenêtre efface le constat d\'avant', async () => {
      const { rerender } = show()
      await userEvent.click(screen.getByRole('button', { name: 'Vérifier le journal' }))
      expect(await screen.findByTestId('ledger-ok')).toBeInTheDocument()

      rerender(<LedgerArchiveDialog open={false} onOpenChange={onOpenChange} />)
      rerender(<LedgerArchiveDialog open onOpenChange={onOpenChange} />)

      expect(screen.queryByTestId('ledger-ok')).not.toBeInTheDocument()
    })
  })

  it('« Fermer » ferme la fenêtre', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('fermée, rien n\'est affiché', () => {
    show(false)

    expect(screen.queryByText('Archive et contrôle du journal')).not.toBeInTheDocument()
  })
})
