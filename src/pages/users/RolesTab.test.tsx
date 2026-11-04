import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRoles, useUpdateRole, useDeleteRole } from '@/hooks/use-roles'
import { RolesTab } from './RolesTab'
import type { Role } from '@/types/api'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/hooks/use-roles', () => ({
  useRoles: vi.fn(),
  useUpdateRole: vi.fn(),
  useDeleteRole: vi.fn(),
}))

// ── Fixtures ───────────────────────────────────────────────────────────────

const ROLE: Role = {
  id: 'role-1',
  name: 'Chef de chantier',
  organizationId: 'org-1',
  permissions: {
    chantiers: ['read', 'update'],
    clients: ['read'],
    equipe: [],
    prestations: [],
    devis: [],
    factures: [],
  },
  isDefault: false,
  _count: { users: 2 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function mockMutation(overrides = {}) {
  return { mutateAsync: vi.fn(), isPending: false, ...overrides }
}

// ── Reset ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useRoles).mockReturnValue({ data: [], isLoading: false } as any)
  vi.mocked(useUpdateRole).mockReturnValue(mockMutation() as never)
  vi.mocked(useDeleteRole).mockReturnValue(mockMutation() as never)
})

// ── Chargement ─────────────────────────────────────────────────────────────

describe('RolesTab — chargement', () => {
  it('affiche des skeletons pendant isLoading', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useRoles).mockReturnValue({ data: undefined, isLoading: true } as any)
    render(<RolesTab isAdmin={true} />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(2)
  })
})

// ── État vide ──────────────────────────────────────────────────────────────

describe('RolesTab — état vide', () => {
  it('affiche le message "Aucun rôle configuré" quand la liste est vide', () => {
    render(<RolesTab isAdmin={true} />)
    expect(screen.getByText('Aucun rôle configuré')).toBeInTheDocument()
  })
})

// ── Liste des rôles ────────────────────────────────────────────────────────

describe('RolesTab — liste des rôles', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useRoles).mockReturnValue({ data: [ROLE], isLoading: false } as any)
  })

  it('affiche le nom du rôle', () => {
    render(<RolesTab isAdmin={true} />)
    expect(screen.getByText('Chef de chantier')).toBeInTheDocument()
  })

  it('affiche le nombre d\'utilisateurs assignés', () => {
    render(<RolesTab isAdmin={true} />)
    expect(screen.getByText('2 membre(s)')).toBeInTheDocument()
  })

  it('n\'affiche pas la matrice de permissions par défaut (rôle replié)', () => {
    render(<RolesTab isAdmin={true} />)
    expect(screen.queryByText('Permissions')).not.toBeInTheDocument()
  })
})

// ── Expansion d'un rôle ────────────────────────────────────────────────────

describe('RolesTab — expansion du rôle', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useRoles).mockReturnValue({ data: [ROLE], isLoading: false } as any)
  })

  it('cliquer sur le rôle ouvre le panneau d\'édition', async () => {
    render(<RolesTab isAdmin={true} />)
    await userEvent.click(screen.getByText('Chef de chantier'))
    expect(screen.getByText('Permissions')).toBeInTheDocument()
  })

  it('affiche le champ nom prérempli dans le panneau ouvert', async () => {
    render(<RolesTab isAdmin={true} />)
    await userEvent.click(screen.getByText('Chef de chantier'))
    expect(screen.getByDisplayValue('Chef de chantier')).toBeInTheDocument()
  })

  it('affiche le bouton Enregistrer dans le panneau ouvert', async () => {
    render(<RolesTab isAdmin={true} />)
    await userEvent.click(screen.getByText('Chef de chantier'))
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('bouton Enregistrer désactivé quand aucune modification', async () => {
    render(<RolesTab isAdmin={true} />)
    await userEvent.click(screen.getByText('Chef de chantier'))
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('bouton Enregistrer activé après modification du nom', async () => {
    render(<RolesTab isAdmin={true} />)
    const roleRow = screen.getByText('Chef de chantier').closest('button')!
    await userEvent.click(roleRow)
    const nameInput = screen.getByDisplayValue('Chef de chantier')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Nouveau nom')
    expect(screen.getByRole('button', { name: 'Enregistrer' })).not.toBeDisabled()
  })

  it('cliquer à nouveau replie le panneau', async () => {
    render(<RolesTab isAdmin={true} />)
    await userEvent.click(screen.getByText('Chef de chantier'))
    await userEvent.click(screen.getByText('Chef de chantier'))
    await waitFor(() => {
      expect(screen.queryByText('Permissions')).not.toBeInTheDocument()
    })
  })
})

// ── Matrice de permissions ─────────────────────────────────────────────────

describe('RolesTab — matrice de permissions', () => {
  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useRoles).mockReturnValue({ data: [ROLE], isLoading: false } as any)
    render(<RolesTab isAdmin={true} />)
    await userEvent.click(screen.getByText('Chef de chantier'))
  })

  it('affiche les 4 modules', () => {
    expect(screen.getByText('Chantiers')).toBeInTheDocument()
    expect(screen.getByText('Clients')).toBeInTheDocument()
    expect(screen.getByText('Équipe')).toBeInTheDocument()
    expect(screen.getByText('Prestations')).toBeInTheDocument()
  })

  it('affiche les 4 actions en colonnes', () => {
    expect(screen.getByText('Voir')).toBeInTheDocument()
    expect(screen.getByText('Créer')).toBeInTheDocument()
    expect(screen.getByText('Modifier')).toBeInTheDocument()
    expect(screen.getByText('Supprimer')).toBeInTheDocument()
  })

  it('les cases cochées correspondent aux permissions du rôle', () => {
    const checkboxes = screen.getAllByRole('checkbox')
    const checked = checkboxes.filter((cb) => (cb as HTMLInputElement).checked)
    expect(checked.length).toBe(3) // chantiers: read+update, clients: read
  })
})

// ── Lectures exigées par Devis ─────────────────────────────────────────────

describe('RolesTab — écrire un devis suppose de lire clients et prestations', () => {
  const box = (row: number, action: number) => screen.getAllByRole('checkbox')[row * 4 + action] as HTMLInputElement
  const CLIENTS = 1
  const PRESTATIONS = 3
  const DEVIS = 4
  const READ = 0
  const CREATE = 1

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useRoles).mockReturnValue({ data: [ROLE], isLoading: false } as any)
    render(<RolesTab isAdmin={true} />)
    await userEvent.click(screen.getByText('Chef de chantier'))
  })

  it('cocher « Créer » sur Devis coche la lecture des clients et des prestations, et la verrouille', async () => {
    expect(box(PRESTATIONS, READ).checked).toBe(false)
    expect(screen.queryByText(/Établir un devis suppose de pouvoir lire/)).not.toBeInTheDocument()

    await userEvent.click(box(DEVIS, CREATE))

    expect(box(DEVIS, CREATE).checked).toBe(true)
    expect(box(PRESTATIONS, READ).checked).toBe(true)
    expect(box(PRESTATIONS, READ)).toBeDisabled()
    expect(box(CLIENTS, READ).checked).toBe(true)
    expect(box(CLIENTS, READ)).toBeDisabled()
    expect(screen.getByText(/Établir un devis suppose de pouvoir lire/)).toBeInTheDocument()
  })

  it('retirer ce qui les demande libère les lectures, sans les décocher', async () => {
    await userEvent.click(box(DEVIS, CREATE))
    await userEvent.click(box(DEVIS, CREATE))

    expect(box(PRESTATIONS, READ)).toBeEnabled()
    expect(box(PRESTATIONS, READ).checked).toBe(true)
    expect(screen.queryByText(/Établir un devis suppose de pouvoir lire/)).not.toBeInTheDocument()
  })

  it('« tout cocher » sur Devis fait de même, et « tout décocher » sur Clients ne retire pas la lecture exigée', async () => {
    await userEvent.click(box(DEVIS, READ).closest('tr')!.querySelector('button')!)

    expect(box(PRESTATIONS, READ).checked).toBe(true)

    await userEvent.click(box(CLIENTS, READ).closest('tr')!.querySelector('button')!)
    expect(box(CLIENTS, READ).checked).toBe(true)
  })

  it('lire seulement les devis n\'exige rien', async () => {
    await userEvent.click(box(DEVIS, READ))

    expect(box(PRESTATIONS, READ).checked).toBe(false)
    expect(box(PRESTATIONS, READ)).toBeEnabled()
  })
})

// ── Bouton supprimer ───────────────────────────────────────────────────────

describe('RolesTab — suppression', () => {
  it('bouton supprimer désactivé quand le rôle a des utilisateurs assignés', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useRoles).mockReturnValue({ data: [ROLE], isLoading: false } as any)
    render(<RolesTab isAdmin={true} />)
    await userEvent.click(screen.getByText('Chef de chantier'))
    const allButtons = screen.getAllByRole('button')
    const deleteButton = allButtons.find((b) => b.className.includes('destructive'))
    expect(deleteButton).toBeDisabled()
  })

  it('bouton supprimer activé quand le rôle n\'a pas d\'utilisateurs', async () => {
    const roleNoUsers: Role = { ...ROLE, _count: { users: 0 } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useRoles).mockReturnValue({ data: [roleNoUsers], isLoading: false } as any)
    render(<RolesTab isAdmin={true} />)
    await userEvent.click(screen.getByText('Chef de chantier'))
    const allButtons = screen.getAllByRole('button')
    const deleteButton = allButtons.find((b) => b.className.includes('destructive'))
    expect(deleteButton).not.toBeDisabled()
  })
})
