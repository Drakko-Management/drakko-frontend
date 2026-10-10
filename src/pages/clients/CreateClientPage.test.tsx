import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth.store'
import { CreateClientPage } from './CreateClientPage'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
const mockCreate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
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

  // Le tutoriel « Créer un client » éclaire ces zones : elles doivent rester sur la page
  it('garde les repères des tutoriels sur chaque zone du formulaire', () => {
    const { container } = render(<MemoryRouter><CreateClientPage /></MemoryRouter>)

    const targets = Array.from(container.querySelectorAll('[data-tutorial]')).map((el) => el.getAttribute('data-tutorial'))
    expect(targets).toEqual(['client-name', 'client-email', 'client-phone', 'client-address', 'client-notes', 'client-submit'])
  })
})
