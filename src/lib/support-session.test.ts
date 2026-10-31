import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { enterSupportSession, leaveSupportSession, type SupportGrant } from './support-session'
import { apiRequest, ApiError } from './api-client'
import { useAuthStore } from '@/store/auth.store'
import { queryClient } from './query-client'
import { toast } from 'sonner'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

// Mode dépannage (ADR-028) : le jeton reste en mémoire, rien ne touche à la session ni aux préférences du navigateur

const GRANT: SupportGrant = {
  accessToken: 'support-token',
  expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  reason: 'Le client ne voit plus ses chantiers',
  organization: { id: 'org-1', name: 'Jardins du Sud' },
  user: { id: 'u-1', username: 'lea.martin', firstName: 'Léa', lastName: 'Martin', role: 'ADMIN' },
}

const assign = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  useAuthStore.setState({ accessToken: null, support: null, twoFactorRequired: true, permissions: null })
  vi.stubGlobal('location', { ...window.location, assign })
})
afterEach(() => vi.unstubAllGlobals())

const profile = (extra: object = {}) =>
  vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        firstName: 'Léa',
        lastName: 'Martin',
        navSlots: ['chantiers'],
        customRole: { name: 'Chef', permissions: { chantiers: ['read'] } },
        language: 'de',
        theme: 'dark',
        ...extra,
      }),
      { status: 200 },
    ),
  )

describe('enterSupportSession', () => {
  it('ouvre la session avec le jeton de dépannage et note le mode, le motif, l’organisation et la personne vue', async () => {
    vi.stubGlobal('fetch', profile())

    await enterSupportSession(GRANT)

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('support-token')
    expect(state.support).toMatchObject({
      reason: 'Le client ne voit plus ses chantiers',
      organizationName: 'Jardins du Sud',
      viewingAs: 'Léa Martin',
    })
    expect(state.support?.expiresAt).toBe(new Date(GRANT.expiresAt).getTime())
    expect(state.permissions).toEqual({ chantiers: ['read'] })
    expect(state.navSlots).toEqual(['chantiers'])
  })

  it('relit le profil avec le jeton de dépannage', async () => {
    const fetchMock = profile()
    vi.stubGlobal('fetch', fetchMock)

    await enterSupportSession(GRANT)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/users\/me$/)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer support-token')
  })

  it('n’écrit jamais de jeton de renouvellement, et ne change ni la langue ni le thème de ce navigateur', async () => {
    localStorage.setItem('drakko-lang', 'fr')
    vi.stubGlobal('fetch', profile())

    await enterSupportSession(GRANT)

    expect(localStorage.getItem('drakko-rt')).toBeNull()
    expect(localStorage.getItem('drakko-lang')).toBe('fr')
    expect(localStorage.length).toBe(1)
  })

  it('ne touche pas au jeton de renouvellement d’une session ordinaire déjà présente dans ce navigateur', async () => {
    localStorage.setItem('drakko-rt', 'session-ordinaire')
    vi.stubGlobal('fetch', profile())

    await enterSupportSession(GRANT)

    expect(localStorage.getItem('drakko-rt')).toBe('session-ordinaire')
  })

  it('ne renvoie pas vers la configuration de la double authentification de la personne vue', async () => {
    vi.stubGlobal('fetch', profile())
    await enterSupportSession(GRANT)
    expect(useAuthStore.getState().twoFactorRequired).toBe(false)
  })

  it('vide les données en cache : rien de la session précédente n’est montré', async () => {
    queryClient.setQueryData(['projects'], { data: ['reste'] })
    vi.stubGlobal('fetch', profile())

    await enterSupportSession(GRANT)

    expect(queryClient.getQueryData(['projects'])).toBeUndefined()
  })

  it('la session est ouverte même si le profil ne se charge pas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')))
    await enterSupportSession(GRANT)
    expect(useAuthStore.getState().support).not.toBeNull()
  })
})

describe('leaveSupportSession', () => {
  it('recharge la page sur la plateforme et efface le nom gardé pour l’onglet', () => {
    sessionStorage.setItem('username', 'lea.martin')
    sessionStorage.setItem('firstName', 'Léa')
    sessionStorage.setItem('lastName', 'Martin')

    leaveSupportSession()

    expect(assign).toHaveBeenCalledWith('/plateforme')
    expect(sessionStorage.length).toBe(0)
  })
})

describe('apiRequest en mode dépannage', () => {
  it('un 401 met fin au mode sans tenter de renouveler la session, et laisse la session ordinaire du navigateur intacte', async () => {
    localStorage.setItem('drakko-rt', 'session-ordinaire')
    vi.stubGlobal('fetch', profile())
    await enterSupportSession(GRANT)
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const error = await apiRequest('/projects').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
    // une seule requête : pas de POST /auth/refresh
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).not.toMatch(/refresh/)
    expect(assign).toHaveBeenCalledWith('/plateforme')
    expect(localStorage.getItem('drakko-rt')).toBe('session-ordinaire')
  })

  it('une écriture refusée (SUPPORT_READ_ONLY) remonte avec son code, sans fin de session', async () => {
    vi.stubGlobal('fetch', profile())
    await enterSupportSession(GRANT)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'SUPPORT_READ_ONLY' }), { status: 403 })),
    )

    const error = await apiRequest('/clients', { method: 'POST', body: '{}' }).catch((e: unknown) => e)

    expect((error as ApiError).code).toBe('SUPPORT_READ_ONLY')
    expect(useAuthStore.getState().support).not.toBeNull()
    expect(assign).not.toHaveBeenCalled()
    // quel que soit l'écran, l'utilisateur est prévenu que c'est la lecture seule
    expect(toast.error).toHaveBeenCalledWith('Mode dépannage : lecture seule, rien ne peut être modifié', { id: 'support-read-only' })
  })
})
