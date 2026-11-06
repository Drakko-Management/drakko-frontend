import { todayInput } from '@/lib/utils'
import type { ClientKind } from '@/types/api'

/**
 * Pas de paiement dans les sept jours d'un contrat signé hors établissement (article L221-10 du code de la consommation,
 * ADR-036). Un acompte est un paiement. Exceptions de la loi : un dépannage ou une réparation **urgents** demandés
 * expressément par le client, et quelques contrats qui ne concernent pas des travaux. L'application ne sait pas où le
 * devis a été signé ni si le client a demandé l'urgence : elle **avertit sans bloquer**, comme pour un particulier
 * (type de client inconnu = particulier). Non validé par un professionnel (`12-legal-compliance.md` §2).
 */
export const PAYMENT_WAIT_DAYS = 7

function parisDay(instant: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant))
}

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Le premier jour où l'on peut demander un paiement au client, ou `null` quand rien ne l'empêche (client professionnel,
 * devis non accepté, délai déjà passé). Le contrat est conclu le jour de l'acceptation ; le jour de la conclusion ne
 * compte pas dans le délai, qui expire donc à la fin du septième jour suivant : on attend le huitième, par prudence.
 * Le résultat est un jour (« 2026-11-11 »), que `formatDay` lit tel quel.
 */
export function firstPaymentDay(
  quote: { kind?: ClientKind; status?: string; decidedAt: string | null | undefined },
  today: string = todayInput(),
): string | null {
  if (quote.kind === 'PROFESSIONAL') return null
  if (quote.status !== undefined && quote.status !== 'ACCEPTED') return null
  if (!quote.decidedAt) return null
  const first = addDays(parisDay(quote.decidedAt), PAYMENT_WAIT_DAYS + 1)
  return today < first ? first : null
}
