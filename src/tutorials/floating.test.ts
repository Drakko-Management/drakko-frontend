import { describe, it, expect, afterEach } from 'vitest'
import { fitTooltipHeight, keepInVisibleArea, pickRoomierSide, stepSpotlightPadding, visibleArea } from './floating'

const MAX_H = '--tutorial-max-h'
const initialHeight = window.innerHeight
const initialScrollY = window.scrollY

/** Simule `visualViewport` : sur iPad le clavier la réduit sans toucher à `innerHeight`. */
function setVisualViewport(viewport: { pageTop: number; height: number } | undefined) {
  Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true })
}

afterEach(() => {
  Object.defineProperty(window, 'innerHeight', { value: initialHeight, configurable: true })
  Object.defineProperty(window, 'scrollY', { value: initialScrollY, configurable: true })
  setVisualViewport(undefined)
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

describe('visibleArea — la zone que le clavier laisse voir', () => {
  it('sans visualViewport : toute la fenêtre', () => {
    Object.defineProperty(window, 'innerHeight', { value: 700, configurable: true })
    expect(visibleArea()).toEqual({ top: 0, bottom: 700 })
  })

  it('clavier ouvert : la hauteur de visualViewport, pas celle de la fenêtre', () => {
    Object.defineProperty(window, 'innerHeight', { value: 612, configurable: true })
    setVisualViewport({ pageTop: 0, height: 290 })
    expect(visibleArea()).toEqual({ top: 0, bottom: 290 })
  })

  it('le haut se déduit de pageTop moins le défilement (Safari recopie le défilement dans offsetTop)', () => {
    Object.defineProperty(window, 'scrollY', { value: 87, configurable: true })
    setVisualViewport({ pageTop: 87, height: 184 })
    expect(visibleArea()).toEqual({ top: 0, bottom: 184 })
    setVisualViewport({ pageTop: 137, height: 184 }) // page agrandie ou visuel décalé de 50 px dans la page
    expect(visibleArea()).toEqual({ top: 50, bottom: 234 })
  })

  it('fitTooltipHeight compte la place dans la zone visible', () => {
    Object.defineProperty(window, 'innerHeight', { value: 612, configurable: true })
    setVisualViewport({ pageTop: 0, height: 400 })
    // cible de 100 à 160 : sous elle il reste 240 px visibles (400 − 160), pas 452 comme sur la fenêtre entière
    expect(maxHeight('bottom', { top: 100, bottom: 160 }, 612)).toBe('198px')
  })

  it('compact : plancher plus bas, la bulle peut tenir dans peu de place', () => {
    setVisualViewport({ pageTop: 0, height: 290 })
    expect(maxHeight('bottom', { top: 40, bottom: 100 }, 612)).toBe('148px') // 290 − 100 − 42
    expect(maxHeight('bottom', { top: 60, bottom: 250 }, 612)).toBe('130px') // plancher compact, et non 140
  })
})

type MiddlewareFn = (state: unknown) => Record<string, unknown>

function sideState(placement: string, target: { top: number; bottom: number }, middlewareData: Record<string, unknown> = {}) {
  return { placement, middlewareData, elements: { reference: { getBoundingClientRect: () => target } } }
}

describe('pickRoomierSide — clavier ouvert, la bulle prend le côté qui a de la place', () => {
  const pick = (state: unknown) => (pickRoomierSide.fn as MiddlewareFn)(state)

  it('écran haut (pas de clavier) : ne touche à rien, le flip de Joyride suffit', () => {
    setVisualViewport({ pageTop: 0, height: 700 })
    expect(pick(sideState('bottom', { top: 600, bottom: 660 }))).toEqual({})
  })

  it('posée sous la cible mais il y a plus de place au-dessus : passe au-dessus', () => {
    setVisualViewport({ pageTop: 0, height: 290 })
    expect(pick(sideState('bottom', { top: 200, bottom: 260 }))).toEqual({ data: { switched: true }, reset: { placement: 'top' } })
  })

  it('posée au-dessus mais il y a plus de place dessous : passe dessous', () => {
    setVisualViewport({ pageTop: 0, height: 290 })
    expect(pick(sideState('top', { top: 30, bottom: 90 }))).toEqual({ data: { switched: true }, reset: { placement: 'bottom' } })
  })

  it('le côté choisi a déjà le plus de place : reste', () => {
    setVisualViewport({ pageTop: 0, height: 290 })
    expect(pick(sideState('bottom', { top: 30, bottom: 90 }))).toEqual({})
    expect(pick(sideState('top', { top: 200, bottom: 260 }))).toEqual({})
  })

  it('un seul changement par calcul : pas de va-et-vient avec le flip de Joyride', () => {
    setVisualViewport({ pageTop: 0, height: 290 })
    expect(pick(sideState('bottom', { top: 200, bottom: 260 }, { tutorialPickSide: { switched: true } }))).toEqual({})
  })

  it('côtés gauche et droit : laissés à Joyride', () => {
    setVisualViewport({ pageTop: 0, height: 290 })
    expect(pick(sideState('left', { top: 200, bottom: 260 }))).toEqual({})
  })
})

describe('keepInVisibleArea — les boutons de la bulle restent à l\'écran', () => {
  /** `y` et `rects.reference.y` sont dans le repère de la page : leur écart est la distance bulle ↔ cible. */
  const keep = (y: number, floatingHeight: number, target = { top: 100 }) =>
    (keepInVisibleArea.fn as MiddlewareFn)({
      y,
      rects: { reference: { y: target.top + 40 }, floating: { height: floatingHeight } },
      elements: { reference: { getBoundingClientRect: () => target } },
    })

  it('écran haut : ne bouge rien', () => {
    setVisualViewport({ pageTop: 0, height: 700 })
    expect(keep(400, 300)).toEqual({})
  })

  it('bulle entière dans la zone visible : ne bouge rien', () => {
    setVisualViewport({ pageTop: 0, height: 290 })
    // bulle de 120 px dont le haut est à 100 + (180 − 140) = 140 → bas à 260, marge comprise 290 − 8 = 282
    expect(keep(180, 120)).toEqual({})
  })

  it('bulle sous le clavier : remontée pour que son bas reste visible', () => {
    setVisualViewport({ pageTop: 0, height: 290 })
    // haut à 100 + (250 − 140) = 210, bas à 330 : 48 px de trop (282 maximum)
    expect(keep(250, 120)).toEqual({ y: 202 })
  })

  it('bulle au-dessus de l\'écran : redescendue pour que son haut reste visible', () => {
    setVisualViewport({ pageTop: 0, height: 290 })
    // haut à 100 + (20 − 140) = −20 : doit être à 8
    expect(keep(20, 120)).toEqual({ y: 48 })
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
