import { useEffect } from 'react'

/**
 * Recale le calque sombre des tutoriels sur la partie visible de la page.
 *
 * Joyride dessine ce calque (`.react-joyride__spotlight`) en `position: fixed` dès que la cible est dans un conteneur
 * fixe, ce qui est toujours le cas dans la coque de l'application. Sur iPad, en appli installée, ce grand élément fixe
 * collé au bord haut laisse un fondu flou sous la barre d'état une fois le tutoriel fini, et seul un relancement de
 * l'appli l'enlève. La règle de `index.css` le garde donc en `absolute`.
 *
 * Un calque `absolute` suit le défilement de la page, alors que la coque et les cibles restent fixes : or un clavier
 * ouvert fait défiler la fenêtre sur iPad et iPhone (219 px mesurés sur un iPad Air en paysage). Sans correction, la zone
 * éclairée se retrouve décalée d'autant, et le fond sombre bloque la saisie. Ces deux variables CSS décalent le calque
 * du défilement courant, la règle les lit.
 */
export function useOverlayAnchor(): void {
  useEffect(() => {
    const root = document.documentElement
    const update = () => {
      root.style.setProperty('--page-scroll-x', `${window.scrollX}px`)
      root.style.setProperty('--page-scroll-y', `${window.scrollY}px`)
    }
    update()
    // Le clavier fait défiler la fenêtre, mais le déplacement de la zone visible ne déclenche pas toujours `scroll` sur
    // la fenêtre : on écoute aussi `visualViewport`
    const viewport = window.visualViewport
    window.addEventListener('scroll', update, { passive: true })
    viewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('scroll', update)
      viewport?.removeEventListener('scroll', update)
      root.style.removeProperty('--page-scroll-x')
      root.style.removeProperty('--page-scroll-y')
    }
  }, [])
}
