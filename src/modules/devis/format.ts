import i18n from 'i18next'

/**
 * Un montant en euros avec ses centimes (contrairement à `formatCurrency`, qui les arrondit : un devis les montre).
 * `locale` : la langue du document quand ce n'est pas celle de l'appli (page publique d'un devis).
 */
export function formatMoney(amount: string | number | null | undefined, locale?: string): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(locale ?? (i18n.language || 'fr'), { style: 'currency', currency: 'EUR' }).format(value)
}

/** Une quantité sans zéros inutiles (« 12,5 », pas « 12,500 »). */
export function formatQuantity(quantity: string | number, locale?: string): string {
  const value = typeof quantity === 'string' ? parseFloat(quantity) : quantity
  if (Number.isNaN(value)) return String(quantity)
  return new Intl.NumberFormat(locale ?? (i18n.language || 'fr'), { maximumFractionDigits: 3 }).format(value)
}
