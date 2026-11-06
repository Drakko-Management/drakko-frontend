import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { useCreateQuote, useQuote, useUpdateQuote } from '@/hooks/use-quotes'
import { useServices } from '@/hooks/use-services'
import { useClient, useClients } from '@/hooks/use-clients'
import { useOrganization } from '@/hooks/use-organization'
import { CreateQuotePage } from './CreateQuotePage'
import { EditQuotePage } from './EditQuotePage'
import { quote } from '@/test/quote-fixtures'

// Le garde-fou de sortie sur les formulaires de devis : le routeur est un vrai routeur de données, comme celui de
// l'application (les autres tests de ces pages se contentent d'un MemoryRouter, où le garde-fou ne fait rien).

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-quotes', () => ({ useCreateQuote: vi.fn(), useQuote: vi.fn(), useUpdateQuote: vi.fn() }))
vi.mock('@/hooks/use-services', () => ({ useServices: vi.fn() }))
vi.mock('@/hooks/use-clients', () => ({ useClients: vi.fn(), useClient: vi.fn() }))
vi.mock('@/hooks/use-organization', () => ({ useOrganization: vi.fn() }))

const CLIENT = { id: 'c1', firstName: 'Léa', lastName: 'Martin', email: 'lea@martin.test' }
const create = vi.fn()
const update = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  create.mockResolvedValue(quote({ id: 'q9' }))
  update.mockResolvedValue(quote())
  vi.mocked(useCreateQuote).mockReturnValue({ mutateAsync: create, isPending: false } as never)
  vi.mocked(useUpdateQuote).mockReturnValue({ mutateAsync: update, isPending: false } as never)
  vi.mocked(useQuote).mockReturnValue({ data: quote({ status: 'DRAFT' }), isLoading: false, isError: false } as never)
  vi.mocked(useServices).mockReturnValue({ data: [] } as never)
  vi.mocked(useClients).mockReturnValue({ data: { data: [CLIENT] }, isFetching: false } as never)
  vi.mocked(useClient).mockReturnValue({ data: undefined, isLoading: false } as never)
  vi.mocked(useOrganization).mockReturnValue({ data: { defaultVatRate: 10 } } as never)
})

function open(path: '/devis/nouveau' | '/devis/nouveau?client=c1' | '/devis/nouveau?duplicate=q1' | '/devis/q1/modifier') {
  const router = createMemoryRouter(
    [
      { path: '/devis', element: <p>Liste des devis</p> },
      { path: '/clients/:id', element: <p>Fiche du client</p> },
      { path: '/devis/nouveau', element: <CreateQuotePage /> },
      { path: '/devis/:id/modifier', element: <EditQuotePage /> },
      { path: '/devis/:id', element: <p>Fiche du devis</p> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const back = () => screen.getByRole('button', { name: 'Retour' })

describe('formulaire de création d\'un devis', () => {
  it('un formulaire vide se quitte sans rien demander', async () => {
    open('/devis/nouveau')

    await userEvent.click(back())

    expect(await screen.findByText('Liste des devis')).toBeInTheDocument()
  })

  it('le client du raccourci de la fiche client n\'est pas une saisie : le formulaire se quitte sans rien demander', async () => {
    vi.mocked(useClient).mockReturnValue({ data: { ...CLIENT, active: true }, isLoading: false } as never)
    open('/devis/nouveau?client=c1')
    expect(screen.getByText('Léa Martin')).toBeInTheDocument()

    await userEvent.click(back())

    expect(await screen.findByText('Fiche du client')).toBeInTheDocument()
    expect(screen.queryByText('Quitter sans enregistrer ?')).not.toBeInTheDocument()
  })

  it('la copie d\'un devis n\'est pas une saisie : ouverte et pas touchée, elle se quitte sans rien demander', async () => {
    open('/devis/nouveau?duplicate=q1')
    expect(screen.getByLabelText('Objet du devis')).toHaveValue('Haie du fond')

    await userEvent.click(back())

    expect(await screen.findByText('Fiche du devis')).toBeInTheDocument()
    expect(screen.queryByText('Quitter sans enregistrer ?')).not.toBeInTheDocument()
  })

  it('une copie modifiée demande confirmation avant de quitter', async () => {
    open('/devis/nouveau?duplicate=q1')
    await userEvent.type(screen.getByLabelText('Objet du devis'), ' bis')

    await userEvent.click(back())

    expect(await screen.findByText('Quitter sans enregistrer ?')).toBeInTheDocument()
  })

  it('une saisie non enregistrée demande confirmation avant de quitter', async () => {
    const router = open('/devis/nouveau')
    await userEvent.type(screen.getByLabelText('Objet du devis'), 'Terrasse')

    await userEvent.click(back())

    expect(await screen.findByText('Quitter sans enregistrer ?')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/devis/nouveau')
    expect(screen.getByLabelText('Objet du devis')).toHaveValue('Terrasse')
  })

  it('« Rester sur la page » garde la saisie ; « Quitter sans enregistrer » l\'abandonne', async () => {
    open('/devis/nouveau')
    await userEvent.type(screen.getByLabelText('Objet du devis'), 'Terrasse')
    await userEvent.click(back())

    await userEvent.click(await screen.findByRole('button', { name: 'Rester sur la page' }))
    expect(screen.getByLabelText('Objet du devis')).toHaveValue('Terrasse')

    await userEvent.click(back())
    await userEvent.click(await screen.findByRole('button', { name: 'Quitter sans enregistrer' }))
    expect(await screen.findByText('Liste des devis')).toBeInTheDocument()
  })

  it('une saisie effacée n\'est plus une saisie', async () => {
    open('/devis/nouveau')
    await userEvent.type(screen.getByLabelText('Objet du devis'), 'T')
    await userEvent.clear(screen.getByLabelText('Objet du devis'))

    await userEvent.click(back())

    expect(await screen.findByText('Liste des devis')).toBeInTheDocument()
  })

  it('enregistrer ouvre la fiche sans demander confirmation', async () => {
    open('/devis/nouveau')
    await userEvent.click(screen.getByPlaceholderText('Rechercher un client…'))
    await userEvent.click(await screen.findByText('Léa Martin'))
    await userEvent.click(screen.getByRole('button', { name: 'Ligne libre' }))
    await userEvent.type(screen.getByLabelText('Désignation'), 'Pose')
    await userEvent.type(screen.getByLabelText('Prix unitaire HT (€)'), '100')

    await userEvent.click(screen.getByRole('button', { name: 'Créer le devis' }))

    expect(await screen.findByText('Fiche du devis')).toBeInTheDocument()
    expect(create).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalled()
    expect(screen.queryByText('Quitter sans enregistrer ?')).not.toBeInTheDocument()
  })
})

describe('formulaire de modification d\'un devis', () => {
  it('ouvert et pas touché, il se quitte sans rien demander (le devis chargé n\'est pas une saisie)', async () => {
    open('/devis/q1/modifier')
    expect(await screen.findByLabelText('Objet du devis')).toHaveValue('Haie du fond')

    await userEvent.click(back())

    expect(await screen.findByText('Fiche du devis')).toBeInTheDocument()
  })

  it('modifié, il demande confirmation avant de quitter', async () => {
    open('/devis/q1/modifier')
    await userEvent.type(await screen.findByLabelText('Objet du devis'), ' bis')

    await userEvent.click(back())

    expect(await screen.findByText('Quitter sans enregistrer ?')).toBeInTheDocument()
  })

  it('remis comme il était, il se quitte sans rien demander', async () => {
    open('/devis/q1/modifier')
    const title = await screen.findByLabelText('Objet du devis')
    await userEvent.type(title, 'X')
    await userEvent.type(title, '{Backspace}')

    await userEvent.click(back())

    expect(await screen.findByText('Fiche du devis')).toBeInTheDocument()
  })

  it('enregistrer revient à la fiche sans demander confirmation', async () => {
    open('/devis/q1/modifier')
    await userEvent.type(await screen.findByLabelText('Objet du devis'), ' bis')

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Fiche du devis')).toBeInTheDocument()
    expect(update).toHaveBeenCalled()
  })
})
