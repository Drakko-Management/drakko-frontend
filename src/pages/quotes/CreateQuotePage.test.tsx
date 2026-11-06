import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { useCreateQuote, useQuote } from '@/hooks/use-quotes'
import { useServices } from '@/hooks/use-services'
import { useClient, useClients } from '@/hooks/use-clients'
import { useOrganization } from '@/hooks/use-organization'
import { ApiError } from '@/lib/api-client'
import { todayInput } from '@/lib/utils'
import { CreateQuotePage } from './CreateQuotePage'
import { plain, quote, quoteLine } from '@/test/quote-fixtures'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-quotes', () => ({ useCreateQuote: vi.fn(), useQuote: vi.fn() }))
vi.mock('@/hooks/use-services', () => ({ useServices: vi.fn() }))
vi.mock('@/hooks/use-clients', () => ({ useClients: vi.fn(), useClient: vi.fn() }))
vi.mock('@/hooks/use-organization', () => ({ useOrganization: vi.fn() }))

const CLIENT = { id: 'c1', firstName: 'Léa', lastName: 'Martin', email: 'lea@martin.test' }
const SERVICE = { id: 's1', title: 'Taille de haie', description: 'Haie vive', unit: 'ml', defaultPrice: 12.5, active: true }

const create = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  create.mockResolvedValue(quote())
  vi.mocked(useCreateQuote).mockReturnValue({ mutateAsync: create, isPending: false } as never)
  vi.mocked(useServices).mockReturnValue({ data: [SERVICE] } as never)
  vi.mocked(useClients).mockReturnValue({ data: { data: [CLIENT] }, isFetching: false } as never)
  vi.mocked(useClient).mockReturnValue({ data: undefined, isLoading: false } as never)
  vi.mocked(useQuote).mockReturnValue({ data: undefined, isLoading: false } as never)
  vi.mocked(useOrganization).mockReturnValue({ data: { defaultVatRate: 10 } } as never)
})

function renderPage(entry = '/devis/nouveau') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <CreateQuotePage />
    </MemoryRouter>,
  )
}

async function pickClient() {
  await userEvent.click(screen.getByPlaceholderText('Rechercher un client…'))
  await userEvent.click(await screen.findByText('Léa Martin'))
}

describe('CreateQuotePage — client venu de la fiche client', () => {
  const FULL_CLIENT = { ...CLIENT, phone: null, address: null, notes: null, active: true }

  it('sans paramètre, le formulaire s\'ouvre sans client et ne cherche personne', () => {
    renderPage()
    expect(useClient).toHaveBeenCalledWith('')
    expect(screen.getByPlaceholderText('Rechercher un client…')).toBeInTheDocument()
  })

  it('`?client=` présélectionne ce client, et le devis part avec lui', async () => {
    vi.mocked(useClient).mockReturnValue({ data: FULL_CLIENT, isLoading: false } as never)
    renderPage('/devis/nouveau?client=c1')

    expect(useClient).toHaveBeenCalledWith('c1')
    expect(screen.getByText('Léa Martin')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Rechercher un client…')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ligne libre' }))
    const line = screen.getByTestId('quote-line')
    await userEvent.type(within(line).getByLabelText('Désignation'), 'Pose')
    await userEvent.type(within(line).getByLabelText('Prix unitaire HT (€)'), '100')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0].clientId).toBe('c1')
  })

  it('le client reste modifiable : on peut en prendre un autre', async () => {
    vi.mocked(useClient).mockReturnValue({ data: FULL_CLIENT, isLoading: false } as never)
    renderPage('/devis/nouveau?client=c1')

    // Le bouton qui retire le client n'a pas de nom : on le prend à côté du nom choisi
    await userEvent.click(within(screen.getByText('Léa Martin').parentElement as HTMLElement).getByRole('button'))

    expect(screen.getByPlaceholderText('Rechercher un client…')).toBeInTheDocument()
  })

  it('un client désactivé n\'est pas présélectionné : on ne l\'a plus dans les formulaires', () => {
    vi.mocked(useClient).mockReturnValue({ data: { ...FULL_CLIENT, active: false }, isLoading: false } as never)
    renderPage('/devis/nouveau?client=c1')

    expect(screen.getByPlaceholderText('Rechercher un client…')).toBeInTheDocument()
  })

  it('un client introuvable ouvre le formulaire vide, sans erreur', () => {
    vi.mocked(useClient).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never)
    renderPage('/devis/nouveau?client=zzz')

    expect(screen.getByPlaceholderText('Rechercher un client…')).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('le formulaire attend la réponse : pas de client en vue, pas de formulaire non plus', () => {
    vi.mocked(useClient).mockReturnValue({ data: undefined, isLoading: true } as never)
    renderPage('/devis/nouveau?client=c1')

    expect(screen.queryByRole('button', { name: 'Créer le devis' })).not.toBeInTheDocument()
  })

  it('« retour » ramène à la fiche du client, pas à la liste des devis', async () => {
    vi.mocked(useClient).mockReturnValue({ data: FULL_CLIENT, isLoading: false } as never)
    renderPage('/devis/nouveau?client=c1')

    await userEvent.click(screen.getByRole('button', { name: 'Retour' }))

    expect(mockNavigate).toHaveBeenCalledWith('/clients/c1')
  })

  it('sans raccourci, « retour » ramène à la liste des devis', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Retour' }))

    expect(mockNavigate).toHaveBeenCalledWith('/devis')
  })
})

describe('CreateQuotePage — copie d\'un devis (« Dupliquer »)', () => {
  const FULL_CLIENT = { ...CLIENT, phone: null, address: null, notes: null, active: true }
  // Un devis d'hier : validité passée, deux lignes dont une venue d'une prestation, un commentaire, un taux réduit
  const SOURCE = quote({
    id: 'q7',
    status: 'SENT',
    validUntil: '2026-09-30T00:00:00.000Z',
    vatRate: '5.5',
    comment: 'Accès par le portail',
    lines: [
      quoteLine({ serviceId: 's1' }),
      quoteLine({ id: 'l2', snapshotTitle: 'Déplacement', snapshotDescription: null, snapshotUnit: null, quantity: '1', unitPrice: '40' }),
    ],
  })

  beforeEach(() => {
    vi.mocked(useQuote).mockReturnValue({ data: SOURCE, isLoading: false } as never)
    vi.mocked(useClient).mockReturnValue({ data: FULL_CLIENT, isLoading: false } as never)
  })

  it('le formulaire s\'ouvre rempli : client, objet, taux, commentaire et lignes, avec un avis de copie', () => {
    renderPage('/devis/nouveau?duplicate=q7')

    expect(useQuote).toHaveBeenCalledWith('q7')
    expect(screen.getByText('Léa Martin')).toBeInTheDocument()
    expect(screen.getByLabelText('Objet du devis')).toHaveValue('Haie du fond')
    expect(screen.getByLabelText('TVA (%)')).toHaveValue('5.5')
    expect(screen.getByLabelText('Commentaire')).toHaveValue('Accès par le portail')
    expect(screen.getAllByTestId('quote-line')).toHaveLength(2)
    expect(screen.getByTestId('duplicate-hint')).toHaveTextContent('Copie d\'un devis existant')
  })

  it('la date de validité n\'est pas reprise : celle du devis d\'origine est peut-être passée', () => {
    renderPage('/devis/nouveau?duplicate=q7')

    expect(screen.getByLabelText('Valable jusqu\'au')).toHaveValue('')
    expect(screen.queryByText(/Cette date est passée/)).not.toBeInTheDocument()
  })

  it('« Créer le devis » envoie la copie telle quelle, sans validité : un nouveau devis, pas une modification', async () => {
    renderPage('/devis/nouveau?duplicate=q7')

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0]).toEqual({
      clientId: 'c1',
      title: 'Haie du fond',
      comment: 'Accès par le portail',
      vatRate: 5.5,
      validUntil: null,
      lines: [
        { serviceId: 's1', title: 'Taille de haie', description: 'Haie vive', unit: 'ml', quantity: 10, unitPrice: 12.5 },
        { title: 'Déplacement', quantity: 1, unitPrice: 40 },
      ],
    })
    expect(mockNavigate).toHaveBeenCalledWith('/devis/q1', { replace: true })
  })

  it('un devis établi sous franchise de TVA ne fait pas reprendre son taux 0 : celui de l\'organisation s\'applique', async () => {
    vi.mocked(useQuote).mockReturnValue({ data: { ...SOURCE, vatExempt: true, vatRate: '0' }, isLoading: false } as never)
    renderPage('/devis/nouveau?duplicate=q7')

    expect(screen.getByLabelText('TVA (%)')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(create.mock.calls[0][0]).not.toHaveProperty('vatRate')
  })

  it('un client désactivé n\'est pas repris (on ne l\'a plus dans les formulaires), les lignes si', () => {
    vi.mocked(useClient).mockReturnValue({ data: { ...FULL_CLIENT, active: false }, isLoading: false } as never)
    renderPage('/devis/nouveau?duplicate=q7')

    expect(screen.getByPlaceholderText('Rechercher un client…')).toBeInTheDocument()
    expect(screen.getAllByTestId('quote-line')).toHaveLength(2)
  })

  it('si la relecture du client échoue, la copie garde celui du devis plutôt que de bloquer', () => {
    vi.mocked(useClient).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never)
    renderPage('/devis/nouveau?duplicate=q7')

    expect(screen.getByText('Léa Martin')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Rechercher un client…')).not.toBeInTheDocument()
  })

  it('un devis introuvable ouvre le formulaire vide, sans avis ni erreur', () => {
    vi.mocked(useQuote).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never)
    // Pas de `?client=` : rien à relire (le mock, lui, renverrait un client quoi qu'on lui demande)
    vi.mocked(useClient).mockReturnValue({ data: undefined, isLoading: false } as never)
    renderPage('/devis/nouveau?duplicate=zzz')

    expect(screen.getByPlaceholderText('Rechercher un client…')).toBeInTheDocument()
    expect(screen.queryByTestId('duplicate-hint')).not.toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('le formulaire attend le devis, puis la relecture du client', () => {
    vi.mocked(useQuote).mockReturnValue({ data: undefined, isLoading: true } as never)
    renderPage('/devis/nouveau?duplicate=q7')
    expect(screen.queryByRole('button', { name: 'Créer le devis' })).not.toBeInTheDocument()
  })

  it('il attend aussi la relecture du client, sinon le client changerait sous la main', () => {
    vi.mocked(useClient).mockReturnValue({ data: undefined, isLoading: true } as never)
    renderPage('/devis/nouveau?duplicate=q7')
    expect(screen.queryByRole('button', { name: 'Créer le devis' })).not.toBeInTheDocument()
  })

  it('« retour » ramène au devis copié', async () => {
    renderPage('/devis/nouveau?duplicate=q7')

    await userEvent.click(screen.getByRole('button', { name: 'Retour' }))

    expect(mockNavigate).toHaveBeenCalledWith('/devis/q7')
  })

  it('sans `?duplicate=`, ni avis de copie ni devis cherché', () => {
    // Le test simule `useQuote` sans tenir compte de `enabled` : la page ne doit pas s'y fier
    renderPage('/devis/nouveau')

    expect(useQuote).toHaveBeenCalledWith('')
    expect(screen.queryByTestId('duplicate-hint')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Objet du devis')).toHaveValue('')
  })
})

describe('CreateQuotePage — plafonds de l\'API et première erreur', () => {
  async function addFreeLine(title = 'Pose', quantity = '1', price = '100') {
    await userEvent.click(screen.getByRole('button', { name: 'Ligne libre' }))
    const lines = screen.getAllByTestId('quote-line')
    const line = lines[lines.length - 1]
    await userEvent.type(within(line).getByLabelText('Désignation'), title)
    await userEvent.clear(within(line).getByLabelText('Quantité'))
    await userEvent.type(within(line).getByLabelText('Quantité'), quantity)
    await userEvent.type(within(line).getByLabelText('Prix unitaire HT (€)'), price)
    return line
  }
  const scroll = vi.fn()

  beforeEach(() => {
    scroll.mockClear()
    Element.prototype.scrollIntoView = scroll
  })

  it('une quantité au-delà du plafond est dite tout de suite, et bloque l\'envoi', async () => {
    renderPage()
    await pickClient()
    const line = await addFreeLine('Pose', '1000001')

    expect(within(line).getByTestId('quantity-max')).toHaveTextContent('Quantité : 1 000 000 au plus.')
    expect(within(line).getByLabelText('Quantité')).toHaveAttribute('aria-invalid', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))
    expect(create).not.toHaveBeenCalled()
  })

  it('le plafond lui-même est permis, une décimale de trop non (comme l\'API)', async () => {
    renderPage()
    await pickClient()
    const line = await addFreeLine('Pose', '1000000')
    expect(within(line).queryByTestId('quantity-max')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))
    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][0].lines[0].quantity).toBe(1000000)
  })

  it('un prix au-delà du plafond est dit tout de suite, et bloque l\'envoi', async () => {
    renderPage()
    await pickClient()
    const line = await addFreeLine('Pose', '1', '100000000')

    expect(within(line).getByTestId('price-max')).toHaveTextContent('Prix : 99 999 999,00 € au plus.')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))
    expect(create).not.toHaveBeenCalled()
  })

  it('le prix au plafond passe', async () => {
    renderPage()
    await pickClient()
    const line = await addFreeLine('Pose', '1', '99999999')
    expect(within(line).queryByTestId('price-max')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('sans client, un envoi refusé ramène à l\'erreur du haut et place le curseur dans la recherche', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll.mock.contexts[0]).toBe(document.getElementById('client-search')?.closest('[data-form-error]'))
    expect(document.activeElement).toBe(document.getElementById('client-search'))
  })

  it('une ligne incomplète : le saut va à sa désignation', async () => {
    renderPage()
    await pickClient()
    await userEvent.click(screen.getByRole('button', { name: 'Ligne libre' }))

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    const line = screen.getByTestId('quote-line')
    expect(scroll.mock.contexts[0]).toBe(line)
    expect(document.activeElement).toBe(within(line).getByLabelText('Désignation'))
  })

  it('plusieurs erreurs : la première dans l\'ordre de la page, ici le client', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Ligne libre' }))

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(document.activeElement).toBe(document.getElementById('client-search'))
  })

  it('chaque refus ramène à l\'erreur, pas seulement le premier', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))
    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(scroll).toHaveBeenCalledTimes(2)
  })

  it('un formulaire valide ne saute nulle part', async () => {
    renderPage()
    await pickClient()
    await addFreeLine()

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(create).toHaveBeenCalledTimes(1)
    expect(scroll).not.toHaveBeenCalled()
  })
})

describe('CreateQuotePage — date de validité passée', () => {
  const PAST = 'Cette date est passée : le devis ne pourra pas être envoyé tant qu\'elle n\'est pas prolongée.'
  // La veille du jour d'aujourd'hui, comme le formulaire le compte
  const yesterday = () => new Date(new Date(`${todayInput()}T00:00:00.000Z`).getTime() - 86_400_000).toISOString().slice(0, 10)
  const tomorrow = () => new Date(new Date(`${todayInput()}T00:00:00.000Z`).getTime() + 86_400_000).toISOString().slice(0, 10)

  it('aucune date : rien à dire', () => {
    renderPage()

    expect(screen.queryByText(PAST)).not.toBeInTheDocument()
  })

  it('une date passée est signalée, sans empêcher d\'enregistrer le brouillon', async () => {
    renderPage()
    await pickClient()

    await userEvent.type(screen.getByLabelText('Valable jusqu\'au'), yesterday())

    expect(screen.getByTestId('valid-until-past')).toHaveTextContent(PAST)
    expect(screen.getByLabelText('Valable jusqu\'au')).toHaveAccessibleDescription(PAST)
    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))
    expect(create.mock.calls[0][0].validUntil).toBe(yesterday())
  })

  it.each([
    ['aujourd\'hui (le dernier jour compte)', () => todayInput()],
    ['demain', tomorrow],
  ])('%s : rien à dire', async (_name, day) => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Valable jusqu\'au'), day())

    expect(screen.queryByText(PAST)).not.toBeInTheDocument()
  })

  it('l\'avertissement suit la saisie : il disparaît quand la date est prolongée', async () => {
    renderPage()
    const input = screen.getByLabelText('Valable jusqu\'au')

    await userEvent.type(input, yesterday())
    expect(screen.getByText(PAST)).toBeInTheDocument()

    await userEvent.clear(input)
    await userEvent.type(input, tomorrow())
    expect(screen.queryByText(PAST)).not.toBeInTheDocument()
  })
})

describe('CreateQuotePage', () => {
  it('une prestation ajoutée se recopie dans la ligne, avec son prix par défaut, et les totaux suivent', async () => {
    renderPage()

    await userEvent.selectOptions(screen.getByLabelText('Ajouter une prestation'), 's1')

    const line = screen.getByTestId('quote-line')
    expect(within(line).getByLabelText('Désignation')).toHaveValue('Taille de haie')
    expect(within(line).getByLabelText('Quantité')).toHaveValue('1')
    expect(within(line).getByLabelText('Prix unitaire HT (€)')).toHaveValue('12.5')
    expect(plain(screen.getByTestId('quote-subtotal').textContent)).toBe('12,50 €')
    expect(plain(screen.getByTestId('quote-vat-amount').textContent)).toBe('1,25 €')
    expect(plain(screen.getByTestId('quote-total').textContent)).toBe('13,75 €')
  })

  it('les totaux se recalculent à la frappe, centime près, avec la virgule française', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Ligne libre' }))
    const line = screen.getByTestId('quote-line')

    await userEvent.clear(within(line).getByLabelText('Quantité'))
    await userEvent.type(within(line).getByLabelText('Quantité'), '1,5')
    await userEvent.type(within(line).getByLabelText('Prix unitaire HT (€)'), '80')

    expect(plain(within(line).getByTestId('quote-line-total').textContent)).toBe('120,00 €')
    expect(plain(screen.getByTestId('quote-total').textContent)).toBe('132,00 €')

    await userEvent.type(screen.getByLabelText('TVA (%)'), '5,5')
    expect(plain(screen.getByTestId('quote-vat-amount').textContent)).toBe('6,60 €')
    expect(plain(screen.getByTestId('quote-total').textContent)).toBe('126,60 €')
  })

  it('sans client, rien n\'est envoyé et le champ le dit', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(screen.getByText('Choisissez un client')).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('une ligne sans prix bloque l\'envoi et le dit', async () => {
    renderPage()
    await pickClient()
    await userEvent.click(screen.getByRole('button', { name: 'Ligne libre' }))
    await userEvent.type(screen.getByLabelText('Désignation'), 'Déplacement')

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(screen.getByText(/Chaque ligne doit avoir une désignation/)).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('un taux de TVA au-delà de 100 % bloque l\'envoi', async () => {
    renderPage()
    await pickClient()
    await userEvent.type(screen.getByLabelText('TVA (%)'), '150')

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(create).not.toHaveBeenCalled()
  })

  it('envoie le client, les lignes (prestation et ligne libre) et rien de plus, puis ouvre le devis créé', async () => {
    renderPage()
    await pickClient()
    await userEvent.type(screen.getByLabelText('Objet du devis'), 'Haie du fond')
    await userEvent.selectOptions(screen.getByLabelText('Ajouter une prestation'), 's1')
    await userEvent.click(screen.getByRole('button', { name: 'Ligne libre' }))
    const lines = screen.getAllByTestId('quote-line')
    await userEvent.type(within(lines[1]).getByLabelText('Désignation'), 'Déplacement')
    await userEvent.type(within(lines[1]).getByLabelText('Prix unitaire HT (€)'), '30')

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({
      clientId: 'c1',
      title: 'Haie du fond',
      comment: null,
      validUntil: null,
      lines: [
        { serviceId: 's1', title: 'Taille de haie', description: 'Haie vive', unit: 'ml', quantity: 1, unitPrice: 12.5 },
        { title: 'Déplacement', description: undefined, unit: undefined, quantity: 1, unitPrice: 30 },
      ],
    })
    expect(toast.success).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/devis/q1', { replace: true })
  })

  it('une ligne supprimée ne part pas', async () => {
    renderPage()
    await pickClient()
    await userEvent.selectOptions(screen.getByLabelText('Ajouter une prestation'), 's1')
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer la ligne' }))

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(create.mock.calls[0][0].lines).toEqual([])
  })

  describe('franchise de TVA (ADR-033)', () => {
    beforeEach(() => {
      vi.mocked(useOrganization).mockReturnValue({ data: { defaultVatRate: 20, vatExempt: true } } as never)
    })

    it('le taux est 0 et ne se change pas ; la mention légale remplace la ligne de TVA', async () => {
      renderPage()
      await userEvent.selectOptions(screen.getByLabelText('Ajouter une prestation'), 's1')

      expect(screen.getByLabelText('TVA (%)')).toBeDisabled()
      expect(screen.getByLabelText('TVA (%)')).toHaveValue('0')
      expect(screen.queryByTestId('quote-vat-amount')).not.toBeInTheDocument()
      expect(plain(screen.getByTestId('quote-total').textContent)).toBe('12,50 €')
    })

    it('n\'envoie aucun taux : l\'API met 0', async () => {
      renderPage()
      await pickClient()

      await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

      expect(create.mock.calls[0][0]).not.toHaveProperty('vatRate')
    })
  })

  it('hors franchise, le taux se saisit comme avant', () => {
    renderPage()

    expect(screen.getByLabelText('TVA (%)')).toBeEnabled()
    expect(screen.getByLabelText('Valable jusqu\'au')).toBeInTheDocument()
  })

  it('une erreur de l\'API est dite avec sa traduction, sans quitter la page', async () => {
    create.mockRejectedValue(new ApiError(404, 'x', 'SERVICE_NOT_FOUND'))
    renderPage()
    await pickClient()

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(toast.error).toHaveBeenCalledWith('Cette prestation n\'existe plus.')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
