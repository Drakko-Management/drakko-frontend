import { describe, it, expect, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useOverlayAnchor } from './use-overlay-anchor'

function scrollTo(x: number, y: number) {
  Object.defineProperty(window, 'scrollX', { value: x, configurable: true })
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  window.dispatchEvent(new Event('scroll'))
}

const readY = () => document.documentElement.style.getPropertyValue('--page-scroll-y')
const readX = () => document.documentElement.style.getPropertyValue('--page-scroll-x')

describe('useOverlayAnchor', () => {
  afterEach(() => { scrollTo(0, 0) })

  it('publie le défilement courant dès le montage', () => {
    scrollTo(0, 219)
    const { unmount } = renderHook(() => { useOverlayAnchor() })

    expect(readY()).toBe('219px')
    expect(readX()).toBe('0px')
    unmount()
  })

  // Un clavier ouvert fait défiler la fenêtre de 219 px (iPad Air en paysage) : le calque des tutoriels doit suivre,
  // sans quoi la zone éclairée se décale de 219 px par rapport au champ
  it('suit le défilement de la fenêtre, puis son retour à zéro', () => {
    const { unmount } = renderHook(() => { useOverlayAnchor() })

    scrollTo(0, 219)
    expect(readY()).toBe('219px')

    scrollTo(0, 0)
    expect(readY()).toBe('0px')
    unmount()
  })

  it('retire les variables et cesse d\'écouter au démontage', () => {
    const { unmount } = renderHook(() => { useOverlayAnchor() })
    unmount()

    expect(readY()).toBe('')
    expect(readX()).toBe('')
    scrollTo(0, 50)
    expect(readY()).toBe('')
  })
})
