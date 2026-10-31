import { describe, it, expect } from 'vitest'
import { formatPhone } from './phone'

describe('formatPhone', () => {
  it('met un numéro français valide au format national', () => {
    expect(formatPhone('0612345678')).toBe('06 12 34 56 78')
    expect(formatPhone('+33612345678')).toBe('06 12 34 56 78')
  })

  it('laisse tel quel un texte qui n\'est pas un numéro valide', () => {
    expect(formatPhone('06 12')).toBe('06 12')
    expect(formatPhone('')).toBe('')
  })
})
