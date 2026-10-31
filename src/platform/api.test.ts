import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { platformRequest } from './api'
import { usePlatformStore } from './store'
import { useAuthStore } from '@/store/auth.store'

const json = (status: number, body: object = {}) => new Response(JSON.stringify(body), { status })

beforeEach(() => {
  usePlatformStore.setState({ accessToken: 'plat-1', admin: null })
  useAuthStore.setState({ accessToken: 'jeton-organisation' })
})
afterEach(() => vi.unstubAllGlobals())

describe('platformRequest', () => {
  it('envoie le jeton de la plateforme, jamais celui de l’application', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await platformRequest('/platform/organizations')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer plat-1')
    expect(init.credentials).toBe('include')
  })

  it('un 401 renouvelle la session par le cookie, puis rejoue la requête avec le nouveau jeton', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200, { accessToken: 'plat-2' }))
      .mockResolvedValueOnce(json(200, { items: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(platformRequest('/platform/organizations')).resolves.toEqual({ items: [] })

    expect(fetchMock.mock.calls[1][0]).toMatch(/\/platform\/auth\/refresh$/)
    expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('POST')
    expect(((fetchMock.mock.calls[2][1] as RequestInit).headers as Record<string, string>).Authorization).toBe('Bearer plat-2')
    expect(usePlatformStore.getState().accessToken).toBe('plat-2')
    // la session de l’application n’est jamais touchée
    expect(useAuthStore.getState().accessToken).toBe('jeton-organisation')
  })

  it('si le renouvellement est refusé, la session plateforme est fermée et l’erreur remonte', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(401)))

    await expect(platformRequest('/platform/organizations')).rejects.toMatchObject({ status: 401 })

    expect(usePlatformStore.getState().accessToken).toBeNull()
  })

  it('un réseau coupé pendant le renouvellement ne ferme pas la session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(401)).mockRejectedValueOnce(new Error('réseau')))

    await expect(platformRequest('/platform/organizations')).rejects.toMatchObject({ status: 401 })

    expect(usePlatformStore.getState().accessToken).toBe('plat-1')
  })

  it('renvoie le code de l’API pour les autres erreurs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(409, { code: 'ORGANIZATION_SLUG_TAKEN', message: 'x' })))

    await expect(platformRequest('/platform/organizations', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      status: 409,
      code: 'ORGANIZATION_SLUG_TAKEN',
    })
  })
})
