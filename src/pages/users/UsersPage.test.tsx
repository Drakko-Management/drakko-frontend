import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import { useUsers, useCreateUser, useUpdateUser, useTransferOwnership } from '@/hooks/use-users'
import { useRoles, useAssignableRoles } from '@/hooks/use-roles'
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
  useTransferOwnership: vi.fn(),
}))

vi.mock('@/hooks/use-roles', () => ({
  useRoles: vi.fn(),
  useAssignableRoles: vi.fn(),
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
  isOwner: false,
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
function usersTree() {
  return (
    <MemoryRouter initialEntries={['/utilisateurs']}>
      <Routes>
        <Route path="/utilisateurs" element={<UsersPage />} />
        <Route path="/utilisateurs/nouveau" element={<p>Page création membre</p>} />
        <Route path="/utilisateurs/roles/nouveau" element={<p>Page création rôle</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function renderUsers() {
  return render(usersTree())
}

// ── Reset ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u0', permissions: null })
   
  vi.mocked(useUsers).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof useUsers>)
   
  vi.mocked(useRoles).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof useRoles>)
  vi.mocked(useAssignableRoles).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof useAssignableRoles>)
  vi.mocked(useCreateUser).mockReturnValue(mockMutation() as never)
  vi.mocked(useUpdateUser).mockReturnValue(mockMutation() as never)
  vi.mocked(useTransferOwnership).mockReturnValue(mockMutation() as never)
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

// ── Sélecteur de rôle de la fiche : ce que l'on voit est le rôle réel ────────

describe('UsersPage — rôle affiché dans la fiche d\'un membre', () => {
  beforeEach(() => {
    vi.mocked(useAssignableRoles).mockReturnValue({ data: [{ id: 'r1', name: 'Chef d\'équipe' }], isLoading: false } as unknown as ReturnType<typeof useAssignableRoles>)
  })

  function selectedOption() {
    const select = screen.getByRole('combobox') as HTMLSelectElement
    return select.options[select.selectedIndex].textContent
  }

  it('un membre sans rôle personnalisé affiche « Choisir un rôle », pas « Administrateur »', async () => {
    vi.mocked(useUsers).mockReturnValue({ data: [USER_ACTIVE], isLoading: false } as unknown as ReturnType<typeof useUsers>)
    renderUsers()
    await userEvent.click(screen.getByText('Jean Dupont'))
    expect(selectedOption()).toBe('Choisir un rôle')
  })

  it('un membre avec un rôle personnalisé affiche ce rôle', async () => {
    vi.mocked(useUsers).mockReturnValue({ data: [{ ...USER_ACTIVE, customRoleId: 'r1' }], isLoading: false } as unknown as ReturnType<typeof useUsers>)
    renderUsers()
    await userEvent.click(screen.getByText('Jean Dupont'))
    expect(selectedOption()).toBe('Chef d\'équipe')
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
    vi.mocked(useAssignableRoles).mockReturnValue({ data: [{ id: 'r1', name: 'Chef d\'équipe' }], isLoading: false } as unknown as ReturnType<typeof useAssignableRoles>)
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

// ── Un membre n'accorde pas plus de droits que les siens ────────────────────

describe('UsersPage — droits bornés par ceux de l\'appelant', () => {
  const WORKER_PERMISSIONS = makePermissions({ chantiers: ['read'] })
  const BOSS_PERMISSIONS = makePermissions({ chantiers: ['read', 'update'], clients: ['read'], equipe: ['read', 'update'] })

  const USER_WORKER: User = {
    ...USER_ACTIVE,
    id: 'u-worker',
    username: 'lea.ouvrier',
    firstName: 'Léa',
    lastName: 'Ouvrier',
    customRoleId: 'r-worker',
    customRole: { id: 'r-worker', name: 'Ouvrier', permissions: WORKER_PERMISSIONS },
  }
  const USER_BOSS: User = {
    ...USER_ACTIVE,
    id: 'u-boss',
    username: 'marc.direction',
    firstName: 'Marc',
    lastName: 'Direction',
    customRoleId: 'r-boss',
    customRole: { id: 'r-boss', name: 'Direction', permissions: BOSS_PERMISSIONS },
  }

  // un responsable : lit les chantiers et gère l'équipe, rien de plus
  function manager() {
    useAuthStore.setState({
      accessToken: 'tok',
      username: 'responsable',
      role: 'MEMBER',
      userId: 'u-manager',
      permissions: makePermissions({ chantiers: ['read'], equipe: ['read', 'update'] }),
    })
  }

  beforeEach(() => {
    vi.mocked(useUsers).mockReturnValue({ data: [USER_WORKER, USER_BOSS], isLoading: false } as unknown as ReturnType<typeof useUsers>)
  })

  it('MEMBER : ouvre la fiche d\'un collègue dont les droits n\'excèdent pas les siens', async () => {
    manager()
    renderUsers()
    await userEvent.click(screen.getByText('Léa Ouvrier'))
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('MEMBER : la fiche d\'un collègue plus puissant ne s\'ouvre pas (ni mot de passe, ni désactivation)', async () => {
    manager()
    renderUsers()
    await userEvent.click(screen.getByText('Marc Direction'))
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Désactiver le compte' })).not.toBeInTheDocument()
  })

  it('ADMIN : ouvre toutes les fiches, la plus puissante comprise', async () => {
    renderUsers()
    await userEvent.click(screen.getByText('Marc Direction'))
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('le choix du rôle propose les rôles attribuables fournis par l\'API, pas la liste complète des rôles', async () => {
    manager()
    vi.mocked(useRoles).mockReturnValue({
      data: [{ id: 'r-worker', name: 'Ouvrier' }, { id: 'r-boss', name: 'Direction' }],
      isLoading: false,
    } as unknown as ReturnType<typeof useRoles>)
    vi.mocked(useAssignableRoles).mockReturnValue({
      data: [{ id: 'r-worker', name: 'Ouvrier' }],
      isLoading: false,
    } as unknown as ReturnType<typeof useAssignableRoles>)
    renderUsers()
    await userEvent.click(screen.getByText('Léa Ouvrier'))

    expect(screen.getByRole('option', { name: 'Ouvrier' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Direction' })).not.toBeInTheDocument()
  })

  it.each([
    ['ROLE_EXCEEDS_PERMISSIONS', 'Vous ne pouvez pas attribuer un rôle qui donne des droits que vous n\'avez pas'],
    ['USER_EXCEEDS_PERMISSIONS', 'Ce compte a des droits que vous n\'avez pas : vous ne pouvez pas le modifier'],
  ])('affiche le message traduit quand l\'API répond %s (liste ou droits devenus périmés)', async (code, message) => {
    manager()
    const mutateAsync = vi.fn().mockRejectedValue(new ApiError(403, 'Texte technique', code))
    vi.mocked(useUpdateUser).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderUsers()
    await userEvent.click(screen.getByText('Léa Ouvrier'))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(message)
    })
  })
})

// ── Propriétaire : protégé, et seul à pouvoir transférer la propriété ─────────

describe('UsersPage — propriétaire', () => {
  const OWNER: User = {
    ...USER_ACTIVE,
    id: 'u-owner',
    username: 'julien',
    firstName: 'Julien',
    lastName: 'Thibault',
    role: 'ADMIN',
    isOwner: true,
  }
  const OTHER_ADMIN: User = {
    ...USER_ACTIVE,
    id: 'u-admin2',
    username: 'anne.chef',
    firstName: 'Anne',
    lastName: 'Chef',
    role: 'ADMIN',
  }
  const THIRD_ADMIN: User = { ...OTHER_ADMIN, id: 'u-admin3', username: 'paul.ancien', firstName: 'Paul', lastName: 'Ancien' }
  const INACTIVE_ADMIN: User = { ...THIRD_ADMIN, id: 'u-admin4', firstName: 'Luc', lastName: 'Parti', active: false }

  function signInAs(user: User) {
    useAuthStore.setState({ accessToken: 'tok', username: user.username, role: user.role, userId: user.id, permissions: null })
  }

  function mockTransfer(mutateAsync = vi.fn().mockResolvedValue({})) {
    vi.mocked(useTransferOwnership).mockReturnValue({ mutateAsync, isPending: false } as never)
    return mutateAsync
  }

  beforeEach(() => {
    vi.mocked(useUsers).mockReturnValue({
      data: [OWNER, OTHER_ADMIN, THIRD_ADMIN, USER_ACTIVE, INACTIVE_ADMIN],
      isLoading: false,
    } as unknown as ReturnType<typeof useUsers>)
    signInAs(OWNER)
  })

  it('affiche le badge « Propriétaire » sur la fiche du propriétaire, et sur elle seule', () => {
    renderUsers()
    expect(screen.getAllByText('Propriétaire')).toHaveLength(1)
  })

  it('un autre administrateur ne peut pas ouvrir la fiche du propriétaire, mais ouvre celle d\'un membre', async () => {
    signInAs(OTHER_ADMIN)
    renderUsers()
    await userEvent.click(screen.getByText('Julien Thibault'))
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('Jean Dupont'))
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('le propriétaire ouvre sa fiche : rôle verrouillé, pas de désactivation, indication affichée', async () => {
    renderUsers()
    await userEvent.click(screen.getByText('Julien Thibault'))
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Désactiver le compte' })).not.toBeInTheDocument()
    expect(screen.getByText(/transférez d'abord la propriété/i)).toBeInTheDocument()
    // il peut en revanche enregistrer le reste de sa fiche
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('le propriétaire enregistre sa fiche en gardant le rôle administrateur', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useUpdateUser).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderUsers()
    await userEvent.click(screen.getByText('Julien Thibault'))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ role: 'ADMIN' }))
  })

  it('un autre administrateur reste désactivable par le propriétaire (aucune protection)', async () => {
    renderUsers()
    await userEvent.click(screen.getByText('Anne Chef'))
    expect(screen.getByRole('button', { name: 'Désactiver le compte' })).toBeInTheDocument()
  })

  describe('transfert de la propriété', () => {
    it('proposé par le propriétaire sur la fiche d\'un administrateur actif', async () => {
      renderUsers()
      await userEvent.click(screen.getByText('Anne Chef'))
      expect(screen.getByRole('button', { name: 'Transférer la propriété' })).toBeInTheDocument()
    })

    it('pas proposé sur la fiche d\'un membre : une indication demande de le nommer administrateur d\'abord', async () => {
      renderUsers()
      await userEvent.click(screen.getByText('Jean Dupont'))
      expect(screen.queryByRole('button', { name: 'Transférer la propriété' })).not.toBeInTheDocument()
      expect(screen.getByText(/nommez-le d'abord administrateur/i)).toBeInTheDocument()
    })

    it('pas proposé sur la fiche d\'un administrateur désactivé', async () => {
      renderUsers()
      await userEvent.click(screen.getByText('Luc Parti'))
      expect(screen.queryByRole('button', { name: 'Transférer la propriété' })).not.toBeInTheDocument()
      expect(screen.queryByText(/nommez-le d'abord administrateur/i)).not.toBeInTheDocument()
    })

    it('pas proposé à un administrateur qui n\'est pas le propriétaire', async () => {
      signInAs(OTHER_ADMIN)
      renderUsers()
      await userEvent.click(screen.getByText('Paul Ancien'))
      expect(screen.queryByRole('button', { name: 'Transférer la propriété' })).not.toBeInTheDocument()
    })

    it('demande confirmation, puis transfère et confirme par un message', async () => {
      const mutateAsync = mockTransfer()
      renderUsers()
      await userEvent.click(screen.getByText('Anne Chef'))
      await userEvent.click(screen.getByRole('button', { name: 'Transférer la propriété' }))

      const dialog = await screen.findByRole('alertdialog')
      expect(dialog).toHaveTextContent('Transférer la propriété à Anne Chef ?')
      expect(mutateAsync).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole('button', { name: 'Transférer' }))
      await waitFor(() => { expect(mutateAsync).toHaveBeenCalledTimes(1) })
      expect(toast.success).toHaveBeenCalledWith('Propriété transférée à Anne Chef')
    })

    it('après le transfert, la fiche ouverte du nouveau propriétaire se referme : elle n\'est plus modifiable', async () => {
      const view = renderUsers()
      await userEvent.click(screen.getByText('Anne Chef'))
      expect(screen.getByRole('button', { name: 'Transférer la propriété' })).toBeInTheDocument()

      // l'API a transféré la propriété à Anne : la liste rechargée la désigne, et plus l'appelant
      vi.mocked(useUsers).mockReturnValue({
        data: [{ ...OWNER, isOwner: false }, { ...OTHER_ADMIN, isOwner: true }, THIRD_ADMIN, USER_ACTIVE, INACTIVE_ADMIN],
        isLoading: false,
      } as unknown as ReturnType<typeof useUsers>)
      view.rerender(usersTree())

      expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Transférer la propriété' })).not.toBeInTheDocument()
    })

    it('annuler ne transfère rien', async () => {
      const mutateAsync = mockTransfer()
      renderUsers()
      await userEvent.click(screen.getByText('Anne Chef'))
      await userEvent.click(screen.getByRole('button', { name: 'Transférer la propriété' }))
      await userEvent.click(await screen.findByRole('button', { name: 'Annuler' }))
      expect(mutateAsync).not.toHaveBeenCalled()
    })

    it('affiche le message traduit quand l\'API refuse le transfert', async () => {
      mockTransfer(vi.fn().mockRejectedValue(new ApiError(400, 'Texte technique', 'OWNER_TARGET_INVALID')))
      renderUsers()
      await userEvent.click(screen.getByText('Anne Chef'))
      await userEvent.click(screen.getByRole('button', { name: 'Transférer la propriété' }))
      await userEvent.click(await screen.findByRole('button', { name: 'Transférer' }))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('La propriété ne peut être transférée qu\'à un administrateur actif')
      })
    })
  })
})
