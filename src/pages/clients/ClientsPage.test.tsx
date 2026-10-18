import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { useClients, useDeleteClient, useSetClientActive } from '@/hooks/use-clients'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions, EMPTY_PERMISSIONS } from '@/lib/permissions'
import { ClientsPage } from './ClientsPage'
import type { Client, Paginated } from '@/types/api'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/hooks/use-clients', () => ({
  useClients: vi.fn(),
  useDeleteClient: vi.fn(),
  useSetClientActive: vi.fn(),
}))

// ── Fixtures ───────────────────────────────────────────────────────────────

const CLIENT: Client = {
  id: 'client-1',
  firstName: 'Pierre',
  lastName: 'Durand',
  email: 'pierre@test.com',
  phone: '0600000000',
  address: null,
  notes: null,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function paginated(items: Client[]): Paginated<Client> {
  return { data: items, total: items.length, page: 1, limit: 20 }
}

// ── Reset ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useClients).mockReturnValue({ data: paginated([]), isLoading: false } as any)
  vi.mocked(useSetClientActive).mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false } as never)
  vi.mocked(useDeleteClient).mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({ result: 'deleted' }), isPending: false } as never)
  useAuthStore.setState({
    accessToken: 'tok',
    username: 'admin',
    role: 'ADMIN',
    userId: 'u1',
    permissions: null,
  })
})

// ── Helpers ────────────────────────────────────────────────────────────────

function renderClients() {
  return render(
    <MemoryRouter>
      <ClientsPage />
    </MemoryRouter>,
  )
}

// ── Rendu de base ──────────────────────────────────────────────────────────

describe('ClientsPage — rendu', () => {
  it('affiche le titre Clients', () => {
    renderClients()
    expect(screen.getByRole('heading', { name: 'Clients' })).toBeInTheDocument()
  })

  it('affiche le champ de recherche', () => {
    renderClients()
    expect(screen.getByPlaceholderText('Rechercher un client…')).toBeInTheDocument()
  })

  it('affiche le sélecteur de tri', () => {
    renderClients()
    expect(screen.getByRole('combobox', { name: 'A → Z' })).toBeInTheDocument()
  })
})

// ── Bouton "Nouveau" — permissions ─────────────────────────────────────────

describe('ClientsPage — bouton Nouveau client', () => {
  // L'en-tête (desktop) s'appelle « Nouveau client » ; le bouton flottant (mobile) « Nouveau ». happy-dom ignore
  // les classes responsive : les deux sont dans le DOM. Avec une liste remplie, l'EmptyState n'ajoute pas le sien.
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useClients).mockReturnValue({ data: paginated([CLIENT]), isLoading: false } as any)
  })

  it('visible pour ADMIN (en-tête et bouton flottant)', () => {
    useAuthStore.setState({ role: 'ADMIN', permissions: null, accessToken: 'tok', username: 'admin', userId: 'u1' })
    renderClients()
    expect(screen.getByRole('button', { name: 'Nouveau client' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nouveau' })).toBeInTheDocument()
  })

  it('visible pour MEMBER avec clients.create', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ clients: ['read', 'create'] }),
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderClients()
    expect(screen.getByRole('button', { name: 'Nouveau client' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nouveau' })).toBeInTheDocument()
  })

  it.each([
    ['MEMBER sans permission clients.create', makePermissions({ clients: ['read'] })],
    ['MEMBER avec EMPTY_PERMISSIONS', EMPTY_PERMISSIONS],
  ])('absent pour %s', (_label, permissions) => {
    useAuthStore.setState({ role: 'MEMBER', permissions, accessToken: 'tok', username: 'user', userId: 'u2' })
    renderClients()
    expect(screen.queryByRole('button', { name: 'Nouveau client' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nouveau' })).not.toBeInTheDocument()
  })
})

// ── Clic "Nouveau" ─────────────────────────────────────────────────────────

describe('ClientsPage — navigation', () => {
  it('cliquer Nouveau (en-tête) navigue vers /clients/nouveau', async () => {
    renderClients()
    const header = screen.getAllByRole('button', { name: 'Nouveau client' })[0]
    await userEvent.click(header)
    expect(mockNavigate).toHaveBeenCalledWith('/clients/nouveau')
  })

  it('le bouton flottant mobile mène aussi à /clients/nouveau', async () => {
    renderClients()
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau' }))
    expect(mockNavigate).toHaveBeenCalledWith('/clients/nouveau')
  })

  it('cliquer sur un client navigue vers /clients/:id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useClients).mockReturnValue({ data: paginated([CLIENT]), isLoading: false } as any)
    renderClients()
    await userEvent.click(screen.getByText('Pierre Durand'))
    expect(mockNavigate).toHaveBeenCalledWith('/clients/client-1')
  })
})

// ── Liste des clients ──────────────────────────────────────────────────────

describe('ClientsPage — liste', () => {
  it('affiche le nom complet du client', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useClients).mockReturnValue({ data: paginated([CLIENT]), isLoading: false } as any)
    renderClients()
    expect(screen.getByText('Pierre Durand')).toBeInTheDocument()
  })

  it('affiche l\'email du client', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useClients).mockReturnValue({ data: paginated([CLIENT]), isLoading: false } as any)
    renderClients()
    // Email + phone sont dans le même <p> : "pierre@test.com · 0600000000"
    expect(screen.getByText(/pierre@test\.com/)).toBeInTheDocument()
  })

  it('affiche 4 skeletons pendant le chargement', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useClients).mockReturnValue({ data: undefined, isLoading: true } as any)
    renderClients()
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(4)
  })

  it('affiche l\'état vide quand la liste est vide', () => {
    renderClients()
    expect(screen.getByText('Aucun client')).toBeInTheDocument()
  })
})

// ── Recherche ──────────────────────────────────────────────────────────────

describe('ClientsPage — recherche', () => {
  it('appelle useClients avec search quand l\'utilisateur tape', async () => {
    renderClients()
    await userEvent.type(screen.getByPlaceholderText('Rechercher un client…'), 'Pierre')
    await waitFor(() => {
      expect(vi.mocked(useClients)).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Pierre' }),
      )
    })
  })
})

// ── Masquer et supprimer depuis la liste ───────────────────────────────────

describe('ClientsPage — masquer et supprimer', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useClients).mockReturnValue({ data: paginated([CLIENT]), isLoading: false } as any)
  })

  it('l\'œil désactive le client sans confirmation (réversible)', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useSetClientActive).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderClients()

    await userEvent.click(screen.getByLabelText('Désactiver'))

    expect(mutateAsync).toHaveBeenCalledWith({ id: 'client-1', active: false })
  })

  it('un client désactivé se réactive avec l\'œil', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useSetClientActive).mockReturnValue({ mutateAsync, isPending: false } as never)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useClients).mockReturnValue({ data: paginated([{ ...CLIENT, active: false }]), isLoading: false } as any)
    renderClients()

    await userEvent.click(screen.getByLabelText('Activer'))

    expect(mutateAsync).toHaveBeenCalledWith({ id: 'client-1', active: true })
  })

  it('la corbeille avertit d\'abord, et ne supprime rien avant la confirmation', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ result: 'deleted' })
    vi.mocked(useDeleteClient).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderClients()

    await userEvent.click(screen.getByLabelText('Supprimer'))
    expect(screen.getByText(/supprimé définitivement/i)).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(mutateAsync).toHaveBeenCalledWith('client-1')
  })

  it('un client qui a des chantiers est seulement désactivé : le message le dit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ result: 'deactivated' })
    vi.mocked(useDeleteClient).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderClients()

    await userEvent.click(screen.getByLabelText('Supprimer'))
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/encore des chantiers/i)))
  })

  it('« Voir les clients désactivés » interroge les clients inactifs', async () => {
    renderClients()

    await userEvent.click(screen.getByText('Voir les clients désactivés'))

    const calls = vi.mocked(useClients).mock.calls
    expect(calls[calls.length - 1]?.[0]).toMatchObject({ active: false })
  })

  it("vue des désactivés vide : un simple message, pas l'invitation à créer un premier client", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useClients).mockReturnValue({ data: paginated([]), isLoading: false } as any)
    renderClients()

    await userEvent.click(screen.getByText('Voir les clients désactivés'))

    expect(screen.getByText('Aucun client désactivé')).toBeInTheDocument()
    expect(screen.queryByText('Créez votre premier client')).not.toBeInTheDocument()
    expect(screen.queryByText('Aucun client')).not.toBeInTheDocument()
  })

  it('sans droit de mise à jour ni de suppression : ni œil ni corbeille', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ clients: ['read'] }) })
    renderClients()
    expect(screen.queryByLabelText('Désactiver')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Supprimer')).not.toBeInTheDocument()
  })
})
