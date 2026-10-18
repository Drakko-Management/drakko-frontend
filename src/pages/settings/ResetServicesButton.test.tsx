import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useDeleteAllServices } from '@/hooks/use-services'
import { ResetServicesButton } from './ResetServicesButton'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-services', () => ({ useDeleteAllServices: vi.fn() }))

const mutateAsync = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mutateAsync.mockResolvedValue({ deleted: 3, deactivated: 1 })
  vi.mocked(useDeleteAllServices).mockReturnValue({ mutateAsync, isPending: false } as never)
})

describe('ResetServicesButton', () => {
  it("avertit avant d'effacer et n'envoie rien tant qu'on n'a pas confirmé", async () => {
    const user = userEvent.setup()
    render(<ResetServicesButton />)

    await user.click(screen.getByRole('button', { name: /réinitialiser les prestations/i }))

    expect(screen.getByText(/toute votre bibliothèque de prestations sera effacée/i)).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('efface tout après confirmation', async () => {
    const user = userEvent.setup()
    render(<ResetServicesButton />)

    await user.click(screen.getByRole('button', { name: /réinitialiser les prestations/i }))
    await user.click(screen.getByRole('button', { name: 'Tout effacer' }))

    expect(mutateAsync).toHaveBeenCalledTimes(1)
  })

  it("n'efface rien quand on annule", async () => {
    const user = userEvent.setup()
    render(<ResetServicesButton />)

    await user.click(screen.getByRole('button', { name: /réinitialiser les prestations/i }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(mutateAsync).not.toHaveBeenCalled()
  })
})
