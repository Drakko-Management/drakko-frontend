import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiRequest, ApiError } from '@/lib/api-client'
import { useMe } from '@/hooks/use-update-me'
import { ChangeEmailForm } from './ChangeEmailForm'
import { ChangePasswordCard } from './ChangePasswordCard'

// Ici les VRAIS hooks de changement (seul l'appel réseau est simulé) : pendant l'envoi, les champs sont
// désactivés, et un champ désactivé ne prend pas le focus. Les autres tests simulent un envoi instantané et
// ne voient pas ce cas.
vi.mock('@/hooks/use-update-me', () => ({ useMe: vi.fn() }))
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

const STRONG = 'correct cheval pile agrafe'

function renderWithQuery(ui: React.ReactElement) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{ui}</QueryClientProvider>)
}

// Un refus qui arrive après un court délai : le champ est désactivé entre-temps
function rejectCurrentPasswordLater() {
  vi.mocked(apiRequest).mockImplementation(
    () =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new ApiError(400, 'Current password is incorrect', 'CURRENT_PASSWORD_INVALID')), 30),
      ),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useMe).mockReturnValue({ data: { email: 'lea@acme.test', firstName: 'Léa', lastName: 'Martin' } } as unknown as ReturnType<typeof useMe>)
})

describe('le focus revient sur le mot de passe refusé, une fois l’envoi terminé', () => {
  it('changement d’adresse email', async () => {
    rejectCurrentPasswordLater()
    renderWithQuery(<ChangeEmailForm />)

    await userEvent.clear(screen.getByLabelText('Adresse email'))
    await userEvent.type(screen.getByLabelText('Adresse email'), 'nouvelle@acme.test')
    await userEvent.type(screen.getByLabelText('Mot de passe actuel'), 'pas-le-bon')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await screen.findByRole('alert')
    await waitFor(() => expect(screen.getByLabelText('Mot de passe actuel')).toHaveFocus())
  })

  it('changement de mot de passe', async () => {
    rejectCurrentPasswordLater()
    renderWithQuery(<ChangePasswordCard />)
    await userEvent.click(screen.getByRole('button', { name: /Modifier mon mot de passe/ }))

    await userEvent.type(screen.getByLabelText('Mot de passe actuel'), 'pas-le-bon')
    await userEvent.type(screen.getByLabelText('Nouveau mot de passe'), STRONG)
    await userEvent.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), STRONG)
    await screen.findByText('Mot de passe accepté', {}, { timeout: 8000 })
    await userEvent.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))

    await screen.findByRole('alert')
    await waitFor(() => expect(screen.getByLabelText('Mot de passe actuel')).toHaveFocus())
  })
})
