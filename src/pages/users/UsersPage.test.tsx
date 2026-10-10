import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/use-users'
import { useRoles } from '@/hooks/use-roles'
import { useAuthStore } from '@/store/auth.store'
import { ApiError } from '@/lib/api-client'
import { makePermissions } from '@/lib/permissions'
import { UsersPage } from './UsersPage'
import type { User } from '@/types/api'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/hooks/use-users', () => ({
  useUsers: vi.fn(),
  useCreateUser: vi.fn(),
  useUpdateUser: vi.fn(),
}))

vi.mock('@/hooks/use-roles', () => ({
  useRoles: vi.fn(),
  useCreateRole: vi.fn(),
  useUpdateRole: vi.fn(),
  useDeleteRole: vi.fn(),
}))

// ── Fixtures ───────────────────────────────────────────────────────────────

const USER_ACTIVE: User = {
  id: 'u1',
  username: 'jean.dupont',
  email: 'jean@test.com',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'MEMBER',
  customRoleId: null,
  active: true,
  navSlots: [],
  language: 'fr',
  theme: 'light',
  accentColor: '#000',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const USER_INACTIVE: User = {
  ...USER_ACTIVE,
  id: 'u2',
  username: 'marie.martin',
  firstName: 'Marie',
  lastName: 'Martin',
  active: false,
}

function mockMutation(overrides = {}) {
  return { mutateAsync: vi.fn(), isPending: false, ...overrides }
}

// Routeur réel avec des pages repères : on vérifie la destination de la navigation, pas un appel simulé
function renderUsers() {
  return render(
    <MemoryRouter initialEntries={['/utilisateurs']}>
      <Routes>
        <Route path="/utilisateurs" element={<UsersPage />} />
        <Route path="/utilisateurs/nouveau" element={<p>Page création membre</p>} />
        <Route path="/utilisateurs/roles/nouveau" element={<p>Page création rôle</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

// ── Reset ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u0', permissions: null })
   
  vi.mocked(useUsers).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof useUsers>)
   
  vi.mocked(useRoles).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof useRoles>)
  vi.mocked(useCreateUser).mockReturnValue(mockMutation() as never)
  vi.mocked(useUpdateUser).mockReturnValue(mockMutation() as never)
})

// ── Rendu de base ──────────────────────────────────────────────────────────

describe('UsersPage — rendu', () => {
  it('affiche le titre Utilisateurs', () => {
    renderUsers()
    expect(screen.getByRole('heading', { name: 'Utilisateurs' })).toBeInTheDocument()
  })

  it('affiche le bouton Nouveau (en-tête et bouton flottant mobile)', () => {
    renderUsers()
    // happy-dom ignore les classes responsive : les deux boutons sont dans le DOM
    expect(screen.getAllByRole('button', { name: /nouveau/i })).toHaveLength(2)
  })

  it('ADMIN : affiche les onglets Membres et Rôles', () => {
    renderUsers()
    expect(screen.getByRole('button', { name: 'Membres' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rôles' })).toBeInTheDocument()
  })

  it('MEMBER : n\'affiche pas l\'onglet Rôles', () => {
    useAuthStore.setState({ accessToken: 'tok', username: 'member', role: 'MEMBER', userId: 'u1', permissions: { chantiers: [], clients: [], equipe: ['read'], prestations: [] } })
    renderUsers()
    expect(screen.queryByRole('button', { name: 'Rôles' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Membres' })).not.toBeInTheDocument()
  })

  it('l\'onglet Membres est actif par défaut', () => {
    renderUsers()
    const membresTab = screen.getByRole('button', { name: 'Membres' })
    expect(membresTab.className).toContain('bg-background')
  })
})

// ── Onglets ────────────────────────────────────────────────────────────────

describe('UsersPage — navigation par onglets', () => {
  it('cliquer sur "Rôles" affiche le contenu des rôles', async () => {
    renderUsers()
    await userEvent.click(screen.getByRole('button', { name: 'Rôles' }))
    // RolesTab renders "Aucun rôle configuré" when empty
    await waitFor(() => {
      expect(screen.getByText('Aucun rôle configuré')).toBeInTheDocument()
    })
  })

  it('cliquer sur "Membres" après "Rôles" revient à la liste des membres', async () => {
    renderUsers()
    await userEvent.click(screen.getByRole('button', { name: 'Rôles' }))
    await userEvent.click(screen.getByRole('button', { name: 'Membres' }))
    // State vide → EmptyState "Aucun utilisateur"
    await waitFor(() => {
      expect(screen.getByText('Aucun utilisateur')).toBeInTheDocument()
    })
  })
})

// ── Création (pages dédiées) ───────────────────────────────────────────────

describe('UsersPage — bouton Nouveau', () => {
  it('sur l\'onglet Membres, le bouton de l\'en-tête s\'appelle « Nouveau membre » et ouvre la création d\'un membre', async () => {
    renderUsers()
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau membre' }))
    expect(screen.getByText('Page création membre')).toBeInTheDocument()
  })

  it('sur l\'onglet Rôles, le bouton de l\'en-tête s\'appelle « Nouveau rôle » et ouvre la création d\'un rôle', async () => {
    renderUsers()
    await userEvent.click(screen.getByRole('button', { name: 'Rôles' }))
    expect(screen.queryByRole('button', { name: 'Nouveau membre' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau rôle' }))
    expect(screen.getByText('Page création rôle')).toBeInTheDocument()
  })

  it('le bouton flottant mobile mène à la même page que le bouton de l\'en-tête', async () => {
    renderUsers()
    const buttons = screen.getAllByRole('button', { name: 'Nouveau' })
    await userEvent.click(buttons[buttons.length - 1])
    expect(screen.getByText('Page création membre')).toBeInTheDocument()
  })

  it('MEMBER avec equipe.create : boutons Nouveau visibles', () => {
    useAuthStore.setState({ accessToken: 'tok', username: 'member', role: 'MEMBER', userId: 'u1', permissions: makePermissions({ equipe: ['read', 'create'] }) })
    renderUsers()
    expect(screen.getByRole('button', { name: 'Nouveau membre' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nouveau' })).toBeInTheDocument()   // bouton flottant mobile
  })

  it('MEMBER avec equipe.read seulement : aucun bouton Nouveau', () => {
    useAuthStore.setState({ accessToken: 'tok', username: 'member', role: 'MEMBER', userId: 'u1', permissions: makePermissions({ equipe: ['read'] }) })
    renderUsers()
    expect(screen.queryByRole('button', { name: 'Nouveau' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nouveau membre' })).not.toBeInTheDocument()
  })
})

// ── Liste des membres actifs ────────────────────────────────────────────────

describe('UsersPage — liste des membres', () => {
  it('affiche le nom complet de l\'utilisateur actif', () => {
     
    vi.mocked(useUsers).mockReturnValue({ data: [USER_ACTIVE], isLoading: false } as unknown as ReturnType<typeof useUsers>)
    renderUsers()
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
  })

  it('affiche le username', () => {
     
    vi.mocked(useUsers).mockReturnValue({ data: [USER_ACTIVE], isLoading: false } as unknown as ReturnType<typeof useUsers>)
    renderUsers()
    expect(screen.getByText(/@jean\.dupont/)).toBeInTheDocument()
  })

  it('affiche la section "Comptes inactifs" pour les utilisateurs inactifs', () => {
     
    vi.mocked(useUsers).mockReturnValue({
      data: [USER_ACTIVE, USER_INACTIVE],
      isLoading: false,
    } as unknown as ReturnType<typeof useUsers>)
    renderUsers()
    expect(screen.getByText('Comptes inactifs')).toBeInTheDocument()
    expect(screen.getByText('Marie Martin')).toBeInTheDocument()
  })

  it('affiche 3 skeletons pendant le chargement', () => {
     
    vi.mocked(useUsers).mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<typeof useUsers>)
    renderUsers()
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('affiche l\'état vide quand aucun utilisateur', () => {
    renderUsers()
    expect(screen.getByText('Aucun utilisateur')).toBeInTheDocument()
  })
})

// ── Expansion d'un utilisateur ─────────────────────────────────────────────

describe('UsersPage — expansion d\'un utilisateur', () => {
  beforeEach(() => {
     
    vi.mocked(useUsers).mockReturnValue({ data: [USER_ACTIVE], isLoading: false } as unknown as ReturnType<typeof useUsers>)
  })

  it('cliquer sur un utilisateur ouvre le formulaire d\'édition', async () => {
    renderUsers()
    await userEvent.click(screen.getByText('Jean Dupont'))
    expect(screen.getByDisplayValue('Jean')).toBeInTheDocument()         // prénom
    expect(screen.getByDisplayValue('Dupont')).toBeInTheDocument()       // nom
    expect(screen.getByDisplayValue('jean.dupont')).toBeInTheDocument()  // username
  })

  it('le formulaire d\'édition contient le champ identifiant pré-rempli', async () => {
    renderUsers()
    await userEvent.click(screen.getByText('Jean Dupont'))
    expect(screen.getByDisplayValue('jean.dupont')).toBeInTheDocument()
  })

  it('enregistrer inclut le username dans la mutation', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useUpdateUser).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderUsers()
    await userEvent.click(screen.getByText('Jean Dupont'))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'jean.dupont' }),
    )
  })

  it('affiche le bouton Enregistrer dans le panneau ouvert', async () => {
    renderUsers()
    await userEvent.click(screen.getByText('Jean Dupont'))
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('affiche le bouton désactiver pour un utilisateur actif', async () => {
    renderUsers()
    await userEvent.click(screen.getByText('Jean Dupont'))
    expect(screen.getByRole('button', { name: 'Désactiver le compte' })).toBeInTheDocument()
  })
})

// ── Comptes administrateurs : seul un ADMIN les modifie ou attribue ADMIN ───

describe('UsersPage — comptes administrateurs', () => {
  const USER_ADMIN: User = {
    ...USER_ACTIVE,
    id: 'u-admin',
    username: 'anne.chef',
    firstName: 'Anne',
    lastName: 'Chef',
    role: 'ADMIN',
  }

  function memberWithEquipeUpdate() {
    useAuthStore.setState({ accessToken: 'tok', username: 'member', role: 'MEMBER', userId: 'u1', permissions: makePermissions({ equipe: ['read', 'update'] }) })
  }

  beforeEach(() => {
    vi.mocked(useUsers).mockReturnValue({ data: [USER_ADMIN, USER_ACTIVE], isLoading: false } as unknown as ReturnType<typeof useUsers>)
    vi.mocked(useRoles).mockReturnValue({ data: [{ id: 'r1', name: 'Chef d\'équipe' }], isLoading: false } as unknown as ReturnType<typeof useRoles>)
  })

  it('ADMIN : ouvre la fiche d\'un administrateur et propose « Administrateur » comme rôle', async () => {
    renderUsers()
    await userEvent.click(screen.getByText('Anne Chef'))
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Administrateur' })).toBeInTheDocument()
  })

  it('MEMBER avec equipe.update : la fiche d\'un administrateur ne s\'ouvre pas', async () => {
    memberWithEquipeUpdate()
    renderUsers()
    await userEvent.click(screen.getByText('Anne Chef'))
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Désactiver le compte' })).not.toBeInTheDocument()
  })

  it('MEMBER avec equipe.update : modifie un membre, sans que « Administrateur » soit proposé comme rôle', async () => {
    memberWithEquipeUpdate()
    renderUsers()
    await userEvent.click(screen.getByText('Jean Dupont'))
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Administrateur' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Chef d\'équipe' })).toBeInTheDocument()
  })

  it('affiche le message traduit quand l\'API répond ADMIN_REQUIRED (liste devenue périmée)', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new ApiError(403, 'Seul un administrateur', 'ADMIN_REQUIRED'))
    vi.mocked(useUpdateUser).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderUsers()
    await userEvent.click(screen.getByText('Jean Dupont'))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Seul un administrateur peut créer ou modifier un compte administrateur')
    })
  })
})
