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
  beforeEach(() => {
    useAuthStore.setState({ modules: null })
    setUser('ADMIN', null)
  })

  it("un administrateur voit tous les modules, dans l'ordre des menus", () => {
    expect(keys()).toEqual(['chantiers', 'devis', 'factures', 'clients', 'equipe', 'prestations'])
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

  it('un module que l\'organisation n\'a pas disparaît des menus, même pour un administrateur (ADR-029)', () => {
    useAuthStore.setState({ modules: ['devis'] })
    expect(keys()).toEqual(['devis', 'clients', 'equipe', 'prestations'])
  })

  it('« Devis seul » : Chantiers n\'est nulle part, Devis, Clients et Prestations y sont', () => {
    useAuthStore.setState({ modules: ['devis'] })
    setUser('MEMBER', makePermissions({ chantiers: ['read'], devis: ['read'], clients: ['read'], prestations: ['read'] }))
    expect(keys()).toEqual(['devis', 'clients', 'prestations'])
  })
})
