import { describe, it, expect } from 'vitest'
import fr from '@/i18n/locales/fr.json'
import en from '@/i18n/locales/en.json'
import es from '@/i18n/locales/es.json'
import itLocale from '@/i18n/locales/it.json'
import de from '@/i18n/locales/de.json'
import { TUTORIALS } from './definitions'

type Texts = Record<string, unknown>
const LOCALES = { fr, en, es, it: itLocale, de } as unknown as Record<string, { tutorials: Record<string, Texts> }>

// Fichiers de public/tutorials (sans dépendre de Node : le build typecheck aussi les tests)
const CAPTURES = new Set(Object.keys(import.meta.glob('../../public/tutorials/*.png')).map((path) => path.split('/').pop()))

// Les textes des tutoriels sont construits dynamiquement (`tutorials.<tutoriel>.<étape>_title`) : les tests i18n
// généraux ne les voient pas. Une étape sans texte afficherait une clé brute à l'écran.
describe('tutoriels — textes et liens', () => {
  for (const tuto of TUTORIALS) {
    const steps = [...tuto.steps, ...(tuto.fallbackSteps ?? [])]

    it(`« ${tuto.id} » : titre, description et textes de chaque étape existent dans les 5 langues`, () => {
      const missing: string[] = []
      for (const [lang, locale] of Object.entries(LOCALES)) {
        const texts = locale.tutorials[tuto.id]
        if (!texts) { missing.push(`${lang}: section absente`); continue }
        const keys = ['title', 'desc', ...steps.flatMap((s) => [`${s.id}_title`, `${s.id}_body`])]
        for (const key of keys) {
          const text = texts[key]
          if (typeof text !== 'string' || !text.trim()) missing.push(`${lang}: ${key}`)
        }
      }
      expect(missing).toEqual([])
    })

    it(`« ${tuto.id} » : les étapes à capture ont leur image dans les 5 langues`, () => {
      // Les captures sont dans public/tutorials/<nom>-<langue>.png
      const missing: string[] = []
      for (const s of steps) {
        if (!s.image) continue
        for (const lang of Object.keys(LOCALES)) {
          const file = `${s.image}-${lang}.png`
          if (!CAPTURES.has(file)) missing.push(file)
        }
      }
      expect(missing).toEqual([])
    })

    it(`« ${tuto.id} » : les liens vers un autre tutoriel pointent vers un tutoriel qui existe`, () => {
      for (const s of steps) {
        if (s.link) expect(TUTORIALS.some((other) => other.id === s.link), `${s.id} → ${s.link}`).toBe(true)
      }
    })
  }

  it('le libellé du lien existe dans les 5 langues et accepte le titre du tutoriel', () => {
    for (const [lang, locale] of Object.entries(LOCALES)) {
      expect(locale.tutorials.link_label, lang).toContain('{{title}}')
    }
  })

  it('la nature d\'un tutoriel (création réelle ou visite guidée) a son libellé dans les 5 langues', () => {
    const missing: string[] = []
    for (const [lang, locale] of Object.entries(LOCALES)) {
      for (const kind of new Set(TUTORIALS.map((tuto) => tuto.kind))) {
        const label: unknown = locale.tutorials[`kind_${kind}`]
        if (typeof label !== 'string' || !label.trim()) missing.push(`${lang}: kind_${kind}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('un tutoriel qui crée de vraies données demande la permission de créer', () => {
    for (const tuto of TUTORIALS.filter((other) => other.kind === 'create')) {
      expect(tuto.permission?.action, tuto.id).toBe('create')
    }
  })
})
