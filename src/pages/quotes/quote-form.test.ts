import { describe, it, expect } from 'vitest'
import {
  MAX_UNIT_PRICE,
  discountRateInvalid,
  duplicateOfQuote,
  firstLineProblemId,
  formLinesFrom,
  isDiscountLine,
  isLineValid,
  priceTooLarge,
  toLineInputs,
  type FormLine,
} from './quote-form'
import { quote, quoteLine } from '@/test/quote-fixtures'

// Une remise est une ligne à prix négatif : valable, sous les mêmes plafonds qu'un prix.

const line = (over: Partial<FormLine> = {}): FormLine => ({
  key: 'l1',
  title: 'Remise',
  description: '',
  unit: '',
  quantity: '1',
  unitPrice: '-50',
  discountRate: '',
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

describe('la remise en pourcentage d\'une ligne', () => {
  const priced = (over: Partial<FormLine> = {}) => line({ title: 'Pose', unitPrice: '100', ...over })

  it('vide ou entre 0 et 100 avec deux décimales au plus : valable', () => {
    for (const discountRate of ['', '0', '10', '12,5', '12.50', '99,99', '100']) {
      expect(discountRateInvalid(priced({ discountRate })), discountRate).toBe(false)
      expect(isLineValid(priced({ discountRate })), discountRate).toBe(true)
    }
  })

  it('au-delà de 100, négative, avec trop de décimales ou pas un nombre : la ligne n\'est pas envoyable', () => {
    for (const discountRate of ['100,01', '101', '-5', '1,234', 'dix', '10 %']) {
      expect(discountRateInvalid(priced({ discountRate })), discountRate).toBe(true)
      expect(isLineValid(priced({ discountRate })), discountRate).toBe(false)
    }
  })

  it('le premier champ à corriger est la remise quand elle seule est en cause', () => {
    expect(firstLineProblemId(priced({ discountRate: '150' }))).toBe('l1-discount')
    expect(firstLineProblemId(priced({ discountRate: '150', title: '' }))).toBe('l1-title')
    expect(firstLineProblemId(priced({ discountRate: '150', quantity: '0' }))).toBe('l1-qty')
    expect(firstLineProblemId(priced({ discountRate: '150', unitPrice: '' }))).toBe('l1-price')
  })

  it('part à l\'API en nombre, et seulement quand elle est saisie', () => {
    const inputs = toLineInputs([
      priced({ discountRate: '12,5' }),
      priced({ key: 'l2', discountRate: '' }),
      priced({ key: 'l3', discountRate: '0' }),
    ])

    expect(inputs[0].discountRate).toBe(12.5)
    expect(inputs[1]).not.toHaveProperty('discountRate')
    // « 0 » saisi est envoyé tel quel : c'est une valeur, l'API la garde
    expect(inputs[2].discountRate).toBe(0)
  })

  it('une ligne reçue de l\'API : « 0 » devient un champ vide, 12.50 devient « 12.5 »', () => {
    const lines = formLinesFrom([quoteLine({ discountRate: '0' }), quoteLine({ discountRate: '12.50' }), quoteLine({ discountRate: '10' })])

    expect(lines.map((l) => l.discountRate)).toEqual(['', '12.5', '10'])
  })

  it('la copie d\'un devis reprend la remise de chaque ligne', () => {
    const copy = duplicateOfQuote(quote({ lines: [quoteLine({ discountRate: '15' }), quoteLine({ id: 'l2', discountRate: '0' })] }), null)

    expect(copy.lines.map((l) => l.discountRate)).toEqual(['15', ''])
  })
})
