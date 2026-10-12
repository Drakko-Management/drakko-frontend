import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let storedToken: string | null = null
// Le stockage local de l'appli, partagé entre onglets : ce que l'un écrit, l'autre le lit
vi.mock('@/store/auth.store', () => ({
  getStoredRefreshToken: () => storedToken,
  storeRefreshToken: (token: string) => { storedToken = token },
}))

import { refreshSession } from './session-refresh'

const SESSION = { accessToken: 'access-1', refreshToken: 'refresh-1' }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// Un verrou comme celui du navigateur : une seule fonction à la fois, dans l'ordre d'arrivée
function installLocks() {
  let tail: Promise<unknown> = Promise.resolve()
  const request = vi.fn((_name: string, callback: () => Promise<unknown>) => {
    const run = tail.then(callback, callback)
    tail = run.catch(() => undefined)
    return run
  })
  Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })
  return request
}

function removeLocks() {
  Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true })
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  storedToken = null
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'locks')
})

describe('refreshSession : réponse du serveur', () => {
  beforeEach(removeLocks)

  it('renvoie la session renouvelée', async () => {
    fetchMock.mockResolvedValue(jsonResponse(SESSION))

    await expect(refreshSession()).resolves.toEqual(SESSION)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/auth/refresh')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
  })

  it('envoie le jeton gardé par l’onglet, ou rien (le cookie suffit)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(SESSION))

    await refreshSession()
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].body).toBeUndefined()

    storedToken = 'jeton-de-l-onglet'
    await refreshSession()
    expect((fetchMock.mock.calls[1] as [string, RequestInit])[1].body).toBe(
      JSON.stringify({ refreshToken: 'jeton-de-l-onglet' }),
    )
  })

  it('garde le nouveau jeton dans le stockage local dès la réponse', async () => {
    storedToken = 'ancien'
    fetchMock.mockResolvedValue(jsonResponse(SESSION))

    await refreshSession()

    expect(storedToken).toBe(SESSION.refreshToken)
  })

  it.each([401, 403])('%i : le serveur refuse la session (null, on se reconnecte)', async (status) => {
    storedToken = 'ancien'
    fetchMock.mockResolvedValue(new Response(null, { status }))

    await expect(refreshSession()).resolves.toBeNull()
    expect(storedToken).toBe('ancien')
  })

  it('erreur du serveur ou réseau coupé : la session n’est pas jugée (false, on ne déconnecte pas)', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))
    await expect(refreshSession()).resolves.toBe(false)

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(refreshSession()).resolves.toBe(false)
  })
})

describe('refreshSession : onglets en même temps', () => {
  it('range les renouvellements à la file : le second attend le premier et présente le jeton qu’il a reçu', async () => {
    const request = installLocks()
    storedToken = 'T1'
    let finishFirst!: (res: Response) => void
    fetchMock
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishFirst = resolve }))
      .mockImplementationOnce(() => Promise.resolve(jsonResponse({ accessToken: 'access-2', refreshToken: 'T3' })))

    const first = refreshSession()
    const second = refreshSession()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    // le premier n'a pas répondu : le second n'a rien envoyé (avant, les deux présentaient T1 et l'un était refusé)
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // le premier reçoit son nouveau jeton : il l'écrit lui-même, avant de rendre le verrou
    finishFirst(jsonResponse({ accessToken: 'access-1', refreshToken: 'T2' }))

    await expect(first).resolves.toEqual({ accessToken: 'access-1', refreshToken: 'T2' })
    await expect(second).resolves.toEqual({ accessToken: 'access-2', refreshToken: 'T3' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect((fetchMock.mock.calls[1] as [string, RequestInit])[1].body).toBe(JSON.stringify({ refreshToken: 'T2' }))
    expect(new Set(request.mock.calls.map((call) => call[0]))).toEqual(new Set(['drakko-session-refresh']))
  })

  it('un renouvellement qui échoue libère le verrou pour le suivant', async () => {
    installLocks()
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(jsonResponse(SESSION))

    const [first, second] = await Promise.all([refreshSession(), refreshSession()])

    expect(first).toBe(false)
    expect(second).toEqual(SESSION)
  })

  it('abandonne une requête sans réponse au bout de 30 s, pour ne pas bloquer les autres onglets', async () => {
    installLocks()
    vi.useFakeTimers()
    fetchMock
      .mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
          }),
      )
      .mockResolvedValueOnce(jsonResponse(SESSION))

    const first = refreshSession()
    const second = refreshSession()
    await vi.advanceTimersByTimeAsync(29_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1_000)
    await expect(first).resolves.toBe(false)
    await expect(second).resolves.toEqual(SESSION)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('renouvelle quand même si le navigateur refuse le verrou', async () => {
    const request = installLocks()
    request.mockRejectedValueOnce(new DOMException('Denied', 'SecurityError'))
    fetchMock.mockResolvedValue(jsonResponse(SESSION))

    await expect(refreshSession()).resolves.toEqual(SESSION)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
