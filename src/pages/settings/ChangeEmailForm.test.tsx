import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import { useChangeEmail } from '@/hooks/use-change-email'
import { useMe } from '@/hooks/use-update-me'
import { ChangeEmailForm } from './ChangeEmailForm'

vi.mock('@/hooks/use-change-email', () => ({ useChangeEmail: vi.fn() }))
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

const mutateAsync = vi.fn()

function withEmail(email: string | null, totpEnabledAt: string | null = null) {
  vi.mocked(useMe).mockReturnValue({ data: { email, totpEnabledAt } } as unknown as ReturnType<typeof useMe>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mutateAsync.mockResolvedValue({ email: 'x' })
  vi.mocked(useChangeEmail).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useChangeEmail>)
  withEmail('lea@acme.test')
})

const emailField = () => screen.getByLabelText('Adresse email')
const passwordField = () => screen.getByLabelText('Mot de passe actuel')
const save = () => screen.getByRole('button', { name: 'Enregistrer' })

async function typeEmail(value: string) {
  await userEvent.clear(emailField())
  await userEvent.type(emailField(), value)
}

describe('ChangeEmailForm', () => {
  it("montre l'adresse enregistrée et explique à quoi elle sert, sans demander de mot de passe tant qu'on ne la change pas", () => {
    render(<ChangeEmailForm />)

    expect(emailField()).toHaveValue('lea@acme.test')
    expect(screen.getByText(/réinitialiser votre mot de passe/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Mot de passe actuel')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument()
  })

  it('dès que l’adresse change : le mot de passe actuel est demandé, avec l’explication, et l’envoi reste bloqué sans lui', async () => {
    render(<ChangeEmailForm />)

    await typeEmail('nouvelle@acme.test')

    expect(passwordField()).toBeInTheDocument()
    expect(screen.getByText(/L'ancienne adresse sera prévenue/)).toBeInTheDocument()
    expect(save()).toBeDisabled()
  })

  it('envoie le mot de passe actuel et la nouvelle adresse (sans espaces autour), puis confirme que l’ancienne adresse est prévenue', async () => {
    render(<ChangeEmailForm />)

    await typeEmail('  nouvelle@acme.test ')
    await userEvent.type(passwordField(), 'mon-mot-de-passe')
    await userEvent.click(save())

    expect(mutateAsync).toHaveBeenCalledWith({ currentPassword: 'mon-mot-de-passe', email: 'nouvelle@acme.test' })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Adresse email enregistrée. L'ancienne adresse a été prévenue."),
    )
    // le champ de mot de passe disparaît : l'adresse enregistrée est celle de la réponse
    expect(screen.queryByLabelText('Mot de passe actuel')).not.toBeInTheDocument()
  })

  it('un compte sans adresse avant : même demande de mot de passe, confirmation sans « ancienne adresse »', async () => {
    withEmail(null)
    render(<ChangeEmailForm />)

    await typeEmail('premiere@acme.test')
    await userEvent.type(passwordField(), 'mon-mot-de-passe')
    await userEvent.click(save())

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Adresse email enregistrée'))
  })

  it('même adresse (casse différente) : alerte précise, rien à envoyer', async () => {
    render(<ChangeEmailForm />)

    await typeEmail('LEA@acme.test')

    expect(screen.getByRole('alert')).toHaveTextContent("C'est déjà l'adresse enregistrée sur votre compte")
    expect(emailField()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByLabelText('Mot de passe actuel')).not.toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('mot de passe incorrect : alerte précise sous le champ, notification, focus, adresse conservée', async () => {
    mutateAsync.mockRejectedValue(new ApiError(400, 'Current password is incorrect', 'CURRENT_PASSWORD_INVALID'))
    render(<ChangeEmailForm />)

    await typeEmail('nouvelle@acme.test')
    await userEvent.type(passwordField(), 'pas-le-bon')
    await userEvent.click(save())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Le mot de passe actuel est incorrect'))
    expect(screen.getByRole('alert')).toHaveTextContent('Le mot de passe actuel est incorrect')
    expect(passwordField()).toHaveAttribute('aria-invalid', 'true')
    expect(passwordField()).toHaveFocus()
    expect(emailField()).toHaveValue('nouvelle@acme.test')
  })

  it('l’alerte sur le mot de passe disparaît dès qu’on le corrige', async () => {
    mutateAsync.mockRejectedValue(new ApiError(400, 'x', 'CURRENT_PASSWORD_INVALID'))
    render(<ChangeEmailForm />)
    await typeEmail('nouvelle@acme.test')
    await userEvent.type(passwordField(), 'pas-le-bon')
    await userEvent.click(save())
    await screen.findByRole('alert')

    await userEvent.type(passwordField(), 'x')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('adresse déjà utilisée par un autre compte : alerte précise sous le champ, qui s’efface dès qu’on la modifie', async () => {
    mutateAsync.mockRejectedValue(new ApiError(409, 'x', 'EMAIL_TAKEN'))
    render(<ChangeEmailForm />)
    await typeEmail('pris@acme.test')
    await userEvent.type(passwordField(), 'mon-mot-de-passe')
    await userEvent.click(save())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cette adresse est déjà utilisée par un autre compte'))
    expect(screen.getByRole('alert')).toHaveTextContent('Cette adresse est déjà utilisée par un autre compte')
    expect(emailField()).toHaveAttribute('aria-invalid', 'true')

    await userEvent.type(emailField(), 'x')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('compte bloqué après des échecs : message de blocage', async () => {
    mutateAsync.mockRejectedValue(new ApiError(429, 'x', 'TOO_MANY_ATTEMPTS'))
    render(<ChangeEmailForm />)
    await typeEmail('nouvelle@acme.test')
    await userEvent.type(passwordField(), 'x')
    await userEvent.click(save())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Trop de tentatives échouées')))
  })

  it('autre erreur : message générique, jamais le texte du serveur', async () => {
    mutateAsync.mockRejectedValue(new ApiError(500, 'Internal server error'))
    render(<ChangeEmailForm />)
    await typeEmail('nouvelle@acme.test')
    await userEvent.type(passwordField(), 'x')
    await userEvent.click(save())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Impossible d'enregistrer l'adresse email"))
  })

  describe('avec la double authentification', () => {
    const codeField = () => screen.getByLabelText("Code de l'application (ou code de secours)")
    beforeEach(() => withEmail('lea@acme.test', '2026-10-11T10:00:00Z'))

    it('sans double authentification, aucun champ de code', async () => {
      withEmail('lea@acme.test')
      render(<ChangeEmailForm />)
      await typeEmail('nouvelle@acme.test')

      expect(screen.queryByLabelText("Code de l'application (ou code de secours)")).not.toBeInTheDocument()
    })

    it('rappelle que le code ne dure que 30 secondes', async () => {
      render(<ChangeEmailForm />)
      await typeEmail('nouvelle@acme.test')

      expect(screen.getByText(/le code ne dure que 30 secondes/)).toBeInTheDocument()
    })

    it('le code est demandé avec le mot de passe, et l’envoi reste bloqué sans lui', async () => {
      render(<ChangeEmailForm />)
      await typeEmail('nouvelle@acme.test')
      await userEvent.type(passwordField(), 'mon-mot-de-passe')

      expect(codeField()).toBeInTheDocument()
      expect(save()).toBeDisabled()

      await userEvent.type(codeField(), '123456')
      expect(save()).toBeEnabled()
    })

    it('envoie le code avec le mot de passe et la nouvelle adresse', async () => {
      render(<ChangeEmailForm />)
      await typeEmail('nouvelle@acme.test')
      await userEvent.type(passwordField(), 'mon-mot-de-passe')
      await userEvent.type(codeField(), ' 123456 ')
      await userEvent.click(save())

      expect(mutateAsync).toHaveBeenCalledWith({
        currentPassword: 'mon-mot-de-passe',
        email: 'nouvelle@acme.test',
        code: '123456',
      })
    })

    it('code refusé : alerte précise sous le champ, notification, focus, adresse conservée', async () => {
      mutateAsync.mockRejectedValue(new ApiError(400, 'The code is not valid', 'INVALID_TWO_FACTOR_CODE'))
      render(<ChangeEmailForm />)
      await typeEmail('nouvelle@acme.test')
      await userEvent.type(passwordField(), 'mon-mot-de-passe')
      await userEvent.type(codeField(), '000001')
      await userEvent.click(save())

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Ce code n'est pas valable")))
      expect(screen.getByRole('alert')).toHaveTextContent("Ce code n'est pas valable")
      expect(codeField()).toHaveAttribute('aria-invalid', 'true')
      expect(codeField()).toHaveFocus()
      expect(emailField()).toHaveValue('nouvelle@acme.test')

      await userEvent.type(codeField(), '2')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
