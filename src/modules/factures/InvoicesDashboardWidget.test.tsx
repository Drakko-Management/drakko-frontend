import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { useInvoices } from '@/hooks/use-invoices'
import { InvoicesDashboardWidget } from './InvoicesDashboardWidget'
import { creditNote, invoice, issuedInvoice } from '@/test/invoice-fixtures'
import { plain } from '@/test/quote-fixtures'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('@/hooks/use-invoices', () => ({ useInvoices: vi.fn() }))

function show(data: unknown[] | undefined, isLoading = false) {
  vi.mocked(useInvoices).mockReturnValue({ data, isLoading } as never)
  render(
    <MemoryRouter>
      <InvoicesDashboardWidget />
    </MemoryRouter>,
  )
}

// Les trois premiers boutons sont les compteurs, dans l'ordre : brouillons, à encaisser, en retard
const TILES = ['Brouillons', 'À encaisser', 'En retard']
const tile = (label: string) => screen.getAllByRole('button')[TILES.indexOf(label)]

beforeEach(() => vi.clearAllMocks())

describe('InvoicesDashboardWidget', () => {
  const data = [
    invoice({ id: 'd1' }),
    invoice({ id: 'd2' }),
    issuedInvoice({ id: 'a', total: '100.00' }),
    issuedInvoice({ id: 'b', total: '250.50', overdue: true, reference: 'FAC-2026-0002' }),
    issuedInvoice({ id: 'c', status: 'PAID', reference: 'FAC-2026-0003', total: '999.00' }),
    creditNote({ id: 'cn1', total: '-100.00' }),
  ]

  it('compte les brouillons, les factures à encaisser et celles en retard', () => {
    show(data)

    expect(within(tile('Brouillons')).getByText('2')).toBeInTheDocument()
    // À encaisser : les deux factures émises ; ni la payée ni l'avoir
    expect(within(tile('À encaisser')).getByText('2')).toBeInTheDocument()
    expect(within(tile('En retard')).getByText('1')).toBeInTheDocument()
  })

  it('dit le montant à encaisser, centime près, sans compter les avoirs ni les factures payées', () => {
    show(data)

    expect(plain(screen.getByTestId('invoices-to-collect').textContent)).toBe('350,50 € à encaisser')
  })

  it('rien à encaisser : pas de phrase de montant', () => {
    show([invoice()])

    expect(screen.queryByTestId('invoices-to-collect')).not.toBeInTheDocument()
  })

  it.each([
    ['Brouillons', 'DRAFT'],
    ['À encaisser', 'ISSUED'],
    ['En retard', 'OVERDUE'],
  ])('« %s » ouvre la liste filtrée', async (label, filter) => {
    show(data)

    await userEvent.click(tile(label))

    expect(mockNavigate).toHaveBeenCalledWith(`/factures?filter=${filter}`)
  })

  it('montre les factures récentes (cinq au plus) et chacune s\'ouvre', async () => {
    show(Array.from({ length: 8 }, (_, i) => issuedInvoice({ id: `i${i}`, reference: `FAC-2026-000${i}`, title: null })))

    const rows = screen.getAllByRole('button', { name: /FAC-2026-000/ })
    expect(rows).toHaveLength(5)
    await userEvent.click(rows[0])
    expect(mockNavigate).toHaveBeenCalledWith('/factures/i0')
  })

  it('« Voir tout » ouvre la liste', async () => {
    show(data)

    await userEvent.click(screen.getByRole('button', { name: 'Voir tout' }))

    expect(mockNavigate).toHaveBeenCalledWith('/factures')
  })

  it('aucune facture : le dit', () => {
    show([])

    expect(screen.getByText('Aucune facture pour le moment')).toBeInTheDocument()
  })
})
