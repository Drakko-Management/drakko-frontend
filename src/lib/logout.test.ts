import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api-client'
import { getStoredRefreshToken, useAuthStore } from '@/store/auth.store'
import { logout } from './logout'

const apiRequest = vi.fn()

vi.mock('@/lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api-client')>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}))

function signIn() {
  useAuthStore.getState().setAuth('jeton-d-acces', 'jean', 'jeton-de-rafraichissement')
}

describe('logout', () => {
  beforeEach(() => {
    apiRequest.mockReset()
    signIn()
  })

  it('succès : le serveur a révoqué la session, l\'état local est effacé', async () => {
    apiRequest.mockResolvedValue(undefined)

    await expect(logout()).resolves.toBe('done')

    expect(apiRequest).toHaveBeenCalledWith('/auth/logout', { method: 'POST' })
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(getStoredRefreshToken()).toBeNull()
  })

  it.each([
    ['réseau coupé', new TypeError('Failed to fetch')],
    ['erreur serveur 500', new ApiError(500, 'Internal Server Error')],
    ['service indisponible 503', new ApiError(503, 'Service Unavailable')],
  ])('%s : la session reste ouverte et n\'est PAS effacée (le cookie, lui, resterait valable)', async (_what, error) => {
    apiRequest.mockRejectedValue(error)

    await expect(logout()).resolves.toBe('failed')

    expect(useAuthStore.getState().accessToken).toBe('jeton-d-acces')
    expect(getStoredRefreshToken()).toBe('jeton-de-rafraichissement')
  })

  it('401 après que le rafraîchissement a vidé la session : plus rien à révoquer, on se déconnecte', async () => {
    apiRequest.mockImplementation(() => {
      // ce que fait le client API quand le serveur refuse le jeton de rafraîchissement
      useAuthStore.getState().clearAuth()
      return Promise.reject(new ApiError(401, 'Session expired'))
    })

    await expect(logout()).resolves.toBe('done')

    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('401 alors que le rafraîchissement a échoué faute de réseau : la session existe encore, échec', async () => {
    apiRequest.mockRejectedValue(new ApiError(401, 'Session expired'))

    await expect(logout()).resolves.toBe('failed')

    expect(useAuthStore.getState().accessToken).toBe('jeton-d-acces')
    expect(getStoredRefreshToken()).toBe('jeton-de-rafraichissement')
  })
})
