import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import {
  useDisableTwoFactor,
  useRegenerateRecoveryCodes,
  useTwoFactorStatus,
} from '@/hooks/use-two-factor'
import { useAuthStore } from '@/store/auth.store'
import { TwoFactorCard } from './TwoFactorCard'

vi.mock('@/components/two-factor/TwoFactorSetupFlow', () => ({
  TwoFactorSetupFlow: ({ replacing, onCancel }: { replacing?: boolean; onCancel?: () => void }) => (
    <div>
      {replacing ? 'flux nouvel appareil' : 'flux première activation'}
      <button onClick={onCancel}>annuler le flux</button>
    </div>
  ),
}))
vi.mock('@/hooks/use-two-factor', () => ({
  useTwoFactorStatus: vi.fn(),
  useDisableTwoFactor: vi.fn(),
  useRegenerateRecoveryCodes: vi.fn(),
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

const disable = vi.fn()
const regenerate = vi.fn()

function status(overrides = {}) {
  vi.mocked(useTwoFactorStatus).mockReturnValue({
    data: { available: true, enabled: false, required: false, codesLeft: 0, ...overrides },
  } as unknown as ReturnType<typeof useTwoFactorStatus>)
}

beforeEach(() => {
  vi.clearAllMocks()
  disable.mockResolvedValue(undefined)
  regenerate.mockResolvedValue({ recoveryCodes: ['aaaaa-bbbbb', 'ccccc-ddddd'] })
  vi.mocked(useDisableTwoFactor).mockReturnValue({ mutateAsync: disable, isPending: false } as unknown as ReturnType<typeof useDisableTwoFactor>)
  vi.mocked(useRegenerateRecoveryCodes).mockReturnValue({ mutateAsync: regenerate, isPending: false } as unknown as ReturnType<typeof useRegenerateRecoveryCodes>)
  useAuthStore.setState({ accessToken: 'tok', username: 'lea', role: 'MEMBER', userId: 'u1' })
  status()
})

const lastDisableButton = () => {
  const buttons = screen.getAllByRole('button', { name: 'Désactiver' })
  return buttons[buttons.length - 1]
}
const header = () => screen.getByRole('button', { name: /Double authentification/ })
async function open() {
  await userEvent.click(header())
}

describe('TwoFactorCard', () => {
  it('rien du tout tant que l’état n’est pas chargé, ni quand le serveur ne l’offre pas (pas de clé de chiffrement)', () => {
    vi.mocked(useTwoFactorStatus).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useTwoFactorStatus>)
    const { container, rerender } = render(<TwoFactorCard />)
    expect(container).toBeEmptyDOMElement()

    status({ available: false })
    rerender(<TwoFactorCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('repliée au départ, avec l’état dans l’en-tête', () => {
    render(<TwoFactorCard />)

    expect(header()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Désactivée')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Activer la double authentification' })).not.toBeInTheDocument()
  })

  it('activée : l’en-tête le dit', () => {
    status({ enabled: true, codesLeft: 10 })
    render(<TwoFactorCard />)

    expect(screen.getByText('Activée')).toBeInTheDocument()
  })

  it('désactivée : explique à quoi ça sert et propose de l’activer (le flux de configuration s’ouvre)', async () => {
    render(<TwoFactorCard />)
    await open()

    expect(screen.getByText(/application d'authentification/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Activer la double authentification' }))

    expect(screen.getByText('flux première activation')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'annuler le flux' }))
    expect(screen.getByRole('button', { name: 'Activer la double authentification' })).toBeInTheDocument()
  })

  it('activée : dit combien de codes de secours restent, et propose changer d’appareil, renouveler les codes, désactiver', async () => {
    status({ enabled: true, codesLeft: 7 })
    render(<TwoFactorCard />)
    await open()

    expect(screen.getByText(/Il vous reste 7 codes de secours/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Changer d'appareil" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Renouveler les codes de secours' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Désactiver' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('peu de codes de secours (3 ou moins) : alerte pour les renouveler', async () => {
    status({ enabled: true, codesLeft: 2 })
    render(<TwoFactorCard />)
    await open()

    expect(screen.getByRole('alert')).toHaveTextContent('Il ne vous reste que 2 codes de secours : renouvelez-les.')
  })

  it('un seul code restant : singulier', async () => {
    status({ enabled: true, codesLeft: 1 })
    render(<TwoFactorCard />)
    await open()

    expect(screen.getByRole('alert')).toHaveTextContent('Il ne vous reste que 1 code de secours')
  })

  it('un administrateur ne peut pas la désactiver : pas de bouton, une note le dit', async () => {
    useAuthStore.setState({ role: 'ADMIN' })
    status({ enabled: true, codesLeft: 10 })
    render(<TwoFactorCard />)
    await open()

    expect(screen.queryByRole('button', { name: 'Désactiver' })).not.toBeInTheDocument()
    expect(screen.getByText(/Obligatoire pour les administrateurs/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Changer d'appareil" })).toBeInTheDocument()
  })

  it('changer d’appareil : ouvre le flux avec le code actuel demandé', async () => {
    status({ enabled: true, codesLeft: 10 })
    render(<TwoFactorCard />)
    await open()

    await userEvent.click(screen.getByRole('button', { name: "Changer d'appareil" }))

    expect(screen.getByText('flux nouvel appareil')).toBeInTheDocument()
  })

  describe('renouveler les codes de secours', () => {
    beforeEach(async () => {
      status({ enabled: true, codesLeft: 10 })
      render(<TwoFactorCard />)
      await open()
      await userEvent.click(screen.getByRole('button', { name: 'Renouveler les codes de secours' }))
    })

    it('demande le mot de passe et un code, puis montre les nouveaux codes', async () => {
      const submit = screen.getByRole('button', { name: 'Renouveler les codes de secours' })
      expect(submit).toBeDisabled()

      await userEvent.type(screen.getByLabelText('Mot de passe actuel'), 'mon-mot-de-passe')
      await userEvent.type(screen.getByLabelText(/Code de l'application/), '123456')
      await userEvent.click(submit)

      expect(regenerate).toHaveBeenCalledWith({ currentPassword: 'mon-mot-de-passe', code: '123456' })
      expect(await screen.findByText('aaaaa-bbbbb')).toBeInTheDocument()
    })

    it('un code refusé : alerte précise sous le champ', async () => {
      regenerate.mockRejectedValue(new ApiError(400, 'x', 'INVALID_TWO_FACTOR_CODE'))
      await userEvent.type(screen.getByLabelText('Mot de passe actuel'), 'mon-mot-de-passe')
      await userEvent.type(screen.getByLabelText(/Code de l'application/), '000001')
      await userEvent.click(screen.getByRole('button', { name: 'Renouveler les codes de secours' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(/Ce code n'est pas valable/)
      expect(screen.getByLabelText(/Code de l'application/)).toHaveAttribute('aria-invalid', 'true')
    })

    it('un mot de passe faux : alerte précise et focus', async () => {
      regenerate.mockRejectedValue(new ApiError(400, 'x', 'CURRENT_PASSWORD_INVALID'))
      await userEvent.type(screen.getByLabelText('Mot de passe actuel'), 'pas-le-bon')
      await userEvent.type(screen.getByLabelText(/Code de l'application/), '123456')
      await userEvent.click(screen.getByRole('button', { name: 'Renouveler les codes de secours' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Le mot de passe actuel est incorrect')
      await waitFor(() => expect(screen.getByLabelText('Mot de passe actuel')).toHaveFocus())
    })

    it('« Annuler » revient aux actions', async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

      expect(screen.getByRole('button', { name: "Changer d'appareil" })).toBeInTheDocument()
    })
  })

  describe('désactiver (membre)', () => {
    beforeEach(async () => {
      status({ enabled: true, codesLeft: 10 })
      render(<TwoFactorCard />)
      await open()
      await userEvent.click(screen.getByRole('button', { name: 'Désactiver' }))
    })

    it('prévient de ce que ça retire, demande le mot de passe et un code, puis confirme', async () => {
      expect(screen.getByText(/retire la protection supplémentaire/)).toBeInTheDocument()
      await userEvent.type(screen.getByLabelText('Mot de passe actuel'), 'mon-mot-de-passe')
      await userEvent.type(screen.getByLabelText(/Code de l'application/), '123456')

      await userEvent.click(lastDisableButton())

      expect(disable).toHaveBeenCalledWith({ currentPassword: 'mon-mot-de-passe', code: '123456' })
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Double authentification désactivée'))
    })

    it('le bouton reste inactif sans mot de passe et sans code', () => {
      expect(lastDisableButton()).toBeDisabled()
    })

    it('un administrateur interdit côté serveur : message précis', async () => {
      disable.mockRejectedValue(new ApiError(400, 'x', 'TWO_FACTOR_REQUIRED_FOR_ADMIN'))
      await userEvent.type(screen.getByLabelText('Mot de passe actuel'), 'mon-mot-de-passe')
      await userEvent.type(screen.getByLabelText(/Code de l'application/), '123456')
      await userEvent.click(lastDisableButton())

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Obligatoire pour les administrateurs : elle ne peut pas être désactivée'))
    })
  })
})
