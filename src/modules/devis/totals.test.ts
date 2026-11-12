import { describe, it, expect } from 'vitest'
import {
  centsOf,
  centsToNumber,
  computeBalanceTotals,
  computeDraftTotals,
  lineCents,
  percentOfCents,
  toCents,
  toDiscountRate,
  toMilli,
  toPriceCents,
  vatOfCents,
} from './totals'

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
        { quantity: '2', unitPrice: '50', discountRate: '' },
        { quantity: '1,5', unitPrice: '80', discountRate: '' },
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
    expect(lineCents({ quantity: '3', unitPrice: '0,34', discountRate: '' })).toBe(102n)
    expect(lineCents({ quantity: '0,005', unitPrice: '1', discountRate: '' })).toBe(1n)
    expect(lineCents({ quantity: '0,004', unitPrice: '1', discountRate: '' })).toBe(0n)
  })

  it('arrondit la TVA au centime, demi vers le haut (10,10 € à 5,5 % = 0,56 €)', () => {
    const totals = computeDraftTotals([{ quantity: '1', unitPrice: '10,10', discountRate: '' }], '5,5')

    expect(totals.vatAmount).toBe(56n)
    expect(totals.total).toBe(1066n)
  })

  it('une ligne pas encore chiffrable vaut zéro dans le total et reste visible comme telle', () => {
    const totals = computeDraftTotals(
      [
        { quantity: '2', unitPrice: '', discountRate: '' },
        { quantity: '1', unitPrice: '20', discountRate: '' },
      ],
      '20',
    )

    expect(totals.lines).toEqual([null, 2000n])
    expect(totals.subtotal).toBe(2000n)
    expect(totals.total).toBe(2400n)
  })

  it('un devis sans ligne vaut zéro, et un taux illisible vaut 0 %', () => {
    expect(computeDraftTotals([], '20').total).toBe(0n)
    expect(computeDraftTotals([{ quantity: '1', unitPrice: '10', discountRate: '' }], 'x').total).toBe(1000n)
  })

  it('supporte de gros montants sans perdre un centime', () => {
    const totals = computeDraftTotals([{ quantity: '1000000', unitPrice: '99999999', discountRate: '' }], '20')

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

describe('centsOf', () => {
  it('lit un montant de l’API, signe compris', () => {
    expect(centsOf('1234.50')).toBe(123450n)
    expect(centsOf('-69.00')).toBe(-6900n)
    expect(centsOf('0.00')).toBe(0n)
  })
})

describe('percentOfCents', () => {
  it('prend un pourcentage d’un montant, arrondi au centime demi vers le haut', () => {
    expect(percentOfCents(23000n, '30')).toBe(6900n)
    // 45,03 × 12,5 % = 5,62875 → 5,63
    expect(percentOfCents(4503n, '12,5')).toBe(563n)
    // 10,00 × 0,01 % = 0,001 → 0,00
    expect(percentOfCents(1000n, '0,01')).toBe(0n)
  })

  it('refuse ce qui n’est pas un pourcentage à deux décimales', () => {
    expect(percentOfCents(23000n, '12,345')).toBeNull()
    expect(percentOfCents(23000n, '-5')).toBeNull()
    expect(percentOfCents(23000n, '')).toBeNull()
  })
})

describe('vatOfCents', () => {
  it('applique la TVA comme l’API, y compris sur un montant négatif (symétrique)', () => {
    expect(vatOfCents(16100n, '20')).toBe(3220n)
    expect(vatOfCents(-16100n, '20')).toBe(-3220n)
    // 0,125 € → 0,13 ; l'arrondi demi vers le haut est le même de part et d'autre de zéro
    expect(vatOfCents(125n, '10')).toBe(13n)
    expect(vatOfCents(-125n, '10')).toBe(-13n)
    expect(vatOfCents(1000n, '0')).toBe(0n)
  })
})

describe('computeBalanceTotals', () => {
  it('retranche les acomptes hors taxe, puis applique la TVA une fois sur le reste', () => {
    // 10 × 23,00 = 230,00 de travaux ; 69,00 d'acompte ; 161,00 + 20 % = 193,20
    const totals = computeBalanceTotals([{ quantity: '10', unitPrice: '23', discountRate: '' }], '20', 6900n)

    expect(totals.worksSubtotal).toBe(23000n)
    expect(totals.subtotal).toBe(16100n)
    expect(totals.vatAmount).toBe(3220n)
    expect(totals.total).toBe(19320n)
  })

  it('sans acompte, c’est le total ordinaire', () => {
    const lines = [{ quantity: '3', unitPrice: '15,01', discountRate: '' }]

    expect(computeBalanceTotals(lines, '10', 0n)).toMatchObject({
      subtotal: computeDraftTotals(lines, '10').subtotal,
      total: computeDraftTotals(lines, '10').total,
    })
  })

  it('peut descendre sous zéro quand les acomptes dépassent les travaux', () => {
    const totals = computeBalanceTotals([{ quantity: '1', unitPrice: '10', discountRate: '' }], '20', 6900n)

    expect(totals.subtotal).toBe(-5900n)
    expect(totals.vatAmount).toBe(-1180n)
    expect(totals.total).toBe(-7080n)
  })
})

describe('toPriceCents : un prix peut être négatif (une remise)', () => {
  it('lit un signe moins, avec une virgule ou un point', () => {
    expect(toPriceCents('-50')).toBe(-5000n)
    expect(toPriceCents('-12,5')).toBe(-1250n)
    expect(toPriceCents('-0.05')).toBe(-5n)
    expect(toPriceCents('12,5')).toBe(1250n)
  })

  it('« -0 » vaut zéro, jamais un zéro négatif', () => {
    expect(toPriceCents('-0')).toBe(0n)
    expect(toPriceCents('-0,00')).toBe(0n)
  })

  it('refuse un moins seul, deux moins, un moins au milieu, un signe plus et trop de décimales', () => {
    for (const bad of ['-', '--5', '5-', '1-2', '+5', '- 5', '-1,234', '', 'abc']) {
      expect(toPriceCents(bad)).toBeNull()
    }
  })

  it('les quantités, les taux et les pourcentages restent positifs', () => {
    expect(toMilli('-1')).toBeNull()
    expect(toCents('-5')).toBeNull()
  })
})

describe('une remise dans les totaux', () => {
  it('une ligne à prix négatif retranche, la TVA porte sur ce qui reste', () => {
    const totals = computeDraftTotals(
      [
        { quantity: '10', unitPrice: '50', discountRate: '' },
        { quantity: '1', unitPrice: '-50', discountRate: '' },
      ],
      '10',
    )

    expect(totals.lines).toEqual([50000n, -5000n])
    expect(totals.subtotal).toBe(45000n)
    expect(totals.vatAmount).toBe(4500n)
    expect(totals.total).toBe(49500n)
  })

  // Les mêmes valeurs que `quote-totals.spec.ts` du back : la remise saisie ici est, au centime, celle du PDF
  it.each([
    ['0,5', '-0,01', -1n],
    ['0,5', '0,01', 1n],
    ['1,005', '-1', -101n],
    ['2,675', '-1', -268n],
    ['0,4', '-0,01', 0n],
  ])('%s × %s s\'arrondit comme l\'API, en s\'éloignant de zéro : %s centime(s)', (quantity, unitPrice, expected) => {
    expect(lineCents({ quantity, unitPrice, discountRate: '' })).toBe(expected)
  })

  it('la TVA d\'un total négatif s\'arrondit comme côté API : -10,10 × 5,5 % = -0,56', () => {
    const totals = computeDraftTotals([{ quantity: '1', unitPrice: '-10,10', discountRate: '' }], '5,5')

    expect(totals.vatAmount).toBe(-56n)
    expect(totals.total).toBe(-1066n)
  })

  it('une remise égale aux prestations donne zéro, sans signe', () => {
    const totals = computeDraftTotals(
      [
        { quantity: '1', unitPrice: '80', discountRate: '' },
        { quantity: '1', unitPrice: '-80', discountRate: '' },
      ],
      '20',
    )

    expect(totals.subtotal).toBe(0n)
    expect(totals.vatAmount).toBe(0n)
    expect(totals.total).toBe(0n)
  })

  it('des remises plus grandes que les prestations donnent un total négatif, que le formulaire refuse', () => {
    const totals = computeDraftTotals(
      [
        { quantity: '1', unitPrice: '100', discountRate: '' },
        { quantity: '1', unitPrice: '-100,01', discountRate: '' },
      ],
      '10',
    )

    expect(totals.subtotal).toBe(-1n)
  })

  it('un solde garde la remise, puis retranche les acomptes', () => {
    const totals = computeBalanceTotals(
      [
        { quantity: '2', unitPrice: '100', discountRate: '' },
        { quantity: '1', unitPrice: '-50', discountRate: '' },
      ],
      '20',
      3000n,
    )

    expect(totals.worksSubtotal).toBe(15000n)
    expect(totals.subtotal).toBe(12000n)
    expect(totals.vatAmount).toBe(2400n)
  })
})

describe('toDiscountRate', () => {
  it('lit un pourcentage en centièmes de pour cent, virgule ou point', () => {
    expect(toDiscountRate('10')).toBe(1000n)
    expect(toDiscountRate('12,5')).toBe(1250n)
    expect(toDiscountRate('12.5')).toBe(1250n)
    expect(toDiscountRate('0,01')).toBe(1n)
    expect(toDiscountRate('100')).toBe(10000n)
  })

  it('le champ vide est « pas de remise », pas une erreur', () => {
    expect(toDiscountRate('')).toBe(0n)
    expect(toDiscountRate('   ')).toBe(0n)
  })

  it('refuse plus de 100 %, le négatif, trop de décimales et le texte', () => {
    expect(toDiscountRate('100,01')).toBeNull()
    expect(toDiscountRate('101')).toBeNull()
    expect(toDiscountRate('-5')).toBeNull()
    expect(toDiscountRate('1,234')).toBeNull()
    expect(toDiscountRate('dix')).toBeNull()
    expect(toDiscountRate('10 %')).toBeNull()
  })
})

describe('la remise en pourcentage d\'une ligne', () => {
  const line = (quantity: string, unitPrice: string, discountRate: string) => ({ quantity, unitPrice, discountRate })

  // Les mêmes valeurs que `quote-totals.spec.ts` du back : le total saisi ici est, au centime, celui du PDF
  it.each([
    ['2', '50', '10', 9000n],
    ['2', '50', '10,00', 9000n],
    ['1', '10', '25', 750n],
    ['1', '1,25', '50', 63n],
    ['1', '-1,25', '50', -63n],
    ['0,335', '3', '10', 90n],
    ['2', '40', '100', 0n],
    ['2', '40', '', 8000n],
    ['2', '40', '0', 8000n],
    ['10', '-50', '10', -45000n],
    ['2,5', '33,33', '12,5', 7291n],
  ])('%s × %s moins %s %% = %s centime(s)', (quantity, unitPrice, discountRate, expected) => {
    expect(lineCents(line(quantity, unitPrice, discountRate))).toBe(expected)
  })

  it('arrondit une seule fois, après la remise (arrondir avant donnerait un centime de plus)', () => {
    // 3 × 0,335 = 1,005 ; moins 10 % = 0,9045 → 0,90 ; arrondi d'abord à 1,01 puis réduit : 0,909 → 0,91
    expect(lineCents(line('3', '0,335', '10'))).toBeNull() // trois décimales de prix : refusé, voir le cas avec la quantité
    expect(lineCents(line('0,335', '3', '10'))).toBe(90n)
  })

  it('une ligne offerte (100 %) vaut zéro, jamais un zéro négatif', () => {
    expect(lineCents(line('3', '-40', '100'))).toBe(0n)
    expect(Object.is(lineCents(line('3', '-40', '100')), 0n)).toBe(true)
  })

  it('une remise invalide rend la ligne non chiffrable, comme un prix invalide', () => {
    expect(lineCents(line('1', '10', '101'))).toBeNull()
    expect(lineCents(line('1', '10', 'beaucoup'))).toBeNull()
    expect(lineCents(line('1', '10', '-5'))).toBeNull()
  })

  it('reste exact aux plafonds : 1 000 000 × 99 999 999,99 moins 33,33 %', () => {
    // 99 999 999 990 000 € × 66,67 % = 66 669 999 993 333 € exactement : un nombre à virgule flottante se tromperait
    expect(lineCents(line('1000000', '99999999,99', '33,33'))).toBe(6666999999333300n)
  })

  it('les totaux : la TVA porte sur la somme des lignes après remise', () => {
    // 3 × 100 moins 10 % = 270 ; une ligne offerte ; TVA 10 % → 27 ; mêmes valeurs que le test d'API de factures
    const totals = computeDraftTotals([line('3', '100', '10'), line('1', '40', '100')], '10')

    expect(totals.lines).toEqual([27000n, 0n])
    expect(totals.subtotal).toBe(27000n)
    expect(totals.vatAmount).toBe(2700n)
    expect(totals.total).toBe(29700n)
  })

  it('une remise en pourcentage et une ligne de remise à prix négatif se cumulent', () => {
    const totals = computeBalanceTotals([line('10', '50', '10'), line('1', '-50', '')], '0', 0n)

    expect(totals.lines).toEqual([45000n, -5000n])
    expect(totals.worksSubtotal).toBe(40000n)
  })

  it('la déduction d\'un acompte se retranche du total après remises', () => {
    // 2 × 100 moins 25 % = 150 ; moins un acompte de 30 → 120 ; TVA 20 % → 24
    const totals = computeBalanceTotals([line('2', '100', '25')], '20', 3000n)

    expect(totals.worksSubtotal).toBe(15000n)
    expect(totals.subtotal).toBe(12000n)
    expect(totals.vatAmount).toBe(2400n)
  })
})
