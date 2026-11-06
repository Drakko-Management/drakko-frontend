import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { useCreateInvoice } from '@/hooks/use-invoices'
import { useServices } from '@/hooks/use-services'
import { useClients } from '@/hooks/use-clients'
import { useOrganization } from '@/hooks/use-organization'
import { ApiError } from '@/lib/api-client'
import { CreateInvoicePage } from './CreateInvoicePage'
import { invoice } from '@/test/invoice-fixtures'
import { plain } from '@/test/quote-fixtures'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-invoices', () => ({ useCreateInvoice: vi.fn() }))
vi.mock('@/hooks/use-services', () => ({ useServices: vi.fn() }))
vi.mock('@/hooks/use-clients', () => ({ useClients: vi.fn() }))
vi.mock('@/hooks/use-organization', () => ({ useOrganization: vi.fn() }))

const CLIENT = { id: 'c1', firstName: 'Léa', lastName: 'Martin', email: 'lea@martin.test' }
const SERVICE = { id: 's1', title: 'Taille de haie', description: 'Haie vive', unit: 'ml', defaultPrice: 12.5, active: true }

const create = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  create.mockResolvedValue(invoice())
  vi.mocked(useCreateInvoice).mockReturnValue({ mutateAsync: create, isPending: false } as never)
  vi.mocked(useServices).mockReturnValue({ data: [SERVICE] } as never)
  vi.mocked(useClients).mockReturnValue({ data: { data: [CLIENT] }, isFetching: false } as never)
  vi.mocked(useOrganization).mockReturnValue({ data: { defaultVatRate: 10, defaultPaymentTerms: '30' } } as never)
})

function renderPage() {
  render(
    <MemoryRouter>
      <CreateInvoicePage />
    </MemoryRouter>,
  )
}

async function pickClient() {
  await userEvent.click(screen.getByPlaceholderText('Rechercher un client…'))
  await userEvent.click(await screen.findByText('Léa Martin'))
}

describe('CreateInvoicePage', () => {
  it('le formulaire est celui d\'un devis, avec une échéance au lieu d\'une validité', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Nouvelle facture' })).toBeInTheDocument()
    expect(screen.getByLabelText('Échéance')).toBeInTheDocument()
    expect(screen.queryByLabelText('Valable jusqu\'au')).not.toBeInTheDocument()
    expect(screen.getByLabelText('TVA (%)')).toBeEnabled()
  })

  it('dit quelle échéance sera prise si le champ reste vide, selon les conditions de paiement', () => {
    renderPage()

    expect(screen.getByText('Laissée vide, l\'échéance sera de 30 jours après l\'émission.')).toBeInTheDocument()
  })

  it('le délai dit suit les conditions de paiement des réglages', () => {
    vi.mocked(useOrganization).mockReturnValue({ data: { defaultVatRate: 10, defaultPaymentTerms: '45' } } as never)
    renderPage()

    expect(screen.getByText(/sera de 45 jours/)).toBeInTheDocument()
  })

  it('une échéance choisie fait disparaître la phrase', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Échéance'), '2026-12-15')

    expect(screen.queryByText(/Laissée vide/)).not.toBeInTheDocument()
  })

  it('une prestation ajoutée se recopie dans la ligne, et les totaux suivent', async () => {
    renderPage()

    await userEvent.selectOptions(screen.getByLabelText('Ajouter une prestation'), 's1')

    const line = screen.getByTestId('quote-line')
    expect(within(line).getByLabelText('Désignation')).toHaveValue('Taille de haie')
    expect(plain(screen.getByTestId('quote-total').textContent)).toBe('13,75 €')
  })

  it('sans client, rien n\'est envoyé et le champ le dit', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Créer le brouillon' }))

    expect(screen.getByText('Choisissez un client')).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('envoie le client, l\'objet, l\'échéance et les lignes, puis ouvre le brouillon créé', async () => {
    renderPage()
    await pickClient()
    await userEvent.type(screen.getByLabelText('Objet du devis'), 'Haie du fond')
    await userEvent.type(screen.getByLabelText('Échéance'), '2026-12-15')
    await userEvent.selectOptions(screen.getByLabelText('Ajouter une prestation'), 's1')

    await userEvent.click(screen.getByRole('button', { name: 'Créer le brouillon' }))

    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({
      clientId: 'c1',
      title: 'Haie du fond',
      comment: null,
      dueDate: '2026-12-15',
      serviceDate: null,
      lines: [{ serviceId: 's1', title: 'Taille de haie', description: 'Haie vive', unit: 'ml', quantity: 1, unitPrice: 12.5 }],
    })
    expect(toast.success).toHaveBeenCalledWith('Brouillon de facture créé')
    expect(mockNavigate).toHaveBeenCalledWith('/factures/i1', { replace: true })
  })

  it('le jour de la prestation est facultatif : il part quand il est saisi, à null sinon', async () => {
    renderPage()
    await pickClient()
    expect(screen.getByLabelText('Prestation réalisée le')).toHaveValue('')
    await userEvent.type(screen.getByLabelText('Prestation réalisée le'), '2026-10-28')

    await userEvent.click(screen.getByRole('button', { name: 'Créer le brouillon' }))

    expect(create.mock.calls[0][0].serviceDate).toBe('2026-10-28')
  })

  it('sans échéance choisie, l\'API la calculera : dueDate part à null', async () => {
    renderPage()
    await pickClient()

    await userEvent.click(screen.getByRole('button', { name: 'Créer le brouillon' }))

    expect(create.mock.calls[0][0].dueDate).toBeNull()
  })

  describe('franchise de TVA', () => {
    beforeEach(() => {
      vi.mocked(useOrganization).mockReturnValue({ data: { defaultVatRate: 20, vatExempt: true } } as never)
    })

    it('le taux est 0 et ne se change pas, la mention légale remplace la ligne de TVA', async () => {
      renderPage()
      await userEvent.selectOptions(screen.getByLabelText('Ajouter une prestation'), 's1')

      expect(screen.getByLabelText('TVA (%)')).toBeDisabled()
      expect(screen.getByLabelText('TVA (%)')).toHaveValue('0')
      expect(screen.getAllByText('TVA non applicable, art. 293 B du CGI').length).toBeGreaterThan(0)
      expect(screen.queryByTestId('quote-vat-amount')).not.toBeInTheDocument()
      expect(plain(screen.getByTestId('quote-total').textContent)).toBe('12,50 €')
    })

    it('n\'envoie aucun taux : l\'API met 0', async () => {
      renderPage()
      await pickClient()

      await userEvent.click(screen.getByRole('button', { name: 'Créer le brouillon' }))

      expect(create.mock.calls[0][0]).not.toHaveProperty('vatRate')
    })
  })

  it('une erreur de l\'API est dite avec sa traduction, sans quitter la page', async () => {
    create.mockRejectedValue(new ApiError(404, 'x', 'SERVICE_NOT_FOUND'))
    renderPage()
    await pickClient()

    await userEvent.click(screen.getByRole('button', { name: 'Créer le brouillon' }))

    expect(toast.error).toHaveBeenCalledWith('Cette prestation n\'existe plus.')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
