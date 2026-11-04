import type { Organization } from '@/types/api'

/**
 * Ce qu'une facture émise doit porter de l'entreprise (ADR-033) : adresse, SIRET, et le numéro de TVA sauf sous franchise.
 * Même règle que `missingIssuerFields` du back, qui reste seul juge à l'émission : ici on prévient avant de cliquer.
 * Renvoie les clés de libellé des réglages des champs qui manquent.
 */
export function missingIdentity(org: Organization | null | undefined, vatExempt: boolean): string[] {
  if (!org) return []
  const required: [string, string | null | undefined][] = [
    ['settings.org_address', org.address],
    ['settings.org_postal_code', org.postalCode],
    ['settings.org_city', org.city],
    ['settings.org_siret', org.siret],
    ...(vatExempt ? [] : ([['settings.org_vat_number', org.vatNumber]] as [string, string | null | undefined][])),
  ]
  return required.filter(([, value]) => !value?.trim()).map(([key]) => key)
}
