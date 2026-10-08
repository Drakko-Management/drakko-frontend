import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useProjects } from '@/hooks/use-projects'
import { useAuthStore } from '@/store/auth.store'
import { DashboardPage } from './DashboardPage'
import type { Paginated, Project } from '@/types/api'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/hooks/use-projects', () => ({
  useProjects: vi.fn(),
}))

// ── Fixtures ───────────────────────────────────────────────────────────────

const PROJECT: Project = {
  id: 'proj-1',
  reference: 'CH-2026-001',
  title: 'Aménagement Jardin Dupont',
  address: '12 rue des Lilas, Lyon',
  status: 'IN_PROGRESS',
  clientId: 'client-1',
  createdById: 'user-1',
  closedById: null,
  closedAt: null,
  description: null,
  notes: null,
  quoteAmount: null,
  startDate: null,
  expectedEndDate: '2026-07-15',
  actualEndDate: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  client: { id: 'client-1', firstName: 'Pierre', lastName: 'Dupont' },
}

function paginated(items: Project[], total = items.length, limit = 20): Paginated<Project> {
  return { data: items, total, page: 1, limit }
}

/** Les compteurs interrogent `useProjects` par statut (limit 1) ; sans statut, ce sont les chantiers récents. */
function mockProjects({
  totals = {},
  recent = [],
}: { totals?: Record<string, number>; recent?: Project[] } = {}) {
  vi.mocked(useProjects).mockImplementation(((params?: { status?: string }) => ({
    data: params?.status ? paginated([], totals[params.status] ?? 0, 1) : paginated(recent),
    isLoading: false,
  })) as never)
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

// ── Reset ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockProjects()
  useAuthStore.setState({
    accessToken: 'tok',
    username: 'admin',
    firstName: 'Admin',
    lastName: '',
    role: 'ADMIN',
    userId: 'u1',
    permissions: null,
  })
})

// ── Rendu de base ──────────────────────────────────────────────────────────

describe('DashboardPage — rendu', () => {
  it('affiche la salutation avec le prénom', () => {
    renderDashboard()
    expect(screen.getByText('Bonjour, Admin')).toBeInTheDocument()
  })

  it('affiche la section des chantiers récents', () => {
    renderDashboard()
    expect(screen.getByRole('heading', { name: 'Chantiers récents' })).toBeInTheDocument()
  })

  it('"Voir tout" ouvre la liste des chantiers', async () => {
    renderDashboard()
    await userEvent.click(screen.getByRole('button', { name: 'Voir tout' }))
    expect(mockNavigate).toHaveBeenCalledWith('/chantiers')
  })
})

// ── Compteurs par statut ───────────────────────────────────────────────────

describe('DashboardPage — compteurs par statut', () => {
  it('affiche le nombre de chantiers de chaque statut', () => {
    mockProjects({ totals: { IN_PROGRESS: 3, AWAITING_SIGNATURE: 2, COMPLETED: 12, DISPUTED: 1 } })
    renderDashboard()
    expect(screen.getByRole('button', { name: /En cours/ })).toHaveTextContent('3')
    expect(screen.getByRole('button', { name: /À signer/ })).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: /Terminés/ })).toHaveTextContent('12')
    expect(screen.getByRole('button', { name: /Litiges/ })).toHaveTextContent('1')
  })

  it('affiche 0 quand aucun chantier n\'a ce statut', () => {
    renderDashboard()
    expect(screen.getByRole('button', { name: /En cours/ })).toHaveTextContent('0')
  })

  it.each([
    ['En cours', 'IN_PROGRESS'],
    ['À signer', 'AWAITING_SIGNATURE'],
    ['Terminés', 'COMPLETED'],
    ['Litiges', 'DISPUTED'],
  ])('cliquer sur « %s » ouvre la liste filtrée sur %s', async (label, status) => {
    renderDashboard()
    await userEvent.click(screen.getByRole('button', { name: new RegExp(label) }))
    expect(mockNavigate).toHaveBeenCalledWith(`/chantiers?status=${status}`)
  })
})

// ── Chargement des projets récents ─────────────────────────────────────────

describe('DashboardPage — projets récents', () => {
  it('affiche des skeletons pendant le chargement', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProjects).mockReturnValue({ data: undefined, isLoading: true } as any)
    renderDashboard()
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('affiche le message "Aucun chantier" quand la liste est vide', () => {
    renderDashboard()
    expect(screen.getByText('Aucun chantier pour le moment')).toBeInTheDocument()
  })

  it('affiche le titre, la référence et le client de chaque chantier récent', () => {
    mockProjects({ recent: [PROJECT] })
    renderDashboard()
    expect(screen.getByText('Aménagement Jardin Dupont')).toBeInTheDocument()
    expect(screen.getByText('CH-2026-001 · Pierre Dupont')).toBeInTheDocument()
    expect(screen.getByText(/Fin prévue/)).toBeInTheDocument()
    expect(screen.queryByText('Aucun chantier pour le moment')).not.toBeInTheDocument()
  })

  it('cliquer sur un chantier récent ouvre sa fiche', async () => {
    mockProjects({ recent: [PROJECT] })
    renderDashboard()
    await userEvent.click(screen.getByText('Aménagement Jardin Dupont'))
    expect(mockNavigate).toHaveBeenCalledWith('/chantiers/proj-1')
  })
})
