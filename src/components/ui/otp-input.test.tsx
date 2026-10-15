import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { OtpInput } from './otp-input'

function Harness() {
  const [value, setValue] = useState('')
  return (
    <>
      <label htmlFor="otp">Code</label>
      <OtpInput id="otp" value={value} onChange={setValue} />
    </>
  )
}

describe('OtpInput', () => {
  it('affiche 6 cases séparées par un tiret et ne garde que les chiffres', async () => {
    const { container } = render(<Harness />)
    await userEvent.type(screen.getByLabelText('Code'), '12a3-45')

    expect(screen.getByLabelText('Code')).toHaveValue('12345')
    expect(container.querySelectorAll('div[aria-hidden]')).toHaveLength(6)
    expect(container.textContent).toBe('Code123-45')
  })

  it('un collage trop long est coupé à 6 chiffres', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByLabelText('Code'))
    await userEvent.paste('123 456 789')

    expect(screen.getByLabelText('Code')).toHaveValue('123456')
  })

  it('la suppression retire le dernier chiffre', async () => {
    render(<Harness />)
    await userEvent.type(screen.getByLabelText('Code'), '123{Backspace}')

    expect(screen.getByLabelText('Code')).toHaveValue('12')
  })
})
