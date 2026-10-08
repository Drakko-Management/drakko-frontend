import { describe, it, expect, afterEach } from 'vitest'
import i18n from 'i18next'
import { formatDate, formatCurrency, fullName, initials, avatarColor } from './utils'

// ── formatDate ─────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('retourne "—" pour null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('retourne "—" pour undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('retourne "—" pour une chaîne vide', () => {
    expect(formatDate('')).toBe('—')
  })

  it('formate une date ISO en français', () => {
    expect(formatDate('2025-10-20')).toBe('20 oct. 2025')
  })

  it('formate une date avec heure (ignore la partie heure)', () => {
    expect(formatDate('2025-10-20T10:30:00.000Z')).toMatch(/2025/)
  })
})

// ── formatCurrency ─────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('retourne "—" pour null', () => {
    expect(formatCurrency(null)).toBe('—')
  })

  it('retourne "—" pour undefined', () => {
    expect(formatCurrency(undefined)).toBe('—')
  })

  it('retourne "—" pour une chaîne vide', () => {
    expect(formatCurrency('')).toBe('—')
  })

  it('retourne "—" pour une valeur non numérique', () => {
    expect(formatCurrency('abc')).toBe('—')
  })

  it('formate un entier en euros fr-FR', () => {
    // L'espace peut être un espace normal ou insécable selon l'environnement
    const result = formatCurrency(8900)
    expect(result).toMatch(/8.900/)
    expect(result).toContain('€')
  })

  it('formate zéro', () => {
    const result = formatCurrency(0)
    expect(result).toContain('€')
  })

  it('formate un nombre string parseable', () => {
    const result = formatCurrency('1200')
    expect(result).toMatch(/1.200/)
    expect(result).toContain('€')
  })

  it('arrondit à zéro décimale', () => {
    const result = formatCurrency(1234.99)
    expect(result).not.toContain(',9')
  })
})

// ── Langue de l'interface ──────────────────────────────────────────────────

describe('formatDate / formatCurrency — langue de l\'interface', () => {
  afterEach(async () => {
    await i18n.changeLanguage('fr')
  })

  it.each([
    ['fr', '20 oct. 2025'],
    ['en', 'Oct 20, 2025'],
    ['es', '20 oct 2025'],
    ['it', '20 ott 2025'],
    ['de', '20. Okt. 2025'],
  ])('formatDate suit la langue %s', async (lang, expected) => {
    await i18n.changeLanguage(lang)
    expect(formatDate('2025-10-20')).toBe(expected)
  })

  it.each([
    ['fr', /^12\s500\s€$/],
    ['en', /^€12,500$/],
    ['de', /^12\.500\s€$/],
  ])('formatCurrency suit la langue %s', async (lang, expected) => {
    await i18n.changeLanguage(lang)
    expect(formatCurrency(12500)).toMatch(expected)
  })
})

// ── fullName ───────────────────────────────────────────────────────────────

describe('fullName', () => {
  it('concatène prénom et nom', () => {
    expect(fullName({ firstName: 'Jean', lastName: 'Dupont' })).toBe('Jean Dupont')
  })

  it('gère les prénoms composés', () => {
    expect(fullName({ firstName: 'Jean-Pierre', lastName: 'Martin' })).toBe('Jean-Pierre Martin')
  })
})

// ── initials ───────────────────────────────────────────────────────────────

describe('initials', () => {
  it('retourne les initiales en majuscules', () => {
    expect(initials({ firstName: 'Jean', lastName: 'Dupont' })).toBe('JD')
  })

  it('met bien les lettres en majuscules', () => {
    expect(initials({ firstName: 'sarah', lastName: 'bernard' })).toBe('SB')
  })

  it('utilise la première lettre de chaque champ', () => {
    expect(initials({ firstName: 'Alice', lastName: 'Zhao' })).toBe('AZ')
  })
})

// ── avatarColor ────────────────────────────────────────────────────────────

describe('avatarColor', () => {
  it('retourne une chaîne non vide', () => {
    expect(avatarColor('some-id')).toBeTruthy()
  })

  it('retourne une classe Tailwind bg-* et text-*', () => {
    const color = avatarColor('test-id')
    expect(color).toMatch(/^bg-\w+-\d+/)
    expect(color).toContain('text-')
  })

  it('est déterministe — même id donne toujours la même couleur', () => {
    const id = 'seed-user-foreman'
    expect(avatarColor(id)).toBe(avatarColor(id))
  })

  it('des ids différents peuvent donner des couleurs différentes', () => {
    const colors = new Set([
      avatarColor('id-1'),
      avatarColor('id-2'),
      avatarColor('id-3'),
      avatarColor('id-4'),
      avatarColor('id-5'),
      avatarColor('id-6'),
      avatarColor('id-7'),
      avatarColor('id-8'),
      avatarColor('id-9'),
      avatarColor('id-10'),
    ])
    expect(colors.size).toBeGreaterThan(1)
  })
})
