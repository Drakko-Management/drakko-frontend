/**
 * Les éléments mobile/desktop partagent le même `data-tutorial` (ex. FAB et bouton « Nouveau ») :
 * on prend celui qui est affiché.
 */
export function findVisible(name: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tutorial="${name}"]`)
  return Array.from(nodes).find((el) => el.getClientRects().length > 0) ?? null
}

/**
 * Vrai si la zone ciblée est « complète » :
 * - tous ses champs `required` actifs sont remplis et valides (ex. un email mal formé bloque) ;
 * - tous ses composants personnalisés marqués `data-tutorial-ready` valent `true`
 *   (ex. un client sélectionné dans une recherche, qui n'est pas un simple champ).
 */
export function isZoneFilled(zone: HTMLElement | null): boolean {
  if (!zone) return false
  const fields = zone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input[required], textarea[required], select[required]',
  )
  for (const field of Array.from(fields)) {
    if (field.disabled) continue
    if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) continue
    if (!field.value.trim() || !field.checkValidity()) return false
  }
  const flagged = [
    ...(zone.matches('[data-tutorial-ready]') ? [zone] : []),
    ...Array.from(zone.querySelectorAll<HTMLElement>('[data-tutorial-ready]')),
  ]
  return flagged.every((el) => el.getAttribute('data-tutorial-ready') === 'true')
}
