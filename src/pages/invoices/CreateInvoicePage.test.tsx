import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { useCreateInvoice, useInvoice } from '@/hooks/use-invoices'
import { useServices } from '@/hooks/use-services'
import { useClient, useClients } from '@/hooks/use-clients'
import { useOrganization } from '@/hooks/use-organization'
import { ApiError } from '@/lib/api-client'
import { CreateInvoicePage } from './CreateInvoicePage'
import { invoice, invoiceLine } from '@/test/invoice-fixtures'
import { plain } from '@/test/quote-fixtures'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-invoices', () => ({ useCreateInvoice: vi.fn(), useInvoice: vi.fn() }))
vi.mock('@/hooks/use-services', () => ({ useServices: vi.fn() }))
vi.mock('@/hooks/use-clients', () => ({ useClients: vi.fn(), useClient: vi.fn() }))
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
  vi.mocked(useClient).mockReturnValue({ data: undefined, isLoading: false } as never)
  vi.mocked(useInvoice).mockReturnValue({ data: undefined, isLoading: false } as never)
  vi.mocked(useOrganization).mockReturnValue({ data: { defaultVatRate: 10, defaultPaymentTerms: '30' } } as never)
})

function renderPage(entry = '/factures/nouveau') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <CreateInvoicePage />
    </MemoryRouter>,
  )
}

async function pickClient() {
  await userEvent.click(screen.getByPlaceholderText('Rechercher un client…'))
  await userEvent.click(await screen.findByText('Léa Martin'))
}

describe('CreateInvoicePage — client venu de la fiche client', () => {
  const FULL_CLIENT = { ...CLIENT, phone: null, address: null, notes: null, active: true }

  it('sans paramètre, le formulaire s\'ouvre sans client', () => {
    renderPage()
    expect(useClient).toHaveBeenCalledWith('')
    expect(screen.getByPlaceholderText('Rechercher un client…')).toBeInTheDocument()
  })

  it('`?client=` présélectionne ce client, et la facture part avec lui', async () => {
    vi.mocked(useClient).mockReturnValue({ data: FULL_CLIENT, isLoading: false } as never)
    renderPage('/factures/nouveau?client=c1')

    expect(useClient).toHaveBeenCalledWith('c1')
    expect(screen.getByText('Léa Martin')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Rechercher un client…')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ligne libre' }))
    const line = screen.getByTestId('quote-line')
    await userEvent.type(within(line).getByLabelText('Désignation'), 'Pose')
    await userEvent.type(within(line).getByLabelText('Prix unitaire HT (€)'), '100')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le brouillon' }))

    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0].clientId).toBe('c1')
  })

  it('un client désactivé n\'est pas présélectionné', () => {
    vi.mocked(useClient).mockReturnValue({ data: { ...FULL_CLIENT, active: false }, isLoading: false } as never)
    renderPage('/factures/nouveau?client=c1')

    expect(screen.getByPlaceholderText('Rechercher un client…')).toBeInTheDocument()
  })

  it('un client introuvable ouvre le formulaire vide, sans erreur', () => {
    vi.mocked(useClient).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never)
    renderPage('/factures/nouveau?client=zzz')

    expect(screen.getByPlaceholderText('Rechercher un client…')).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('« retour » ramène à la fiche du client, ou à la liste des factures sans raccourci', async () => {
    vi.mocked(useClient).mockReturnValue({ data: FULL_CLIENT, isLoading: false } as never)
    renderPage('/factures/nouveau?client=c1')
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }))
    expect(mockNavigate).toHaveBeenLastCalledWith('/clients/c1')
  })
})

describe('CreateInvoicePage — copie d\'une facture (« Dupliquer »)', () => {
  const FULL_CLIENT = { ...CLIENT, phone: null, address: null, notes: null, active: true }
  // Une facture émise en octobre, avec échéance et jour de prestation
  const SOURCE = invoice({
    id: 'i7',
    status: 'ISSUED',
    reference: 'FAC-2026-0007',
    dueDate: '2026-11-30T00:00:00.000Z',
    serviceDate: '2026-10-28T00:00:00.000Z',
    vatRate: '20',
    comment: 'Règlement par virement',
    lines: [invoiceLine(), invoiceLine({ id: 'il2', snapshotTitle: 'Déplacement', snapshotDescription: null, snapshotUnit: null, quantity: '1', unitPrice: '40' })],
  })

  beforeEach(() => {
    vi.mocked(useInvoice).mockReturnValue({ data: SOURCE, isLoading: false } as never)
    vi.mocked(useClient).mockReturnValue({ data: FULL_CLIENT, isLoading: false } as never)
  })

  it('le formulaire s\'ouvre rempli : client, objet, taux, commentaire et lignes, avec un avis de copie', () => {
    renderPage('/factures/nouveau?duplicate=i7')

    expect(useInvoice).toHaveBeenCalledWith('i7')
    expect(screen.getByText('Léa Martin')).toBeInTheDocument()
    expect(screen.getByLabelText('Objet du devis')).toHaveValue('Haie du fond')
    expect(screen.getByLabelText('TVA (%)')).toHaveValue('20')
    expect(screen.getByLabelText('Commentaire')).toHaveValue('Règlement par virement')
    expect(screen.getAllByTestId('quote-line')).toHaveLength(2)
    expect(screen.getByTestId('duplicate-hint')).toHaveTextContent('Copie d\'une facture existante')
  })

  it('ni l\'échéance ni le jour de la prestation ne sont repris', () => {
    renderPage('/factures/nouveau?duplicate=i7')

    expect(screen.getByLabelText('Échéance')).toHaveValue('')
    expect(screen.getByLabelText('Prestation réalisée le')).toHaveValue('')
  })

  it('« Créer le brouillon » envoie la copie : une nouvelle facture, sans échéance ni jour de prestation', async () => {
    renderPage('/factures/nouveau?duplicate=i7')

    await userEvent.click(screen.getByRole('button', { name: 'Créer le brouillon' }))

    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0]).toEqual({
      clientId: 'c1',
      title: 'Haie du fond',
      comment: 'Règlement par virement',
      vatRate: 20,
      dueDate: null,
      serviceDate: null,
      lines: [
        { title: 'Taille de haie', description: 'Haie vive', unit: 'ml', quantity: 10, unitPrice: 12.5 },
        { title: 'Déplacement', quantity: 1, unitPrice: 40 },
      ],
    })
    expect(mockNavigate).toHaveBeenCalledWith('/factures/i1', { replace: true })
  })

  it('les lignes qui déduisent un acompte ne sont pas reprises (l\'adresse peut être tapée à la main)', async () => {
    vi.mocked(useInvoice).mockReturnValue({
      data: { ...SOURCE, lines: [invoiceLine(), invoiceLine({ id: 'il3', depositInvoiceId: 'd1', snapshotTitle: 'FAC-2026-0006', quantity: '-1', unitPrice: '50' })] },
      isLoading: false,
    } as never)
    renderPage('/factures/nouveau?duplicate=i7')

    expect(screen.getAllByTestId('quote-line')).toHaveLength(1)
  })

  it('une facture établie sous franchise de TVA ne fait pas reprendre son taux 0', async () => {
    vi.mocked(useInvoice).mockReturnValue({ data: { ...SOURCE, vatExempt: true, vatRate: '0' }, isLoading: false } as never)
    renderPage('/factures/nouveau?duplicate=i7')

    expect(screen.getByLabelText('TVA (%)')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le brouillon' }))

    expect(create.mock.calls[0][0]).not.toHaveProperty('vatRate')
  })

  it('un client désactivé n\'est pas repris, les lignes si', () => {
    vi.mocked(useClient).mockReturnValue({ data: { ...FULL_CLIENT, active: false }, isLoading: false } as never)
    renderPage('/factures/nouveau?duplicate=i7')

    expect(screen.getByPlaceholderText('Rechercher un client…')).toBeInTheDocument()
    expect(screen.getAllByTestId('quote-line')).toHaveLength(2)
  })

  it('si la relecture du client échoue, la copie garde celui de la facture', () => {
    vi.mocked(useClient).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never)
    renderPage('/factures/nouveau?duplicate=i7')

    expect(screen.getByText('Léa Martin')).toBeInTheDocument()
  })

  it('une facture introuvable ouvre le formulaire vide, sans avis ni erreur', () => {
    vi.mocked(useInvoice).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never)
    // Pas de `?client=` : rien à relire (le mock, lui, renverrait un client quoi qu'on lui demande)
    vi.mocked(useClient).mockReturnValue({ data: undefined, isLoading: false } as never)
    renderPage('/factures/nouveau?duplicate=zzz')

    expect(screen.getByPlaceholderText('Rechercher un client…')).toBeInTheDocument()
    expect(screen.queryByTestId('duplicate-hint')).not.toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('le formulaire attend la facture, puis la relecture du client', () => {
    vi.mocked(useInvoice).mockReturnValue({ data: undefined, isLoading: true } as never)
    renderPage('/factures/nouveau?duplicate=i7')
    expect(screen.queryByRole('button', { name: 'Créer le brouillon' })).not.toBeInTheDocument()

    vi.mocked(useInvoice).mockReturnValue({ data: SOURCE, isLoading: false } as never)
    vi.mocked(useClient).mockReturnValue({ data: undefined, isLoading: true } as never)
    renderPage('/factures/nouveau?duplicate=i7')
    expect(screen.queryByRole('button', { name: 'Créer le brouillon' })).not.toBeInTheDocument()
  })

  it('« retour » ramène à la facture copiée', async () => {
    renderPage('/factures/nouveau?duplicate=i7')

    await userEvent.click(screen.getByRole('button', { name: 'Retour' }))

    expect(mockNavigate).toHaveBeenCalledWith('/factures/i7')
  })

  it('sans `?duplicate=`, ni avis de copie ni facture cherchée', () => {
    renderPage('/factures/nouveau')

    expect(useInvoice).toHaveBeenCalledWith('')
    expect(screen.queryByTestId('duplicate-hint')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Objet du devis')).toHaveValue('')
  })
})

describe('CreateInvoicePage — remises (une ligne à prix négatif)', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  async function fillDiscounted(discount: string) {
    await pickClient()
    await userEvent.click(screen.getByRole('button', { name: 'Ligne libre' }))
    await userEvent.type(within(screen.getByTestId('quote-line')).getByLabelText('Désignation'), 'Pose')
    await userEvent.type(within(screen.getByTestId('quote-line')).getByLabelText('Prix unitaire HT (€)'), '100')
    await userEvent.click(screen.getByRole('button', { name: 'Remise globale' }))
    const lines = screen.getAllByTestId('quote-line')
    await userEvent.type(within(lines[1]).getByLabelText('Prix unitaire HT (€)'), discount)
  }

  it('la facture part avec sa remise, le total en tient compte', async () => {
    renderPage()

    await fillDiscounted('40')

    expect(plain(screen.getByTestId('quote-subtotal').textContent)).toBe('60,00 €')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le brouillon' }))
    expect(create.mock.calls[0][0].lines).toEqual([
      { title: 'Pose', quantity: 1, unitPrice: 100 },
      { title: 'Remise', quantity: 1, unitPrice: -40 },
    ])
  })

  it('des remises plus grandes que les prestations bloquent l\'envoi', async () => {
    renderPage()

    await fillDiscounted('140')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le brouillon' }))

    expect(screen.getByTestId('quote-discount-too-high')).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('une erreur de l\'API sur les remises est dite avec sa traduction', async () => {
    create.mockRejectedValue(new ApiError(400, 'x', 'INVOICE_DISCOUNT_TOO_HIGH'))
    renderPage()
    await fillDiscounted('40')

    await userEvent.click(screen.getByRole('button', { name: 'Créer le brouillon' }))

    expect(toast.error).toHaveBeenCalledWith('Les remises dépassent le montant des prestations : le total ne peut pas être négatif.')
  })
})

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
