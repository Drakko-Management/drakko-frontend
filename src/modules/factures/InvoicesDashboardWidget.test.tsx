import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { useInvoicesSummary } from '@/hooks/use-invoices'
import { InvoicesDashboardWidget } from './InvoicesDashboardWidget'
import { issuedInvoice } from '@/test/invoice-fixtures'
import { plain } from '@/test/quote-fixtures'
import type { InvoicesSummary } from '@/types/api'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('@/hooks/use-invoices', () => ({ useInvoicesSummary: vi.fn() }))

const SUMMARY: InvoicesSummary = {
  drafts: 2,
  overdue: 1,
  toCollect: 2,
  toCollectTotal: '350.50',
  recent: [
    issuedInvoice({ id: 'a', total: '100.00', reference: 'FAC-2026-0001', title: null }),
    issuedInvoice({ id: 'b', total: '250.50', overdue: true, reference: 'FAC-2026-0002', title: null }),
  ],
}

function show(summary: InvoicesSummary | undefined = SUMMARY, isLoading = false) {
  vi.mocked(useInvoicesSummary).mockReturnValue({ data: summary, isLoading } as never)
  render(
    <MemoryRouter>
      <InvoicesDashboardWidget />
    </MemoryRouter>,
  )
}

// Les trois premiers boutons sont les compteurs, dans l'ordre : brouillons, à encaisser, en retard
const TILES = ['Brouillons', 'À encaisser', 'En retard']
const tile = (label: string) => screen.getAllByRole('button')[TILES.indexOf(label)]

beforeEach(() => vi.clearAllMocks())

describe('InvoicesDashboardWidget', () => {
  it('compte les brouillons, les factures à encaisser et celles en retard', () => {
    show()

    expect(within(tile('Brouillons')).getByText('2')).toBeInTheDocument()
    expect(within(tile('À encaisser')).getByText('2')).toBeInTheDocument()
    expect(within(tile('En retard')).getByText('1')).toBeInTheDocument()
  })

  it('les comptes viennent de la synthèse du serveur, pas des factures récentes : 312 à encaisser restent 312', () => {
    show({ ...SUMMARY, drafts: 205, toCollect: 312, overdue: 41, toCollectTotal: '48210.35' })

    expect(within(tile('Brouillons')).getByText('205')).toBeInTheDocument()
    expect(within(tile('À encaisser')).getByText('312')).toBeInTheDocument()
    expect(within(tile('En retard')).getByText('41')).toBeInTheDocument()
    expect(plain(screen.getByTestId('invoices-to-collect').textContent)).toBe('48\u202f210,35 € à encaisser'.replace('\u202f', ' '))
  })

  it('dit le montant à encaisser tel que le serveur le calcule', () => {
    show()

    expect(plain(screen.getByTestId('invoices-to-collect').textContent)).toBe('350,50 € à encaisser')
  })

  it('rien à encaisser : pas de phrase de montant', () => {
    show({ ...SUMMARY, toCollect: 0, toCollectTotal: '0.00' })

    expect(screen.queryByTestId('invoices-to-collect')).not.toBeInTheDocument()
  })

  it.each([
    ['Brouillons', 'DRAFT'],
    ['À encaisser', 'ISSUED'],
    ['En retard', 'OVERDUE'],
  ])('« %s » ouvre la liste filtrée', async (label, filter) => {
    show()

    await userEvent.click(tile(label))

    expect(mockNavigate).toHaveBeenCalledWith(`/factures?filter=${filter}`)
  })

  it('montre les factures récentes de la synthèse et chacune s\'ouvre', async () => {
    show()

    const rows = screen.getAllByRole('button', { name: /FAC-2026-000/ })
    expect(rows).toHaveLength(2)
    await userEvent.click(rows[0])
    expect(mockNavigate).toHaveBeenCalledWith('/factures/a')
  })

  it('« Voir tout » ouvre la liste', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Voir tout' }))

    expect(mockNavigate).toHaveBeenCalledWith('/factures')
  })

  it('aucune facture : le dit', () => {
    show({ drafts: 0, overdue: 0, toCollect: 0, toCollectTotal: '0.00', recent: [] })

    expect(screen.getByText('Aucune facture pour le moment')).toBeInTheDocument()
  })
})
