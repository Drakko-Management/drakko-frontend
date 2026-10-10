import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import i18n from 'i18next'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString(i18n.language || 'fr', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat(i18n.language || 'fr', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(num)
}

export function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`
}

export function initials(user: { firstName: string; lastName: string }): string {
  return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
}

/**
 * Date reçue de l'API → valeur d'un champ <input type="date">.
 * Une colonne SQL de type date est renvoyée avec une heure (« 2026-06-01T00:00:00.000Z ») que le champ refuse
 * (il resterait vide) ; il n'accepte que « 2026-06-01 ». On garde les 10 premiers caractères, sans passer par
 * un `Date` pour ne pas risquer de décalage de fuseau horaire.
 */
export function toDateInput(value: string | null | undefined): string {
  return value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? ''
}

/**
 * Bornes d'un champ de date : l'année tient toujours sur 4 chiffres.
 * Sans `max`, Chrome réserve la place de 6 chiffres (jusqu'à l'an 275 760) : le champ rétrécit de 15 px, et
 * l'icône du calendrier avec lui, dès qu'un `max` apparaît. Une année saisie avec 5 ou 6 chiffres par erreur
 * serait aussi acceptée.
 */
export const DATE_INPUT_MIN = '1900-01-01'
export const DATE_INPUT_MAX = '2100-12-31'

/**
 * Bornes des deux champs d'une paire de dates (début / fin) : chacune limite l'autre, et les bornes
 * générales s'appliquent tant que l'autre date n'est pas choisie. Chaque champ a toujours un `min` et un
 * `max` (voir DATE_INPUT_MAX).
 */
export function dateRangeBounds(start: string, end: string) {
  return {
    start: { min: DATE_INPUT_MIN, max: end || DATE_INPUT_MAX },
    end: { min: start || DATE_INPUT_MIN, max: DATE_INPUT_MAX },
  }
}

export function buildAddress(street: string, postalCode: string, city: string): string | undefined {
  const parts = [street.trim(), [postalCode.trim(), city.trim()].filter(Boolean).join(' ')].filter(Boolean)
  return parts.join(', ') || undefined
}

export function parseAddress(address: string): { street: string; postalCode: string; city: string } {
  // "1 rue des Roses, 45300 Pannecières" (with comma)
  const withComma = address.match(/^(.+),\s*(\d{5})\s+(.+)$/)
  if (withComma) return { street: withComma[1], postalCode: withComma[2], city: withComma[3] }
  // "1 rue des Roses 45300 Pannecières" (without comma)
  const withoutComma = address.match(/^(.+?)\s+(\d{5})\s+(.+)$/)
  if (withoutComma) return { street: withoutComma[1], postalCode: withoutComma[2], city: withoutComma[3] }
  return { street: address, postalCode: '', city: '' }
}

export function avatarColor(id: string): string {
  const colors = [
    'bg-red-100 text-red-700',
    'bg-orange-100 text-orange-700',
    'bg-amber-100 text-amber-700',
    'bg-emerald-100 text-emerald-700',
    'bg-teal-100 text-teal-700',
    'bg-cyan-100 text-cyan-700',
    'bg-blue-100 text-blue-700',
    'bg-indigo-100 text-indigo-700',
    'bg-violet-100 text-violet-700',
    'bg-pink-100 text-pink-700',
  ]
  const hash = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return colors[hash % colors.length]
}
