import type { ClientFormValues } from './ClientForm'

/**
 * Texte tapé dans la recherche d'un client → champs de départ du formulaire :
 * « Paul Dupont » → prénom + nom, « Dupont » → nom, « paul@dupont.fr » → email.
 */
export function clientPrefill(text: string): Partial<ClientFormValues> {
  const value = text.trim()
  if (!value) return {}
  if (value.includes('@')) return { email: value }
  const [first, ...rest] = value.split(/\s+/)
  return rest.length > 0 ? { firstName: first, lastName: rest.join(' ') } : { lastName: first }
}
