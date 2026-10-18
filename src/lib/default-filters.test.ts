import { describe, it, expect } from 'vitest'
import { FILTER_FALLBACKS, resolveDefaultFilters } from './default-filters'

describe('resolveDefaultFilters', () => {
  it("rend le réglage d'origine des écrans quand rien n'est enregistré", () => {
    expect(resolveDefaultFilters(null)).toEqual(FILTER_FALLBACKS)
    expect(resolveDefaultFilters({})).toEqual(FILTER_FALLBACKS)
  })

  it('garde les valeurs valides et complète les autres', () => {
    expect(resolveDefaultFilters({ projectsStatus: 'IN_PROGRESS', clientsSort: 'recent' })).toEqual({
      ...FILTER_FALLBACKS,
      projectsStatus: 'IN_PROGRESS',
      clientsSort: 'recent',
    })
  })

  it('ignore une valeur inconnue (ancienne version, donnée corrompue)', () => {
    expect(resolveDefaultFilters({ projectsStatus: 'ARCHIVED', servicesSort: 42 })).toEqual(FILTER_FALLBACKS)
  })
})
