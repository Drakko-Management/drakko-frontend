import { parsePhoneNumberFromString } from 'libphonenumber-js'

/** Met un numéro valide au format national français (06 12 34 56 78) ; tout autre texte reste tel quel. */
export function formatPhone(value: string): string {
  const phone = parsePhoneNumberFromString(value, 'FR')
  return phone?.isValid() ? phone.formatNational() : value
}
