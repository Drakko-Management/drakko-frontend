import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useUsers, useUpdateUser, useTransferOwnership, useDeleteUser } from '@/hooks/use-users'
import { useAssignableRoles } from '@/hooks/use-roles'
import { useAuthStore } from '@/store/auth.store'
import { EditUserPage } from './EditUserPage'
import type { User } from '@/types/api'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-two-factor', () => ({ useResetUserTwoFactor: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/hooks/use-users', () => ({
  useUsers: vi.fn(),
  useUpdateUser: vi.fn(),
  useTransferOwnership: vi.fn(),
  useDeleteUser: vi.fn(),
}))
vi.mock('@/hooks/use-roles', () => ({ useAssignableRoles: vi.fn() }))

const USER: User = {
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

const remove = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ accessToken: 'tok', role: 'ADMIN', userId: 'u0', permissions: null })
  vi.mocked(useUsers).mockReturnValue({ data: [USER], isLoading: false } as never)
  vi.mocked(useAssignableRoles).mockReturnValue({ data: [], isLoading: false } as never)
  vi.mocked(useUpdateUser).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  vi.mocked(useTransferOwnership).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  vi.mocked(useDeleteUser).mockReturnValue({ mutateAsync: remove, isPending: false } as never)
  remove.mockResolvedValue({ result: 'deleted' })
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/utilisateurs" element={<p>Liste de l'équipe</p>} />
        <Route path="/utilisateurs/:id" element={<EditUserPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EditUserPage', () => {
  it('affiche le nom du membre en titre et sa fiche', () => {
    renderAt('/utilisateurs/u1')
    expect(screen.getByRole('heading', { name: 'Jean Dupont' })).toBeInTheDocument()
    expect(screen.getByText('Modifier le membre')).toBeInTheDocument()
    expect(screen.getByDisplayValue('jean.dupont')).toBeInTheDocument()
  })

  it('un membre inconnu renvoie à la liste', () => {
    renderAt('/utilisateurs/inconnu')
    expect(screen.getByText("Liste de l'équipe")).toBeInTheDocument()
  })

  it("un membre qu'on n'a pas le droit de modifier renvoie à la liste, sans ouvrir la fiche", () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: { chantiers: [], clients: [], equipe: ['read'], prestations: [] } as never })
    renderAt('/utilisateurs/u1')
    expect(screen.getByText("Liste de l'équipe")).toBeInTheDocument()
    expect(screen.queryByDisplayValue('jean.dupont')).not.toBeInTheDocument()
  })

  it('supprimer avertit d\'abord, puis supprime et revient à la liste', async () => {
    const user = userEvent.setup()
    renderAt('/utilisateurs/u1')

    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(screen.getByText(/Supprimer Jean Dupont/)).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(remove).toHaveBeenCalledWith('u1')
    expect(await screen.findByText("Liste de l'équipe")).toBeInTheDocument()
  })

  it('pas de suppression de son propre compte', () => {
    useAuthStore.setState({ userId: 'u1' })
    renderAt('/utilisateurs/u1')
    expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument()
  })
})
