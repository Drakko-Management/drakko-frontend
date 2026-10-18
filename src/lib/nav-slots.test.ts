import { describe, it, expect } from 'vitest'
import {
  DEFAULT_NAV_SLOTS,
  NAV_SLOT_REGISTRY,
  ALL_SLOT_KEYS,
  type NavSlotKey,
} from './nav-slots'

// ── DEFAULT_NAV_SLOTS ──────────────────────────────────────────────────────

describe('DEFAULT_NAV_SLOTS', () => {
  it('contient 3 entrées', () => {
    expect(DEFAULT_NAV_SLOTS).toHaveLength(3)
  })

  it('contient chantiers, clients, prestations', () => {
    expect(DEFAULT_NAV_SLOTS).toContain('chantiers')
    expect(DEFAULT_NAV_SLOTS).toContain('clients')
    expect(DEFAULT_NAV_SLOTS).toContain('prestations')
  })

  it('ne contient pas utilisateurs', () => {
    expect(DEFAULT_NAV_SLOTS).not.toContain('utilisateurs')
  })
})

// ── ALL_SLOT_KEYS ──────────────────────────────────────────────────────────

describe('ALL_SLOT_KEYS', () => {
  it('contient 5 clés', () => {
    expect(ALL_SLOT_KEYS).toHaveLength(5)
  })

  it('contient les 5 emplacements', () => {
    const expected: NavSlotKey[] = ['chantiers', 'clients', 'utilisateurs', 'prestations', 'parametres']
    expected.forEach((k) => expect(ALL_SLOT_KEYS).toContain(k))
  })

  it('correspond aux clés du registre', () => {
    const registryKeys = Object.keys(NAV_SLOT_REGISTRY) as NavSlotKey[]
    expect(ALL_SLOT_KEYS.sort()).toEqual(registryKeys.sort())
  })
})

// ── NAV_SLOT_REGISTRY ─────────────────────────────────────────────────────

describe('NAV_SLOT_REGISTRY — structure', () => {
  const KEYS: NavSlotKey[] = ['chantiers', 'clients', 'utilisateurs', 'prestations', 'parametres']

  it.each(KEYS)('%s a les champs requis (to, icon, labelKey, nameKey)', (key) => {
    const entry = NAV_SLOT_REGISTRY[key]
    expect(entry).toHaveProperty('to')
    expect(entry).toHaveProperty('icon')
    expect(entry).toHaveProperty('labelKey')
    expect(entry).toHaveProperty('nameKey')
  })

  it.each(KEYS)('%s a un champ to non vide', (key) => {
    expect(NAV_SLOT_REGISTRY[key].to).toBeTruthy()
  })

  it.each(KEYS)('%s a une icône (React.ElementType)', (key) => {
    // Lucide icons peuvent être des fonctions ou des objets forwardRef
    const icon = NAV_SLOT_REGISTRY[key].icon
    expect(icon).toBeDefined()
    expect(icon).not.toBeNull()
    expect(['function', 'object']).toContain(typeof icon)
  })
})

// ── NAV_SLOT_REGISTRY — routes ─────────────────────────────────────────────

describe('NAV_SLOT_REGISTRY — routes attendues', () => {
  it('chantiers pointe vers /chantiers', () => {
    expect(NAV_SLOT_REGISTRY.chantiers.to).toBe('/chantiers')
  })

  it('clients pointe vers /clients', () => {
    expect(NAV_SLOT_REGISTRY.clients.to).toBe('/clients')
  })

  it('utilisateurs pointe vers /utilisateurs', () => {
    expect(NAV_SLOT_REGISTRY.utilisateurs.to).toBe('/utilisateurs')
  })

  it('prestations pointe vers /prestations', () => {
    expect(NAV_SLOT_REGISTRY.prestations.to).toBe('/prestations')
  })

  it('parametres pointe vers /parametres', () => {
    expect(NAV_SLOT_REGISTRY.parametres.to).toBe('/parametres')
  })
})

// ── NAV_SLOT_REGISTRY — clés i18n ─────────────────────────────────────────

describe('NAV_SLOT_REGISTRY — clés i18n', () => {
  it('chantiers a labelKey = nav.projects', () => {
    expect(NAV_SLOT_REGISTRY.chantiers.labelKey).toBe('nav.projects')
  })

  it('utilisateurs a labelKey = nav.team', () => {
    expect(NAV_SLOT_REGISTRY.utilisateurs.labelKey).toBe('nav.team')
  })

  it('prestations a nameKey = nav.services', () => {
    expect(NAV_SLOT_REGISTRY.prestations.nameKey).toBe('nav.services')
  })
})
