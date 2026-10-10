import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { useCreateUser } from '@/hooks/use-users'
import { useAssignableRoles } from '@/hooks/use-roles'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions } from '@/lib/permissions'
import { ApiError } from '@/lib/api-client'
import { isZoneFilled } from '@/tutorials/dom'
import { TUTORIALS } from '@/tutorials/definitions'
import { CreateUserPage } from './CreateUserPage'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/hooks/use-users', () => ({
  useCreateUser: vi.fn(),
}))

vi.mock('@/hooks/use-roles', () => ({
  useAssignableRoles: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateUserPage />
    </MemoryRouter>,
  )
}

async function fillIdentity() {
  await userEvent.type(screen.getByLabelText(/Prénom/), 'Marie')
  await userEvent.type(screen.getByLabelText(/^Nom/), 'Durand')
  await userEvent.type(screen.getByLabelText(/Identifiant/), 'marie.durand')
  await userEvent.type(screen.getByLabelText(/Mot de passe/), 'motdepasse1')
}

// Le rôle est obligatoire : le sélecteur n'a rien de choisi au départ
async function fillRequiredFields() {
  await fillIdentity()
  await userEvent.selectOptions(screen.getByRole('combobox'), 'r1')
}

// ── Reset ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u0', permissions: null })
  vi.mocked(useAssignableRoles).mockReturnValue({ data: [{ id: 'r1', name: 'Chef d\'équipe' }], isLoading: false } as unknown as ReturnType<typeof useAssignableRoles>)
  vi.mocked(useCreateUser).mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false } as never)
})

// ── Choix du rôle : seul un ADMIN attribue ADMIN ────────────────────────────

describe('CreateUserPage — choix du rôle', () => {
  it('ADMIN : propose « Administrateur » et les rôles personnalisés', () => {
    renderPage()
    expect(screen.getByRole('option', { name: 'Administrateur' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Chef d\'équipe' })).toBeInTheDocument()
  })

  it('MEMBER avec equipe.create : ne propose pas « Administrateur », seulement les rôles personnalisés', () => {
    useAuthStore.setState({ accessToken: 'tok', username: 'member', role: 'MEMBER', userId: 'u1', permissions: makePermissions({ equipe: ['read', 'create'] }) })
    renderPage()
    expect(screen.queryByRole('option', { name: 'Administrateur' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Chef d\'équipe' })).toBeInTheDocument()
  })
})

// ── Rôle obligatoire : ce que l'on voit est ce qui est envoyé ───────────────

describe('CreateUserPage — rôle obligatoire', () => {
  function roleSelect() {
    return screen.getByRole('combobox') as HTMLSelectElement
  }

  it('affiche « Choisir un rôle » tant qu\'aucun rôle n\'est choisi', () => {
    renderPage()
    const select = roleSelect()
    expect(select.value).toBe('')
    expect(select.options[select.selectedIndex].textContent).toBe('Choisir un rôle')
    expect(select).toBeRequired()
  })

  it('refuse l\'enregistrement sans rôle : rien n\'est envoyé à l\'API', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useCreateUser).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderPage()
    await fillIdentity()
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('sans validation native (WebView) : message traduit et rien n\'est envoyé', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useCreateUser).mockReturnValue({ mutateAsync, isPending: false } as never)
    const { container } = renderPage()
    // Une WebView n'affiche pas les bulles de validation du navigateur : le formulaire se défend seul
    container.querySelector('form')?.setAttribute('novalidate', '')
    await fillIdentity()
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(toast.error).toHaveBeenCalledWith('Choisissez un rôle pour ce membre')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('envoie le rôle personnalisé choisi', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useCreateUser).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderPage()
    await fillRequiredFields()
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'MEMBER', customRoleId: 'r1' }),
      )
    })
  })

  it('ADMIN : envoie le rôle administrateur choisi, sans rôle personnalisé', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useCreateUser).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderPage()
    await fillIdentity()
    await userEvent.selectOptions(roleSelect(), 'ADMIN')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN', customRoleId: null }),
      )
    })
  })

  it('le tutoriel « Créer un membre » ne laisse pas passer l\'étape du rôle tant qu\'aucun n\'est choisi', async () => {
    renderPage()
    const zone = document.querySelector<HTMLElement>('[data-tutorial="user-role"]')
    expect(isZoneFilled(zone)).toBe(false)
    await userEvent.selectOptions(roleSelect(), 'r1')
    expect(isZoneFilled(zone)).toBe(true)

    const step = TUTORIALS.find((t) => t.id === 'create_member')?.steps.find((s) => s.id === 'role')
    expect(step?.gate).toBe(true)
  })
})

// ── Erreurs de l'API ───────────────────────────────────────────────────────

describe('CreateUserPage — erreurs de l\'API', () => {
  it('affiche le message traduit de ADMIN_REQUIRED, jamais le texte du serveur', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new ApiError(403, 'Texte technique du serveur', 'ADMIN_REQUIRED'))
    vi.mocked(useCreateUser).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderPage()
    await fillRequiredFields()
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Seul un administrateur peut créer ou modifier un compte administrateur')
    })
  })

  it('affiche le message traduit de ROLE_NOT_FOUND (rôle supprimé entre-temps)', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new ApiError(404, 'Rôle introuvable', 'ROLE_NOT_FOUND'))
    vi.mocked(useCreateUser).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderPage()
    await fillRequiredFields()
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Rôle introuvable. Choisissez-en un autre.')
    })
  })

  it('retombe sur le message générique pour une erreur sans code', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new ApiError(500, 'Internal server error'))
    vi.mocked(useCreateUser).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderPage()
    await fillRequiredFields()
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erreur lors de la création')
    })
  })
})
