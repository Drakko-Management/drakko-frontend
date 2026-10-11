import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import { useConfirmTwoFactorSetup, useStartTwoFactorSetup } from '@/hooks/use-two-factor'
import { TwoFactorSetupFlow } from './TwoFactorSetupFlow'

vi.mock('@/hooks/use-two-factor', () => ({
  useStartTwoFactorSetup: vi.fn(),
  useConfirmTwoFactorSetup: vi.fn(),
}))
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

const SETUP = { secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/Drakko:lea?secret=JBSWY3DPEHPK3PXP', qrCode: 'data:image/png;base64,AAAA' }
const start = vi.fn()
const confirm = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  start.mockResolvedValue(SETUP)
  confirm.mockResolvedValue({ recoveryCodes: ['abcde-fghjk', 'mnpqr-stuvw'] })
  vi.mocked(useStartTwoFactorSetup).mockReturnValue({ mutateAsync: start, isPending: false } as unknown as ReturnType<typeof useStartTwoFactorSetup>)
  vi.mocked(useConfirmTwoFactorSetup).mockReturnValue({ mutateAsync: confirm, isPending: false } as unknown as ReturnType<typeof useConfirmTwoFactorSetup>)
})

const password = () => screen.getByLabelText('Mot de passe actuel')
const next = () => screen.getByRole('button', { name: 'Continuer' })

describe('TwoFactorSetupFlow — première activation', () => {
  it('commence par le mot de passe : sans lui, on ne peut pas continuer', async () => {
    render(<TwoFactorSetupFlow onDone={vi.fn()} />)

    expect(next()).toBeDisabled()
    await userEvent.type(password(), 'mon-mot-de-passe')
    expect(next()).toBeEnabled()
  })

  it('envoie le mot de passe (sans code, c’est une première activation), puis montre le QR code et la clé de secours', async () => {
    render(<TwoFactorSetupFlow onDone={vi.fn()} />)

    await userEvent.type(password(), 'mon-mot-de-passe')
    await userEvent.click(next())

    expect(start).toHaveBeenCalledWith({ currentPassword: 'mon-mot-de-passe' })
    expect(await screen.findByAltText(/QR code à scanner/)).toHaveAttribute('src', SETUP.qrCode)
    expect(screen.getByText(SETUP.secret)).toBeInTheDocument()
  })

  it('un mot de passe faux : alerte précise sous le champ, focus, aucune étape suivante', async () => {
    start.mockRejectedValue(new ApiError(400, 'x', 'CURRENT_PASSWORD_INVALID'))
    render(<TwoFactorSetupFlow onDone={vi.fn()} />)

    await userEvent.type(password(), 'pas-le-bon')
    await userEvent.click(next())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Le mot de passe actuel est incorrect'))
    expect(screen.getByRole('alert')).toHaveTextContent('Le mot de passe actuel est incorrect')
    expect(password()).toHaveAttribute('aria-invalid', 'true')
    expect(password()).toHaveFocus()
    expect(screen.queryByAltText(/QR code/)).not.toBeInTheDocument()
  })

  it('l’alerte sur le mot de passe disparaît dès qu’on le corrige', async () => {
    start.mockRejectedValue(new ApiError(400, 'x', 'CURRENT_PASSWORD_INVALID'))
    render(<TwoFactorSetupFlow onDone={vi.fn()} />)
    await userEvent.type(password(), 'pas-le-bon')
    await userEvent.click(next())
    await screen.findByRole('alert')

    await userEvent.type(password(), 'x')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('serveur sans clé de chiffrement : message clair', async () => {
    start.mockRejectedValue(new ApiError(503, 'x', 'TWO_FACTOR_UNAVAILABLE'))
    render(<TwoFactorSetupFlow onDone={vi.fn()} />)
    await userEvent.type(password(), 'mon-mot-de-passe')
    await userEvent.click(next())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("La double authentification n'est pas disponible pour le moment"))
  })

  async function reachScan() {
    render(<TwoFactorSetupFlow onDone={vi.fn()} />)
    await userEvent.type(password(), 'mon-mot-de-passe')
    await userEvent.click(next())
    await screen.findByAltText(/QR code/)
  }

  it('le bouton « Activer » n’accepte que 6 chiffres', async () => {
    await reachScan()
    const code = screen.getByLabelText('Code à 6 chiffres')
    const activate = screen.getByRole('button', { name: 'Activer' })

    await userEvent.type(code, '12345')
    expect(activate).toBeDisabled()
    await userEvent.type(code, '6')
    expect(activate).toBeEnabled()
    await userEvent.clear(code)
    await userEvent.type(code, 'abcdef')
    expect(activate).toBeDisabled()
  })

  it('un code accepté (espaces ignorés) active, puis montre les codes de secours', async () => {
    await reachScan()

    await userEvent.type(screen.getByLabelText('Code à 6 chiffres'), '123 456')
    await userEvent.click(screen.getByRole('button', { name: 'Activer' }))

    expect(confirm).toHaveBeenCalledWith({ code: '123456' })
    expect(await screen.findByText('abcde-fghjk')).toBeInTheDocument()
    expect(screen.queryByAltText(/QR code/)).not.toBeInTheDocument()
  })

  it('terminer (après avoir noté les codes) appelle onDone', async () => {
    const onDone = vi.fn()
    render(<TwoFactorSetupFlow onDone={onDone} />)
    await userEvent.type(password(), 'mon-mot-de-passe')
    await userEvent.click(next())
    await userEvent.type(await screen.findByLabelText('Code à 6 chiffres'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Activer' }))
    await userEvent.click(await screen.findByLabelText(/J'ai noté mes codes de secours/))

    await userEvent.click(screen.getByRole('button', { name: 'Terminer' }))

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('un code refusé : alerte précise sous le champ (heure du téléphone), focus, on reste sur le QR code', async () => {
    confirm.mockRejectedValue(new ApiError(400, 'x', 'INVALID_TWO_FACTOR_CODE'))
    await reachScan()

    await userEvent.type(screen.getByLabelText('Code à 6 chiffres'), '000001')
    await userEvent.click(screen.getByRole('button', { name: 'Activer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/vérifiez l'heure de votre téléphone/)
    expect(screen.getByLabelText('Code à 6 chiffres')).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(screen.getByLabelText('Code à 6 chiffres')).toHaveFocus())
    expect(screen.getByAltText(/QR code/)).toBeInTheDocument()
  })

  it('l’alerte sur le code disparaît dès qu’on le corrige', async () => {
    confirm.mockRejectedValue(new ApiError(400, 'x', 'INVALID_TWO_FACTOR_CODE'))
    await reachScan()
    await userEvent.type(screen.getByLabelText('Code à 6 chiffres'), '000001')
    await userEvent.click(screen.getByRole('button', { name: 'Activer' }))
    await screen.findByRole('alert')

    await userEvent.type(screen.getByLabelText('Code à 6 chiffres'), '2')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('« Annuler » est proposé quand un parent le demande', async () => {
    const onCancel = vi.fn()
    render(<TwoFactorSetupFlow onDone={vi.fn()} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onCancel).toHaveBeenCalled()
  })
})

describe('TwoFactorSetupFlow — changer d’appareil', () => {
  it('demande aussi le code de l’appareil actuel, et l’envoie avec le mot de passe', async () => {
    render(<TwoFactorSetupFlow replacing onDone={vi.fn()} />)
    const submit = screen.getByRole('button', { name: 'Continuer' })

    await userEvent.type(password(), 'mon-mot-de-passe')
    expect(submit).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/Code de l'application/), '654321')
    await userEvent.click(submit)

    expect(start).toHaveBeenCalledWith({ currentPassword: 'mon-mot-de-passe', code: '654321' })
  })

  it('un code actuel refusé : alerte précise sous ce champ', async () => {
    start.mockRejectedValue(new ApiError(400, 'x', 'INVALID_TWO_FACTOR_CODE'))
    render(<TwoFactorSetupFlow replacing onDone={vi.fn()} />)

    await userEvent.type(password(), 'mon-mot-de-passe')
    await userEvent.type(screen.getByLabelText(/Code de l'application/), '000001')
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Ce code n'est pas valable/)
    expect(screen.getByLabelText(/Code de l'application/)).toHaveAttribute('aria-invalid', 'true')
  })
})
