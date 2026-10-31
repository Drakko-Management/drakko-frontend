import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth.store'
import { ExpressProjectPage } from './ExpressProjectPage'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
const mockCreate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/hooks/use-projects', () => ({
  useCreateExpressProject: () => ({ mutateAsync: mockCreate, isPending: false }),
}))

// La saisie d'adresse interroge un service externe : un champ et un bouton « suggestion » suffisent ici
vi.mock('@/components/common/AddressAutocomplete', () => ({
  AddressAutocomplete: ({
    value,
    onChange,
    onSelect,
    placeholder,
    required,
  }: {
    value: string
    onChange: (v: string) => void
    onSelect: (s: { label: string; street: string; postalCode: string; city: string }) => void
    placeholder?: string
    required?: boolean
  }) => (
    <div>
      <input placeholder={placeholder} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
      <button
        type="button"
        onClick={() => onSelect({ label: '8 avenue Foch, 75116 Paris', street: '8 avenue Foch', postalCode: '75116', city: 'Paris' })}
      >
        suggestion
      </button>
    </div>
  ),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  vi.clearAllMocks()
  mockCreate.mockResolvedValue({ id: 'project-new' })
  useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u1', permissions: null })
})

function renderPage() {
  render(<MemoryRouter><ExpressProjectPage /></MemoryRouter>)
}

async function fillClient() {
  await userEvent.type(screen.getByLabelText(/Prénom/), 'Paul')
  await userEvent.type(screen.getByLabelText(/^Nom/), 'Dupont')
  await userEvent.type(screen.getByLabelText(/Email/), 'paul@dupont.fr')
}

const submit = () => screen.getByRole('button', { name: 'Créer et aller au rapport' })
const billingSwitch = () => screen.getByRole('switch', { name: 'Facturation à la même adresse' })

describe('ExpressProjectPage', () => {
  it('demande le téléphone du client, facultatif', async () => {
    renderPage()

    const phone = screen.getByLabelText('Téléphone')
    expect(phone).not.toBeRequired()

    await userEvent.type(screen.getByLabelText(/Prénom/), 'Paul')
    await userEvent.type(screen.getByLabelText(/^Nom/), 'Dupont')
    await userEvent.type(screen.getByLabelText(/Email/), 'paul@dupont.fr')
    await userEvent.type(phone, '0612345678')
    await userEvent.tab() // la sortie du champ met le numéro en forme
    await userEvent.click(screen.getByRole('button', { name: 'suggestion' }))
    await userEvent.click(submit())

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ clientPhone: '06 12 34 56 78' }))
  })

  it('l\'adresse de l\'intervention se saisit comme ailleurs : rue avec suggestions, code postal, ville', async () => {
    renderPage()

    expect(screen.getByPlaceholderText('Numéro et rue')).toBeRequired()
    await userEvent.click(screen.getByRole('button', { name: 'suggestion' }))

    expect(screen.getByPlaceholderText('Numéro et rue')).toHaveValue('8 avenue Foch')
    expect(screen.getByPlaceholderText('Code postal')).toHaveValue('75116')
    expect(screen.getByPlaceholderText('Ville')).toHaveValue('Paris')
  })

  it('facture par défaut à l\'adresse de l\'intervention, sans second formulaire', async () => {
    renderPage()
    await fillClient()
    await userEvent.type(screen.getByPlaceholderText('Numéro et rue'), '3 rue Neuve')
    await userEvent.type(screen.getByPlaceholderText('Code postal'), '69000')
    await userEvent.type(screen.getByPlaceholderText('Ville'), 'Lyon')

    expect(billingSwitch()).toBeChecked()
    expect(screen.getAllByPlaceholderText('Numéro et rue')).toHaveLength(1)

    await userEvent.click(submit())

    expect(mockCreate).toHaveBeenCalledWith({
      clientFirstName: 'Paul',
      clientLastName: 'Dupont',
      clientEmail: 'paul@dupont.fr',
      clientPhone: undefined,
      clientAddress: undefined,
      title: undefined,
      description: undefined,
      address: '3 rue Neuve, 69000 Lyon',
    })
    expect(toast.success).toHaveBeenCalledWith('Intervention créée')
    expect(mockNavigate).toHaveBeenCalledWith('/chantiers/project-new/rapport')
  })

  it('propose une adresse de facturation distincte, obligatoire, quand elle n\'est pas la même', async () => {
    renderPage()
    await fillClient()
    await userEvent.click(screen.getByRole('button', { name: 'suggestion' }))

    await userEvent.click(billingSwitch())

    const streets = screen.getAllByPlaceholderText('Numéro et rue')
    expect(streets).toHaveLength(2)
    expect(streets[1]).toBeRequired()
    expect(screen.getByText('Adresse de facturation *')).toBeInTheDocument()

    // sans adresse de facturation, le navigateur bloque l'envoi : rien n'est créé
    await userEvent.click(submit())
    expect(mockCreate).not.toHaveBeenCalled()

    await userEvent.type(streets[1]!, '1 place Bellecour')
    await userEvent.type(screen.getAllByPlaceholderText('Code postal')[1]!, '69002')
    await userEvent.type(screen.getAllByPlaceholderText('Ville')[1]!, 'Lyon')
    await userEvent.click(submit())

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '8 avenue Foch, 75116 Paris',
        clientAddress: '1 place Bellecour, 69002 Lyon',
      }),
    )
  })

  it('revenir à « même adresse » n\'envoie plus l\'adresse de facturation saisie entre-temps', async () => {
    renderPage()
    await fillClient()
    await userEvent.click(screen.getByRole('button', { name: 'suggestion' }))
    await userEvent.click(billingSwitch())
    await userEvent.type(screen.getAllByPlaceholderText('Numéro et rue')[1]!, '1 place Bellecour')
    await userEvent.click(billingSwitch())

    await userEvent.click(submit())

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ clientAddress: undefined }))
  })

  it('ne crée rien quand l\'adresse de l\'intervention manque (champ obligatoire)', async () => {
    renderPage()
    await fillClient()

    await userEvent.click(submit())

    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('ne crée rien et prévient quand l\'adresse n\'est faite que d\'espaces', async () => {
    renderPage()
    await fillClient()
    await userEvent.type(screen.getByPlaceholderText('Numéro et rue'), '   ')

    await userEvent.click(submit())

    expect(mockCreate).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Prénom, nom, email et adresse sont obligatoires')
  })

  it('reste sur la page avec un message quand la création échoue', async () => {
    mockCreate.mockRejectedValue(new Error('boom'))
    renderPage()
    await fillClient()
    await userEvent.click(screen.getByRole('button', { name: 'suggestion' }))

    await userEvent.click(submit())

    expect(toast.error).toHaveBeenCalledWith('Impossible de créer l\'intervention')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
