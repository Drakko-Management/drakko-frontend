import { describe, it, expect } from 'vitest'
import {
  isValidBic,
  isValidEmail,
  isValidIban,
  isValidSiret,
  isValidVatNumber,
  normalizeBic,
  normalizeIban,
  normalizeSiret,
  normalizeVatNumber,
} from './identifiers'

// Les mêmes valeurs que le test du back (`identifiers.spec.ts`) : les deux règles ne doivent pas diverger.

describe('SIRET', () => {
  it.each(['73282932000074', '55208131766522', '78467169500087'])('%s est valide', (siret) => {
    expect(isValidSiret(siret)).toBe(true)
  })

  it.each(['73282932000075', '7328293200007', '732829320000740', '7328293200007A', '', '12345678900012'])(
    'refuse « %s »',
    (siret) => {
      expect(isValidSiret(siret)).toBe(false)
    },
  )

  it("applique l'exception de La Poste", () => {
    expect(isValidSiret('35600000000051')).toBe(true)
    expect(isValidSiret('35600000000050')).toBe(false)
    expect(isValidSiret('35600000000048')).toBe(false)
  })

  it('normalise : espaces retirés', () => {
    expect(normalizeSiret(' 732 829 320 00074 ')).toBe('73282932000074')
  })
})

describe('IBAN', () => {
  it.each([
    'FR7630006000011234567890189',
    'DE89370400440532013000',
    'GB82WEST12345698765432',
    'ES9121000418450200051332',
    'IT60X0542811101000000123456',
    'BE68539007547034',
    'FR1420041010050500013M02606',
  ])('%s est valide', (iban) => {
    expect(isValidIban(iban)).toBe(true)
  })

  it.each([
    'FR7630006000011234567890188',
    'FR7612345678901234567890123',
    'FR0000000000000000000000000',
    'FR76300060000112345678901',
    'DE893704004405320130001',
    'fr7630006000011234567890189',
    '',
    '7630006000011234567890189',
  ])('refuse « %s »', (iban) => {
    expect(isValidIban(iban)).toBe(false)
  })

  it('normalise : espaces retirés, majuscules', () => {
    expect(normalizeIban('fr76 3000 6000 0112 3456 7890 189')).toBe('FR7630006000011234567890189')
  })

  it("un pays absent de la table n'a que la clé modulo 97 pour juge", () => {
    expect(isValidIban('BR1800360305000010009795493C1')).toBe(true)
    expect(isValidIban('BR1800360305000010009795493C2')).toBe(false)
  })
})

describe('BIC', () => {
  it.each(['AGRIFRPP', 'BNPAFRPPXXX', 'DEUTDEFF500'])('%s est valide', (bic) => {
    expect(isValidBic(bic)).toBe(true)
  })

  it.each(['AGRIFRPP1', 'AG1IFRPP', 'AGRIFR', 'agrifrpp', ''])('refuse « %s »', (bic) => {
    expect(isValidBic(bic)).toBe(false)
  })

  it('normalise comme un IBAN', () => {
    expect(normalizeBic(' agri frpp ')).toBe('AGRIFRPP')
  })
})

describe('numéro de TVA', () => {
  it.each(['FR40303265045', 'FR83404833048', 'DE123456789', 'BE0123456789', 'NL123456789B01'])('%s est valide', (vat) => {
    expect(isValidVatNumber(vat)).toBe(true)
  })

  it.each(['FR12345678901', 'FR4030326504', '40303265045', 'FR4', 'DE1234567890123', 'DE12-34567', ''])(
    'refuse « %s »',
    (vat) => {
      expect(isValidVatNumber(vat)).toBe(false)
    },
  )

  it("une clé française faite de lettres n'est pas contrôlée", () => {
    expect(isValidVatNumber('FRAB303265045')).toBe(true)
  })

  it('normalise : espaces et points retirés, majuscules', () => {
    expect(normalizeVatNumber(' fr 40.303 265 045 ')).toBe('FR40303265045')
  })
})

describe('email', () => {
  it.each(['contact@jardins.test', 'a.b+c@sous.domaine.fr'])('%s est valide', (email) => {
    expect(isValidEmail(email)).toBe(true)
  })

  it.each(['contact.jardins.test', 'contact@', '@jardins.test', 'a b@c.fr', 'a@b'])('refuse « %s »', (email) => {
    expect(isValidEmail(email)).toBe(false)
  })
})
