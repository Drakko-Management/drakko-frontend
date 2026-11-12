import { describe, it, expect } from 'vitest'
import { formatPercent, hasDiscount } from './format'

describe('formatPercent', () => {
  it('écrit un pourcentage sans zéros inutiles, dans la langue demandée', () => {
    expect(formatPercent('10').replace(/\s/g, ' ')).toBe('10 %')
    expect(formatPercent('12.5').replace(/\s/g, ' ')).toBe('12,5 %')
    expect(formatPercent('12.50', 'en')).toBe('12.5%')
    expect(formatPercent(100, 'en')).toBe('100%')
    expect(formatPercent('7.25', 'de').replace(/\s/g, ' ')).toBe('7,25 %')
  })

  it('renvoie le texte tel quel quand ce n\'est pas un nombre', () => {
    expect(formatPercent('abc')).toBe('abc')
  })
})

describe('hasDiscount', () => {
  it('une remise strictement positive : oui', () => {
    expect(hasDiscount('10')).toBe(true)
    expect(hasDiscount('0.01')).toBe(true)
    expect(hasDiscount(100)).toBe(true)
  })

  it('« 0 », « 0.00 », rien : non', () => {
    expect(hasDiscount('0')).toBe(false)
    expect(hasDiscount('0.00')).toBe(false)
    expect(hasDiscount(undefined)).toBe(false)
    expect(hasDiscount(null)).toBe(false)
    expect(hasDiscount('')).toBe(false)
  })
})
