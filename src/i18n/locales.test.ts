import { describe, it, expect } from 'vitest'
import fr from './locales/fr.json'
import en from './locales/en.json'
import es from './locales/es.json'
import itLocale from './locales/it.json'
import de from './locales/de.json'
import { TUTORIALS } from '@/tutorials/definitions'
import { NAV_SLOT_REGISTRY } from '@/lib/nav-slots'
import { MODULES, ACTIONS } from '@/lib/permissions'

const LOCALES: Record<string, unknown> = { fr, en, es, it: itLocale, de }
const OTHERS = ['en', 'es', 'it', 'de']

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value }
  if (value && typeof value === 'object') {
    return Object.assign(
      {},
      ...Object.entries(value).map(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k)),
    )
  }
  return {}
}

const flat: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(LOCALES).map(([lang, data]) => [lang, flatten(data)]),
)

// Une clé de pluriel (`_one`, `_other`) compte comme présente
const hasKey = (lang: string, key: string) =>
  key in flat[lang]! || `${key}_one` in flat[lang]! || `${key}_other` in flat[lang]!

// ── Cohérence entre les langues ────────────────────────────────────────────

describe('traductions — cohérence entre les 5 langues', () => {
  it.each(OTHERS)('%s a exactement les mêmes clés que fr', (lang) => {
    const missing = Object.keys(flat.fr!).filter((k) => !(k in flat[lang]!))
    const extra = Object.keys(flat[lang]!).filter((k) => !(k in flat.fr!))
    expect({ missing, extra }).toEqual({ missing: [], extra: [] })
  })

  it.each(Object.keys(LOCALES))('%s : aucune traduction vide', (lang) => {
    const empty = Object.entries(flat[lang]!)
      .filter(([, value]) => !value.trim())
      .map(([key]) => key)
    expect(empty).toEqual([])
  })

  it.each(OTHERS)('%s : mêmes variables {{…}} que fr', (lang) => {
    const variables = (s: string) =>
      [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(',')
    const mismatched = Object.keys(flat.fr!).filter(
      (k) => k in flat[lang]! && variables(flat.fr![k]!) !== variables(flat[lang]![k]!),
    )
    expect(mismatched).toEqual([])
  })
})

// ── Clés utilisées dans le code ────────────────────────────────────────────

describe('traductions — clés utilisées dans le code', () => {
  const sources = import.meta.glob(
    ['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts', '!../**/*.test.tsx'],
    { query: '?raw', import: 'default', eager: true },
  ) as Record<string, string>

  it.each(Object.keys(LOCALES))('%s : chaque clé t(\'…\') statique existe', (lang) => {
    const missing: string[] = []
    for (const [file, code] of Object.entries(sources)) {
      for (const match of code.matchAll(/\bt\(\s*(['"`])([A-Za-z0-9_.]+)\1/g)) {
        if (!hasKey(lang, match[2]!)) missing.push(`${file.replace('../', 'src/')} → ${match[2]}`)
      }
    }
    expect(missing).toEqual([])
  })

  // Clés construites dynamiquement dans le code (t(`status.${status}`), registres de navigation…)
  const DYNAMIC: Record<string, string[]> = {
    statuts: ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'AWAITING_SIGNATURE', 'AWAITING_RESERVE_LIFT', 'COMPLETED', 'DISPUTED'].map((s) => `status.${s}`),
    étapes: ['status.step_reserve_lift'],
    modules: MODULES.map((m) => `users.module_${m}`),
    actions: ACTIONS.map((a) => `users.action_${a}`),
    onglets: ['membres', 'roles'].map((tab) => `users.tab_${tab}`),
    navigation: Object.values(NAV_SLOT_REGISTRY).flatMap((slot) => [slot.labelKey, slot.nameKey]),
    'choix de réception': ['accepted', 'accepted_with_reserves', 'refused'].map((c) => `sign.choice_${c}`),
  }

  it.each(Object.keys(LOCALES))('%s : les clés dynamiques existent', (lang) => {
    const missing = Object.values(DYNAMIC).flat().filter((k) => !hasKey(lang, k))
    expect(missing).toEqual([])
  })

  it.each(Object.keys(LOCALES))('%s : chaque tutoriel a son titre, sa description et le texte de chaque étape', (lang) => {
    const missing: string[] = []
    for (const tutorial of TUTORIALS) {
      const needed = [`tutorials.${tutorial.id}.title`]
      if (tutorial.audience !== 'public') needed.push(`tutorials.${tutorial.id}.desc`)
      for (const step of [...tutorial.steps, ...(tutorial.fallbackSteps ?? [])]) {
        needed.push(`tutorials.${tutorial.id}.${step.id}_title`, `tutorials.${tutorial.id}.${step.id}_body`)
      }
      missing.push(...needed.filter((k) => !hasKey(lang, k)))
    }
    expect(missing).toEqual([])
  })
})
