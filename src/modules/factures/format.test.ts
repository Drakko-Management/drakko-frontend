import { describe, it, expect } from 'vitest'
import { formatDay, todayInput } from './format'

describe('formatDay', () => {
  it('lit un jour sans heure en UTC : jamais la veille, quel que soit le fuseau du navigateur', () => {
    expect(formatDay('2026-11-04T00:00:00.000Z', 'fr')).toBe('4 nov. 2026')
    expect(formatDay('2026-01-01T00:00:00.000Z', 'fr')).toBe('1 janv. 2026')
  })

  it('suit la langue demandée', () => {
    expect(formatDay('2026-11-04T00:00:00.000Z', 'en')).toBe('Nov 4, 2026')
  })

  it('un jour absent s\'écrit « — »', () => {
    expect(formatDay(null)).toBe('—')
    expect(formatDay(undefined)).toBe('—')
  })
})

describe('todayInput', () => {
  it('compte le jour à Paris, comme le serveur', () => {
    // 23h30 UTC le 31 décembre : à Paris, c'est déjà le 1er janvier
    expect(todayInput(new Date('2026-12-31T23:30:00.000Z'))).toBe('2027-01-01')
    expect(todayInput(new Date('2026-11-04T10:00:00.000Z'))).toBe('2026-11-04')
  })
})
