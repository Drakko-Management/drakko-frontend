/**
 * Le délai de paiement que les « conditions de paiement » des réglages représentent (« immediate », « 15 », « 30 »,
 * « 45 » ou « 60 » jours). Même règle que `payment-terms.ts` du back, qui calcule l'échéance à l'émission : ici on ne
 * fait que la dire à l'avance. Sans choix, ou avec un texte libre, la loi donne 30 jours.
 */
export const DEFAULT_PAYMENT_DAYS = 30

export function paymentDays(terms: string | null | undefined): number {
  const value = terms?.trim()
  if (value === 'immediate') return 0
  if (value && /^\d{1,2}$/.test(value)) return Math.min(parseInt(value, 10), 60)
  return DEFAULT_PAYMENT_DAYS
}
