import { describe, it, expect } from 'vitest'
import { MAX_UNIT_PRICE, isDiscountLine, isLineValid, priceTooLarge, type FormLine } from './quote-form'

// Une remise est une ligne à prix négatif : valable, sous les mêmes plafonds qu'un prix.

const line = (over: Partial<FormLine> = {}): FormLine => ({
  key: 'l1',
  title: 'Remise',
  description: '',
  unit: '',
  quantity: '1',
  unitPrice: '-50',
  ...over,
})

describe('isLineValid : une remise', () => {
  it('une ligne à prix négatif est valable', () => {
    expect(isLineValid(line())).toBe(true)
    expect(isLineValid(line({ unitPrice: '-12,5' }))).toBe(true)
  })

  it('un « - » seul ne l\'est pas encore : il manque le montant', () => {
    expect(isLineValid(line({ unitPrice: '-' }))).toBe(false)
  })

  it('la quantité reste positive', () => {
    expect(isLineValid(line({ quantity: '-1' }))).toBe(false)
    expect(isLineValid(line({ quantity: '0' }))).toBe(false)
  })

  it('un prix à zéro reste valable (un geste commercial)', () => {
    expect(isLineValid(line({ unitPrice: '0' }))).toBe(true)
  })
})

describe('priceTooLarge : les plafonds valent dans les deux sens', () => {
  it('le plafond exact est permis, un centime de plus non, pour un prix comme pour une remise', () => {
    expect(priceTooLarge(line({ unitPrice: String(MAX_UNIT_PRICE) }))).toBe(false)
    expect(priceTooLarge(line({ unitPrice: `${MAX_UNIT_PRICE},01` }))).toBe(true)
    expect(priceTooLarge(line({ unitPrice: `-${MAX_UNIT_PRICE}` }))).toBe(false)
    expect(priceTooLarge(line({ unitPrice: `-${MAX_UNIT_PRICE},01` }))).toBe(true)
  })

  it('une remise au-delà du plafond n\'est pas valable', () => {
    expect(isLineValid(line({ unitPrice: '-100000000' }))).toBe(false)
  })
})

describe('isDiscountLine', () => {
  it('reconnaît un prix négatif, pas un prix positif, nul ou incomplet', () => {
    expect(isDiscountLine(line({ unitPrice: '-1' }))).toBe(true)
    expect(isDiscountLine(line({ unitPrice: '1' }))).toBe(false)
    expect(isDiscountLine(line({ unitPrice: '0' }))).toBe(false)
    expect(isDiscountLine(line({ unitPrice: '-' }))).toBe(false)
    expect(isDiscountLine(line({ unitPrice: '' }))).toBe(false)
  })
})
