import { describe, it, expect, afterEach } from 'vitest'
import { fitTooltipHeight, stepSpotlightPadding } from './floating'

const MAX_H = '--tutorial-max-h'
const initialHeight = window.innerHeight

afterEach(() => {
  Object.defineProperty(window, 'innerHeight', { value: initialHeight, configurable: true })
})

/** Fait tourner le middleware pour une cible donnée et renvoie la hauteur maximale posée sur la bulle. */
function maxHeight(placement: string, target: { top: number; bottom: number }, viewportHeight = 640): string {
  Object.defineProperty(window, 'innerHeight', { value: viewportHeight, configurable: true })
  const floating = document.createElement('div')
  const state = { placement, elements: { floating, reference: { getBoundingClientRect: () => target } } }
  const result = (fitTooltipHeight.fn as (s: unknown) => unknown)(state)
  expect(result).toEqual({}) // ne déplace rien : il borne seulement la hauteur
  return floating.style.getPropertyValue(MAX_H)
}

describe('fitTooltipHeight — la bulle ne dépasse pas la place restante', () => {
  it('posée sous la cible : la place va du bas de la cible au bas de l\'écran, moins la marge', () => {
    expect(maxHeight('bottom', { top: 120, bottom: 382 })).toBe('216px') // 640 − 382 − 42
    expect(maxHeight('bottom', { top: 100, bottom: 300 })).toBe('298px')
  })

  it('posée au-dessus de la cible : la place va du haut de l\'écran au haut de la cible', () => {
    expect(maxHeight('top', { top: 400, bottom: 460 })).toBe('358px')
    expect(maxHeight('top-start', { top: 300, bottom: 360 })).toBe('258px')
  })

  it('jamais sous un plancher : plutôt défiler un peu que cacher la cible', () => {
    expect(maxHeight('bottom', { top: 500, bottom: 620 })).toBe('140px')
    expect(maxHeight('top', { top: 30, bottom: 90 })).toBe('140px')
  })

  it('suit la hauteur de l\'écran (iPhone dans Safari : environ 664 px)', () => {
    expect(maxHeight('bottom', { top: 120, bottom: 300 }, 664)).toBe('322px')
  })
})

describe('stepSpotlightPadding — la zone éclairée garde sa marge sur les quatre côtés', () => {
  it('étape ordinaire : marge par défaut de Joyride, aucune marge propre à l\'étape', () => {
    expect(stepSpotlightPadding({}, 0)).toBeUndefined()
  })

  it('liste déroulante : seul le bas s\'agrandit, les autres côtés gardent 8 px (et non 0)', () => {
    expect(stepSpotlightPadding({ floating: 'ul' }, 0)).toEqual({ top: 8, right: 8, bottom: 8, left: 8 })
    expect(stepSpotlightPadding({ floating: 'ul' }, 120)).toEqual({ top: 8, right: 8, bottom: 128, left: 8 })
  })

  it('marge propre à l\'étape : les côtés précisés l\'emportent, les autres gardent 8 px', () => {
    expect(stepSpotlightPadding({ spotlightPadding: { bottom: 40 } }, 0)).toEqual({ top: 8, right: 8, bottom: 40, left: 8 })
    expect(stepSpotlightPadding({ spotlightPadding: { bottom: 40 }, floating: 'ul' }, 100)).toEqual({ top: 8, right: 8, bottom: 140, left: 8 })
  })
})
