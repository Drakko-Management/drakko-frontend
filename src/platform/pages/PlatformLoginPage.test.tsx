import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ApiError } from '@/lib/api-client'
import { PlatformLoginPage } from './PlatformLoginPage'
import * as api from '../api'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../api', () => ({
  platformPublicRequest: vi.fn(),
  startPlatformSession: vi.fn(),
  loadPlatformAdmin: vi.fn().mockResolvedValue({ id: 'a', username: 'root', name: 'Root' }),
}))

const publicRequest = vi.mocked(api.platformPublicRequest)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.loadPlatformAdmin).mockResolvedValue({ id: 'a', username: 'root', name: 'Root' })
})

function renderPage() {
  render(
    <MemoryRouter>
      <PlatformLoginPage />
    </MemoryRouter>,
  )
}

async function submitPassword() {
  await userEvent.type(screen.getByLabelText('Identifiant'), 'root')
  await userEvent.type(screen.getByLabelText('Mot de passe'), 'correct cheval pile agrafe')
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
}

describe('PlatformLoginPage — logo', () => {
  it('affiche le logo Drakko (variantes claire et sombre), comme la connexion des clients', () => {
    renderPage()
    const sources = screen.getAllByRole('img', { name: 'Drakko' }).map((img) => img.getAttribute('src'))
    expect(sources).toEqual(['/drakko/logo_light.png', '/drakko/logo_dark.png'])
  })
})

describe('PlatformLoginPage — appareil déjà configuré', () => {
  it('le mot de passe ne suffit pas : le code est demandé, et aucune session ne démarre avant', async () => {
    publicRequest.mockResolvedValueOnce({ mfaRequired: true, mfaToken: 'mfa-1' })
    renderPage()

    await submitPassword()

    expect(await screen.findByText('Double authentification')).toBeInTheDocument()
    expect(api.startPlatformSession).not.toHaveBeenCalled()
    expect(publicRequest).toHaveBeenCalledWith('/platform/auth/login', { username: 'root', password: 'correct cheval pile agrafe' })
  })

  it('le bon code ouvre la session et mène à la plateforme', async () => {
    publicRequest.mockResolvedValueOnce({ mfaRequired: true, mfaToken: 'mfa-1' }).mockResolvedValueOnce({ accessToken: 'plat-1' })
    renderPage()
    await submitPassword()

    await userEvent.type(await screen.findByLabelText(/code/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => expect(api.startPlatformSession).toHaveBeenCalledWith('plat-1'))
    expect(publicRequest).toHaveBeenLastCalledWith('/platform/auth/login/2fa', { mfaToken: 'mfa-1', code: '123456' })
    expect(mockNavigate).toHaveBeenCalledWith('/plateforme', { replace: true })
  })

  it('un code refusé reste sur l’étape du code, avec le message traduit', async () => {
    publicRequest
      .mockResolvedValueOnce({ mfaRequired: true, mfaToken: 'mfa-1' })
      .mockRejectedValueOnce(new ApiError(400, 'x', 'INVALID_TWO_FACTOR_CODE'))
    renderPage()
    await submitPassword()

    await userEvent.type(await screen.findByLabelText(/code/i), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Ce code n'est pas valable")
    expect(api.startPlatformSession).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('un mot de passe refusé reste sur la première étape, avec un message', async () => {
    publicRequest.mockRejectedValueOnce(new ApiError(401, 'x'))
    renderPage()

    await submitPassword()

    expect(await screen.findByRole('alert')).toHaveTextContent('Connexion impossible')
    expect(screen.getByLabelText('Identifiant')).toBeInTheDocument()
  })

  it('un compte bloqué affiche le message de blocage', async () => {
    publicRequest.mockRejectedValueOnce(new ApiError(429, 'x', 'TOO_MANY_ATTEMPTS'))
    renderPage()

    await submitPassword()

    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de tentatives')
  })
})

describe('PlatformLoginPage — première connexion', () => {
  it('configure l’appareil avant toute session : QR code, premier code, puis codes de secours montrés avant d’entrer', async () => {
    publicRequest
      .mockResolvedValueOnce({ enrolmentRequired: true, enrolmentToken: 'enrol-1' })
      .mockResolvedValueOnce({ secret: 'SECRETCLE', otpauthUri: 'otpauth://x', qrCode: 'data:image/png;base64,AAA' })
      .mockResolvedValueOnce({ accessToken: 'plat-1', recoveryCodes: ['abcde-23456', 'fghjk-78923'] })
    renderPage()
    await submitPassword()

    expect(await screen.findByText("Configurer l'application d'authentification")).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /QR code/ })).toHaveAttribute('src', 'data:image/png;base64,AAA')
    expect(screen.getByText('SECRETCLE')).toBeInTheDocument()
    expect(publicRequest).toHaveBeenCalledWith('/platform/auth/enrol/setup', { enrolmentToken: 'enrol-1' })
    expect(api.startPlatformSession).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText(/code/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Activer et me connecter' }))

    // les codes de secours ne s'affichent qu'une fois : la session n'est ouverte qu'après qu'on les a vus
    const codes = await screen.findByTestId('recovery-codes')
    expect(codes).toHaveTextContent('abcde-23456')
    expect(codes).toHaveTextContent('fghjk-78923')
    expect(api.startPlatformSession).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: "J'ai noté mes codes" }))

    await waitFor(() => expect(api.startPlatformSession).toHaveBeenCalledWith('plat-1'))
    expect(mockNavigate).toHaveBeenCalledWith('/plateforme', { replace: true })
  })
})
