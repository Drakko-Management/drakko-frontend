import { describe, it, expect, afterEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import type { TooltipRenderProps } from 'react-joyride'
import { TutorialTooltip } from './TutorialTooltip'
import type { TutorialStepData } from './TutorialTooltip'

// Hors TutorialProvider, `useTutorial()` renvoie des valeurs par défaut : t(clé) → la clé elle-même
function renderTooltip(data: Partial<TutorialStepData> = {}) {
  const buttonProps = { 'aria-label': '', 'data-action': '', onClick: () => undefined, role: 'button', title: '' }
  const props = {
    index: 1,
    size: 8,
    isLastStep: false,
    step: { title: 'Identité', content: 'Saisissez le prénom et le nom.', data: { advance: 'next', canGoBack: true, ...data } },
    tooltipProps: { role: 'alertdialog' },
    primaryProps: buttonProps,
    backProps: buttonProps,
    skipProps: buttonProps,
  } as unknown as TooltipRenderProps
  render(<TutorialTooltip {...props} />)
  return screen.getByRole('alertdialog')
}

afterEach(() => {
  Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true })
})

describe('TutorialTooltip — bulle sur un écran court', () => {
  it('est bornée à la place restante (variable posée par fitTooltipHeight) et, sans elle, à l\'écran', () => {
    const tooltip = renderTooltip()

    expect(tooltip).toHaveClass('flex', 'flex-col')
    expect(tooltip.className).toContain('max-h-[var(--tutorial-max-h,calc(100dvh_-_1.5rem))]')
  })

  it('le texte défile, les boutons restent hors de la zone qui défile', () => {
    const tooltip = renderTooltip()
    const scrollZone = tooltip.querySelector('.overflow-y-auto') as HTMLElement

    expect(scrollZone).not.toBeNull()
    expect(within(scrollZone).getByText('Identité')).toBeInTheDocument()
    expect(within(scrollZone).getByText('Saisissez le prénom et le nom.')).toBeInTheDocument()
    for (const name of ['tutorials.quit', 'tutorials.back', 'tutorials.next']) {
      const button = within(tooltip).getByRole('button', { name })
      expect(scrollZone).not.toContainElement(button)
    }
  })

  it('estompe le bas du texte tant qu\'il reste à lire, puis plus une fois lu jusqu\'au bout', () => {
    const tooltip = renderTooltip()
    const scrollZone = tooltip.querySelector('.overflow-y-auto') as HTMLElement
    const size = (scrollHeight: number, scrollTop: number) => {
      Object.defineProperty(scrollZone, 'scrollHeight', { value: scrollHeight, configurable: true })
      Object.defineProperty(scrollZone, 'clientHeight', { value: 200, configurable: true })
      scrollZone.scrollTop = scrollTop
      act(() => { scrollZone.dispatchEvent(new Event('scroll')) })
    }

    expect(scrollZone.className).not.toContain('mask-image') // le texte tient : rien à indiquer

    size(320, 0) // déborde, on est en haut
    expect(scrollZone.className).toContain('mask-image')

    size(320, 120) // lu jusqu'en bas
    expect(scrollZone.className).not.toContain('mask-image')
  })

  it('une étape d\'action n\'a pas de « Suivant » mais garde « Quitter » toujours accessible', () => {
    const tooltip = renderTooltip({ advance: 'action' })

    expect(within(tooltip).queryByRole('button', { name: 'tutorials.next' })).not.toBeInTheDocument()
    expect(within(tooltip).getByRole('button', { name: 'tutorials.quit' })).toBeInTheDocument()
  })

  it('clavier ouvert (peu de place visible) : marges réduites, numéro d\'étape et titre sur une seule ligne', () => {
    Object.defineProperty(window, 'visualViewport', { value: { pageTop: 0, height: 290, addEventListener: () => undefined, removeEventListener: () => undefined }, configurable: true })
    const tooltip = renderTooltip()

    expect(tooltip).toHaveClass('p-3')
    expect(tooltip).not.toHaveClass('p-4')
    const header = within(tooltip).getByText('Identité').parentElement as HTMLElement
    expect(header).toHaveClass('flex')
    expect(within(header).getByText('tutorials.step_of')).toBeInTheDocument()
  })

  it('écran haut : présentation habituelle', () => {
    const tooltip = renderTooltip()

    expect(tooltip).toHaveClass('p-4')
    expect(within(tooltip).getByText('Identité').parentElement).not.toHaveClass('flex')
  })
})
