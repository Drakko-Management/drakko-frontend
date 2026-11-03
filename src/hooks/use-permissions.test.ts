import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePermissions } from './use-permissions'
import { useAuthStore } from '@/store/auth.store'
import { FULL_PERMISSIONS, EMPTY_PERMISSIONS, makePermissions } from '@/lib/permissions'

// ── Reset ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    username: '',
    role: null,
    userId: null,
    permissions: null,
    modules: null,
  })
})

// ── ADMIN — bypass total ──────────────────────────────────────────────────

describe('usePermissions — ADMIN', () => {
  beforeEach(() => {
    useAuthStore.setState({ role: 'ADMIN', permissions: null })
  })

  it('isAdmin est true', () => {
    const { result } = renderHook(() => usePermissions())
    expect(result.current.isAdmin).toBe(true)
  })

  it('can() retourne true pour toute action sur tout module', () => {
    const { result } = renderHook(() => usePermissions())
    const modules = ['chantiers', 'clients', 'equipe', 'prestations'] as const
    const actions = ['read', 'create', 'update', 'delete'] as const
    modules.forEach((mod) => {
      actions.forEach((action) => {
        expect(result.current.can(mod, action)).toBe(true)
      })
    })
  })

  it('permissions retourne FULL_PERMISSIONS', () => {
    const { result } = renderHook(() => usePermissions())
    expect(result.current.permissions).toEqual(FULL_PERMISSIONS)
  })

  it('can() retourne true même si permissions store est null (bypass ADMIN)', () => {
    useAuthStore.setState({ role: 'ADMIN', permissions: null })
    const { result } = renderHook(() => usePermissions())
    expect(result.current.can('chantiers', 'delete')).toBe(true)
  })
})

// ── MEMBER sans rôle personnalisé ─────────────────────────────────────────

describe('usePermissions — MEMBER sans permissions', () => {
  beforeEach(() => {
    useAuthStore.setState({ role: 'MEMBER', permissions: null })
  })

  it('isAdmin est false', () => {
    const { result } = renderHook(() => usePermissions())
    expect(result.current.isAdmin).toBe(false)
  })

  it('can() retourne false pour toute action', () => {
    const { result } = renderHook(() => usePermissions())
    expect(result.current.can('chantiers', 'read')).toBe(false)
    expect(result.current.can('clients', 'create')).toBe(false)
    expect(result.current.can('equipe', 'update')).toBe(false)
    expect(result.current.can('prestations', 'delete')).toBe(false)
  })

  it('permissions retourne EMPTY_PERMISSIONS', () => {
    const { result } = renderHook(() => usePermissions())
    expect(result.current.permissions).toEqual(EMPTY_PERMISSIONS)
  })
})

// ── MEMBER avec permissions partielles ───────────────────────────────────

describe('usePermissions — MEMBER avec permissions partielles', () => {
  const customPerms = makePermissions({
    chantiers: ['read', 'update'],
    clients: ['read'],
  })

  beforeEach(() => {
    useAuthStore.setState({ role: 'MEMBER', permissions: customPerms })
  })

  it('can() retourne true pour les actions autorisées', () => {
    const { result } = renderHook(() => usePermissions())
    expect(result.current.can('chantiers', 'read')).toBe(true)
    expect(result.current.can('chantiers', 'update')).toBe(true)
    expect(result.current.can('clients', 'read')).toBe(true)
  })

  it('can() retourne false pour les actions non autorisées', () => {
    const { result } = renderHook(() => usePermissions())
    expect(result.current.can('chantiers', 'create')).toBe(false)
    expect(result.current.can('chantiers', 'delete')).toBe(false)
    expect(result.current.can('clients', 'create')).toBe(false)
    expect(result.current.can('equipe', 'read')).toBe(false)
    expect(result.current.can('prestations', 'read')).toBe(false)
  })

  it('permissions retourne les permissions effectives', () => {
    const { result } = renderHook(() => usePermissions())
    expect(result.current.permissions).toEqual(customPerms)
  })
})

// ── MEMBER avec accès complet ─────────────────────────────────────────────

describe('usePermissions — MEMBER avec FULL_PERMISSIONS', () => {
  beforeEach(() => {
    useAuthStore.setState({ role: 'MEMBER', permissions: FULL_PERMISSIONS })
  })

  it('can() retourne true pour toute action', () => {
    const { result } = renderHook(() => usePermissions())
    expect(result.current.can('chantiers', 'delete')).toBe(true)
    expect(result.current.can('equipe', 'create')).toBe(true)
  })

  it('isAdmin reste false même avec toutes les permissions', () => {
    const { result } = renderHook(() => usePermissions())
    expect(result.current.isAdmin).toBe(false)
  })
})

// ── Rôle null (non authentifié) ───────────────────────────────────────────

describe('usePermissions — non authentifié', () => {
  it('can() retourne false', () => {
    useAuthStore.setState({ role: null, permissions: null })
    const { result } = renderHook(() => usePermissions())
    expect(result.current.can('chantiers', 'read')).toBe(false)
  })

  it('isAdmin est false', () => {
    useAuthStore.setState({ role: null, permissions: null })
    const { result } = renderHook(() => usePermissions())
    expect(result.current.isAdmin).toBe(false)
  })
})

// ── Modules activables (ADR-029) ──────────────────────────────────────────

describe('usePermissions — modules de l\'organisation', () => {
  it('un module que l\'organisation n\'a pas est fermé même à un ADMIN', () => {
    useAuthStore.setState({ role: 'ADMIN', permissions: null, modules: ['devis'] })
    const { result } = renderHook(() => usePermissions())

    expect(result.current.can('chantiers', 'read')).toBe(false)
    expect(result.current.can('chantiers', 'create')).toBe(false)
    expect(result.current.can('devis', 'read')).toBe(true)
    expect(result.current.isModuleActive('chantiers')).toBe(false)
  })

  it('Clients, Prestations et Équipe restent ouverts, quels que soient les modules', () => {
    useAuthStore.setState({ role: 'ADMIN', permissions: null, modules: ['devis'] })
    const { result } = renderHook(() => usePermissions())

    expect(result.current.can('clients', 'read')).toBe(true)
    expect(result.current.can('prestations', 'update')).toBe(true)
    expect(result.current.can('equipe', 'create')).toBe(true)
  })

  it('un MEMBER dont le rôle donne le droit est refusé quand le module est inactif (droits dormants)', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ chantiers: ['read', 'update'], clients: ['read'] }),
      modules: ['devis'],
    })
    const { result } = renderHook(() => usePermissions())

    expect(result.current.can('chantiers', 'read')).toBe(false)
    expect(result.current.can('clients', 'read')).toBe(true)
  })

  it('le droit revient quand le module est réactivé', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ devis: ['read'] }), modules: ['chantiers'] })
    expect(renderHook(() => usePermissions()).result.current.can('devis', 'read')).toBe(false)

    useAuthStore.setState({ modules: ['chantiers', 'devis'] })
    expect(renderHook(() => usePermissions()).result.current.can('devis', 'read')).toBe(true)
  })

  it('liste des modules pas encore connue : rien n\'est masqué (l\'API reste seule juge)', () => {
    useAuthStore.setState({ role: 'ADMIN', permissions: null, modules: null })
    const { result } = renderHook(() => usePermissions())

    expect(result.current.can('chantiers', 'read')).toBe(true)
    expect(result.current.can('devis', 'read')).toBe(true)
  })
})
