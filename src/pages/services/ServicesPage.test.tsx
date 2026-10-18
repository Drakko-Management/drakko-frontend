import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useDeleteServices,
  useSetServicesActive,
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

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
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
  useDeleteServices: vi.fn(),
  useSetServicesActive: vi.fn(),
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
   
  vi.mocked(useServices).mockReturnValue({ data: [SERVICE_ACTIVE], isLoading: false } as unknown as ReturnType<typeof useServices>)
  vi.mocked(useCreateService).mockReturnValue(mockMutation() as never)
  vi.mocked(useUpdateService).mockReturnValue(mockMutation() as never)
  vi.mocked(useDeleteService).mockReturnValue(mockMutation() as never)
  vi.mocked(useSetServicesActive).mockReturnValue(mockMutation({ mutateAsync: vi.fn().mockResolvedValue({ updated: 1 }) }) as never)
  vi.mocked(useDeleteServices).mockReturnValue(mockMutation({ mutateAsync: vi.fn().mockResolvedValue({ deleted: 2, deactivated: 0 }) }) as never)
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

// ── Bouton « Nouvelle prestation » — permissions ─────────────────────────────────────────

describe('ServicesPage — bouton Ajouter (RBAC)', () => {
  it('visible pour ADMIN (vue active)', () => {
    renderServices()
    expect(screen.getByRole('button', { name: 'Nouvelle prestation' })).toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: 'Nouvelle prestation' })).toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: 'Nouvelle prestation' })).not.toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: 'Nouvelle prestation' })).not.toBeInTheDocument()
  })
})

// ── ServiceCard — boutons modifier et supprimer (permissions) ──────────────

describe('ServicesPage — ServiceCard (RBAC)', () => {
  it('ADMIN (can update) : un tap sur la carte ouvre la modification', async () => {
    renderServices()
    await userEvent.click(screen.getByText('Tonte de pelouse'))
    expect(mockNavigate).toHaveBeenCalledWith('/prestations/svc-1/modifier')
  })

  it('affiche le bouton Supprimer quand ADMIN (can delete)', () => {
    renderServices()
    expect(screen.getByLabelText('Supprimer')).toBeInTheDocument()
  })

  it('sans permission prestations.update, un tap sur la carte ne mène nulle part', async () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ prestations: ['read'] }),
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderServices()
    await userEvent.click(screen.getByText('Tonte de pelouse'))
    expect(mockNavigate).not.toHaveBeenCalled()
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
    expect(screen.getByLabelText('Désactiver')).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: 'Nouvelle prestation' }))
    expect(mockNavigate).toHaveBeenCalledWith('/prestations/nouveau')
  })

  it('le bouton flottant mobile mène à la même page', async () => {
    renderServices()
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau' }))
    expect(mockNavigate).toHaveBeenCalledWith('/prestations/nouveau')
  })
})

// ── Formulaire de modification ─────────────────────────────────────────────

describe('ServicesPage — modification sur une page', () => {
  it('plus de crayon : la carte entière ouvre la page de modification', async () => {
    renderServices()
    expect(screen.queryByLabelText('Modifier')).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('Tonte de pelouse'))
    expect(mockNavigate).toHaveBeenCalledWith('/prestations/svc-1/modifier')
  })
})

// ── État vide / chargement ─────────────────────────────────────────────────

describe('ServicesPage — états vide et chargement', () => {
  it('affiche des skeletons pendant le chargement', () => {
     
    vi.mocked(useServices).mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<typeof useServices>)
    renderServices()
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('affiche le bouton d\'import pour un ADMIN quand la liste est vide', () => {
     
    vi.mocked(useServices).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof useServices>)
    renderServices()
    expect(screen.getByText('Importer les prestations par défaut')).toBeInTheDocument()
  })

  it('masque le bouton d\'import pour un MEMBER quand la liste est vide', () => {
     
    vi.mocked(useServices).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof useServices>)
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
     
    vi.mocked(useServices).mockReturnValue({
      data: [SERVICE_ACTIVE, SERVICE_INACTIVE],
      isLoading: false,
    } as unknown as ReturnType<typeof useServices>)
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
    expect(screen.getByText(/← Actives/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nouvelle prestation' })).not.toBeInTheDocument()
  })
})


// ── Suppression en masse ───────────────────────────────────────────────────

describe('ServicesPage — suppression en masse', () => {
  const SERVICE_THIRD: Service = { ...SERVICE_ACTIVE, id: 'svc-3', title: 'Arrosage' }

  beforeEach(() => {
    vi.mocked(useServices).mockReturnValue({
      data: [SERVICE_ACTIVE, SERVICE_THIRD],
      isLoading: false,
    } as unknown as ReturnType<typeof useServices>)
  })

  it('« Tout sélectionner » coche toutes les prestations et compte la sélection', async () => {
    const user = userEvent.setup()
    renderServices()

    await user.click(screen.getByRole('button', { name: /sélection multiple/i }))
    await user.click(screen.getByRole('checkbox', { name: /tout sélectionner/i }))

    expect(screen.getByRole('button', { name: /supprimer \(2\)/i })).toBeEnabled()
  })

  it('demande confirmation avant de supprimer, puis envoie les identifiants choisis', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue({ deleted: 1, deactivated: 0 })
    vi.mocked(useDeleteServices).mockReturnValue(mockMutation({ mutateAsync }) as never)
    renderServices()

    await user.click(screen.getByRole('button', { name: /sélection multiple/i }))
    await user.click(screen.getByRole('checkbox', { name: /Arrosage/ }))
    await user.click(screen.getByRole('button', { name: /supprimer \(1\)/i }))

    expect(mutateAsync).not.toHaveBeenCalled()
    expect(screen.getByText(/cette action est définitive/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /supprimer 1 prestation/i }))
    expect(mutateAsync).toHaveBeenCalledWith(['svc-3'])
  })

  it("n'envoie rien quand on annule la confirmation", async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn()
    vi.mocked(useDeleteServices).mockReturnValue(mockMutation({ mutateAsync }) as never)
    renderServices()

    await user.click(screen.getByRole('button', { name: /sélection multiple/i }))
    await user.click(screen.getByRole('checkbox', { name: /tout sélectionner/i }))
    await user.click(screen.getByRole('button', { name: /supprimer \(2\)/i }))
    await user.click(screen.getByRole('button', { name: 'Annuler', hidden: false }))

    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('désactive en masse la sélection, sans confirmation (réversible)', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue({ updated: 1 })
    vi.mocked(useSetServicesActive).mockReturnValue(mockMutation({ mutateAsync }) as never)
    renderServices()

    await user.click(screen.getByRole('button', { name: /sélection multiple/i }))
    await user.click(screen.getByRole('checkbox', { name: /Arrosage/ }))
    await user.click(screen.getByRole('button', { name: /désactiver \(1\)/i }))

    expect(mutateAsync).toHaveBeenCalledWith({ serviceIds: ['svc-3'], active: false })
  })

  it('réactive la sélection depuis la vue des désactivées', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue({ updated: 1 })
    vi.mocked(useSetServicesActive).mockReturnValue(mockMutation({ mutateAsync }) as never)
    vi.mocked(useServices).mockReturnValue({
      data: [SERVICE_ACTIVE, SERVICE_INACTIVE],
      isLoading: false,
    } as unknown as ReturnType<typeof useServices>)
    renderServices()

    await user.click(screen.getByRole('button', { name: /voir les désactivées/i }))
    await user.click(screen.getByRole('button', { name: /sélection multiple/i }))
    await user.click(screen.getByRole('checkbox', { name: /tout sélectionner/i }))
    await user.click(screen.getByRole('button', { name: /^activer \(1\)/i }))

    expect(mutateAsync).toHaveBeenCalledWith({ serviceIds: ['svc-2'], active: true })
  })

  it('sans droit de suppression, pas de sélection', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ prestations: ['read'] }) })
    renderServices()
    expect(screen.queryByRole('button', { name: /sélection multiple/i })).not.toBeInTheDocument()
  })
})
