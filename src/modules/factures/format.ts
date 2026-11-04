import i18n from 'i18next'

/**
 * Un jour sans heure (émission, échéance, paiement). L'API les enregistre à minuit UTC : on les lit en UTC, sinon un
 * navigateur à l'ouest de Greenwich afficherait la veille.
 */
export function formatDay(date: string | null | undefined, locale?: string): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString(locale ?? (i18n.language || 'fr'), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Le jour d'aujourd'hui à Paris (« 2026-11-04 »), comme le serveur le compte pour une facture. */
export function todayInput(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
