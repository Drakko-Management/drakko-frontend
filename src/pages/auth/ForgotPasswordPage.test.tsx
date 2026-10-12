import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { apiRequest, ApiError } from '@/lib/api-client'
import { ForgotPasswordPage } from './ForgotPasswordPage'

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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(apiRequest).mockResolvedValue(undefined)
})

function renderPage() {
  render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  )
}

async function submit(email: string) {
  await userEvent.type(screen.getByLabelText('Identifiant ou adresse email'), email)
  await userEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }))
}

describe('ForgotPasswordPage', () => {
  it("envoie ce qui est saisi (sans espaces autour) à la route publique : une adresse email", async () => {
    renderPage()

    await submit('  lea@acme.test ')

    expect(apiRequest).toHaveBeenCalledWith('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'lea@acme.test' }),
    })
  })

  it('… ou un identifiant : le même champ accepte les deux', async () => {
    renderPage()

    await submit('lea.martin')

    expect(apiRequest).toHaveBeenCalledWith('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'lea.martin' }),
    })
  })

  it('le champ n\'est pas de type email (un identifiant n\'est pas une adresse) et propose l\'identifiant au navigateur', () => {
    renderPage()

    const field = screen.getByLabelText('Identifiant ou adresse email')
    expect(field).toHaveAttribute('type', 'text')
    expect(field).toHaveAttribute('autocomplete', 'username')
  })

  it('affiche la confirmation, qui ne dit pas si un compte existe', async () => {
    renderPage()

    await submit('inconnu@acme.test')

    expect(await screen.findByText('Vérifiez votre boîte mail')).toBeInTheDocument()
    expect(screen.getByText(/Si ce compte existe et a une adresse email/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour à la connexion' })).toHaveAttribute('href', '/login')
  })

  it('trop de demandes (429) : message dédié, le formulaire reste affiché', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new ApiError(429, 'Too Many Requests'))
    renderPage()

    await submit('lea@acme.test')

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Trop de demandes, réessayez dans une minute'))
    expect(screen.queryByText('Vérifiez votre boîte mail')).not.toBeInTheDocument()
  })

  it('autre erreur : message générique, jamais le texte du serveur', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new ApiError(500, 'Internal server error'))
    renderPage()

    await submit('lea@acme.test')

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Une erreur est survenue, réessayez'))
  })
})
