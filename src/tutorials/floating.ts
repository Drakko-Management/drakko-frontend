import type { FloatingOptions } from 'react-joyride'

type FloatingMiddleware = NonNullable<FloatingOptions['middleware']>[number]

/** Écart entre la bulle et la cible (contour éclairé, flèche : 34 px mesurés) plus une marge de 8 px au bord de l'écran. */
const EDGE_ROOM = 42
/** En dessous, la bulle recouvrirait la cible : mieux vaut qu'elle défile un peu qu'elle la cache. */
const MIN_HEIGHT = 140
/** Marge entre la bulle et le bord de la zone visible quand on la recale. */
const SCREEN_MARGIN = 8

/**
 * Sous cette hauteur visible (clavier ouvert sur une tablette, téléphone en paysage) la bulle passe en présentation
 * compacte et se recale dans la zone visible : il n'y a la place ni d'un grand cadre ni d'un texte entier.
 */
export const COMPACT_BELOW = 460
/** Plancher de la bulle compacte : le titre, deux lignes de texte et les boutons. */
const MIN_HEIGHT_COMPACT = 130

/**
 * Partie de l'écran réellement visible, dans le repère de `getBoundingClientRect()`. Sur iPad et iPhone le clavier
 * n'agrandit pas la page : `window.innerHeight` garde la hauteur de l'écran entier et seule `visualViewport` rétrécit.
 * Se fier à `innerHeight` fait croire à la bulle qu'elle a de la place sous le clavier.
 * Le haut se déduit de `pageTop` et du défilement, pas de `offsetTop` : Safari y recopie le défilement de la page
 * (87 px de défilement, `offsetTop` à 87, alors que le haut visible est bien celui du repère), ce qui décalerait
 * toute la zone sous le clavier.
 */
export function visibleArea(): { top: number; bottom: number } {
  const viewport = window.visualViewport
  if (!viewport) return { top: 0, bottom: window.innerHeight }
  const top = viewport.pageTop - window.scrollY
  return { top, bottom: top + viewport.height }
}

function isCompact(area: { top: number; bottom: number }): boolean {
  return area.bottom - area.top < COMPACT_BELOW
}

/**
 * Limite la hauteur de la bulle à la place qui reste du côté de la cible où elle est posée. `TutorialTooltip` lit la
 * variable `--tutorial-max-h` : son texte défile, ses boutons restent à l'écran. Sans cela, sur un écran court (petit
 * téléphone, iPhone dans Safari, tablette au clavier), la bulle dépasse, ses boutons sortent de l'écran et le fond
 * sombre empêche de défiler : on ne peut plus ni continuer ni quitter.
 */
export const fitTooltipHeight: FloatingMiddleware = {
  name: 'tutorialFitHeight',
  fn({ placement, elements }) {
    const target = elements.reference.getBoundingClientRect()
    const area = visibleArea()
    const room = placement.startsWith('top') ? target.top - area.top : area.bottom - target.bottom
    const floor = isCompact(area) ? MIN_HEIGHT_COMPACT : MIN_HEIGHT
    elements.floating.style.setProperty('--tutorial-max-h', `${Math.max(room - EDGE_ROOM, floor)}px`)
    return {}
  },
}

/**
 * Clavier ouvert : le côté choisi par Joyride se mesure sur la fenêtre entière, clavier compris, et la bulle se
 * retrouve dessous ou hors de l'écran. On reprend le côté qui a le plus de place dans la zone réellement visible.
 * À placer avant `fitTooltipHeight`, qui borne la hauteur selon le côté retenu. Un seul changement par calcul, pour
 * ne pas se battre avec le `flip` de Joyride.
 */
export const pickRoomierSide: FloatingMiddleware = {
  name: 'tutorialPickSide',
  fn({ placement, elements, middlewareData }) {
    const area = visibleArea()
    if (!isCompact(area) || middlewareData.tutorialPickSide) return {}
    if (!placement.startsWith('top') && !placement.startsWith('bottom')) return {}
    const target = elements.reference.getBoundingClientRect()
    const above = target.top - area.top
    const below = area.bottom - target.bottom
    const onTop = placement.startsWith('top')
    if ((onTop ? above : below) >= (onTop ? below : above)) return {}
    return { data: { switched: true }, reset: { placement: onTop ? 'bottom' : 'top' } }
  },
}

/**
 * Dernier recours, clavier ouvert : si la bulle déborde encore de la zone visible (pas assez de place d'un côté comme
 * de l'autre), on la décale pour que ses boutons restent à l'écran, quitte à couvrir un peu la cible. Sans cela le fond
 * sombre empêche de défiler et on ne peut ni continuer ni quitter.
 */
export const keepInVisibleArea: FloatingMiddleware = {
  name: 'tutorialKeepInView',
  fn({ y, elements, rects }) {
    const area = visibleArea()
    if (!isCompact(area)) return {}
    // `y` et `rects.reference.y` sont dans le repère du parent positionné : leur écart donne la place par rapport à la cible
    const top = elements.reference.getBoundingClientRect().top + (y - rects.reference.y)
    const bottom = top + rects.floating.height
    let shift = 0
    if (bottom > area.bottom - SCREEN_MARGIN) shift = area.bottom - SCREEN_MARGIN - bottom
    if (top + shift < area.top + SCREEN_MARGIN) shift = area.top + SCREEN_MARGIN - top
    return shift === 0 ? {} : { y: y + shift }
  },
}

/** Marge de la zone éclairée autour de la cible, par défaut. */
export const SPOTLIGHT_PADDING = 8

interface SpotlightPaddingDef {
  spotlightPadding?: { top?: number; right?: number; bottom?: number; left?: number }
  floating?: string
}

/**
 * Marges propres à une étape, ou `undefined` pour garder celle par défaut. Joyride remplace la marge par défaut par
 * celle de l'étape et met à 0 chaque côté non précisé : on repart donc des quatre côtés par défaut, sans quoi une liste
 * déroulante (qui n'agrandit que le bas) collerait les champs aux bords de la zone éclairée.
 * `floatingExtra` : hauteur de l'élément flottant, actuellement affiché, que la zone doit englober.
 */
export function stepSpotlightPadding(def: SpotlightPaddingDef, floatingExtra: number) {
  if (!def.spotlightPadding && !def.floating) return undefined
  const padding = { top: SPOTLIGHT_PADDING, right: SPOTLIGHT_PADDING, bottom: SPOTLIGHT_PADDING, left: SPOTLIGHT_PADDING, ...def.spotlightPadding }
  return def.floating ? { ...padding, bottom: padding.bottom + floatingExtra } : padding
}

/** Constante : Joyride recalcule la position à chaque nouvel objet d'options. */
export const tooltipFloatingOptions: Partial<FloatingOptions> = {
  middleware: [pickRoomierSide, fitTooltipHeight, keepInVisibleArea],
}
