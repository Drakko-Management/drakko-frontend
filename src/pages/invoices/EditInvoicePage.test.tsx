import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { toast } from 'sonner'
import { useInvoice, useUpdateInvoice } from '@/hooks/use-invoices'
import { useServices } from '@/hooks/use-services'
import { useClients } from '@/hooks/use-clients'
import { useOrganization } from '@/hooks/use-organization'
import { ApiError } from '@/lib/api-client'
import { EditInvoicePage } from './EditInvoicePage'
import { invoice, invoiceLine, issuedInvoice } from '@/test/invoice-fixtures'
import { plain } from '@/test/quote-fixtures'
import type { Invoice } from '@/types/api'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-invoices', () => ({ useInvoice: vi.fn(), useUpdateInvoice: vi.fn() }))
vi.mock('@/hooks/use-services', () => ({ useServices: vi.fn() }))
vi.mock('@/hooks/use-clients', () => ({ useClients: vi.fn() }))
vi.mock('@/hooks/use-organization', () => ({ useOrganization: vi.fn() }))

const update = vi.fn()

function show(data: Invoice | undefined) {
  vi.mocked(useInvoice).mockReturnValue({ data, isLoading: false, isError: !data } as never)
  render(
    <MemoryRouter initialEntries={['/factures/i1/modifier']}>
      <Routes>
        <Route path="/factures/:id/modifier" element={<EditInvoicePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  update.mockResolvedValue(invoice())
  vi.mocked(useUpdateInvoice).mockReturnValue({ mutateAsync: update, isPending: false } as never)
  vi.mocked(useServices).mockReturnValue({ data: [] } as never)
  vi.mocked(useClients).mockReturnValue({ data: { data: [] }, isFetching: false } as never)
  vi.mocked(useOrganization).mockReturnValue({ data: { defaultVatRate: 10 } } as never)
})

describe('EditInvoicePage', () => {
  it('s\'ouvre sur le brouillon rempli : client, objet, échéance, lignes, taux et totaux', () => {
    show(invoice({ comment: 'Accès par le portail', dueDate: '2026-12-15T00:00:00.000Z' }))

    expect(screen.getByText('Léa Martin')).toBeInTheDocument()
    expect(screen.getByLabelText('Objet du devis')).toHaveValue('Haie du fond')
    expect(screen.getByLabelText('Échéance')).toHaveValue('2026-12-15')
    expect(screen.getByLabelText('TVA (%)')).toHaveValue('10')
    expect(screen.getByLabelText('Commentaire')).toHaveValue('Accès par le portail')
    const line = screen.getByTestId('quote-line')
    expect(within(line).getByLabelText('Désignation')).toHaveValue('Taille de haie')
    expect(within(line).getByLabelText('Quantité')).toHaveValue('10')
    expect(plain(screen.getByTestId('quote-total').textContent)).toBe('137,50 €')
  })

  it('un brouillon tiré d\'un devis se modifie comme un autre (facturer une partie, ajuster une quantité)', async () => {
    show(invoice({ quoteId: 'q1', quote: { id: 'q1', reference: 'DEV-2026-0001' }, lines: [invoiceLine({ serviceId: 's1' })] }))

    await userEvent.clear(screen.getByLabelText('Quantité'))
    await userEvent.type(screen.getByLabelText('Quantité'), '4')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(update).toHaveBeenCalledWith({
      id: 'i1',
      clientId: 'c1',
      title: 'Haie du fond',
      comment: null,
      vatRate: 10,
      dueDate: null,
      lines: [{ serviceId: 's1', title: 'Taille de haie', description: 'Haie vive', unit: 'ml', quantity: 4, unitPrice: 12.5 }],
    })
    expect(toast.success).toHaveBeenCalledWith('Facture enregistrée')
    expect(mockNavigate).toHaveBeenCalledWith('/factures/i1', { replace: true })
  })

  it('l\'échéance vidée part à null (l\'API la recalculera)', async () => {
    show(invoice({ dueDate: '2026-12-15T00:00:00.000Z' }))

    await userEvent.clear(screen.getByLabelText('Échéance'))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(update.mock.calls[0][0].dueDate).toBeNull()
  })

  it('sous franchise de TVA : le taux est verrouillé à 0', () => {
    show(invoice({ vatExempt: true, vatRate: '0' }))

    expect(screen.getByLabelText('TVA (%)')).toBeDisabled()
    expect(screen.getByLabelText('TVA (%)')).toHaveValue('0')
  })

  it.each(['ISSUED', 'PAID', 'CANCELLED'] as const)('une facture %s ne se modifie pas : le formulaire n\'apparaît pas', (status) => {
    show(issuedInvoice({ status }))

    expect(screen.getByText(/ne se modifie plus/)).toBeInTheDocument()
    expect(screen.getByText(/annulez-la par un avoir/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument()
  })

  it('une facture introuvable renvoie à la liste', () => {
    show(undefined)

    expect(screen.getByText('Facture introuvable')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour aux factures' })).toHaveAttribute('href', '/factures')
  })

  it('une facture émise entre-temps : le refus de l\'API est dit avec sa traduction', async () => {
    update.mockRejectedValue(new ApiError(409, 'x', 'INVOICE_LOCKED'))
    show(invoice())

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(toast.error).toHaveBeenCalledWith('Une facture émise ne se modifie plus')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

describe('EditInvoicePage — facture de solde (ADR-033)', () => {
  const deduction = invoiceLine({
    id: 'il9',
    snapshotTitle: 'FAC-2026-0001',
    quantity: '-1',
    unitPrice: '69',
    total: '-69.00',
    depositInvoiceId: 'd1',
    order: 5,
  })
  // 10 × 23,00 = 230,00 de travaux, moins 69,00 d'acompte
  const balance = (over: Partial<Invoice> = {}) =>
    invoice({
      vatRate: '20',
      lines: [invoiceLine({ quantity: '10', unitPrice: '23', total: '230.00' }), deduction],
      ...over,
    })

  it('le formulaire ne montre que les travaux : la ligne d\'acompte n\'est pas modifiable', () => {
    show(balance())

    expect(screen.getAllByTestId('quote-line')).toHaveLength(1)
    expect(screen.getByLabelText('Désignation')).toHaveValue('Taille de haie')
  })

  it('les totaux retranchent l\'acompte, puis appliquent la TVA une fois sur le reste', () => {
    show(balance())

    expect(plain(screen.getByTestId('quote-works-total').textContent)).toBe('230,00 €')
    expect(screen.getByTestId('quote-deduction')).toHaveTextContent('Acompte FAC-2026-0001')
    expect(plain(screen.getByTestId('quote-subtotal').textContent)).toBe('161,00 €')
    expect(plain(screen.getByTestId('quote-vat-amount').textContent)).toBe('32,20 €')
    expect(plain(screen.getByTestId('quote-total').textContent)).toBe('193,20 €')
    expect(screen.getByText('Reste à payer')).toBeInTheDocument()
    expect(screen.getByText(/se déduisent automatiquement/)).toBeInTheDocument()
  })

  it('suit la saisie : moins de travaux, moins de solde', async () => {
    show(balance())

    await userEvent.clear(screen.getByLabelText('Quantité'))
    await userEvent.type(screen.getByLabelText('Quantité'), '5')

    // 5 × 23 = 115 - 69 = 46 ; TVA 9,20 ; 55,20
    expect(plain(screen.getByTestId('quote-total').textContent)).toBe('55,20 €')
  })

  it('prévient quand les acomptes dépassent les travaux', async () => {
    show(balance())

    await userEvent.clear(screen.getByLabelText('Quantité'))
    await userEvent.type(screen.getByLabelText('Quantité'), '1')

    expect(screen.getByTestId('quote-balance-negative')).toHaveTextContent('Les acomptes dépassent le montant de la facture')
  })

  it('n\'envoie que les travaux : l\'API garde les déductions', async () => {
    show(balance())

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    const body = update.mock.calls[0][0]
    expect(body.lines).toHaveLength(1)
    expect(body.lines[0]).toMatchObject({ title: 'Taille de haie', quantity: 10, unitPrice: 23 })
  })

  it('sans acompte, aucun rappel de déduction', () => {
    show(invoice())

    expect(screen.queryByTestId('quote-works-total')).not.toBeInTheDocument()
    expect(screen.queryByTestId('quote-deduction')).not.toBeInTheDocument()
    expect(screen.queryByText(/se déduisent automatiquement/)).not.toBeInTheDocument()
  })
})

