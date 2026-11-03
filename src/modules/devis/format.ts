import i18n from 'i18next'

/** Un montant en euros avec ses centimes (contrairement à `formatCurrency`, qui les arrondit : un devis les montre). */
export function formatMoney(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(i18n.language || 'fr', { style: 'currency', currency: 'EUR' }).format(value)
}

/** Une quantité sans zéros inutiles (« 12,5 », pas « 12,500 »). */
export function formatQuantity(quantity: string | number): string {
  const value = typeof quantity === 'string' ? parseFloat(quantity) : quantity
  if (Number.isNaN(value)) return String(quantity)
  return new Intl.NumberFormat(i18n.language || 'fr', { maximumFractionDigits: 3 }).format(value)
}
