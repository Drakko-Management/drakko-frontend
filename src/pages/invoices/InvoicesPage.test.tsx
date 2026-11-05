import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { useInvoices } from '@/hooks/use-invoices'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions } from '@/lib/permissions'
import { InvoicesPage } from './InvoicesPage'
import { creditNote, invoice, issuedInvoice } from '@/test/invoice-fixtures'
import { plain } from '@/test/quote-fixtures'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('@/hooks/use-invoices', () => ({ useInvoices: vi.fn() }))

function renderPage(entry = '/factures') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <InvoicesPage />
    </MemoryRouter>,
  )
}

const lastFilters = () => {
  const calls = vi.mocked(useInvoices).mock.calls
  return calls[calls.length - 1]?.[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useInvoices).mockReturnValue({ data: [], isLoading: false } as never)
  useAuthStore.setState({ role: 'ADMIN', permissions: null, modules: null })
})

describe('InvoicesPage', () => {
  it('liste les factures : titre, numéro, client, montant, état', () => {
    vi.mocked(useInvoices).mockReturnValue({
      data: [
        invoice({ id: 'd1', title: 'Brouillon de haie' }),
        issuedInvoice({ id: 'e1' }),
        issuedInvoice({ id: 'o1', reference: 'FAC-2026-0002', title: null, overdue: true, dueDate: '2026-11-01T00:00:00.000Z' }),
        issuedInvoice({ id: 'p1', status: 'PAID', reference: 'FAC-2026-0003', title: null }),
        creditNote(),
      ],
      isLoading: false,
    } as never)
    renderPage()

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(5)
    // Un brouillon n'a pas de numéro : le titre le désigne, « Brouillon » le dit
    expect(within(rows[0]).getByText('Brouillon de haie')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Brouillon · Léa Martin')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Haie du fond')).toBeInTheDocument()
    expect(within(rows[1]).getByText('FAC-2026-0001 · Léa Martin')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Émise')).toBeInTheDocument()
    expect(plain(within(rows[1]).getByText(/137,50/).textContent)).toBe('137,50 €')
    // Sans objet, le numéro fait le titre et n'est pas répété dessous
    expect(within(rows[2]).getByText('FAC-2026-0002')).toBeInTheDocument()
    expect(within(rows[2]).getByText('En retard')).toBeInTheDocument()
    expect(within(rows[2]).getByText(/Échéance le 1 nov\. 2026/)).toBeInTheDocument()
    expect(within(rows[3]).getByText('Payée')).toBeInTheDocument()
    expect(within(rows[4]).getByText('Avoir')).toBeInTheDocument()
    expect(plain(within(rows[4]).getByText(/-137,50/).textContent)).toContain('-137,50')
  })

  it('une ligne ouvre la facture', async () => {
    vi.mocked(useInvoices).mockReturnValue({ data: [issuedInvoice({ id: 'e1' })], isLoading: false } as never)
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /Haie du fond/ }))

    expect(mockNavigate).toHaveBeenCalledWith('/factures/e1')
  })

  it.each([
    ['Brouillons', { status: 'DRAFT' }],
    // « À encaisser » ne compte pas les avoirs, qui n'attendent aucun paiement
    ['À encaisser', { status: 'ISSUED', kind: 'INVOICE' }],
    ['En retard', { overdue: true }],
    ['Payées', { status: 'PAID' }],
    ['Avoirs', { kind: 'CREDIT_NOTE' }],
  ])('l\'onglet « %s » demande ce qu\'il faut à l\'API', async (label, expected) => {
    renderPage()

    await userEvent.click(screen.getByRole('tab', { name: label }))

    expect(lastFilters()).toMatchObject(expected)
    expect(screen.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true')
  })

  it('« Toutes » ne filtre rien', async () => {
    renderPage('/factures?filter=PAID')
    expect(lastFilters()).toMatchObject({ status: 'PAID' })

    await userEvent.click(screen.getByRole('tab', { name: 'Toutes' }))

    expect(lastFilters()).toEqual({ q: undefined, limit: 50 })
  })

  it('l\'onglet vient de l\'adresse (le tableau de bord y renvoie)', () => {
    renderPage('/factures?filter=OVERDUE')

    expect(screen.getByRole('tab', { name: 'En retard' })).toHaveAttribute('aria-selected', 'true')
    expect(lastFilters()).toMatchObject({ overdue: true })
  })

  it('un onglet inconnu dans l\'adresse vaut « Toutes »', () => {
    renderPage('/factures?filter=NOPE')

    expect(screen.getByRole('tab', { name: 'Toutes' })).toHaveAttribute('aria-selected', 'true')
  })

  it('la recherche part à l\'API après une courte pause', async () => {
    renderPage()

    await userEvent.type(screen.getByPlaceholderText('Rechercher une facture…'), 'terrasse')

    await vi.waitFor(() => expect(lastFilters()).toMatchObject({ q: 'terrasse' }))
  })

  it('aucune facture : un état vide qui propose d\'en créer une', async () => {
    renderPage()

    expect(screen.getByText('Aucune facture')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Nouvelle facture' })[0])
    expect(mockNavigate).toHaveBeenCalledWith('/factures/nouveau')
  })

  it('un filtre sans résultat le dit, sans proposer de créer', () => {
    renderPage('/factures?filter=PAID')

    expect(screen.getByText('Aucune facture ne correspond')).toBeInTheDocument()
    expect(screen.queryByText('Créez une facture depuis un devis accepté, ou partez de zéro.')).not.toBeInTheDocument()
  })

  it('en lecture seule, aucun bouton pour créer', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ factures: ['read'] }) })
    renderPage()

    expect(screen.queryByRole('button', { name: 'Nouvelle facture' })).not.toBeInTheDocument()
  })

  describe('« Afficher plus » : la liste ne s\'arrête jamais en silence', () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, i) => issuedInvoice({ id: `i${i}`, reference: `FAC-2026-${String(i).padStart(4, '0')}`, title: `Facture ${i}` }))

    it('moins de factures que demandé : tout est là, pas de bouton', () => {
      vi.mocked(useInvoices).mockReturnValue({ data: many(49), isLoading: false } as never)
      renderPage()

      expect(screen.queryByRole('button', { name: 'Afficher plus' })).not.toBeInTheDocument()
    })

    it('autant de factures que demandé : « Afficher plus » en demande cinquante de plus', async () => {
      vi.mocked(useInvoices).mockReturnValue({ data: many(50), isLoading: false } as never)
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Afficher plus' }))

      expect(lastFilters()).toMatchObject({ limit: 100 })
    })

    it('changer d\'onglet repart de cinquante', async () => {
      vi.mocked(useInvoices).mockImplementation(((filters: { limit?: number }) => ({
        data: many(filters.limit ?? 50),
        isLoading: false,
      })) as never)
      renderPage()
      await userEvent.click(screen.getByRole('button', { name: 'Afficher plus' }))
      expect(lastFilters()).toMatchObject({ limit: 100 })

      await userEvent.click(screen.getByRole('tab', { name: 'Brouillons' }))

      expect(lastFilters()).toMatchObject({ status: 'DRAFT', limit: 50 })
    })
  })
})
