import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { apiRequest } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth.store'
import { TwoFactorRequiredPage } from './TwoFactorRequiredPage'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('@/components/two-factor/TwoFactorSetupFlow', () => ({
  TwoFactorSetupFlow: ({ onDone }: { onDone: () => void }) => <button onClick={onDone}>flux terminé</button>,
}))
vi.mock('@/lib/api-client', () => ({ apiRequest: vi.fn(), ApiError: class extends Error {} }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(apiRequest).mockResolvedValue(undefined)
  useAuthStore.setState({ accessToken: 'tok', username: 'chef', role: 'ADMIN', userId: 'u1', twoFactorRequired: true })
})

function renderPage() {
  render(
    <MemoryRouter>
      <TwoFactorRequiredPage />
    </MemoryRouter>,
  )
}

describe('TwoFactorRequiredPage', () => {
  it('explique que la double authentification est obligatoire pour les administrateurs et qu’on ne peut rien faire d’autre avant', () => {
    renderPage()

    expect(screen.getByText('Double authentification obligatoire')).toBeInTheDocument()
    expect(screen.getByText(/obligatoire pour les administrateurs/)).toBeInTheDocument()
    expect(screen.getByText(/vous ne pourrez rien faire d'autre avant/)).toBeInTheDocument()
  })

  it('une fois configurée : l’exigence est levée et on arrive dans l’application', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'flux terminé' }))

    expect(useAuthStore.getState().twoFactorRequired).toBe(false)
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('« Se déconnecter » : ferme la session côté serveur et renvoie vers la connexion', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true }))
    expect(apiRequest).toHaveBeenCalledWith('/auth/logout', { method: 'POST' })
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('si le serveur ne répond pas, la personne reste connectée et en est prévenue : pas de faux « déconnecté »', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error('réseau'))
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Vous restez connecté')),
    )
    // Le cookie de session reste valable côté serveur : effacer l'état local ferait croire à une déconnexion
    expect(useAuthStore.getState().accessToken).toBe('tok')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
