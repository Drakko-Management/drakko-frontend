import { describe, it, expect } from 'vitest'
import ts from 'typescript'

/**
 * Règle du projet : aucun texte visible écrit en dur dans un composant (tout passe par `t('…')`).
 * Ce test lit le code source et signale :
 * - le texte brut dans le JSX ;
 * - les attributs visibles (`aria-label`, `placeholder`, `title`, `alt`…) écrits en dur ;
 * - toute chaîne contenant une lettre accentuée (signe de texte français).
 * Si un texte est volontairement non traduisible (nom propre, sigle, exemple de format), l'ajouter ci-dessous.
 */
const ALLOWED = new Set([
  'Drakko', // nom de marque
  'EI', 'EURL', 'SARL', 'SAS', 'SASU', 'SA', // formes juridiques (noms propres)
  'https://', 'FR12345678901', 'FR76 XXXX XXXX XXXX', // exemples de format
])

const USER_ATTRS = new Set(['aria-label', 'placeholder', 'title', 'alt', 'label', 'helperText', 'description'])
const ACCENTED = /[À-ÖØ-öø-ÿ]/ // lettres accentuées, sans × ni ÷
const hasLetters = (s: string) => /[A-Za-z]/.test(s) || ACCENTED.test(s)

const sources = import.meta.glob(
  ['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts', '!../**/*.test.tsx', '!../test/**', '!../i18n/locales/**'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

function findHardcodedText(file: string, code: string): string[] {
  const sf = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const found: string[] = []
  const report = (node: ts.Node, kind: string, text: string) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart())
    found.push(`${file.replace('../', 'src/')}:${line + 1} [${kind}] ${text}`)
  }

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim()
      if (text && hasLetters(text) && !ALLOWED.has(text)) report(node, 'texte JSX', text)
    } else if (ts.isJsxAttribute(node) && USER_ATTRS.has(node.name.getText())) {
      const init = node.initializer
      const value =
        init && ts.isStringLiteral(init)
          ? init.text
          : init && ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression)
            ? init.expression.text
            : null
      if (value && hasLetters(value) && !ALLOWED.has(value)) report(node, `attribut ${node.name.getText()}`, value)
    } else if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      ACCENTED.test(node.text) &&
      !ts.isImportDeclaration(node.parent) &&
      !ts.isExportDeclaration(node.parent)
    ) {
      report(node, 'texte accentué', node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

describe('textes visibles — aucun texte écrit en dur', () => {
  it('le code source ne contient que des textes passant par t(\'…\')', () => {
    const violations = Object.entries(sources).flatMap(([file, code]) => findHardcodedText(file, code))
    expect(violations, `Textes à traduire (clé dans les 5 fichiers de src/i18n/locales) :\n${violations.join('\n')}`).toEqual([])
  })
})
