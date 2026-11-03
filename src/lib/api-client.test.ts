import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { apiRequest, ApiError } from './api-client'
import { useAuthStore } from '@/store/auth.store'

const respond = (status: number, body: object) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'tok', twoFactorRequired: false })
})
afterEach(() => vi.unstubAllGlobals())

describe('apiRequest — double authentification exigée', () => {
  it('une réponse 403 TWO_FACTOR_REQUIRED marque le compte : l’interface le renvoie vers la configuration', async () => {
    respond(403, { message: 'Two-factor authentication must be set up first', code: 'TWO_FACTOR_REQUIRED' })

    const error = await apiRequest('/projects').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('TWO_FACTOR_REQUIRED')
    expect(useAuthStore.getState().twoFactorRequired).toBe(true)
  })

  it('un autre 403 ne marque rien', async () => {
    respond(403, { message: 'Forbidden', code: 'ADMIN_REQUIRED' })

    await apiRequest('/users').catch(() => undefined)

    expect(useAuthStore.getState().twoFactorRequired).toBe(false)
  })

  it('une réponse réussie ne marque rien', async () => {
    respond(200, { ok: true })

    await apiRequest('/users')

    expect(useAuthStore.getState().twoFactorRequired).toBe(false)
  })
})

describe('apiRequest — module coupé (ADR-029)', () => {
  it('un 403 MODULE_NOT_ACTIVE relit la liste des modules : les menus suivent sans attendre', async () => {
    useAuthStore.setState({ accessToken: 'tok', modules: ['chantiers', 'devis'] })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'MODULE_NOT_ACTIVE' }), { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ modules: ['chantiers'] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const error = await apiRequest('/quotes').catch((e: unknown) => e)

    expect((error as ApiError).code).toBe('MODULE_NOT_ACTIVE')
    await vi.waitFor(() => expect(useAuthStore.getState().modules).toEqual(['chantiers']))
    expect(String(fetchMock.mock.calls[1][0])).toContain('/users/me')
  })

  it('un autre 403 ne touche pas aux modules', async () => {
    useAuthStore.setState({ accessToken: 'tok', modules: ['devis'] })
    respond(403, { code: 'ADMIN_REQUIRED' })

    await apiRequest('/users').catch(() => undefined)

    expect(useAuthStore.getState().modules).toEqual(['devis'])
  })
})
