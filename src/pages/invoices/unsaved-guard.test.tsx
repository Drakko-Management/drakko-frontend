import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { useCreateInvoice, useInvoice, useUpdateInvoice } from '@/hooks/use-invoices'
import { useServices } from '@/hooks/use-services'
import { useClients } from '@/hooks/use-clients'
import { useOrganization } from '@/hooks/use-organization'
import { CreateInvoicePage } from './CreateInvoicePage'
import { EditInvoicePage } from './EditInvoicePage'
import { invoice } from '@/test/invoice-fixtures'

// Le garde-fou de sortie sur les formulaires de facture : voir `pages/quotes/unsaved-guard.test.tsx` (même mécanisme,
// vrai routeur de données).

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-invoices', () => ({ useCreateInvoice: vi.fn(), useInvoice: vi.fn(), useUpdateInvoice: vi.fn() }))
vi.mock('@/hooks/use-services', () => ({ useServices: vi.fn() }))
vi.mock('@/hooks/use-clients', () => ({ useClients: vi.fn() }))
vi.mock('@/hooks/use-organization', () => ({ useOrganization: vi.fn() }))

const update = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  update.mockResolvedValue(invoice())
  vi.mocked(useCreateInvoice).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  vi.mocked(useUpdateInvoice).mockReturnValue({ mutateAsync: update, isPending: false } as never)
  vi.mocked(useInvoice).mockReturnValue({ data: invoice(), isLoading: false, isError: false } as never)
  vi.mocked(useServices).mockReturnValue({ data: [] } as never)
  vi.mocked(useClients).mockReturnValue({ data: { data: [] }, isFetching: false } as never)
  vi.mocked(useOrganization).mockReturnValue({ data: { defaultVatRate: 10 } } as never)
})

function open(path: '/factures/nouveau' | '/factures/i1/modifier') {
  const router = createMemoryRouter(
    [
      { path: '/factures', element: <p>Liste des factures</p> },
      { path: '/factures/nouveau', element: <CreateInvoicePage /> },
      { path: '/factures/:id/modifier', element: <EditInvoicePage /> },
      { path: '/factures/:id', element: <p>Fiche de la facture</p> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const back = () => screen.getByRole('button', { name: 'Retour' })

describe('formulaire de création d\'une facture', () => {
  it('un formulaire vide se quitte sans rien demander', async () => {
    open('/factures/nouveau')

    await userEvent.click(back())

    expect(await screen.findByText('Liste des factures')).toBeInTheDocument()
  })

  it('une saisie non enregistrée demande confirmation avant de quitter', async () => {
    const router = open('/factures/nouveau')
    await userEvent.type(screen.getByLabelText('Objet du devis'), 'Entretien')

    await userEvent.click(back())

    expect(await screen.findByText('Quitter sans enregistrer ?')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/factures/nouveau')
  })
})

describe('formulaire de modification d\'une facture', () => {
  it('ouvert et pas touché, il se quitte sans rien demander', async () => {
    open('/factures/i1/modifier')
    expect(await screen.findByLabelText('Objet du devis')).toHaveValue('Haie du fond')

    await userEvent.click(back())

    expect(await screen.findByText('Fiche de la facture')).toBeInTheDocument()
  })

  it('modifié, il demande confirmation avant de quitter', async () => {
    open('/factures/i1/modifier')
    await userEvent.type(await screen.findByLabelText('Objet du devis'), ' bis')

    await userEvent.click(back())

    expect(await screen.findByText('Quitter sans enregistrer ?')).toBeInTheDocument()
  })

  it('enregistrer revient à la fiche sans demander confirmation', async () => {
    open('/factures/i1/modifier')
    await userEvent.type(await screen.findByLabelText('Objet du devis'), ' bis')

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Fiche de la facture')).toBeInTheDocument()
    expect(update).toHaveBeenCalled()
  })

  it('les lignes d\'acompte déduites ne comptent pas comme une saisie : le formulaire d\'un solde se quitte sans demander', async () => {
    vi.mocked(useInvoice).mockReturnValue({
      data: invoice({
        lines: [
          { ...invoice().lines[0] },
          { ...invoice().lines[0], id: 'il9', snapshotTitle: 'FAC-2026-0001', quantity: '-1', unitPrice: '10', total: '-10.00', depositInvoiceId: 'd1' },
        ],
      }),
      isLoading: false,
      isError: false,
    } as never)
    open('/factures/i1/modifier')
    expect(await screen.findByLabelText('Objet du devis')).toBeInTheDocument()

    await userEvent.click(back())

    expect(await screen.findByText('Fiche de la facture')).toBeInTheDocument()
  })
})
