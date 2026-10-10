import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { ClientCreateDialog } from './ClientCreateDialog'
import type { Client } from '@/types/api'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockCreate = vi.fn()

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

// ── Fixtures ───────────────────────────────────────────────────────────────

const CREATED: Client = {
  id: 'client-new',
  firstName: 'Paul',
  lastName: 'Dupont',
  email: 'paul@dupont.fr',
  phone: null,
  address: '3 rue Neuve, 69000 Lyon',
  notes: null,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreate.mockResolvedValue(CREATED)
})

function renderDialog(name = 'Paul Dupont') {
  const onClose = vi.fn()
  const onCreated = vi.fn()
  render(<ClientCreateDialog name={name} onClose={onClose} onCreated={onCreated} />)
  return { onClose, onCreated, dialog: screen.getByRole('dialog') }
}

// ── Fenêtre ────────────────────────────────────────────────────────────────

describe('ClientCreateDialog', () => {
  it('s\'ouvre centrée, au-dessus de la barre du bas et des tutoriels, avec le formulaire de création de client', () => {
    const { dialog } = renderDialog()

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    // z-50 : barre du bas ; z-1000 : fond sombre des tutoriels
    expect(dialog).toHaveClass('items-center', 'justify-center', 'z-[1100]')
    // portail dans <body> : indépendante du conteneur de la page
    expect(dialog.parentElement).toBe(document.body)
    expect(within(dialog).getByRole('heading', { name: 'Nouveau client' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Créer le client' })).toBeInTheDocument()
  })

  it('pré-remplit le prénom et le nom avec le texte tapé et place le curseur sur l\'email', () => {
    const { dialog } = renderDialog('Zzz inconnu')

    expect(within(dialog).getByLabelText(/Prénom/)).toHaveValue('Zzz')
    expect(within(dialog).getByLabelText(/^Nom/)).toHaveValue('inconnu')
    expect(within(dialog).getByLabelText(/Email/)).toHaveFocus()
  })

  it('met le curseur sur le prénom quand rien n\'est pré-rempli', () => {
    const { dialog } = renderDialog('')

    expect(within(dialog).getByLabelText(/Prénom/)).toHaveFocus()
  })

  it('le titre reste fixe et seul le formulaire défile quand il dépasse l\'écran', () => {
    const { dialog } = renderDialog()

    const scrollZone = within(dialog).getByLabelText(/Prénom/).closest('.overflow-y-auto')
    expect(scrollZone).not.toBeNull()
    expect(scrollZone).not.toContainElement(within(dialog).getByRole('heading'))
    expect(scrollZone!.parentElement).toHaveClass('max-h-full', 'flex-col')
  })

  it('se ferme avec la croix, la touche Échap ou le fond', async () => {
    const { onClose, dialog } = renderDialog()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Fermer' }))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(dialog.querySelector('.bg-black\\/40') as HTMLElement)

    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('crée le client avec les champs saisis puis le transmet à la page', async () => {
    const { onCreated, dialog } = renderDialog('Paul Dupont')

    await userEvent.type(within(dialog).getByLabelText(/Email/), 'paul@dupont.fr')
    await userEvent.type(within(dialog).getByPlaceholderText('Numéro et rue'), '3 rue Neuve')
    await userEvent.type(within(dialog).getByPlaceholderText('Code postal'), '69000')
    await userEvent.type(within(dialog).getByPlaceholderText('Ville'), 'Lyon')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le client' }))

    expect(mockCreate).toHaveBeenCalledWith({
      firstName: 'Paul',
      lastName: 'Dupont',
      email: 'paul@dupont.fr',
      phone: undefined,
      address: '3 rue Neuve, 69000 Lyon',
      notes: undefined,
    })
    expect(toast.success).toHaveBeenCalledWith('Client créé')
    expect(onCreated).toHaveBeenCalledWith(CREATED)
  })

  it('refuse l\'envoi quand l\'adresse manque : rien n\'est créé', async () => {
    const { onCreated, dialog } = renderDialog('Paul Dupont')

    await userEvent.type(within(dialog).getByLabelText(/Email/), 'paul@dupont.fr')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le client' }))

    expect(mockCreate).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('reste ouverte avec un message quand la création échoue', async () => {
    mockCreate.mockRejectedValue(new Error('boom'))
    const { onCreated, dialog } = renderDialog('Paul Dupont')

    await userEvent.type(within(dialog).getByLabelText(/Email/), 'paul@dupont.fr')
    await userEvent.type(within(dialog).getByPlaceholderText('Numéro et rue'), '3 rue Neuve')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le client' }))

    expect(toast.error).toHaveBeenCalledWith('Erreur lors de la création')
    expect(onCreated).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
