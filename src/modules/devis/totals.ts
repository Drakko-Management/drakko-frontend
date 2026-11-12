// Les montants d'un devis en cours de saisie, calculés comme le fait l'API (`quote-totals.ts` du back) : chaque ligne
// arrondie au centime (demi vers le haut), le total hors taxe est la somme de ces lignes, la TVA s'applique une fois à
// ce total. En entiers (BigInt) : aucun nombre à virgule flottante, donc aucun centime d'écart avec le PDF.

export interface DraftLineAmounts {
  quantity: string
  unitPrice: string
  /**
   * La remise de la ligne, en pourcentage du prix (« 10 », « 12,5 »), vide = aucune. Obligatoire : une ligne qui
   * l'oublierait serait comptée sans sa remise, sans que rien ne le signale.
   */
  discountRate: string
}

export interface DraftTotals {
  /** Total hors taxe de chaque ligne, en centimes ; null quand la ligne n'est pas encore chiffrable */
  lines: (bigint | null)[]
  subtotal: bigint
  vatAmount: bigint
  total: bigint
}

// « 12,5 » ou « 12.5 » → 12500 (millièmes). Au plus `decimals` décimales, sinon null (refusé comme l'API). Un signe
// moins n'est lu que pour un prix (`signed`) : une remise est une ligne à prix négatif ; une quantité, un taux ou un
// pourcentage restent positifs.
function toScaled(value: string, decimals: number, signed = false): bigint | null {
  const text = value.trim().replace(',', '.')
  if (!(signed ? /^-?\d+(\.\d*)?$/ : /^\d+(\.\d*)?$/).test(text)) return null
  const negative = text.startsWith('-')
  const [whole, fraction = ''] = (negative ? text.slice(1) : text).split('.')
  if (fraction.length > decimals) return null
  const scaled = BigInt(whole + fraction.padEnd(decimals, '0'))
  return negative ? -scaled : scaled
}

export const toMilli = (value: string): bigint | null => toScaled(value, 3)
export const toCents = (value: string): bigint | null => toScaled(value, 2)
/** Le prix d'une ligne en centimes : négatif pour une remise. */
export const toPriceCents = (value: string): bigint | null => toScaled(value, 2, true)
/**
 * La remise d'une ligne en centièmes de pour cent (12,5 % → 1250). Vide = aucune (0). Null au-delà de 100 % ou de deux
 * décimales : l'API refuse aussi.
 */
export function toDiscountRate(value: string): bigint | null {
  if (value.trim() === '') return 0n
  const rate = toScaled(value, 2)
  return rate !== null && rate <= 10000n ? rate : null
}

// Demi vers le haut, en s'éloignant de zéro pour un montant négatif : comme `ROUND_HALF_UP` de Decimal côté API
// (-0,005 → -0,01), pour que la remise saisie ici soit au centime celle du PDF
const divRound = (numerator: bigint, denominator: bigint): bigint =>
  numerator < 0n ? -divRound(-numerator, denominator) : (numerator * 2n + denominator) / (denominator * 2n)

export function lineCents({ quantity, unitPrice, discountRate }: DraftLineAmounts): bigint | null {
  const milli = toMilli(quantity)
  const cents = toPriceCents(unitPrice)
  const rate = toDiscountRate(discountRate)
  if (milli === null || cents === null || rate === null) return null
  // millièmes × centimes × (100 % moins la remise, en centièmes de pour cent) = 10⁻⁸ euro ; on revient au centime, en
  // arrondissant une seule fois, après la remise (comme `quote-totals.ts` du back)
  return divRound(milli * cents * (10000n - rate), 1000n * 10000n)
}

export function computeDraftTotals(lines: DraftLineAmounts[], vatRate: string): DraftTotals {
  const perLine = lines.map(lineCents)
  const subtotal = perLine.reduce<bigint>((sum, value) => sum + (value ?? 0n), 0n)
  const rate = toCents(vatRate) ?? 0n // centièmes de pour cent
  const vatAmount = divRound(subtotal * rate, 10000n)
  return { lines: perLine, subtotal, vatAmount, total: subtotal + vatAmount }
}

/** Centimes → nombre à deux décimales (« 1234.50 »), prêt pour `formatCurrency`. */
export function centsToNumber(cents: bigint): number {
  return Number(cents) / 100
}

/** Un montant renvoyé par l'API (« 1234.50 », « -69.00 » : toujours deux décimales) → centimes, signe compris. */
export function centsOf(amount: string): bigint {
  return BigInt(amount.replace('.', ''))
}

/** Le pourcentage d'un montant en centimes, arrondi au centime (demi vers le haut) ; null si ce n'est pas un nombre à deux décimales. */
export function percentOfCents(cents: bigint, percent: string): bigint | null {
  const hundredths = toCents(percent) // 12,5 % → 1250 centièmes de pour cent
  if (hundredths === null) return null
  return divRound(cents * hundredths, 10000n)
}

/** La TVA d'un montant hors taxe en centimes, comme le fait l'API (demi vers le haut, une seule fois sur le total). */
export function vatOfCents(cents: bigint, vatRate: string): bigint {
  const rate = toCents(vatRate) ?? 0n
  return divRound(cents * rate, 10000n)
}

export interface BalanceTotals extends DraftTotals {
  /** Le total hors taxe des lignes, avant de déduire les acomptes */
  worksSubtotal: bigint
}

/**
 * Les totaux d'une facture de solde en cours de saisie (ADR-033) : les lignes de la personne, moins les acomptes déjà
 * facturés (hors taxe, en centimes), puis la TVA une seule fois sur ce qui reste. Peut être négatif : l'API refuse
 * d'émettre un solde négatif.
 */
export function computeBalanceTotals(lines: DraftLineAmounts[], vatRate: string, deductions: bigint): BalanceTotals {
  const base = computeDraftTotals(lines, vatRate)
  const subtotal = base.subtotal - deductions
  const vatAmount = vatOfCents(subtotal, vatRate)
  return { ...base, worksSubtotal: base.subtotal, subtotal, vatAmount, total: subtotal + vatAmount }
}

