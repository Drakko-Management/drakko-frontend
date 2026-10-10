import { describe, it, expect } from 'vitest'
import css from './index.css?raw'

describe('index.css', () => {
  // Sans cela, l'icône du calendrier d'un champ de date se décale de quelques pixels selon les chiffres choisis
  it('les champs de date ont des chiffres de largeur fixe', () => {
    expect(css).toMatch(/input\[type="date"\]\s*\{[^}]*font-variant-numeric:\s*tabular-nums/)
  })
})
