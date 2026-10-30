import type { FloatingOptions } from 'react-joyride'

type FloatingMiddleware = NonNullable<FloatingOptions['middleware']>[number]

/** Écart entre la bulle et la cible (contour éclairé, flèche : 34 px mesurés) plus une marge de 8 px au bord de l'écran. */
const EDGE_ROOM = 42
/** En dessous, la bulle recouvrirait la cible : mieux vaut qu'elle défile un peu qu'elle la cache. */
const MIN_HEIGHT = 140

/**
 * Limite la hauteur de la bulle à la place qui reste du côté de la cible où elle est posée. `TutorialTooltip` lit la
 * variable `--tutorial-max-h` : son texte défile, ses boutons restent à l'écran. Sans cela, sur un écran court (petit
 * téléphone, iPhone dans Safari), la bulle dépasse, ses boutons sortent de l'écran et le fond sombre empêche de défiler :
 * on ne peut plus ni continuer ni quitter.
 */
export const fitTooltipHeight: FloatingMiddleware = {
  name: 'tutorialFitHeight',
  fn({ placement, elements }) {
    const target = elements.reference.getBoundingClientRect()
    const room = placement.startsWith('top') ? target.top : window.innerHeight - target.bottom
    elements.floating.style.setProperty('--tutorial-max-h', `${Math.max(room - EDGE_ROOM, MIN_HEIGHT)}px`)
    return {}
  },
}

/** Constante : Joyride recalcule la position à chaque nouvel objet d'options. */
export const tooltipFloatingOptions: Partial<FloatingOptions> = { middleware: [fitTooltipHeight] }
