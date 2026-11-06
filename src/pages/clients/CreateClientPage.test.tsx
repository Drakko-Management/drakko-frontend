import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth.store'
import { CreateClientPage } from './CreateClientPage'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
const mockCreate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/hooks/use-clients', () => ({
  useCreateClient: () => ({ mutateAsync: mockCreate, isPending: false }),
}))

// La saisie d'adresse interroge un service externe : un simple champ suffit ici
vi.mock('@/components/common/AddressAutocomplete', () => ({
  AddressAutocomplete: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  vi.clearAllMocks()
  mockCreate.mockResolvedValue({ id: 'client-new' })
  useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u1', permissions: null })
})

function renderPage() {
  render(<MemoryRouter><CreateClientPage /></MemoryRouter>)
}

describe('CreateClientPage', () => {
  it('crée le client puis ouvre sa fiche', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText(/Prénom/), 'Paul')
    await userEvent.type(screen.getByLabelText(/^Nom/), 'Dupont')
    await userEvent.type(screen.getByLabelText(/Email/), 'paul@dupont.fr')
    await userEvent.type(screen.getByPlaceholderText('Numéro et rue'), '3 rue Neuve')
    await userEvent.type(screen.getByPlaceholderText('Code postal'), '69000')
    await userEvent.type(screen.getByPlaceholderText('Ville'), 'Lyon')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le client' }))

    expect(mockCreate).toHaveBeenCalledWith({
      firstName: 'Paul',
      lastName: 'Dupont',
      email: 'paul@dupont.fr',
      phone: undefined,
      address: '3 rue Neuve, 69000 Lyon',
      notes: undefined,
      kind: 'INDIVIDUAL',
      companyName: null,
      siren: null,
      vatNumber: null,
    })
    expect(toast.success).toHaveBeenCalledWith('Client créé')
    expect(mockNavigate).toHaveBeenCalledWith('/clients/client-new')
  })

  it('ne crée rien et prévient quand un champ obligatoire manque', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText(/Prénom/), 'Paul')
    await userEvent.type(screen.getByLabelText(/^Nom/), 'Dupont')
    await userEvent.type(screen.getByLabelText(/Email/), 'paul@dupont.fr')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le client' }))

    expect(mockCreate).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Prénom, nom, email et adresse de facturation sont obligatoires')
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('reste sur la page avec un message quand la création échoue', async () => {
    mockCreate.mockRejectedValue(new Error('boom'))
    renderPage()

    await userEvent.type(screen.getByLabelText(/Prénom/), 'Paul')
    await userEvent.type(screen.getByLabelText(/^Nom/), 'Dupont')
    await userEvent.type(screen.getByLabelText(/Email/), 'paul@dupont.fr')
    await userEvent.type(screen.getByPlaceholderText('Numéro et rue'), '3 rue Neuve')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le client' }))

    expect(toast.error).toHaveBeenCalledWith('Erreur lors de la création')
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  describe('particulier ou professionnel', () => {
    const SIREN_FIELD = () => screen.getByLabelText('SIREN')
    const COMPANY_FIELD = () => screen.getByLabelText(/Dénomination/)

    async function fillContact() {
      await userEvent.type(screen.getByLabelText(/Prénom/), 'Jean')
      await userEvent.type(screen.getByLabelText(/^Nom/), 'Martin')
      await userEvent.type(screen.getByLabelText(/Email/), 'jean@syndic.fr')
      await userEvent.type(screen.getByPlaceholderText('Numéro et rue'), '3 rue Neuve')
      await userEvent.type(screen.getByPlaceholderText('Code postal'), '69000')
      await userEvent.type(screen.getByPlaceholderText('Ville'), 'Lyon')
    }
    const choosePro = () => userEvent.click(screen.getByRole('radio', { name: 'Professionnel' }))

    it('s\'ouvre sur « Particulier », sans champ d\'entreprise', () => {
      renderPage()

      expect(screen.getByRole('radio', { name: 'Particulier' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('radio', { name: 'Professionnel' })).toHaveAttribute('aria-checked', 'false')
      expect(screen.queryByLabelText(/Dénomination/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText('SIREN')).not.toBeInTheDocument()
    })

    it('« Professionnel » ouvre les champs de l\'entreprise et met le curseur sur la dénomination', async () => {
      renderPage()
      await choosePro()

      expect(COMPANY_FIELD()).toBeInTheDocument()
      expect(SIREN_FIELD()).toBeInTheDocument()
      expect(screen.getByLabelText(/TVA/)).toBeInTheDocument()
      await waitFor(() => expect(COMPANY_FIELD()).toHaveFocus())
    })

    it('envoie un professionnel avec sa dénomination, son SIREN (tiré d\'un SIRET) et sa TVA remis en forme', async () => {
      renderPage()
      await choosePro()
      await userEvent.type(COMPANY_FIELD(), '  Syndic Les Lilas ')
      await userEvent.type(SIREN_FIELD(), '732 829 320 00074')
      await userEvent.type(screen.getByLabelText(/TVA/), 'fr 40 303 265 045')
      await fillContact()
      await userEvent.click(screen.getByRole('button', { name: 'Créer le client' }))

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Jean',
          kind: 'PROFESSIONAL',
          companyName: 'Syndic Les Lilas',
          siren: '732829320',
          vatNumber: 'FR40303265045',
        }),
      )
    })

    it('le SIREN et la TVA sont facultatifs : vides, ils partent à null', async () => {
      renderPage()
      await choosePro()
      await userEvent.type(COMPANY_FIELD(), 'SCI Les Lilas')
      await fillContact()
      await userEvent.click(screen.getByRole('button', { name: 'Créer le client' }))

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'PROFESSIONAL', companyName: 'SCI Les Lilas', siren: null, vatNumber: null }),
      )
    })

    it('refuse un professionnel sans dénomination : rien n\'est créé, l\'erreur est dite et le curseur y va', async () => {
      renderPage()
      await choosePro()
      await fillContact()
      await userEvent.click(screen.getByRole('button', { name: 'Créer le client' }))

      expect(mockCreate).not.toHaveBeenCalled()
      expect(await screen.findByText('La dénomination d\'un client professionnel est obligatoire.')).toBeInTheDocument()
      expect(toast.error).toHaveBeenCalledWith('Corrigez les champs en erreur avant d\'enregistrer.')
      await waitFor(() => expect(COMPANY_FIELD()).toHaveFocus())
    })

    it('refuse un SIREN faux, sans l\'écrire pendant la frappe', async () => {
      renderPage()
      await choosePro()
      await userEvent.type(COMPANY_FIELD(), 'Syndic Les Lilas')
      await userEvent.type(SIREN_FIELD(), '732829321')
      // pas d'erreur tant que le champ n'est pas quitté
      expect(screen.queryByText(/SIREN n'est pas valide/)).not.toBeInTheDocument()
      await userEvent.tab()
      expect(await screen.findByText(/SIREN n'est pas valide/)).toBeInTheDocument()

      await fillContact()
      await userEvent.click(screen.getByRole('button', { name: 'Créer le client' }))

      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('repasser à « Particulier » n\'envoie aucune donnée d\'entreprise, même déjà saisie', async () => {
      renderPage()
      await choosePro()
      await userEvent.type(COMPANY_FIELD(), 'Syndic Les Lilas')
      await userEvent.type(SIREN_FIELD(), '732829320')
      await userEvent.click(screen.getByRole('radio', { name: 'Particulier' }))
      await fillContact()
      await userEvent.click(screen.getByRole('button', { name: 'Créer le client' }))

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'INDIVIDUAL', companyName: null, siren: null, vatNumber: null }),
      )
    })
  })

  // Le tutoriel « Créer un client » éclaire ces zones : elles doivent rester sur la page
  it('garde les repères des tutoriels sur chaque zone du formulaire', () => {
    const { container } = render(<MemoryRouter><CreateClientPage /></MemoryRouter>)

    const targets = Array.from(container.querySelectorAll('[data-tutorial]')).map((el) => el.getAttribute('data-tutorial'))
    expect(targets).toEqual(['client-name', 'client-email', 'client-phone', 'client-address', 'client-notes', 'client-submit'])
  })
})
