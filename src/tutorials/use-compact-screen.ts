import { useEffect, useState } from 'react'
import { COMPACT_BELOW, visibleArea } from './floating'

function readHeight(): number {
  const area = visibleArea()
  return area.bottom - area.top
}

/**
 * Vrai quand la zone réellement visible est courte (clavier ouvert, téléphone en paysage). Le clavier d'iOS la réduit
 * sans que la fenêtre (`resize`) ne le sache : il faut écouter `visualViewport`.
 */
export function useCompactScreen(): boolean {
  const [height, setHeight] = useState(readHeight)

  useEffect(() => {
    const update = () => { setHeight(readHeight()) }
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', update)
    window.addEventListener('resize', update)
    update()
    return () => {
      viewport?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return height < COMPACT_BELOW
}
