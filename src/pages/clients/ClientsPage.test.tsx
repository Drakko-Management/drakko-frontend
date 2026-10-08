import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useClients } from '@/hooks/use-clients'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions, EMPTY_PERMISSIONS } from '@/lib/permissions'
import { ClientsPage } from './ClientsPage'
import type { Client, Paginated } from '@/types/api'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/hooks/use-clients', () => ({
  useClients: vi.fn(),
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

describe('ClientsPage — bouton Nouveau', () => {
  // « Nouveau » existe deux fois : bouton de l'en-tête (desktop) et bouton flottant (mobile) ; happy-dom ignore
  // les classes responsive, les deux sont donc dans le DOM.
  // L'EmptyState affiche "Nouveau client" (t('clients.new_client')) → ne doit pas compter

  it('visible pour ADMIN (en-tête et bouton flottant)', () => {
    useAuthStore.setState({ role: 'ADMIN', permissions: null, accessToken: 'tok', username: 'admin', userId: 'u1' })
    renderClients()
    expect(screen.getAllByRole('button', { name: 'Nouveau' })).toHaveLength(2)
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
    expect(screen.getAllByRole('button', { name: 'Nouveau' })).toHaveLength(2)
  })

  it('absent pour MEMBER sans permission clients.create', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ clients: ['read'] }),
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderClients()
    // Seul le bouton exact "Nouveau" doit être absent (pas "Nouveau client" de l'EmptyState)
    expect(screen.queryByRole('button', { name: 'Nouveau' })).not.toBeInTheDocument()
  })

  it('absent pour MEMBER avec EMPTY_PERMISSIONS', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: EMPTY_PERMISSIONS,
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderClients()
    expect(screen.queryByRole('button', { name: 'Nouveau' })).not.toBeInTheDocument()
  })

  it('absent pour MEMBER sans permission clients:create', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: { chantiers: [], clients: [], equipe: [], prestations: [] }, accessToken: 'tok', username: 'f', userId: 'u3' })
    renderClients()
    expect(screen.queryByRole('button', { name: 'Nouveau' })).not.toBeInTheDocument()
  })
})

// ── Clic "Nouveau" ─────────────────────────────────────────────────────────

describe('ClientsPage — navigation', () => {
  it('cliquer Nouveau (en-tête) navigue vers /clients/nouveau', async () => {
    renderClients()
    const [header] = screen.getAllByRole('button', { name: 'Nouveau' })
    await userEvent.click(header)
    expect(mockNavigate).toHaveBeenCalledWith('/clients/nouveau')
  })

  it('le bouton flottant mobile mène aussi à /clients/nouveau', async () => {
    renderClients()
    const buttons = screen.getAllByRole('button', { name: 'Nouveau' })
    await userEvent.click(buttons[buttons.length - 1])
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
