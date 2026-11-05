import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { useQuotesSummary } from '@/hooks/use-quotes'
import { quote } from '@/test/quote-fixtures'
import type { QuotesSummary } from '@/types/api'
import { QuotesDashboardWidget } from './QuotesDashboardWidget'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('@/hooks/use-quotes', () => ({ useQuotesSummary: vi.fn() }))

const SUMMARY: QuotesSummary = {
  drafts: 2,
  sent: 1,
  accepted: 1,
  recent: [
    quote({ id: 'a', status: 'DRAFT', reference: 'DEV-2026-0004' }),
    quote({ id: 'b', status: 'DRAFT', reference: 'DEV-2026-0003' }),
    quote({ id: 'c', status: 'SENT', reference: 'DEV-2026-0002' }),
    quote({ id: 'd', status: 'ACCEPTED', reference: 'DEV-2026-0001' }),
  ],
}

function renderWidget(summary: QuotesSummary | undefined = SUMMARY, isLoading = false) {
  vi.mocked(useQuotesSummary).mockReturnValue({ data: summary, isLoading } as never)
  render(
    <MemoryRouter>
      <QuotesDashboardWidget />
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('QuotesDashboardWidget', () => {
  it('compte les brouillons, les envoyés et les acceptés', () => {
    renderWidget()

    const counts = screen.getAllByRole('button').slice(0, 3).map((b) => b.textContent)
    expect(counts[0]).toMatch(/^2/)
    expect(counts[1]).toMatch(/^1/)
    expect(counts[2]).toMatch(/^1/)
  })

  it('les comptes viennent de la synthèse du serveur, pas des devis récents : 205 brouillons restent 205', () => {
    renderWidget({ ...SUMMARY, drafts: 205, sent: 1200, accepted: 310 })

    const counts = screen.getAllByRole('button').slice(0, 3).map((b) => b.textContent)
    expect(counts[0]).toMatch(/^205/)
    expect(counts[1]).toMatch(/^1200/)
    expect(counts[2]).toMatch(/^310/)
  })

  it('un compteur ouvre la liste filtrée sur cet état', async () => {
    renderWidget()

    await userEvent.click(screen.getAllByRole('button')[1])

    expect(mockNavigate).toHaveBeenCalledWith('/devis?status=SENT')
  })

  it('montre les devis récents de la synthèse, et « Voir tout » ouvre la liste', async () => {
    renderWidget()

    expect(screen.getByRole('heading', { name: 'Devis récents' })).toBeInTheDocument()
    expect(screen.getAllByText(/DEV-2026-000/)).toHaveLength(4)
    await userEvent.click(screen.getByRole('button', { name: 'Voir tout' }))
    expect(mockNavigate).toHaveBeenCalledWith('/devis')
  })

  it('un devis récent ouvre sa fiche', async () => {
    renderWidget()

    await userEvent.click(within(screen.getByRole('region', { name: 'Devis' })).getByText('DEV-2026-0002', { exact: false }))

    expect(mockNavigate).toHaveBeenCalledWith('/devis/c')
  })

  it('sans devis : le dit', () => {
    renderWidget({ drafts: 0, sent: 0, accepted: 0, recent: [] })

    expect(screen.getByText('Aucun devis pour le moment')).toBeInTheDocument()
  })

  it('pendant le chargement, les compteurs sont des squelettes (pas un faux zéro)', () => {
    renderWidget(undefined, true)

    expect(screen.queryByText('Aucun devis pour le moment')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button').slice(0, 3).every((b) => !/^\d/.test(b.textContent ?? ''))).toBe(true)
  })
})
