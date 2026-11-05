import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { useQuotes } from '@/hooks/use-quotes'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions } from '@/lib/permissions'
import { QuotesPage } from './QuotesPage'
import { plain, quote } from '@/test/quote-fixtures'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('@/hooks/use-quotes', () => ({ useQuotes: vi.fn() }))

function renderAt(url = '/devis') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <QuotesPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useQuotes).mockReturnValue({
    data: [
      quote({ id: 'q2', reference: 'DEV-2026-0002', title: 'Terrasse', status: 'SENT', total: '1000.00' }),
      quote({ id: 'q1', reference: 'DEV-2026-0001', title: 'Haie du fond', status: 'DRAFT', total: '137.50' }),
    ],
    isLoading: false,
  } as never)
  useAuthStore.setState({ role: 'ADMIN', permissions: null, modules: null })
})

describe('QuotesPage', () => {
  it('liste chaque devis : objet, numéro, client, état et total', () => {
    renderAt()

    expect(screen.getByText('Terrasse')).toBeInTheDocument()
    expect(screen.getByText('Haie du fond')).toBeInTheDocument()
    expect(screen.getAllByText(/Léa Martin/)).toHaveLength(2)
    expect(screen.getByText('Envoyé', { selector: 'span' })).toBeInTheDocument()
    expect(plain(screen.getByText(/1\s?000,00/).textContent)).toBe('1 000,00 €')
  })

  it('un devis s\'ouvre sur sa fiche', async () => {
    renderAt()

    await userEvent.click(screen.getByText('Terrasse'))

    expect(mockNavigate).toHaveBeenCalledWith('/devis/q2')
  })

  it('sans filtre, la requête n\'en porte aucun ; un état choisi dans l\'adresse filtre la liste', () => {
    renderAt('/devis?status=SENT')

    expect(useQuotes).toHaveBeenLastCalledWith({ status: 'SENT', q: undefined, limit: 50 })
    expect(screen.getByRole('tab', { name: 'Envoyé' })).toHaveAttribute('aria-selected', 'true')
  })

  it('une adresse avec un état inconnu retombe sur « Tous »', () => {
    renderAt('/devis?status=NIMPORTE')

    expect(screen.getByRole('tab', { name: 'Tous' })).toHaveAttribute('aria-selected', 'true')
    expect(useQuotes).toHaveBeenLastCalledWith({ status: undefined, q: undefined, limit: 50 })
  })

  it('choisir un état relance la liste avec cet état', async () => {
    renderAt()

    await userEvent.click(screen.getByRole('tab', { name: 'Brouillon' }))

    expect(useQuotes).toHaveBeenLastCalledWith({ status: 'DRAFT', q: undefined, limit: 50 })
  })

  it('aucun devis : invite à créer le premier', async () => {
    vi.mocked(useQuotes).mockReturnValue({ data: [], isLoading: false } as never)
    renderAt()

    expect(screen.getByText('Aucun devis pour le moment')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Nouveau devis' })
    await userEvent.click(buttons[buttons.length - 1])
    expect(mockNavigate).toHaveBeenCalledWith('/devis/nouveau')
  })

  it('aucun résultat sous un filtre : le dit, sans inviter à créer', () => {
    vi.mocked(useQuotes).mockReturnValue({ data: [], isLoading: false } as never)
    renderAt('/devis?status=ACCEPTED')

    expect(screen.getByText('Aucun devis ne correspond')).toBeInTheDocument()
  })

  it('sans droit de création, aucun bouton « Nouveau devis »', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ devis: ['read'] }) })
    renderAt()

    expect(screen.queryByRole('button', { name: 'Nouveau devis' })).not.toBeInTheDocument()
  })

  describe('« Afficher plus » : la liste ne s\'arrête jamais en silence', () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, i) => quote({ id: `q${i}`, reference: `DEV-2026-${String(i).padStart(4, '0')}`, title: `Devis ${i}` }))

    it('moins de devis que demandé : tout est là, pas de bouton', () => {
      vi.mocked(useQuotes).mockReturnValue({ data: many(49), isLoading: false } as never)
      renderAt()

      expect(screen.queryByRole('button', { name: 'Afficher plus' })).not.toBeInTheDocument()
    })

    it('autant de devis que demandé : il y en a peut-être d\'autres, « Afficher plus » en demande cinquante de plus', async () => {
      vi.mocked(useQuotes).mockReturnValue({ data: many(50), isLoading: false } as never)
      renderAt()

      await userEvent.click(screen.getByRole('button', { name: 'Afficher plus' }))

      expect(useQuotes).toHaveBeenLastCalledWith({ status: undefined, q: undefined, limit: 100 })
    })

    it('les demandes s\'additionnent : 50, 100, 150', async () => {
      vi.mocked(useQuotes).mockImplementation(((filters: { limit?: number }) => ({
        data: many(filters.limit ?? 50),
        isLoading: false,
      })) as never)
      renderAt()

      await userEvent.click(screen.getByRole('button', { name: 'Afficher plus' }))
      await userEvent.click(screen.getByRole('button', { name: 'Afficher plus' }))

      expect(useQuotes).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 150 }))
    })

    it('changer d\'état repart de cinquante', async () => {
      vi.mocked(useQuotes).mockImplementation(((filters: { limit?: number }) => ({
        data: many(filters.limit ?? 50),
        isLoading: false,
      })) as never)
      renderAt()
      await userEvent.click(screen.getByRole('button', { name: 'Afficher plus' }))
      expect(useQuotes).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 100 }))

      await userEvent.click(screen.getByRole('tab', { name: 'Brouillon' }))

      expect(useQuotes).toHaveBeenLastCalledWith({ status: 'DRAFT', q: undefined, limit: 50 })
    })
  })
})
