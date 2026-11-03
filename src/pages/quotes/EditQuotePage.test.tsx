import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { toast } from 'sonner'
import { useQuote, useUpdateQuote } from '@/hooks/use-quotes'
import { useServices } from '@/hooks/use-services'
import { useClients } from '@/hooks/use-clients'
import { useOrganization } from '@/hooks/use-organization'
import { EditQuotePage } from './EditQuotePage'
import { plain, quote, quoteLine } from '@/test/quote-fixtures'
import type { Quote } from '@/types/api'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-quotes', () => ({ useQuote: vi.fn(), useUpdateQuote: vi.fn() }))
vi.mock('@/hooks/use-services', () => ({ useServices: vi.fn() }))
vi.mock('@/hooks/use-clients', () => ({ useClients: vi.fn() }))
vi.mock('@/hooks/use-organization', () => ({ useOrganization: vi.fn() }))

const update = vi.fn()

function show(q: Quote | undefined) {
  vi.mocked(useQuote).mockReturnValue({ data: q, isLoading: false, isError: !q } as never)
  render(
    <MemoryRouter initialEntries={['/devis/q1/modifier']}>
      <Routes>
        <Route path="/devis/:id/modifier" element={<EditQuotePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  update.mockResolvedValue(quote())
  vi.mocked(useUpdateQuote).mockReturnValue({ mutateAsync: update, isPending: false } as never)
  vi.mocked(useServices).mockReturnValue({ data: [] } as never)
  vi.mocked(useClients).mockReturnValue({ data: { data: [] }, isFetching: false } as never)
  vi.mocked(useOrganization).mockReturnValue({ data: { defaultVatRate: 10 } } as never)
})

describe('EditQuotePage', () => {
  it('s\'ouvre sur le brouillon rempli : client, objet, lignes, taux et totaux', () => {
    show(quote({ comment: 'Accès par le portail', validUntil: '2026-12-31T00:00:00.000Z' }))

    expect(screen.getByText('Léa Martin')).toBeInTheDocument()
    expect(screen.getByLabelText('Objet du devis')).toHaveValue('Haie du fond')
    expect(screen.getByLabelText('Valable jusqu\'au')).toHaveValue('2026-12-31')
    expect(screen.getByLabelText('TVA (%)')).toHaveValue('10')
    expect(screen.getByLabelText('Commentaire')).toHaveValue('Accès par le portail')
    const line = screen.getByTestId('quote-line')
    expect(within(line).getByLabelText('Désignation')).toHaveValue('Taille de haie')
    expect(within(line).getByLabelText('Quantité')).toHaveValue('10')
    expect(within(line).getByLabelText('Prix unitaire HT (€)')).toHaveValue('12.5')
    expect(plain(screen.getByTestId('quote-total').textContent)).toBe('137,50 €')
  })

  it('enregistre les lignes modifiées en conservant l\'origine de la prestation, puis revient à la fiche', async () => {
    show(quote({ lines: [quoteLine({ serviceId: 's1' })] }))

    await userEvent.clear(screen.getByLabelText('Quantité'))
    await userEvent.type(screen.getByLabelText('Quantité'), '20')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(update).toHaveBeenCalledWith({
      id: 'q1',
      clientId: 'c1',
      title: 'Haie du fond',
      comment: null,
      vatRate: 10,
      validUntil: null,
      lines: [{ serviceId: 's1', title: 'Taille de haie', description: 'Haie vive', unit: 'ml', quantity: 20, unitPrice: 12.5 }],
    })
    expect(toast.success).toHaveBeenCalledWith('Devis enregistré')
    expect(mockNavigate).toHaveBeenCalledWith('/devis/q1', { replace: true })
  })

  it.each(['SENT', 'ACCEPTED', 'REJECTED'] as const)('un devis %s ne se modifie pas : le formulaire n\'apparaît pas', (status) => {
    show(quote({ status }))

    expect(screen.getByText(/ne se modifie plus/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument()
  })

  it('un devis introuvable renvoie à la liste', () => {
    show(undefined)

    expect(screen.getByText('Devis introuvable')).toBeInTheDocument()
  })
})
