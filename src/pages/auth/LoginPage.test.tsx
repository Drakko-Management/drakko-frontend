import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { apiRequest, ApiError } from '@/lib/api-client'
import { toast } from 'sonner'
import { LoginPage } from './LoginPage'
import { useAuthStore } from '@/store/auth.store'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

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
