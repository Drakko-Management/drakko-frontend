import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupportBanner } from './SupportBanner'
import { useAuthStore } from '@/store/auth.store'

const assign = vi.fn()
const NOW = new Date('2026-10-31T12:00:00Z').getTime()

function enter(msLeft = 30 * 60_000) {
  useAuthStore.setState({
    support: {
      expiresAt: NOW + msLeft,
      reason: 'Ticket 4512 : chantiers invisibles',
      organizationName: 'Jardins du Sud',
      viewingAs: 'Léa Martin',
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('location', { ...window.location, assign })
  useAuthStore.setState({ support: null })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('SupportBanner', () => {
  it('n’affiche rien dans une session ordinaire', () => {
    render(<SupportBanner />)
    expect(screen.queryByTestId('support-banner')).toBeNull()
  })

  it('en mode dépannage : lecture seule, organisation, personne vue, motif et temps restant', () => {
    vi.useFakeTimers({ now: NOW })
    enter()
    render(<SupportBanner />)

    const banner = screen.getByTestId('support-banner')
    expect(banner).toHaveTextContent('Mode dépannage · lecture seule')
    expect(banner).toHaveTextContent('Jardins du Sud — vu comme Léa Martin')
    expect(banner).toHaveTextContent('Motif : Ticket 4512 : chantiers invisibles')
    expect(banner).toHaveTextContent('Reste 30:00')
  })

  it('le temps restant décompte à la seconde', () => {
    vi.useFakeTimers({ now: NOW })
    enter()
    render(<SupportBanner />)

    act(() => {
      vi.advanceTimersByTime(65_000)
    })

    expect(screen.getByTestId('support-banner')).toHaveTextContent('Reste 28:55')
  })

  it('« Quitter » revient à la plateforme', async () => {
    enter()
    render(<SupportBanner />)

    await userEvent.click(screen.getByRole('button', { name: 'Quitter' }))

    expect(assign).toHaveBeenCalledWith('/plateforme')
  })

  it('à la fin des 30 minutes, retour automatique à la plateforme', () => {
    vi.useFakeTimers({ now: NOW })
    enter(3_000)
    render(<SupportBanner />)
    expect(assign).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(4_000)
    })

    expect(assign).toHaveBeenCalledWith('/plateforme')
  })

  it('reste visible : le bandeau est dans l’enveloppe de l’application, hors du défilement', async () => {
    const shell = (await import('@/components/layout/AppShell.tsx?raw')).default
    expect(shell).toContain('<SupportBanner />')
    expect(shell.indexOf('<SupportBanner />')).toBeLessThan(shell.indexOf('<Sidebar'))
  })
})
