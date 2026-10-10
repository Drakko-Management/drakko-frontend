import { StrictMode } from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { apiRequest, ApiError } from '@/lib/api-client'
import { ResetPasswordPage } from './ResetPasswordPage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
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

const TOKEN = 'a'.repeat(64)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(apiRequest).mockResolvedValue(undefined)
  window.history.replaceState(null, '', `/reinitialiser-mot-de-passe#token=${TOKEN}`)
})

function renderPage() {
  render(
    <MemoryRouter>
      <ResetPasswordPage />
    </MemoryRouter>,
  )
}

async function fill(password: string, confirm = password) {
  await userEvent.type(screen.getByLabelText('Nouveau mot de passe'), password)
  await userEvent.type(screen.getByLabelText('Confirmer le mot de passe'), confirm)
}
const submitButton = () => screen.getByRole('button', { name: 'Enregistrer le mot de passe' })

describe('ResetPasswordPage', () => {
  it("lit le jeton dans le fragment de l'adresse puis l'efface de la barre d'adresse", () => {
    renderPage()

    expect(screen.getByLabelText('Nouveau mot de passe')).toBeInTheDocument()
    expect(window.location.hash).toBe('')
    expect(window.location.href).not.toContain(TOKEN)
  })

  it('en développement (StrictMode, qui rend deux fois), le jeton est bien lu puis effacé de l’adresse', () => {
    render(
      <StrictMode>
        <MemoryRouter>
          <ResetPasswordPage />
        </MemoryRouter>
      </StrictMode>,
    )

    expect(screen.getByLabelText('Nouveau mot de passe')).toBeInTheDocument()
    expect(window.location.hash).toBe('')
  })

  it('envoie le jeton et le nouveau mot de passe, puis renvoie vers la connexion', async () => {
    renderPage()

    await fill('nouveaumotdepasse')
    await userEvent.click(submitButton())

    expect(apiRequest).toHaveBeenCalledWith('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: TOKEN, password: 'nouveaumotdepasse' }),
    })
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true }))
    expect(toast.success).toHaveBeenCalledWith('Mot de passe modifié, vous pouvez vous connecter')
  })

  it("n'envoie rien tant que le mot de passe est trop court ou que la confirmation diffère", async () => {
    renderPage()

    await fill('court')
    expect(submitButton()).toBeDisabled()

    await userEvent.clear(screen.getByLabelText('Nouveau mot de passe'))
    await userEvent.clear(screen.getByLabelText('Confirmer le mot de passe'))
    await fill('nouveaumotdepasse', 'autrechose')
    expect(submitButton()).toBeDisabled()
    expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('même soumis sans passer par le bouton (touche Entrée), un mot de passe invalide n’est pas envoyé', async () => {
    renderPage()

    await fill('nouveaumotdepasse', 'autrechose')
    fireEvent.submit(submitButton().closest('form') as HTMLFormElement)

    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('sans jeton dans l’adresse : lien invalide, avec de quoi en demander un nouveau', () => {
    window.history.replaceState(null, '', '/reinitialiser-mot-de-passe')
    renderPage()

    expect(screen.getByText(/Ce lien n'est plus valable/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Demander un nouveau lien' })).toHaveAttribute('href', '/mot-de-passe-oublie')
    expect(screen.queryByLabelText('Nouveau mot de passe')).not.toBeInTheDocument()
  })

  it('lien expiré ou déjà utilisé (INVALID_RESET_TOKEN) : écran de lien invalide', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new ApiError(400, 'Invalid or expired reset link', 'INVALID_RESET_TOKEN'))
    renderPage()

    await fill('nouveaumotdepasse')
    await userEvent.click(submitButton())

    expect(await screen.findByText(/Ce lien n'est plus valable/)).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('trop de demandes (429) : message dédié, le formulaire reste', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new ApiError(429, 'Too Many Requests'))
    renderPage()

    await fill('nouveaumotdepasse')
    await userEvent.click(submitButton())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Trop de demandes, réessayez dans une minute'))
    expect(screen.getByLabelText('Nouveau mot de passe')).toBeInTheDocument()
  })
})
