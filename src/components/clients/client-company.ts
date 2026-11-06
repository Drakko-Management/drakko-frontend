import { isValidSiren, isValidVatNumber, normalizeSiren, normalizeVatNumber } from '@/lib/identifiers'
import type { Client, ClientKind } from '@/types/api'

/** Ce qu'un formulaire de client saisit sur son genre et son entreprise (texte brut, comme dans les champs). */
export interface CompanyValues {
  kind: ClientKind
  companyName: string
  siren: string
  vatNumber: string
}

export const EMPTY_COMPANY: CompanyValues = { kind: 'INDIVIDUAL', companyName: '', siren: '', vatNumber: '' }

export type CompanyField = 'companyName' | 'siren' | 'vatNumber'

/** Clé de traduction de l'erreur de chaque champ en faute. Un particulier n'en a jamais : ses champs d'entreprise sont ignorés. */
export function companyErrors(values: CompanyValues): Partial<Record<CompanyField, string>> {
  const errors: Partial<Record<CompanyField, string>> = {}
  if (values.kind !== 'PROFESSIONAL') return errors
  if (!values.companyName.trim()) errors.companyName = 'create_client.company_required'
  const siren = normalizeSiren(values.siren)
  if (siren !== '' && !isValidSiren(siren)) errors.siren = 'create_client.err_siren'
  const vat = normalizeVatNumber(values.vatNumber)
  if (vat !== '' && !isValidVatNumber(vat)) errors.vatNumber = 'settings.err_vat_number'
  return errors
}

/**
 * Ce qui part à l'API. Champ vidé = `null` (il s'efface, jamais `undefined`) ; un particulier n'envoie aucune donnée d'entreprise,
 * ce qui efface celles qu'il avait quand on le repasse de professionnel à particulier.
 */
export function companyPayload(values: CompanyValues): {
  kind: ClientKind
  companyName: string | null
  siren: string | null
  vatNumber: string | null
} {
  if (values.kind !== 'PROFESSIONAL') return { kind: 'INDIVIDUAL', companyName: null, siren: null, vatNumber: null }
  return {
    kind: 'PROFESSIONAL',
    companyName: values.companyName.trim() || null,
    siren: normalizeSiren(values.siren) || null,
    vatNumber: normalizeVatNumber(values.vatNumber) || null,
  }
}

/** « 732829320 » → « 732 829 320 » (lecture seulement : l'API garde les 9 chiffres collés). */
export const formatSiren = (siren: string): string => siren.replace(/(\d{3})(?=\d)/g, '$1 ')

/** Les valeurs d'un client enregistré, pour remplir un formulaire. */
export function companyValuesOf(client: Pick<Client, 'kind' | 'companyName' | 'siren' | 'vatNumber'>): CompanyValues {
  return {
    kind: client.kind,
    companyName: client.companyName ?? '',
    siren: client.siren ?? '',
    vatNumber: client.vatNumber ?? '',
  }
}
