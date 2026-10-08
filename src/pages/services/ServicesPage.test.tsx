import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useDeactivateService,
  useActivateService,
  useSeedServices,
} from '@/hooks/use-services'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions, EMPTY_PERMISSIONS, FULL_PERMISSIONS } from '@/lib/permissions'
import { ServicesPage } from './ServicesPage'
import type { Service } from '@/types/api'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/hooks/use-services', () => ({
  useServices: vi.fn(),
  useCreateService: vi.fn(),
  useUpdateService: vi.fn(),
  useDeleteService: vi.fn(),
  useDeactivateService: vi.fn(),
  useActivateService: vi.fn(),
  useSeedServices: vi.fn(),
}))

// ── Fixtures ───────────────────────────────────────────────────────────────

const SERVICE_ACTIVE: Service = {
  id: 'svc-1',
  title: 'Tonte de pelouse',
  description: 'Tonte hebdomadaire',
  unit: 'm²',
  defaultPrice: null,
  order: 0,
  active: true,
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const SERVICE_INACTIVE: Service = {
  ...SERVICE_ACTIVE,
  id: 'svc-2',
  title: 'Taille de haies',
  active: false,
}

function mockMutation(overrides = {}) {
  return { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, ...overrides }
}

// ── Reset ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useServices).mockReturnValue({ data: [SERVICE_ACTIVE], isLoading: false } as any)
  vi.mocked(useCreateService).mockReturnValue(mockMutation() as never)
  vi.mocked(useUpdateService).mockReturnValue(mockMutation() as never)
  vi.mocked(useDeleteService).mockReturnValue(mockMutation() as never)
  vi.mocked(useDeactivateService).mockReturnValue(mockMutation() as never)
  vi.mocked(useActivateService).mockReturnValue(mockMutation() as never)
  vi.mocked(useSeedServices).mockReturnValue(mockMutation() as never)

  useAuthStore.setState({
    accessToken: 'tok',
    username: 'admin',
    role: 'ADMIN',
    userId: 'u1',
    permissions: null,
  })
})

// ── Helpers ────────────────────────────────────────────────────────────────

function renderServices() {
  return render(
    <MemoryRouter>
      <ServicesPage />
    </MemoryRouter>,
  )
}

// ── Rendu de base ──────────────────────────────────────────────────────────

describe('ServicesPage — rendu', () => {
  it('affiche le titre Prestations', () => {
    renderServices()
    expect(screen.getByText('Prestations')).toBeInTheDocument()
  })

  it('affiche le champ de recherche', () => {
    renderServices()
    expect(screen.getByPlaceholderText(/rechercher/i)).toBeInTheDocument()
  })

  it('affiche la carte d\'une prestation active', () => {
    renderServices()
    expect(screen.getByText('Tonte de pelouse')).toBeInTheDocument()
  })

  it('affiche l\'unité de la prestation', () => {
    renderServices()
    expect(screen.getByText('m²')).toBeInTheDocument()
  })
})

// ── Bouton "Ajouter" — permissions ─────────────────────────────────────────

describe('ServicesPage — bouton Ajouter (RBAC)', () => {
  it('visible pour ADMIN (vue active)', () => {
    renderServices()
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument()
  })

  it('visible pour MEMBER avec prestations.create', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ prestations: ['read', 'create'] }),
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderServices()
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument()
  })

  it('absent pour MEMBER sans permission prestations.create', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ prestations: ['read'] }),
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderServices()
    expect(screen.queryByRole('button', { name: 'Ajouter' })).not.toBeInTheDocument()
  })

  it('absent pour MEMBER avec EMPTY_PERMISSIONS', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: EMPTY_PERMISSIONS,
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderServices()
    expect(screen.queryByRole('button', { name: 'Ajouter' })).not.toBeInTheDocument()
  })
})

// ── ServiceCard — boutons modifier et supprimer (permissions) ──────────────

describe('ServicesPage — ServiceCard (RBAC)', () => {
  it('affiche le bouton Modifier quand ADMIN (can update)', () => {
    renderServices()
    expect(screen.getByLabelText('Modifier')).toBeInTheDocument()
  })

  it('affiche le bouton Supprimer quand ADMIN (can delete)', () => {
    renderServices()
    expect(screen.getByLabelText('Supprimer')).toBeInTheDocument()
  })

  it('absent pour MEMBER sans permission prestations.update', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ prestations: ['read'] }),
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderServices()
    expect(screen.queryByLabelText('Modifier')).not.toBeInTheDocument()
  })

  it('absent pour MEMBER sans permission prestations.delete', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ prestations: ['read', 'update'] }),
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderServices()
    expect(screen.queryByLabelText('Supprimer')).not.toBeInTheDocument()
  })

  it('affiche les 2 boutons pour MEMBER avec FULL_PERMISSIONS', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: FULL_PERMISSIONS,
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderServices()
    expect(screen.getByLabelText('Modifier')).toBeInTheDocument()
    expect(screen.getByLabelText('Supprimer')).toBeInTheDocument()
  })

  it('affiche le bouton Désactiver (canUpdate) pour une prestation active', () => {
    renderServices()
    expect(screen.getByLabelText('Désactiver')).toBeInTheDocument()
  })
})

// ── Création (page dédiée) ─────────────────────────────────────────────────

describe('ServicesPage — ajout', () => {
  it('cliquer Ajouter navigue vers la page de création', async () => {
    renderServices()
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(mockNavigate).toHaveBeenCalledWith('/prestations/nouveau')
  })

  it('le bouton flottant mobile mène à la même page', async () => {
    renderServices()
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau' }))
    expect(mockNavigate).toHaveBeenCalledWith('/prestations/nouveau')
  })
})

// ── Formulaire de modification ─────────────────────────────────────────────

describe('ServicesPage — modal de modification', () => {
  it('cliquer Modifier ouvre le formulaire avec les données de la prestation', async () => {
    renderServices()
    await userEvent.click(screen.getByLabelText('Modifier'))
    expect(screen.getByText('Modifier la prestation')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Tonte de pelouse')).toBeInTheDocument()
  })
})

// ── État vide / chargement ─────────────────────────────────────────────────

describe('ServicesPage — états vide et chargement', () => {
  it('affiche des skeletons pendant le chargement', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useServices).mockReturnValue({ data: undefined, isLoading: true } as any)
    renderServices()
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('affiche le bouton d\'import pour un ADMIN quand la liste est vide', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useServices).mockReturnValue({ data: [], isLoading: false } as any)
    renderServices()
    expect(screen.getByText('Importer les prestations par défaut')).toBeInTheDocument()
  })

  it('masque le bouton d\'import pour un MEMBER quand la liste est vide', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useServices).mockReturnValue({ data: [], isLoading: false } as any)
    useAuthStore.setState({
      accessToken: 'tok',
      username: 'user',
      firstName: 'Marie',
      lastName: '',
      role: 'MEMBER',
      userId: 'u2',
      permissions: null,
    })
    renderServices()
    expect(screen.queryByText('Importer les prestations par défaut')).not.toBeInTheDocument()
  })
})

// ── Vue inactive ───────────────────────────────────────────────────────────

describe('ServicesPage — vue inactive', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useServices).mockReturnValue({
      data: [SERVICE_ACTIVE, SERVICE_INACTIVE],
      isLoading: false,
    } as any)
  })

  it('affiche le lien "Voir les désactivées" quand il y en a', () => {
    renderServices()
    expect(screen.getByText(/Voir les désactivées/i)).toBeInTheDocument()
  })

  it('cliquer sur "Voir les désactivées" affiche la prestation inactive', async () => {
    renderServices()
    await userEvent.click(screen.getByText(/Voir les désactivées/i))
    expect(screen.getByText('Taille de haies')).toBeInTheDocument()
  })

  it('en vue inactive, affiche le bouton retour et masque Ajouter', async () => {
    renderServices()
    await userEvent.click(screen.getByText(/Voir les désactivées/i))
    // services.view_active = "← Actives ({{count}})" → "← Actives (1)"
    expect(screen.getByRole('button', { name: /← Actives/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ajouter' })).not.toBeInTheDocument()
  })
})
