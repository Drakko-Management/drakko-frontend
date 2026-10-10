import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useProject } from '@/hooks/use-projects'
import { EditProjectPage } from './EditProjectPage'
import type { ProjectDetail } from '@/types/api'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
const mockUpdate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/hooks/use-projects', () => ({
  useProject: vi.fn(),
  useUpdateProject: () => ({ mutateAsync: mockUpdate, isPending: false }),
}))

// La saisie d'adresse interroge un service externe : un simple champ suffit ici
vi.mock('@/components/common/AddressAutocomplete', () => ({
  AddressAutocomplete: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// ── Fixtures ───────────────────────────────────────────────────────────────

// Telles que l'API les renvoie : une colonne SQL de type date sort avec une heure
const PROJECT = {
  id: 'proj-1',
  reference: 'CH-2026-001',
  title: 'Aménagement Jardin Dupont',
  address: '12 rue des Lilas, 69000 Lyon',
  status: 'IN_PROGRESS',
  startDate: '2026-06-01T00:00:00.000Z',
  expectedEndDate: '2026-07-15T00:00:00.000Z',
  quoteAmount: null,
  projectManager: null,
  description: null,
  notes: null,
} as unknown as ProjectDetail

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdate.mockResolvedValue({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useProject).mockReturnValue({ data: PROJECT, isLoading: false } as any)
})

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/chantiers/proj-1/modifier']}>
      <Routes><Route path="/chantiers/:id/modifier" element={<EditProjectPage />} /></Routes>
    </MemoryRouter>,
  )
}

const startField = () => document.getElementById('startDate') as HTMLInputElement
const endField = () => document.getElementById('expectedEndDate') as HTMLInputElement

// ── Chantier verrouillé ────────────────────────────────────────────────────

describe('EditProjectPage — chantier verrouillé', () => {
  it.each(['AWAITING_SIGNATURE', 'AWAITING_RESERVE_LIFT', 'COMPLETED', 'DISPUTED'])(
    'renvoie vers la fiche quand le chantier est %s (le serveur refuserait aussi la modification)',
    async (status) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(useProject).mockReturnValue({ data: { ...PROJECT, status }, isLoading: false } as any)
      renderPage()
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/chantiers/proj-1', { replace: true }))
    },
  )

  it.each(['DRAFT', 'PLANNED', 'IN_PROGRESS'])('reste sur la page quand le chantier est %s', async (status) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProject).mockReturnValue({ data: { ...PROJECT, status }, isLoading: false } as any)
    renderPage()
    await screen.findByDisplayValue('Aménagement Jardin Dupont')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

// ── Dates ──────────────────────────────────────────────────────────────────

describe('EditProjectPage — dates', () => {
  it('affiche les dates du chantier : le champ de date refuse le format avec heure de l\'API', async () => {
    renderPage()

    await waitFor(() => expect(startField()).toHaveValue('2026-06-01'))
    expect(endField()).toHaveValue('2026-07-15')
  })

  it('chaque date limite l\'autre dès l\'ouverture de la page', async () => {
    renderPage()

    await waitFor(() => expect(startField()).toHaveValue('2026-06-01'))
    expect(startField()).toHaveAttribute('max', '2026-07-15')
    expect(endField()).toHaveAttribute('min', '2026-06-01')
  })

  it('décaler la date de fin déplace la limite de la date de début', async () => {
    renderPage()
    await waitFor(() => expect(endField()).toHaveValue('2026-07-15'))

    fireEvent.change(endField(), { target: { value: '2026-09-30' } })

    expect(startField()).toHaveAttribute('max', '2026-09-30')
  })

  it('enregistre les dates au format jour (sans heure)', async () => {
    renderPage()
    await waitFor(() => expect(startField()).toHaveValue('2026-06-01'))

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: '2026-06-01', expectedEndDate: '2026-07-15' }),
    )
  })

  it('un chantier sans date n\'impose aucune limite', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProject).mockReturnValue({ data: { ...PROJECT, startDate: null, expectedEndDate: null }, isLoading: false } as any)
    renderPage()

    await waitFor(() => expect(document.getElementById('title')).toHaveValue('Aménagement Jardin Dupont'))
    expect(startField()).toHaveValue('')
    // seules les bornes générales s'appliquent, mais chaque champ garde un max (voir la page de création)
    expect(startField()).toHaveAttribute('max', '2100-12-31')
    expect(endField()).toHaveAttribute('min', '1900-01-01')
    expect(endField()).toHaveAttribute('max', '2100-12-31')
  })
})
