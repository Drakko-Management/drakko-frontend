/**
 * Écran tactile tenu en paysage. Le clavier virtuel y garde 180 à 290 px de l'écran (iPad mini, iPad Air) : la bulle du
 * guide ne tient plus et la page se décale toute seule sous le clavier. iOS ne laisse pas une page verrouiller
 * l'orientation (`screen.orientation.lock` n'existe pas, le `orientation` du manifeste est ignoré) : on invite à tourner
 * l'appareil avant de lancer un guide, sans jamais l'imposer.
 */
export const TOUCH_LANDSCAPE = '(pointer: coarse) and (orientation: landscape)'

export function isTouchLandscape(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(TOUCH_LANDSCAPE).matches
}
