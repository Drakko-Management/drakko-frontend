import { describe, it, expect } from 'vitest'
import { MODULES } from '@/lib/permissions'
import { routes } from '@/router/routes'
import { APP_MODULES } from './registry'
import { DASHBOARD_WIDGETS } from './dashboard-widgets'
import { NAV_SLOT_REGISTRY, SLOT_TO_PERM_MODULE } from '@/lib/nav-slots'
import type { PermModule } from '@/types/api'

/** Chemins absolus de toutes les routes (les enfants portent un chemin relatif à la coque, donc à la racine). */
function routePaths(): Set<string> {
  const paths = new Set<string>()
  function collect(list: typeof routes) {
    for (const route of list) {
      if (route.path) paths.add(`/${route.path}`.replace('//', '/'))
      if (route.children) collect(route.children)
    }
  }
  collect(routes)
  return paths
}

// Ces tests gardent la liste des modules : ajouter un module de permission sans l'inscrire au registre
// (ou l'inverse) casse ici, avant d'avoir un menu incomplet ou un droit sans écran.

describe('registre des modules', () => {
  it('chaque module de permission a exactement une entrée', () => {
    expect(APP_MODULES.map((m) => m.key).sort()).toEqual([...MODULES].sort())
  })

  it('les emplacements de la barre du bas sont uniques', () => {
    const slots = APP_MODULES.map((m) => m.slot)
    expect(new Set(slots).size).toBe(slots.length)
  })

  it('les adresses des modules sont uniques', () => {
    const paths = APP_MODULES.map((m) => m.to)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('chaque module a une adresse, une icône et des libellés', () => {
    for (const module of APP_MODULES) {
      expect(module.to).toMatch(/^\//)
      expect(module.icon).toBeDefined()
      expect(module.labelKey).toBeTruthy()
      expect(module.nameKey).toBeTruthy()
    }
  })

  it("l'adresse de chaque module existe dans les routes", () => {
    const paths = routePaths()
    for (const module of APP_MODULES) expect(paths).toContain(module.to)
  })

  it("l'action de création d'un module mène à une route existante", () => {
    const paths = routePaths()
    for (const module of APP_MODULES) {
      if (module.createAction) expect(paths).toContain(module.createAction.to)
    }
  })
})

describe('blocs du tableau de bord', () => {
  it('chaque bloc appartient à un module du registre', () => {
    const keys = new Set<PermModule>(APP_MODULES.map((m) => m.key))
    for (const key of Object.keys(DASHBOARD_WIDGETS)) expect(keys).toContain(key)
  })
})

describe('emplacements de navigation dérivés du registre', () => {
  it.each(APP_MODULES.map((m) => [m.slot, m] as const))('%s reprend le module du registre', (slot, module) => {
    expect(NAV_SLOT_REGISTRY[slot]).toEqual({
      to: module.to,
      icon: module.icon,
      labelKey: module.labelKey,
      nameKey: module.nameKey,
    })
    expect(SLOT_TO_PERM_MODULE[slot]).toBe(module.key)
  })

  it('les réglages restent un emplacement hors registre, ouvert à tous', () => {
    expect(NAV_SLOT_REGISTRY.parametres.to).toBe('/parametres')
    expect(SLOT_TO_PERM_MODULE.parametres).toBeNull()
  })
})
