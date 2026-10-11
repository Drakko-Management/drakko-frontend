import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { RecoveryCodesPanel } from './RecoveryCodesPanel'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const CODES = ['abcde-fghjk', 'mnpqr-stuvw', 'xyz23-45678']

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RecoveryCodesPanel', () => {
  it('montre chaque code, et explique qu’ils ne servent qu’une fois et ne seront plus jamais affichés', () => {
    render(<RecoveryCodesPanel codes={CODES} onDone={vi.fn()} />)

    for (const code of CODES) expect(screen.getByText(code)).toBeInTheDocument()
    expect(screen.getByText(/ne servira? qu'une fois|qu'une fois et ne sera plus jamais affiché/)).toBeInTheDocument()
  })

  it('on ne peut terminer qu’une fois la case « j’ai noté mes codes » cochée', async () => {
    const onDone = vi.fn()
    render(<RecoveryCodesPanel codes={CODES} onDone={onDone} />)
    const done = screen.getByRole('button', { name: 'Terminer' })

    expect(done).toBeDisabled()
    await userEvent.click(screen.getByLabelText(/J'ai noté mes codes de secours/))
    expect(done).toBeEnabled()
    await userEvent.click(done)

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('copier : tous les codes, un par ligne, dans le presse-papiers, avec confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<RecoveryCodesPanel codes={CODES} onDone={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Copier' }))

    expect(writeText).toHaveBeenCalledWith(CODES.join('\n'))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Codes copiés'))
  })

  it('copier impossible : message d’erreur', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('refusé')) }, configurable: true })
    render(<RecoveryCodesPanel codes={CODES} onDone={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Copier' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Impossible de copier les codes'))
  })

  it('télécharger : un fichier texte contenant les codes', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:codes')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<RecoveryCodesPanel codes={CODES} onDone={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Télécharger' }))

    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(await blob.text()).toContain(CODES.join('\n'))
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:codes')
    click.mockRestore()
  })
})
