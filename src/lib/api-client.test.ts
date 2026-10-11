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
