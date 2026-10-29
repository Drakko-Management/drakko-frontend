import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions } from '@/lib/permissions'
import { useAppModules } from './use-app-modules'

function setUser(role: 'ADMIN' | 'MEMBER', permissions: ReturnType<typeof makePermissions> | null) {
  useAuthStore.setState({
    accessToken: 'tok',
    username: 'u',
    firstName: 'U',
    lastName: '',
    role,
    userId: 'u1',
    permissions,
  })
}

function keys() {
  return renderHook(() => useAppModules()).result.current.map((m) => m.key)
}

describe('useAppModules', () => {
  beforeEach(() => setUser('ADMIN', null))

  it("un administrateur voit tous les modules, dans l'ordre des menus", () => {
    expect(keys()).toEqual(['chantiers', 'clients', 'equipe', 'prestations'])
  })

  it('un membre ne voit que les modules qu’il peut lire', () => {
    setUser('MEMBER', makePermissions({ clients: ['read'], prestations: ['read', 'update'] }))
    expect(keys()).toEqual(['clients', 'prestations'])
  })

  it('créer sans pouvoir lire ne donne pas accès au module', () => {
    setUser('MEMBER', makePermissions({ chantiers: ['create'] }))
    expect(keys()).toEqual([])
  })

  it('un membre sans permissions ne voit aucun module', () => {
    setUser('MEMBER', null)
    expect(keys()).toEqual([])
  })
})
