// Les montants d'un devis en cours de saisie, calculés comme le fait l'API (`quote-totals.ts` du back) : chaque ligne
// arrondie au centime (demi vers le haut), le total hors taxe est la somme de ces lignes, la TVA s'applique une fois à
// ce total. En entiers (BigInt) : aucun nombre à virgule flottante, donc aucun centime d'écart avec le PDF.

export interface DraftLineAmounts {
  quantity: string
  unitPrice: string
}

export interface DraftTotals {
  /** Total hors taxe de chaque ligne, en centimes ; null quand la ligne n'est pas encore chiffrable */
  lines: (bigint | null)[]
  subtotal: bigint
  vatAmount: bigint
  total: bigint
}

// « 12,5 » ou « 12.5 » → 12500 (millièmes). Au plus `decimals` décimales, sinon null (refusé comme l'API).
function toScaled(value: string, decimals: number): bigint | null {
  const text = value.trim().replace(',', '.')
  if (!/^\d+(\.\d*)?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  if (fraction.length > decimals) return null
  return BigInt(whole + fraction.padEnd(decimals, '0'))
}

export const toMilli = (value: string): bigint | null => toScaled(value, 3)
export const toCents = (value: string): bigint | null => toScaled(value, 2)

// Demi vers le haut, sur des valeurs positives
const divRound = (numerator: bigint, denominator: bigint): bigint => (numerator * 2n + denominator) / (denominator * 2n)

export function lineCents({ quantity, unitPrice }: DraftLineAmounts): bigint | null {
  const milli = toMilli(quantity)
  const cents = toCents(unitPrice)
  if (milli === null || cents === null) return null
  // millièmes × centimes = 10⁻⁵ euro ; on revient au centime
  return divRound(milli * cents, 1000n)
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
