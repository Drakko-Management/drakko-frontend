import { describe, it, expect } from 'vitest'
import css from './index.css?raw'

describe('index.css', () => {
  // Sans cela, l'icône du calendrier d'un champ de date se décale de quelques pixels selon les chiffres choisis
  it('les champs de date ont des chiffres de largeur fixe', () => {
    expect(css).toMatch(/input\[type="date"\]\s*\{[^}]*font-variant-numeric:\s*tabular-nums/)
  })

  // Joyride le dessine en « fixed » dans notre coque fixe : sur iPad, en appli installée, un fondu flou restait en haut de
  // l'écran à la fin d'un tutoriel. En « absolute » il suit le défilement de la page, que le clavier ouvert fait bouger :
  // la règle doit donc aussi le recaler (variables publiées par `useOverlayAnchor`)
  it('le calque sombre des tutoriels reste en « absolute », recalé sur le défilement', () => {
    const rule = css.match(/\.react-joyride__spotlight\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(rule).toMatch(/position:\s*absolute\s*!important/)
    expect(rule).toMatch(/top:\s*var\(--page-scroll-y,\s*0px\)\s*!important/)
    expect(rule).toMatch(/left:\s*var\(--page-scroll-x,\s*0px\)\s*!important/)
  })
})
