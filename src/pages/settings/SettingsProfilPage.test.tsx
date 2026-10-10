import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import { useMe, useUpdateMe } from '@/hooks/use-update-me'
import { useAuthStore } from '@/store/auth.store'
import { SettingsProfilPage } from './SettingsProfilPage'

vi.mock('@/hooks/use-update-me', () => ({ useMe: vi.fn(), useUpdateMe: vi.fn() }))
vi.mock('@/lib/patch-me', () => ({ patchMe: vi.fn() }))
vi.mock('@/lib/api-client', () => {
  class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
      this.name = 'ApiError'
    }
  }
  return { apiRequest: vi.fn(), ApiError }
})
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mutateAsync = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mutateAsync.mockResolvedValue({})
  vi.mocked(useMe).mockReturnValue({ data: { email: 'lea@acme.test' } } as unknown as ReturnType<typeof useMe>)
  vi.mocked(useUpdateMe).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useUpdateMe>)
  useAuthStore.setState({ accessToken: 'tok', username: 'lea', role: 'ADMIN', userId: 'u1' })
})

function renderPage() {
  render(
    <MemoryRouter>
      <SettingsProfilPage />
    </MemoryRouter>,
  )
}
const field = () => screen.getByLabelText('Adresse email')
const save = () => screen.getByRole('button', { name: 'Enregistrer' })

describe('SettingsProfilPage — adresse email', () => {
  it("montre l'adresse enregistrée et explique à quoi elle sert", () => {
    renderPage()

    expect(field()).toHaveValue('lea@acme.test')
    expect(screen.getByText(/réinitialiser votre mot de passe/)).toBeInTheDocument()
  })

  it("n'enregistre rien tant que l'adresse n'a pas changé", async () => {
    renderPage()
    expect(save()).toBeDisabled()

    await userEvent.type(field(), 'x')
    await userEvent.clear(field())
    expect(save()).toBeDisabled()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('enregistre la nouvelle adresse (sans espaces autour)', async () => {
    renderPage()

    await userEvent.clear(field())
    await userEvent.type(field(), ' nouvelle@acme.test ')
    await userEvent.click(save())

    expect(mutateAsync).toHaveBeenCalledWith({ email: 'nouvelle@acme.test' })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Adresse email enregistrée'))
  })

  it('adresse déjà utilisée (409) : message dédié', async () => {
    mutateAsync.mockRejectedValue(new ApiError(409, 'A record with this value already exists'))
    renderPage()

    await userEvent.clear(field())
    await userEvent.type(field(), 'pris@acme.test')
    await userEvent.click(save())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cette adresse est déjà utilisée par un autre compte'))
  })

  it('autre erreur : message générique', async () => {
    mutateAsync.mockRejectedValue(new ApiError(500, 'Internal server error'))
    renderPage()

    await userEvent.clear(field())
    await userEvent.type(field(), 'autre@acme.test')
    await userEvent.click(save())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Impossible d'enregistrer l'adresse email"))
  })
})
