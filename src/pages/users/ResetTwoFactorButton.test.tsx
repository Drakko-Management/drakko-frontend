import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiRequest, ApiError } from '@/lib/api-client'
import type { User } from '@/types/api'
import { ResetTwoFactorButton } from './ResetTwoFactorButton'

// Les VRAIS hooks (seul le réseau est simulé) : le champ est désactivé pendant l'envoi, ce qui compte pour le focus
vi.mock('@/lib/api-client', () => {
  class ApiError extends Error {
    status: number
    code?: string
    constructor(status: number, message: string, code?: string) {
      super(message)
      this.status = status
      this.code = code
      this.name = 'ApiError'
    }
  }
  return { apiRequest: vi.fn(), ApiError }
})
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const JEAN = { id: 'u2', username: 'jean.dupont', firstName: 'Jean', lastName: 'Dupont', totpEnabledAt: '2026-01-01T00:00:00Z' } as User

function renderButton() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <ResetTwoFactorButton user={JEAN} />
    </QueryClientProvider>,
  )
}
const openDialog = () => userEvent.click(screen.getByRole('button', { name: 'Réinitialiser la double authentification' }))
const confirmButton = () => screen.getByRole('button', { name: 'Réinitialiser' })
const field = () => screen.getByLabelText('Votre mot de passe')

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(apiRequest).mockResolvedValue(undefined)
})

describe('ResetTwoFactorButton', () => {
  it('ne fait rien tant qu’on n’a pas confirmé : le bouton ouvre une boîte qui nomme la personne et dit ce qui va se passer', async () => {
    renderButton()

    await openDialog()

    expect(screen.getByText('Réinitialiser la double authentification de Jean Dupont ?')).toBeInTheDocument()
    expect(screen.getByText(/déconnectée, prévenue par email/)).toBeInTheDocument()
    expect(screen.getByText(/VOTRE mot de passe/)).toBeInTheDocument()
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('exige le mot de passe de l’administrateur : le bouton est inactif sans lui', async () => {
    renderButton()
    await openDialog()

    expect(confirmButton()).toBeDisabled()
    await userEvent.type(field(), 'mon-mot-de-passe')
    expect(confirmButton()).toBeEnabled()
  })

  it('confirme : appelle la route de la personne avec le mot de passe de l’administrateur, annonce le résultat et ferme', async () => {
    renderButton()
    await openDialog()
    await userEvent.type(field(), 'mon-mot-de-passe')

    await userEvent.click(confirmButton())

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Double authentification de Jean Dupont réinitialisée'))
    expect(apiRequest).toHaveBeenCalledWith('/auth/2fa/reset/u2', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'mon-mot-de-passe' }),
    })
    await waitFor(() => expect(screen.queryByText(/Réinitialiser la double authentification de Jean/)).not.toBeInTheDocument())
  })

  it('un mot de passe faux : alerte précise, focus, la boîte reste ouverte, rien n’est annoncé comme fait', async () => {
    vi.mocked(apiRequest).mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new ApiError(400, 'x', 'CURRENT_PASSWORD_INVALID')), 30)),
    )
    renderButton()
    await openDialog()
    await userEvent.type(field(), 'pas-le-bon')

    await userEvent.click(confirmButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Le mot de passe actuel est incorrect')
    await waitFor(() => expect(field()).toHaveFocus())
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('l’alerte disparaît dès qu’on corrige le mot de passe', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new ApiError(400, 'x', 'CURRENT_PASSWORD_INVALID'))
    renderButton()
    await openDialog()
    await userEvent.type(field(), 'pas-le-bon')
    await userEvent.click(confirmButton())
    await screen.findByRole('alert')

    await userEvent.type(field(), 'x')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('une cible sans double authentification (409) : message précis', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new ApiError(409, 'x', 'TWO_FACTOR_NOT_ENABLED'))
    renderButton()
    await openDialog()
    await userEvent.type(field(), 'mon-mot-de-passe')

    await userEvent.click(confirmButton())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("La double authentification n'est pas activée"))
  })

  it('« Annuler » ferme et efface le mot de passe saisi', async () => {
    renderButton()
    await openDialog()
    await userEvent.type(field(), 'mon-mot-de-passe')

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await openDialog()

    expect(field()).toHaveValue('')
    expect(apiRequest).not.toHaveBeenCalled()
  })
})
