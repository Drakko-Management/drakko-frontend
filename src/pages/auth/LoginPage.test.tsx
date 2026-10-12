import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { apiRequest, ApiError } from '@/lib/api-client'
import { toast } from 'sonner'
import { LoginPage } from './LoginPage'
import { useAuthStore } from '@/store/auth.store'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
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

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

// ── Reset ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ accessToken: null, username: '', role: null, userId: null })
  sessionStorage.clear()
})

// ── Helpers ────────────────────────────────────────────────────────────────

function renderLogin() {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

async function fillAndSubmit(username = 'admin', password = 'Admin123!') {
  await userEvent.type(screen.getByLabelText('Identifiant'), username)
  await userEvent.type(screen.getByLabelText('Mot de passe'), password)
  await userEvent.click(screen.getByRole('button', { name: /se connecter/i }))
}

// ── Tests : rendu ──────────────────────────────────────────────────────────

describe('LoginPage — rendu', () => {
  it('affiche les champs identifiant et mot de passe', () => {
    renderLogin()
    expect(screen.getByLabelText('Identifiant')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
  })

  it('affiche le bouton Se connecter', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
  })

  it('affiche le logo Drakko (variantes claire et sombre)', () => {
    renderLogin()
    // Les deux variantes sont dans le DOM : le thème en masque une avec des classes `dark:`
    const sources = screen.getAllByRole('img', { name: 'Drakko' }).map((img) => img.getAttribute('src'))
    expect(sources).toEqual(['/drakko/logo_light.png', '/drakko/logo_dark.png'])
  })

  it('masque le mot de passe par défaut (type=password)', () => {
    renderLogin()
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'password')
  })

  it('bascule la visibilité du mot de passe', async () => {
    renderLogin()
    const pwdInput = screen.getByLabelText('Mot de passe')
    const toggleBtn = document.querySelector('button[type="button"]') as HTMLElement
    await userEvent.click(toggleBtn)
    expect(pwdInput).toHaveAttribute('type', 'text')
    await userEvent.click(toggleBtn)
    expect(pwdInput).toHaveAttribute('type', 'password')
  })
})

// ── Tests : succès ─────────────────────────────────────────────────────────

describe('LoginPage — succès', () => {
  it('appelle apiRequest avec les bons paramètres', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ accessToken: 'tok' })
    renderLogin()
    await fillAndSubmit()
    await waitFor(() =>
      expect(vi.mocked(apiRequest)).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'Admin123!' }),
      }),
    )
  })

  it('trim le username avant envoi', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ accessToken: 'tok' })
    renderLogin()
    await fillAndSubmit('  admin  ')
    await waitFor(() =>
      expect(vi.mocked(apiRequest)).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'Admin123!' }),
      }),
    )
  })

  it('stocke le token dans le store', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ accessToken: 'my-token' })
    renderLogin()
    await fillAndSubmit()
    await waitFor(() =>
      expect(useAuthStore.getState().accessToken).toBe('my-token'),
    )
  })

  it('navigue vers / après connexion', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ accessToken: 'tok' })
    renderLogin()
    await fillAndSubmit()
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }),
    )
  })
})

// ── Tests : erreurs ────────────────────────────────────────────────────────

describe('LoginPage — erreurs', () => {
  it('affiche "Identifiants incorrects" sur erreur 401', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new ApiError(401, 'Unauthorized'))
    renderLogin()
    await fillAndSubmit()
    await waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Identifiants incorrects'),
    )
  })

  it('affiche "Erreur de connexion, réessayez" sur autre erreur', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('Network error'))
    renderLogin()
    await fillAndSubmit()
    await waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        'Erreur de connexion, réessayez',
      ),
    )
  })
})

// ── Tests : chargement ─────────────────────────────────────────────────────

describe('LoginPage — chargement', () => {
  it('désactive le bouton pendant le submit', async () => {
    vi.mocked(apiRequest).mockReturnValueOnce(new Promise(() => {}))
    renderLogin()
    await fillAndSubmit()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /connexion/i })).toBeDisabled(),
    )
  })

  it('affiche "Connexion…" dans le bouton pendant le submit', async () => {
    vi.mocked(apiRequest).mockReturnValueOnce(new Promise(() => {}))
    renderLogin()
    await fillAndSubmit()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /connexion/i }),
      ).toHaveTextContent('Connexion…'),
    )
  })
})

// ── Tests : validation ─────────────────────────────────────────────────────

describe('LoginPage — validation', () => {
  it('ne soumet pas si username est uniquement des espaces', async () => {
    renderLogin()
    await fillAndSubmit('   ')
    expect(vi.mocked(apiRequest)).not.toHaveBeenCalled()
  })
})

describe('LoginPage — mot de passe oublié', () => {
  it('propose le lien vers la demande de réinitialisation', () => {
    renderLogin()
    expect(screen.getByRole('link', { name: 'Mot de passe oublié ?' })).toHaveAttribute('href', '/mot-de-passe-oublie')
  })
})

describe('LoginPage — compte bloqué', () => {
  it('trop de tentatives (429) : message dédié, pas « identifiants incorrects »', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new ApiError(429, 'Too many failed attempts'))
    renderLogin()

    await userEvent.type(screen.getByLabelText('Identifiant'), 'jean')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Trop de tentatives échouées')),
    )
    expect(toast.error).not.toHaveBeenCalledWith('Identifiants incorrects')
  })
})

// ── Double authentification : second pas de la connexion ──────────────────

describe('LoginPage — second facteur', () => {
  const CHALLENGE = { mfaRequired: true, mfaToken: 'jeton-de-defi' }
  const TOKENS = { accessToken: 'tok', refreshToken: 'ref' }

  async function reachSecondStep() {
    vi.mocked(apiRequest).mockResolvedValueOnce(CHALLENGE as never)
    renderLogin()
    await userEvent.type(screen.getByLabelText('Identifiant'), 'jean')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    await screen.findByText('Double authentification')
  }
  const codeField = () => screen.getByLabelText(/Code de l'application|Code de secours/)

  it('un compte qui a la double authentification : après le mot de passe, on demande le code (aucune session n’est ouverte)', async () => {
    await reachSecondStep()

    expect(screen.getByLabelText("Code de l'application")).toBeInTheDocument()
    expect(screen.queryByLabelText('Identifiant')).not.toBeInTheDocument()
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('le champ du code propose le code à usage unique au clavier et au gestionnaire de mots de passe', async () => {
    await reachSecondStep()

    expect(codeField()).toHaveAttribute('autocomplete', 'one-time-code')
    expect(codeField()).toHaveAttribute('inputmode', 'numeric')
  })

  it('envoie le jeton de défi et le code, puis ouvre la session', async () => {
    await reachSecondStep()
    vi.mocked(apiRequest).mockResolvedValueOnce(TOKENS as never)

    await userEvent.type(codeField(), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }))
    expect(apiRequest).toHaveBeenLastCalledWith('/auth/login/2fa', {
      method: 'POST',
      body: JSON.stringify({ mfaToken: 'jeton-de-defi', code: '123456' }),
    })
    expect(useAuthStore.getState().accessToken).toBe('tok')
  })

  it('les espaces autour du code (copié-collé) sont retirés avant l\'envoi', async () => {
    await reachSecondStep()
    vi.mocked(apiRequest).mockResolvedValueOnce(TOKENS as never)

    await userEvent.type(codeField(), '  123456  ')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => expect(apiRequest).toHaveBeenLastCalledWith('/auth/login/2fa', {
      method: 'POST',
      body: JSON.stringify({ mfaToken: 'jeton-de-defi', code: '123456' }),
    }))
    // La session s'ouvre puis la page navigue : on l'attend, sinon la navigation tombe dans le test suivant
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }))
  })

  it('code incorrect : alerte précise sous le champ (heure du téléphone, code de secours), pas de session, le formulaire reste', async () => {
    await reachSecondStep()
    vi.mocked(apiRequest).mockRejectedValueOnce(new ApiError(400, 'x', 'INVALID_TWO_FACTOR_CODE'))

    await userEvent.type(codeField(), '000001')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/vérifiez l'heure de votre téléphone/)
    expect(codeField()).toHaveAttribute('aria-invalid', 'true')
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('l’alerte disparaît dès qu’on corrige le code', async () => {
    await reachSecondStep()
    vi.mocked(apiRequest).mockRejectedValueOnce(new ApiError(400, 'x', 'INVALID_TWO_FACTOR_CODE'))
    await userEvent.type(codeField(), '000001')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    await screen.findByRole('alert')

    await userEvent.type(codeField(), '2')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('code de secours : le champ change (texte, libellé), et un code de secours faux a son propre message', async () => {
    await reachSecondStep()
    await userEvent.click(screen.getByRole('button', { name: 'Utiliser un code de secours' }))

    expect(screen.getByLabelText('Code de secours')).toHaveAttribute('inputmode', 'text')
    vi.mocked(apiRequest).mockRejectedValueOnce(new ApiError(400, 'x', 'INVALID_TWO_FACTOR_CODE'))
    await userEvent.type(codeField(), 'abcde-fghjk')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Ce code de secours n'est pas valable ou a déjà servi.")
  })

  it('revenir au code de l’application depuis le code de secours', async () => {
    await reachSecondStep()
    await userEvent.click(screen.getByRole('button', { name: 'Utiliser un code de secours' }))

    await userEvent.click(screen.getByRole('button', { name: "Utiliser le code de l'application" }))

    expect(screen.getByLabelText("Code de l'application")).toBeInTheDocument()
  })

  it('le bouton reste inactif sans code', async () => {
    await reachSecondStep()

    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeDisabled()
  })

  it('étape expirée (5 minutes) : retour au mot de passe avec un message', async () => {
    await reachSecondStep()
    vi.mocked(apiRequest).mockRejectedValueOnce(new ApiError(400, 'x', 'TWO_FACTOR_SESSION_EXPIRED'))
    await userEvent.type(codeField(), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cette étape a expiré, reconnectez-vous'))
    expect(screen.getByLabelText('Identifiant')).toBeInTheDocument()
  })

  it('compte bloqué après des échecs : message de blocage', async () => {
    await reachSecondStep()
    vi.mocked(apiRequest).mockRejectedValueOnce(new ApiError(429, 'x', 'TOO_MANY_ATTEMPTS'))
    await userEvent.type(codeField(), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Trop de tentatives échouées')))
  })

  it('« Retour » revient au mot de passe', async () => {
    await reachSecondStep()

    await userEvent.click(screen.getByRole('button', { name: 'Retour' }))

    expect(screen.getByLabelText('Identifiant')).toBeInTheDocument()
    expect(screen.queryByLabelText("Code de l'application")).not.toBeInTheDocument()
  })

  it('un compte sans double authentification se connecte directement, comme avant', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(TOKENS as never)
    renderLogin()
    await userEvent.type(screen.getByLabelText('Identifiant'), 'jean')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret')

    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }))
    expect(screen.queryByText('Double authentification')).not.toBeInTheDocument()
  })
})
