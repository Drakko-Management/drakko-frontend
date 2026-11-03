import { describe, it, expect } from 'vitest'
import { centsToNumber, computeDraftTotals, lineCents, toCents, toMilli } from './totals'

describe('toMilli / toCents', () => {
  it('lit une virgule ou un point', () => {
    expect(toMilli('12,5')).toBe(12500n)
    expect(toMilli('12.5')).toBe(12500n)
    expect(toCents('18')).toBe(1800n)
    expect(toCents('0,05')).toBe(5n)
  })

  it('refuse trop de décimales, le vide, le négatif et le texte', () => {
    expect(toCents('1,234')).toBeNull()
    expect(toMilli('1,2345')).toBeNull()
    expect(toCents('')).toBeNull()
    expect(toCents('-5')).toBeNull()
    expect(toCents('abc')).toBeNull()
  })
})

describe('computeDraftTotals', () => {
  it('multiplie, additionne et applique la TVA une fois (même résultat que l\'API)', () => {
    const totals = computeDraftTotals(
      [
        { quantity: '2', unitPrice: '50' },
        { quantity: '1,5', unitPrice: '80' },
      ],
      '10',
    )

    expect(totals.lines).toEqual([10000n, 12000n])
    expect(totals.subtotal).toBe(22000n)
    expect(totals.vatAmount).toBe(2200n)
    expect(totals.total).toBe(24200n)
  })

  it('arrondit chaque ligne au centime, demi vers le haut', () => {
    // 0,335 × 3 = 1,005 → 1,01 ; en flottant, 1,005 × 100 donne 100,49999… et se tromperait
    expect(lineCents({ quantity: '3', unitPrice: '0,34' })).toBe(102n)
    expect(lineCents({ quantity: '0,005', unitPrice: '1' })).toBe(1n)
    expect(lineCents({ quantity: '0,004', unitPrice: '1' })).toBe(0n)
  })

  it('arrondit la TVA au centime, demi vers le haut (10,10 € à 5,5 % = 0,56 €)', () => {
    const totals = computeDraftTotals([{ quantity: '1', unitPrice: '10,10' }], '5,5')

    expect(totals.vatAmount).toBe(56n)
    expect(totals.total).toBe(1066n)
  })

  it('une ligne pas encore chiffrable vaut zéro dans le total et reste visible comme telle', () => {
    const totals = computeDraftTotals(
      [
        { quantity: '2', unitPrice: '' },
        { quantity: '1', unitPrice: '20' },
      ],
      '20',
    )

    expect(totals.lines).toEqual([null, 2000n])
    expect(totals.subtotal).toBe(2000n)
    expect(totals.total).toBe(2400n)
  })

  it('un devis sans ligne vaut zéro, et un taux illisible vaut 0 %', () => {
    expect(computeDraftTotals([], '20').total).toBe(0n)
    expect(computeDraftTotals([{ quantity: '1', unitPrice: '10' }], 'x').total).toBe(1000n)
  })

  it('supporte de gros montants sans perdre un centime', () => {
    const totals = computeDraftTotals([{ quantity: '1000000', unitPrice: '99999999' }], '20')

    // 1 000 000 × 99 999 999 € = 99 999 999 000 000 € = 9 999 999 900 000 000 centimes, bien au-delà de 2⁵³
    expect(totals.subtotal).toBe(9_999_999_900_000_000n)
    expect(totals.vatAmount).toBe(1_999_999_980_000_000n)
    expect(totals.total).toBe(11_999_999_880_000_000n)
  })

  it('centsToNumber', () => {
    expect(centsToNumber(24200n)).toBe(242)
    expect(centsToNumber(5n)).toBe(0.05)
  })
})
