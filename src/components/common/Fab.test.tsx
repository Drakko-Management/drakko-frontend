import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Fab } from './Fab'

describe('Fab', () => {
  it('affiche le bouton « + » avec son nom accessible et réagit au clic', async () => {
    const onClick = vi.fn()
    render(<Fab onClick={onClick} tutorial="clients-new" />)

    const button = screen.getByRole('button', { name: 'Nouveau' })
    expect(button).toHaveAttribute('data-tutorial', 'clients-new')

    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('seul, il ne contient que le bouton « + »', () => {
    const { container } = render(<Fab onClick={vi.fn()} />)

    expect(container.querySelector('.bottom-fab')?.children).toHaveLength(1)
  })

  it('un bouton secondaire est empilé sous le « + », dans le même conteneur fixe', () => {
    const { container } = render(
      <Fab onClick={vi.fn()} secondary={<button aria-label="Action rapide" />} />,
    )

    const stack = container.querySelector('.bottom-fab')!
    const [first, second] = Array.from(stack.children)
    expect(first).toBe(screen.getByRole('button', { name: 'Nouveau' }))
    expect(second).toBe(screen.getByRole('button', { name: 'Action rapide' }))
    expect(stack).toHaveClass('fixed', 'flex-col', 'md:hidden')
  })
})
