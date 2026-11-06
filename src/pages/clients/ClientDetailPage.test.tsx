import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useClient, useUpdateClient, useSetClientActive, useDeleteClient } from '@/hooks/use-clients'
import { useProjects } from '@/hooks/use-projects'
import { useInvoices } from '@/hooks/use-invoices'
import { invoice } from '@/test/invoice-fixtures'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions } from '@/lib/permissions'
import { ClientDetailPage } from './ClientDetailPage'
import type { Client } from '@/types/api'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-clients', () => ({
  useClient: vi.fn(),
  useUpdateClient: vi.fn(),
  useSetClientActive: vi.fn(),
  useDeleteClient: vi.fn(),
}))
vi.mock('@/hooks/use-projects', () => ({ useProjects: vi.fn() }))
vi.mock('@/hooks/use-quotes', () => ({ useQuotes: vi.fn().mockReturnValue({ data: [], isLoading: false }) }))
vi.mock('@/hooks/use-invoices', () => ({ useInvoices: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

const CLIENT: Client = {
  id: 'c1',
  firstName: 'Pierre',
  lastName: 'Durand',
  email: 'pierre@test.com',
  phone: '0600000000',
  address: '12 rue des Lilas, 69000 Lyon',
  notes: 'Portail vert',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const save = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  save.mockResolvedValue({})
  vi.mocked(useClient).mockReturnValue({ data: CLIENT, isLoading: false } as never)
  vi.mocked(useUpdateClient).mockReturnValue({ mutateAsync: save, isPending: false } as never)
  vi.mocked(useSetClientActive).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  vi.mocked(useDeleteClient).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  vi.mocked(useProjects).mockReturnValue({ data: { data: [], total: 0 } } as never)
  vi.mocked(useInvoices).mockReturnValue({ data: [], isLoading: false } as never)
  useAuthStore.setState({ accessToken: 'tok', role: 'ADMIN', userId: 'u0', permissions: null, modules: null })
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/clients/c1']}>
      <Routes>
        <Route path="/clients/:id" element={<ClientDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ClientDetailPage — formulaire directement modifiable', () => {
  it("s'ouvre sur le formulaire rempli, sans bouton « Modifier »", () => {
    renderPage()
    expect(screen.getByDisplayValue('Pierre')).toBeInTheDocument()
    expect(screen.getByDisplayValue('pierre@test.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Portail vert')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument()
    expect(screen.getByText('Modifier le client')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pierre Durand' })).toBeInTheDocument()
  })

  it('« Enregistrer » ne s\'active que si la fiche a changé', async () => {
    const user = userEvent.setup()
    renderPage()
    const button = screen.getByRole('button', { name: 'Enregistrer' })
    expect(button).toBeDisabled()

    await user.type(screen.getByDisplayValue('Pierre'), 'x')

    expect(button).toBeEnabled()
  })

  it('enregistre les changements, et peut vider le téléphone et les notes', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.clear(screen.getByDisplayValue('0600000000'))
    await user.clear(screen.getByDisplayValue('Portail vert'))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(save).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Pierre', phone: '', notes: '' }))
  })
})

describe('ClientDetailPage — raccourcis de contact', () => {
  it('appeler, SMS, écrire et itinéraire pointent vers les bonnes adresses', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Appeler' })).toHaveAttribute('href', 'tel:0600000000')
    expect(screen.getByRole('link', { name: 'SMS' })).toHaveAttribute('href', 'sms:0600000000')
    expect(screen.getByRole('link', { name: 'Écrire' })).toHaveAttribute('href', 'mailto:pierre@test.com')
    expect(screen.getByRole('link', { name: 'Itinéraire' }).getAttribute('href')).toContain('maps.google.com')
  })

  it("sans téléphone ni adresse, seuls les raccourcis possibles s'affichent", () => {
    vi.mocked(useClient).mockReturnValue({ data: { ...CLIENT, phone: null, address: null }, isLoading: false } as never)
    renderPage()
    expect(screen.queryByRole('link', { name: 'Appeler' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Itinéraire' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Écrire' })).toBeInTheDocument()
  })
})

describe('ClientDetailPage — sans droit de modification', () => {
  it('lecture seule : pas de champs, pas d\'Enregistrer', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ clients: ['read'] }) })
    renderPage()
    expect(screen.queryByDisplayValue('Pierre')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument()
    expect(screen.getByText('Portail vert')).toBeInTheDocument()
  })
})

describe('ClientDetailPage — factures du client et raccourcis de création', () => {
  it('liste les factures du client, brouillon compris, avec leur état', () => {
    vi.mocked(useInvoices).mockReturnValue({
      data: [
        invoice({ id: 'i1', reference: 'FAC-2026-0004', title: 'Haie du fond', status: 'ISSUED', total: '1210.00' }),
        invoice({ id: 'i2', reference: null, title: null, status: 'DRAFT', total: '90.00' }),
      ],
      isLoading: false,
    } as never)
    renderPage()

    expect(useInvoices).toHaveBeenCalledWith({ clientId: 'c1' }, true)
    const section = screen.getByTestId('client-invoices')
    expect(within(section).getByText('Factures (2)')).toBeInTheDocument()
    expect(within(section).getByText('Haie du fond')).toBeInTheDocument()
    expect(within(section).getByText(/FAC-2026-0004/)).toBeInTheDocument()
    expect(within(section).getByText('Brouillon', { selector: 'p' })).toBeInTheDocument()
  })

  it('une facture en retard le dit, un avoir est un avoir', () => {
    vi.mocked(useInvoices).mockReturnValue({
      data: [
        invoice({ id: 'i1', reference: 'FAC-2026-0004', status: 'ISSUED', overdue: true }),
        invoice({ id: 'i3', reference: 'AV-2026-0001', kind: 'CREDIT_NOTE', status: 'ISSUED' }),
      ],
      isLoading: false,
    } as never)
    renderPage()

    expect(screen.getByText('En retard')).toBeInTheDocument()
    expect(screen.getByText('Avoir')).toBeInTheDocument()
  })

  it('cliquer une facture ouvre sa fiche', async () => {
    vi.mocked(useInvoices).mockReturnValue({ data: [invoice({ id: 'i7', reference: 'FAC-2026-0007' })], isLoading: false } as never)
    renderPage()

    await userEvent.click(within(screen.getByTestId('client-invoices')).getByRole('button'))

    expect(mockNavigate).toHaveBeenCalledWith('/factures/i7')
  })

  it('sans facture, pas de rubrique', () => {
    renderPage()
    expect(screen.queryByTestId('client-invoices')).not.toBeInTheDocument()
  })

  it('« Nouveau devis » et « Nouvelle facture » ouvrent le formulaire avec ce client', async () => {
    renderPage()

    await userEvent.click(screen.getByTestId('client-new-quote'))
    expect(mockNavigate).toHaveBeenLastCalledWith('/devis/nouveau?client=c1')

    await userEvent.click(screen.getByTestId('client-new-invoice'))
    expect(mockNavigate).toHaveBeenLastCalledWith('/factures/nouveau?client=c1')
  })

  it('un client désactivé n\'a pas de raccourci : il n\'est plus proposé dans les formulaires', () => {
    vi.mocked(useClient).mockReturnValue({ data: { ...CLIENT, active: false }, isLoading: false } as never)
    renderPage()

    expect(screen.queryByTestId('client-new-quote')).not.toBeInTheDocument()
    expect(screen.queryByTestId('client-new-invoice')).not.toBeInTheDocument()
  })

  it('chaque raccourci demande son droit de création', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ clients: ['read'], devis: ['read', 'create'], factures: ['read'] }),
    })
    renderPage()

    expect(screen.getByTestId('client-new-quote')).toBeInTheDocument()
    expect(screen.queryByTestId('client-new-invoice')).not.toBeInTheDocument()
  })

  it('sans droit de lecture sur les factures, la liste n\'est même pas demandée', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ clients: ['read'] }) })
    renderPage()

    expect(useInvoices).toHaveBeenCalledWith({ clientId: 'c1' }, false)
    expect(screen.queryByTestId('client-new-quote')).not.toBeInTheDocument()
    expect(screen.queryByTestId('client-new-invoice')).not.toBeInTheDocument()
  })

  it('sans le module Facturation, ni liste ni raccourci facture', () => {
    useAuthStore.setState({ role: 'ADMIN', modules: ['clients', 'devis'] } as never)
    renderPage()

    expect(useInvoices).toHaveBeenCalledWith({ clientId: 'c1' }, false)
    expect(screen.getByTestId('client-new-quote')).toBeInTheDocument()
    expect(screen.queryByTestId('client-new-invoice')).not.toBeInTheDocument()
  })
})
