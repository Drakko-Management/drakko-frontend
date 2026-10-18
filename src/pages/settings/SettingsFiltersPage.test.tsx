import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { useUpdateMe } from '@/hooks/use-update-me'
import { useAuthStore } from '@/store/auth.store'
import { FILTER_FALLBACKS } from '@/lib/default-filters'
import { SettingsFiltersPage } from './SettingsFiltersPage'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-update-me', () => ({ useUpdateMe: vi.fn() }))

const mutateAsync = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mutateAsync.mockResolvedValue({})
  vi.mocked(useUpdateMe).mockReturnValue({ mutateAsync, isPending: false } as never)
  useAuthStore.setState({ accessToken: 'tok', role: 'ADMIN', defaultFilters: FILTER_FALLBACKS })
})

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsFiltersPage />
    </MemoryRouter>,
  )
}

describe('SettingsFiltersPage', () => {
  it('enregistre le statut choisi pour les chantiers, sans toucher aux autres réglages', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getByLabelText('Statut affiché'), 'IN_PROGRESS')

    expect(mutateAsync).toHaveBeenCalledWith({
      defaultFilters: { ...FILTER_FALLBACKS, projectsStatus: 'IN_PROGRESS' },
    })
    expect(useAuthStore.getState().defaultFilters.projectsStatus).toBe('IN_PROGRESS')
  })

  it('revient en arrière quand l\'enregistrement échoue', async () => {
    const user = userEvent.setup()
    mutateAsync.mockRejectedValue(new Error('réseau'))
    renderPage()

    await user.selectOptions(screen.getByLabelText('Statut affiché'), 'COMPLETED')

    await waitFor(() => expect(useAuthStore.getState().defaultFilters.projectsStatus).toBe('all'))
  })

  it("rétablit les réglages d'origine", async () => {
    const user = userEvent.setup()
    useAuthStore.getState().setDefaultFilters({ clientsSort: 'recent' })
    renderPage()

    await user.click(screen.getByRole('button', { name: /rétablir les réglages d'origine/i }))

    expect(mutateAsync).toHaveBeenCalledWith({ defaultFilters: FILTER_FALLBACKS })
  })

  it("n'affiche que les listes auxquelles l'utilisateur a accès", () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: { chantiers: ['read'], clients: [], equipe: [], prestations: [] } as never })
    renderPage()

    expect(screen.getByText('Chantiers')).toBeInTheDocument()
    expect(screen.queryByText('Clients')).not.toBeInTheDocument()
  })
})
