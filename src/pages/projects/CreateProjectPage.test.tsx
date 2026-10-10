import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth.store'
import { CreateProjectPage } from './CreateProjectPage'
import type { Client } from '@/types/api'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
const mockCreateProject = vi.fn()
const mockCreateClient = vi.fn()
const mockUseClients = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/hooks/use-clients', () => ({
  useClients: (params: { search?: string }) => mockUseClients(params),
  useCreateClient: () => ({ mutateAsync: mockCreateClient, isPending: false }),
}))

vi.mock('@/hooks/use-projects', () => ({
  useCreateProject: () => ({ mutateAsync: mockCreateProject, isPending: false }),
  useNextProjectReference: () => ({ data: undefined }),
}))

vi.mock('@/hooks/use-organization', () => ({
  useOrganization: () => ({ data: { autoProjectReference: false } }),
}))

// La saisie d'adresse interroge un service externe : un simple champ suffit ici
vi.mock('@/components/common/AddressAutocomplete', () => ({
  AddressAutocomplete: ({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) => (
    <input placeholder={placeholder} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
  ),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// ── Fixtures ───────────────────────────────────────────────────────────────

const DUPONT: Client = {
  id: 'client-dupont',
  firstName: 'Paul',
  lastName: 'Dupont',
  email: 'paul@dupont.fr',
  phone: null,
  address: '3 rue Neuve, 69000 Lyon',
  notes: null,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const NEW_CLIENT: Client = { ...DUPONT, id: 'client-new', firstName: 'Zzz', lastName: 'inconnu', email: 'zzz@test.fr', address: '8 allée des Tilleuls, 38000 Grenoble' }

// Recherche simulée : seul « Dupont » existe ; sans texte, la liste propose Dupont
function clientsFor({ search }: { search?: string }) {
  const found = !search || /dupont/i.test(search) ? [DUPONT] : []
  return { data: { data: found, total: found.length, page: 1, limit: 8 }, isFetching: false }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseClients.mockImplementation(clientsFor)
  mockCreateProject.mockResolvedValue({ id: 'project-new' })
  mockCreateClient.mockResolvedValue(NEW_CLIENT)
  useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u1', permissions: null })
})

// ── Helpers ────────────────────────────────────────────────────────────────

function renderPage() {
  render(<MemoryRouter><CreateProjectPage /></MemoryRouter>)
}

const searchField = () => screen.getByPlaceholderText('Rechercher un client…')

async function typeInSearch(text: string) {
  await userEvent.type(searchField(), text)
  // la recherche attend 300 ms avant d'interroger le serveur
  await waitFor(() => expect(mockUseClients).toHaveBeenCalledWith(expect.objectContaining({ search: text })))
}

async function fillRequiredProjectFields() {
  await userEvent.type(document.getElementById('reference')!, 'CH-001')
  await userEvent.type(document.getElementById('title')!, 'Terrasse bois')
  await userEvent.type(screen.getByPlaceholderText('Numéro et rue'), '1 rue des Lilas')
}

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Créer le chantier' }))

// ── Client introuvable : créer depuis le formulaire ────────────────────────

describe('CreateProjectPage — client introuvable', () => {
  it('propose « Créer « … » » avec le texte tapé quand aucun client ne correspond', async () => {
    renderPage()

    await typeInSearch('Zzz inconnu')

    expect(await screen.findByText('Aucun client trouvé')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer « Zzz inconnu »' })).toBeInTheDocument()
  })

  it('n\'affiche « Créer » qu\'une fois la recherche terminée, jamais sur un résultat périmé', async () => {
    mockUseClients.mockReturnValue({ data: { data: [], total: 0, page: 1, limit: 8 }, isFetching: false })
    renderPage()

    await userEvent.type(searchField(), 'Zzz')
    // la recherche n'est pas encore partie (300 ms) : le résultat vide affiché est celui d'avant la saisie
    expect(screen.queryByRole('button', { name: /Créer «/ })).not.toBeInTheDocument()

    expect(await screen.findByRole('button', { name: 'Créer « Zzz »' })).toBeInTheDocument()
  })

  it('ne propose rien tant que des clients correspondent', async () => {
    renderPage()

    await typeInSearch('Dupont')

    expect(screen.getByRole('button', { name: /Dupont/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Créer «/ })).not.toBeInTheDocument()
  })

  it('propose « Nouveau client » quand l\'organisation n\'a encore aucun client', async () => {
    mockUseClients.mockReturnValue({ data: { data: [], total: 0, page: 1, limit: 8 }, isFetching: false })
    renderPage()

    await userEvent.click(searchField())

    expect(await screen.findByText('Aucun client trouvé')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nouveau client' })).toBeInTheDocument()
  })

  it('ouvre le formulaire de création de client, nom pré-rempli, sans quitter la page', async () => {
    renderPage()
    await typeInSearch('Zzz inconnu')

    await userEvent.click(await screen.findByRole('button', { name: 'Créer « Zzz inconnu »' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Nouveau client' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Prénom/)).toHaveValue('Zzz')
    expect(within(dialog).getByLabelText(/^Nom/)).toHaveValue('inconnu')
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('le formulaire du chantier n\'est pas soumis quand on valide la création du client', async () => {
    renderPage()
    await typeInSearch('Zzz inconnu')
    await userEvent.click(await screen.findByRole('button', { name: 'Créer « Zzz inconnu »' }))

    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'zzz@test.fr')
    await userEvent.type(within(dialog).getByPlaceholderText('Numéro et rue'), '8 allée des Tilleuls')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le client' }))

    expect(mockCreateClient).toHaveBeenCalledTimes(1)
    expect(mockCreateProject).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('sélectionne le client créé, ferme la fenêtre et reprend son adresse pour le chantier', async () => {
    renderPage()
    await typeInSearch('Zzz inconnu')
    await userEvent.click(await screen.findByRole('button', { name: 'Créer « Zzz inconnu »' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'zzz@test.fr')
    await userEvent.type(within(dialog).getByPlaceholderText('Numéro et rue'), '8 allée des Tilleuls')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le client' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Zzz inconnu')).toBeInTheDocument()
    expect(searchField).toThrow() // le champ de recherche est remplacé par le client choisi
    expect(screen.getByPlaceholderText('Numéro et rue')).toHaveValue('8 allée des Tilleuls')
  })

  it('crée ensuite le chantier avec l\'identifiant du client créé', async () => {
    renderPage()
    await typeInSearch('Zzz inconnu')
    await userEvent.click(await screen.findByRole('button', { name: 'Créer « Zzz inconnu »' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'zzz@test.fr')
    await userEvent.type(within(dialog).getByPlaceholderText('Numéro et rue'), '8 allée des Tilleuls')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le client' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await userEvent.type(document.getElementById('reference')!, 'CH-001')
    await userEvent.type(document.getElementById('title')!, 'Terrasse bois')
    await submit()

    expect(mockCreateProject).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'client-new', title: 'Terrasse bois' }))
    expect(mockNavigate).toHaveBeenCalledWith('/chantiers/project-new')
  })

  it('fermer la fenêtre garde le formulaire du chantier tel quel, sans client', async () => {
    renderPage()
    await userEvent.type(document.getElementById('title')!, 'Terrasse bois')
    await typeInSearch('Zzz inconnu')
    await userEvent.click(await screen.findByRole('button', { name: 'Créer « Zzz inconnu »' }))

    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fermer' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.getElementById('title')).toHaveValue('Terrasse bois')
    expect(searchField()).toHaveValue('Zzz inconnu')
  })
})

// ── Client manquant : champ surligné ───────────────────────────────────────

describe('CreateProjectPage — client manquant', () => {
  it('surligne le champ client, explique quoi faire et y place le curseur', async () => {
    renderPage()
    await fillRequiredProjectFields()

    await submit()

    expect(searchField()).toHaveAttribute('aria-invalid', 'true')
    expect(searchField()).toHaveClass('border-destructive')
    expect(searchField()).toHaveFocus()
    expect(screen.getByRole('alert')).toHaveTextContent('Choisissez un client dans la liste, ou créez-le')
    expect(toast.error).toHaveBeenCalledWith('Référence, titre, adresse et client sont obligatoires')
    expect(mockCreateProject).not.toHaveBeenCalled()
  })

  it('ne laisse pas la liste masquer le message, mais l\'ouvre au toucher', async () => {
    renderPage()
    await fillRequiredProjectFields()
    await submit()

    // le focus vient de la validation : la liste reste fermée, le message est lisible
    expect(screen.queryByRole('button', { name: /Dupont/ })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await userEvent.click(searchField())

    expect(await screen.findByRole('button', { name: /Dupont/ })).toBeInTheDocument()
  })

  it('un nom tapé sans être choisi dans la liste ne compte pas comme un client', async () => {
    renderPage()
    await fillRequiredProjectFields()
    await userEvent.type(searchField(), 'Zzz inconnu')

    await submit()

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(mockCreateProject).not.toHaveBeenCalled()
  })

  it('n\'affiche aucune erreur tant qu\'on n\'a pas essayé d\'envoyer', () => {
    renderPage()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(searchField()).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('l\'erreur disparaît dès qu\'un client est choisi', async () => {
    renderPage()
    await fillRequiredProjectFields()
    await submit()
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await userEvent.click(searchField())
    await userEvent.click(await screen.findByRole('button', { name: /Dupont/ }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ne réaffiche pas l\'erreur quand on retire ensuite le client choisi', async () => {
    renderPage()
    await fillRequiredProjectFields()
    await submit()
    await userEvent.click(searchField())
    await userEvent.click(await screen.findByRole('button', { name: /Dupont/ }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // la croix du client choisi : c'est le seul bouton sans nom du bloc client
    const chosen = screen.getByText('Paul Dupont').parentElement!
    await userEvent.click(within(chosen).getByRole('button'))

    expect(searchField()).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('choisir un client existant permet de créer le chantier', async () => {
    renderPage()
    await fillRequiredProjectFields()
    await userEvent.click(searchField())
    await userEvent.click(await screen.findByRole('button', { name: /Dupont/ }))

    await submit()

    expect(mockCreateProject).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'client-dupont' }))
    expect(toast.error).not.toHaveBeenCalled()
  })
})

// ── Erreur renvoyée par le serveur ─────────────────────────────────────────

describe('CreateProjectPage — erreur du serveur', () => {
  async function submitWithDupont() {
    renderPage()
    await userEvent.click(searchField())
    await userEvent.click(await screen.findByRole('button', { name: /Dupont/ }))
    await userEvent.type(document.getElementById('reference')!, 'CH-001')
    await userEvent.type(document.getElementById('title')!, 'Terrasse bois')
    await submit()
  }

  it('traduit le code CLIENT_NOT_FOUND', async () => {
    mockCreateProject.mockRejectedValue(new ApiError(404, 'Client introuvable', 'CLIENT_NOT_FOUND'))

    await submitWithDupont()

    expect(toast.error).toHaveBeenCalledWith('Client introuvable. Choisissez-en un autre ou créez-le.')
  })

  it('affiche le message générique pour une autre erreur, jamais le texte du serveur', async () => {
    mockCreateProject.mockRejectedValue(new ApiError(500, 'Internal server error'))

    await submitWithDupont()

    expect(toast.error).toHaveBeenCalledWith('Erreur lors de la création')
  })
})

// ── Dates : chacune limite l'autre ─────────────────────────────────────────

describe('CreateProjectPage — dates', () => {
  const startField = () => document.getElementById('startDate') as HTMLInputElement
  const endField = () => document.getElementById('expectedEndDate') as HTMLInputElement
  const pick = (field: HTMLInputElement, value: string) => fireEvent.change(field, { target: { value } })

  it('sans date saisie, seules les bornes générales (années à 4 chiffres) s\'appliquent', () => {
    renderPage()

    expect(startField()).toHaveAttribute('min', '1900-01-01')
    expect(startField()).toHaveAttribute('max', '2100-12-31')
    expect(endField()).toHaveAttribute('min', '1900-01-01')
    expect(endField()).toHaveAttribute('max', '2100-12-31')
  })

  it('la date de fin ne peut pas précéder la date de début : le calendrier grise les jours avant', () => {
    renderPage()

    pick(startField(), '2026-10-20')

    expect(endField()).toHaveAttribute('min', '2026-10-20')
    expect(startField()).toHaveAttribute('max', '2100-12-31')
  })

  it('la date de début ne peut pas suivre la date de fin : le calendrier grise les jours après', () => {
    renderPage()

    pick(endField(), '2026-11-05')

    expect(startField()).toHaveAttribute('max', '2026-11-05')
    expect(endField()).toHaveAttribute('min', '1900-01-01')
  })

  // Chrome réserve la place d'une année à 6 chiffres tant qu'un champ n'a pas de max : quand la date de fin
  // apparaît, le champ de début rétrécissait de 15 px et son icône de calendrier glissait avec lui
  it('chaque champ garde un max à tout moment : l\'icône du calendrier ne bouge pas quand l\'autre date est choisie', () => {
    renderPage()
    const maxes = () => [startField().getAttribute('max'), endField().getAttribute('max')]
    expect(maxes()).not.toContain(null)

    pick(startField(), '2026-10-10')
    expect(maxes()).not.toContain(null)

    pick(endField(), '2026-10-24')
    expect(maxes()).not.toContain(null)

    pick(endField(), '')
    expect(maxes()).not.toContain(null)
  })

  it('les deux contraintes se posent ensemble', () => {
    renderPage()

    pick(startField(), '2026-10-20')
    pick(endField(), '2026-11-05')

    expect(startField()).toHaveAttribute('max', '2026-11-05')
    expect(endField()).toHaveAttribute('min', '2026-10-20')
  })

  it('effacer une date lève la contrainte posée sur l\'autre', () => {
    renderPage()
    pick(startField(), '2026-10-20')
    expect(endField()).toHaveAttribute('min', '2026-10-20')

    pick(startField(), '')

    expect(endField()).toHaveAttribute('min', '1900-01-01')
  })
})
