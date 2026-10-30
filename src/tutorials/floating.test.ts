import { describe, it, expect, afterEach } from 'vitest'
import { fitTooltipHeight } from './floating'

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
