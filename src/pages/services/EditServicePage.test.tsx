import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { toast } from 'sonner'
import { useServices, useUpdateService, useDeactivateService, useActivateService, useDeleteService } from '@/hooks/use-services'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions } from '@/lib/permissions'
import { EditServicePage } from './EditServicePage'
import type { Service } from '@/types/api'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-services', () => ({
  useServices: vi.fn(),
  useUpdateService: vi.fn(),
  useDeactivateService: vi.fn(),
  useActivateService: vi.fn(),
  useDeleteService: vi.fn(),
}))

const SERVICE: Service = {
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

const mutateAsync = vi.fn()
const deactivate = vi.fn()
const activate = vi.fn()
const remove = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mutateAsync.mockResolvedValue({})
  useAuthStore.setState({ accessToken: 'tok', role: 'ADMIN', userId: 'u0', permissions: null })
  vi.mocked(useServices).mockReturnValue({ data: [SERVICE], isLoading: false } as never)
  vi.mocked(useUpdateService).mockReturnValue({ mutateAsync, isPending: false } as never)
  deactivate.mockResolvedValue({})
  activate.mockResolvedValue({})
  remove.mockResolvedValue({ result: 'deleted' })
  vi.mocked(useDeactivateService).mockReturnValue({ mutateAsync: deactivate, isPending: false } as never)
  vi.mocked(useActivateService).mockReturnValue({ mutateAsync: activate, isPending: false } as never)
  vi.mocked(useDeleteService).mockReturnValue({ mutateAsync: remove, isPending: false } as never)
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/prestations" element={<p>Liste des prestations</p>} />
        <Route path="/prestations/:id/modifier" element={<EditServicePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EditServicePage', () => {
  it('affiche le formulaire rempli avec la prestation', () => {
    renderAt('/prestations/svc-1/modifier')
    expect(screen.getByText('Modifier la prestation')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tonte de pelouse' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Tonte de pelouse')).toBeInTheDocument()
    expect(screen.getByDisplayValue('m²')).toBeInTheDocument()
  })

  it("« Enregistrer » est inactif au départ et s'active dès que la fiche change", async () => {
    const user = userEvent.setup()
    renderAt('/prestations/svc-1/modifier')
    const save = screen.getByRole('button', { name: 'Enregistrer' })
    expect(save).toBeDisabled()

    await user.type(screen.getByDisplayValue('m²'), '2')

    expect(save).toBeEnabled()
  })

  it("n'envoie pas le curseur dans un champ en arrivant (pas de focus automatique)", () => {
    renderAt('/prestations/svc-1/modifier')
    expect(screen.getByDisplayValue('Tonte de pelouse')).not.toHaveFocus()
  })

  it('enregistre les changements puis revient à la liste', async () => {
    const user = userEvent.setup()
    renderAt('/prestations/svc-1/modifier')

    await user.type(screen.getByDisplayValue('Tonte de pelouse'), ' bio')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'svc-1', title: 'Tonte de pelouse bio' }),
    )
    expect(toast.success).toHaveBeenCalled()
    expect(await screen.findByText('Liste des prestations')).toBeInTheDocument()
  })

  it('une prestation inconnue renvoie à la liste', () => {
    renderAt('/prestations/inconnue/modifier')
    expect(screen.getByText('Liste des prestations')).toBeInTheDocument()
  })

  it("l'œil désactive la prestation sans confirmation", async () => {
    const user = userEvent.setup()
    renderAt('/prestations/svc-1/modifier')

    await user.click(screen.getByRole('button', { name: 'Désactiver' }))

    expect(deactivate).toHaveBeenCalledWith('svc-1')
  })

  it('une prestation désactivée se réactive', async () => {
    const user = userEvent.setup()
    vi.mocked(useServices).mockReturnValue({ data: [{ ...SERVICE, active: false }], isLoading: false } as never)
    renderAt('/prestations/svc-1/modifier')

    await user.click(screen.getByRole('button', { name: 'Activer' }))

    expect(activate).toHaveBeenCalledWith('svc-1')
  })

  it('supprimer avertit d\'abord, puis supprime et revient à la liste', async () => {
    const user = userEvent.setup()
    renderAt('/prestations/svc-1/modifier')

    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(screen.getByText(/cette action est définitive/i)).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(remove).toHaveBeenCalledWith('svc-1')
    expect(await screen.findByText('Liste des prestations')).toBeInTheDocument()
  })

  it("sans droit de suppression, pas de corbeille", () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ prestations: ['read', 'update'] }) })
    renderAt('/prestations/svc-1/modifier')
    expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument()
  })
})
