import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { useQuotes } from '@/hooks/use-quotes'
import { quote } from '@/test/quote-fixtures'
import { QuotesDashboardWidget } from './QuotesDashboardWidget'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('@/hooks/use-quotes', () => ({ useQuotes: vi.fn() }))

function renderWidget() {
  render(
    <MemoryRouter>
      <QuotesDashboardWidget />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useQuotes).mockReturnValue({
    data: [
      quote({ id: 'a', status: 'DRAFT', reference: 'DEV-2026-0004' }),
      quote({ id: 'b', status: 'DRAFT', reference: 'DEV-2026-0003' }),
      quote({ id: 'c', status: 'SENT', reference: 'DEV-2026-0002' }),
      quote({ id: 'd', status: 'ACCEPTED', reference: 'DEV-2026-0001' }),
      quote({ id: 'e', status: 'REJECTED', reference: 'DEV-2025-0009' }),
    ],
    isLoading: false,
  } as never)
})

describe('QuotesDashboardWidget', () => {
  it('compte les brouillons, les envoyés et les acceptés (les refusés ne sont pas un chiffre de travail)', () => {
    renderWidget()

    const counts = screen.getAllByRole('button').slice(0, 3).map((b) => b.textContent)
    expect(counts[0]).toMatch(/^2/)
    expect(counts[1]).toMatch(/^1/)
    expect(counts[2]).toMatch(/^1/)
  })

  it('un compteur ouvre la liste filtrée sur cet état', async () => {
    renderWidget()

    await userEvent.click(screen.getAllByRole('button')[1])

    expect(mockNavigate).toHaveBeenCalledWith('/devis?status=SENT')
  })

  it('montre au plus cinq devis récents, et « Voir tout » ouvre la liste', async () => {
    renderWidget()

    expect(screen.getByRole('heading', { name: 'Devis récents' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Voir tout' }))
    expect(mockNavigate).toHaveBeenCalledWith('/devis')
  })

  it('un devis récent ouvre sa fiche', async () => {
    renderWidget()

    await userEvent.click(within(screen.getByRole('region', { name: 'Devis' })).getByText('DEV-2026-0002', { exact: false }))

    expect(mockNavigate).toHaveBeenCalledWith('/devis/c')
  })

  it('sans devis : le dit', () => {
    vi.mocked(useQuotes).mockReturnValue({ data: [], isLoading: false } as never)
    renderWidget()

    expect(screen.getByText('Aucun devis pour le moment')).toBeInTheDocument()
  })
})
