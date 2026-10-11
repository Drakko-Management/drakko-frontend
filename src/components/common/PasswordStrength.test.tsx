import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PasswordStrength } from './PasswordStrength'

const filled = () =>
  screen.queryAllByTestId('strength-segment').filter((el) => !el.className.includes('bg-muted')).length

describe('PasswordStrength', () => {
  it('vide : seulement le conseil, pas de jauge', () => {
    render(<PasswordStrength check={{ status: 'empty', score: 0 }} />)

    expect(screen.getByText(/12 caractères minimum/)).toBeInTheDocument()
    expect(screen.queryAllByTestId('strength-segment')).toHaveLength(0)
  })

  it('trop court : message d\'erreur, jauge vide', () => {
    render(<PasswordStrength check={{ status: 'short', score: 0 }} />)

    expect(screen.getByText('Encore trop court : 12 caractères minimum')).toBeInTheDocument()
    expect(filled()).toBe(0)
  })

  it('en cours de vérification : message neutre', () => {
    render(<PasswordStrength check={{ status: 'checking', score: 0 }} />)

    expect(screen.getByText('Vérification…')).toBeInTheDocument()
  })

  it.each([
    [0, 'Très faible', 1],
    [1, 'Faible', 1],
    [2, 'Moyen', 2],
  ])('devinable (score %i) : niveau « %s », conseil et %i segment(s)', (score, label, segments) => {
    render(<PasswordStrength check={{ status: 'weak', score }} />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(/Trop facile à deviner/)).toBeInTheDocument()
    expect(filled()).toBe(segments)
  })

  it('devinable parce qu\'il contient les informations du compte : conseil précis', () => {
    render(<PasswordStrength check={{ status: 'weak', score: 2, reason: 'personal' }} />)

    expect(screen.getByText('Ne doit pas contenir votre identifiant, votre nom ou votre email')).toBeInTheDocument()
    expect(screen.queryByText(/Trop facile à deviner/)).not.toBeInTheDocument()
  })

  it.each([
    [3, 'Bon', 3],
    [4, 'Excellent', 4],
  ])('accepté (score %i) : niveau « %s », %i segments, confirmation', (score, label, segments) => {
    render(<PasswordStrength check={{ status: 'ok', score }} />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText('Mot de passe accepté')).toBeInTheDocument()
    expect(filled()).toBe(segments)
  })

  it('le conseil est annoncé aux lecteurs d\'écran', () => {
    render(<PasswordStrength check={{ status: 'ok', score: 4 }} />)

    expect(screen.getByRole('status')).toHaveTextContent('Mot de passe accepté')
  })
})
