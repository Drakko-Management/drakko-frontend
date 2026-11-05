// Les identifiants légaux et bancaires d'une entreprise : SIRET, numéro de TVA, IBAN, BIC. Ils s'impriment sur les devis
// et les factures : on vérifie leurs clés de contrôle avant d'enregistrer, pas seulement leur longueur. Mêmes règles que le
// back (`03-back/src/common/validators/identifiers.ts`), qui reste juge : les deux fichiers se modifient ensemble.

const withoutSpaces = (value: string): string => value.replace(/\s+/g, '')

// La saisie est remise en forme avant d'être contrôlée : « 732 829 320 00074 » est un SIRET, « fr76 3000… » un IBAN.
export const normalizeSiret = withoutSpaces
export const normalizeIban = (value: string): string => withoutSpaces(value).toUpperCase()
export const normalizeBic = normalizeIban
export const normalizeVatNumber = (value: string): string => value.replace(/[\s.]+/g, '').toUpperCase()

const digitSum = (digits: string): number => [...digits].reduce((sum, digit) => sum + Number(digit), 0)

function luhn(digits: string): boolean {
  let sum = 0
  ;[...digits].reverse().forEach((char, index) => {
    let digit = Number(char)
    if (index % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  })
  return sum % 10 === 0
}

/** 14 chiffres dont la clé de Luhn est juste (La Poste, SIREN 356 000 000 : somme des chiffres multiple de 5). */
export function isValidSiret(value: string): boolean {
  if (!/^\d{14}$/.test(value)) return false
  if (value.startsWith('356000000')) return digitSum(value) % 5 === 0
  return luhn(value)
}

// Longueur de l'IBAN par pays d'Europe ; un autre pays est accepté de 15 à 34 caractères, la clé modulo 97 restant juge.
const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GR: 27,
  HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25,
  RO: 24, SE: 24, SI: 19, SK: 24, SM: 27,
}

// Reste de la division par 97 d'un grand nombre écrit en lettres (A = 10 … Z = 35), chiffre par chiffre
function mod97(text: string): number {
  let rest = 0
  for (const char of text) {
    const digits = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55)
    for (const digit of digits) rest = (rest * 10 + Number(digit)) % 97
  }
  return rest
}

export function isValidIban(value: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value)) return false
  const expected = IBAN_LENGTHS[value.slice(0, 2)]
  if (expected !== undefined && value.length !== expected) return false
  return mod97(value.slice(4) + value.slice(0, 4)) === 1
}

/** 4 lettres de banque, 2 de pays, 2 de localité, et 3 de branche facultatifs. */
export function isValidBic(value: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value)
}

/** Deux lettres de pays puis 2 à 12 caractères ; le numéro français porte sa clé (clé de lettres : non contrôlée). */
export function isValidVatNumber(value: string): boolean {
  if (!/^[A-Z]{2}[A-Z0-9]{2,12}$/.test(value)) return false
  if (!value.startsWith('FR')) return true
  if (!/^FR[0-9A-Z]{2}\d{9}$/.test(value)) return false
  const key = value.slice(2, 4)
  if (!/^\d{2}$/.test(key)) return true
  return Number(key) === (12 + 3 * (Number(value.slice(4)) % 97)) % 97
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Un email d'allure correcte (le serveur contrôle plus finement). */
export const isValidEmail = (value: string): boolean => EMAIL.test(value)
