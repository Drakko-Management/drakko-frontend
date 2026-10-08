import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useProjects } from '@/hooks/use-projects'
import { useAuthStore } from '@/store/auth.store'
import { ProjectsPage } from './ProjectsPage'
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
  expectedEndDate: null,
  actualEndDate: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  client: { id: 'client-1', firstName: 'Pierre', lastName: 'Dupont' },
}

function paginated(items: Project[]): Paginated<Project> {
  return { data: items, total: items.length, page: 1, limit: 20 }
}

// ── Reset ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u1' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useProjects).mockReturnValue({ data: paginated([]), isLoading: false } as any)
})

// ── Helpers ────────────────────────────────────────────────────────────────

function renderProjects(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ── Tests : rendu ──────────────────────────────────────────────────────────

describe('ProjectsPage — rendu', () => {
  it('affiche le titre Chantiers', () => {
    renderProjects()
    expect(screen.getByRole('heading', { name: 'Chantiers' })).toBeInTheDocument()
  })

  it('affiche les 6 chips de filtre', () => {
    renderProjects()
    const labels = ['Tous', 'Brouillon', 'Planifié', 'En cours', 'Signature', 'Terminé']
    labels.forEach((label) =>
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument(),
    )
  })

  it('affiche un projet quand useProjects retourne des données', () => {
    vi.mocked(useProjects).mockReturnValue({ data: paginated([PROJECT]), isLoading: false } as any)
    renderProjects()
    expect(screen.getByText('Aménagement Jardin Dupont')).toBeInTheDocument()
    expect(screen.getByText('CH-2026-001')).toBeInTheDocument()
  })
})

// ── Tests : accès par rôle ─────────────────────────────────────────────────

describe('ProjectsPage — bouton Nouveau', () => {
  it('visible pour ADMIN (en-tête et bouton flottant mobile)', () => {
    useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u1' })
    renderProjects()
    // happy-dom ignore les classes responsive : le bouton de l'en-tête (desktop) et le bouton flottant (mobile) sont tous deux dans le DOM
    expect(screen.getAllByRole('button', { name: /nouveau/i })).toHaveLength(2)
  })

  it('absent pour MEMBER sans permission create', () => {
    useAuthStore.setState({ accessToken: 'tok', username: 'f', role: 'MEMBER', userId: 'u2', permissions: { chantiers: [], clients: [], equipe: [], prestations: [] } })
    renderProjects()
    expect(screen.queryByRole('button', { name: /nouveau/i })).not.toBeInTheDocument()
  })
})

// ── Tests : filtre actif ───────────────────────────────────────────────────

describe('ProjectsPage — chip actif', () => {
  it('chip "Tous" est actif par défaut (pas de param URL)', () => {
    renderProjects('/')
    expect(screen.getByRole('button', { name: 'Tous' }).className).toContain('bg-primary')
    expect(screen.getByRole('button', { name: 'En cours' }).className).not.toContain('bg-primary')
  })

  it('chip correspondant actif selon le param ?status', () => {
    renderProjects('/?status=IN_PROGRESS')
    expect(screen.getByRole('button', { name: 'En cours' }).className).toContain('bg-primary')
    expect(screen.getByRole('button', { name: 'Tous' }).className).not.toContain('bg-primary')
  })
})

// ── Tests : clic sur les chips ─────────────────────────────────────────────

describe('ProjectsPage — clic filtre', () => {
  it('cliquer "En cours" active ce chip', async () => {
    renderProjects('/')
    await userEvent.click(screen.getByRole('button', { name: 'En cours' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'En cours' }).className).toContain('bg-primary'),
    )
  })

  it('cliquer "Tous" réinitialise le filtre (chip "Tous" redevient actif)', async () => {
    renderProjects('/?status=IN_PROGRESS')
    await userEvent.click(screen.getByRole('button', { name: 'Tous' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tous' }).className).toContain('bg-primary'),
    )
    expect(screen.getByRole('button', { name: 'En cours' }).className).not.toContain('bg-primary')
  })
})

// ── Tests : chargement ─────────────────────────────────────────────────────

describe('ProjectsPage — chargement', () => {
  it('affiche 4 skeletons pendant isLoading', () => {
    vi.mocked(useProjects).mockReturnValue({ data: undefined, isLoading: true } as any)
    renderProjects()
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(4)
  })
})

// ── Tests : liste vide ─────────────────────────────────────────────────────

describe('ProjectsPage — liste vide', () => {
  it('affiche EmptyState quand la liste est vide', () => {
    vi.mocked(useProjects).mockReturnValue({ data: paginated([]), isLoading: false } as any)
    renderProjects()
    expect(screen.getByText('Aucun chantier')).toBeInTheDocument()
  })

  it('affiche le bouton "Créer un chantier" dans EmptyState pour ADMIN', () => {
    vi.mocked(useProjects).mockReturnValue({ data: paginated([]), isLoading: false } as any)
    useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u1' })
    renderProjects()
    expect(screen.getByRole('button', { name: 'Créer un chantier' })).toBeInTheDocument()
  })
})

// ── Tests : intégration hook ───────────────────────────────────────────────

describe('ProjectsPage — useProjects', () => {
  it('est appelé avec status depuis le param URL', () => {
    renderProjects('/?status=PLANNED')
    expect(vi.mocked(useProjects)).toHaveBeenCalledWith({ status: 'PLANNED', page: 1, limit: 20, sort: 'recent' })
  })

  it('est appelé avec status=undefined quand pas de param', () => {
    renderProjects('/')
    expect(vi.mocked(useProjects)).toHaveBeenCalledWith({ status: undefined, page: 1, limit: 20, sort: 'recent' })
  })
})

// ── Tests : navigation ─────────────────────────────────────────────────────

describe('ProjectsPage — navigation', () => {
  it('cliquer "Nouveau" (en-tête) navigue vers /chantiers/nouveau', async () => {
    renderProjects()
    const [header] = screen.getAllByRole('button', { name: /nouveau/i })
    await userEvent.click(header)
    expect(mockNavigate).toHaveBeenCalledWith('/chantiers/nouveau')
  })

  it('le bouton flottant mobile mène aussi à /chantiers/nouveau', async () => {
    renderProjects()
    const buttons = screen.getAllByRole('button', { name: /nouveau/i })
    await userEvent.click(buttons[buttons.length - 1])
    expect(mockNavigate).toHaveBeenCalledWith('/chantiers/nouveau')
  })

  it('cliquer sur un projet navigue vers /chantiers/:id', async () => {
    vi.mocked(useProjects).mockReturnValue({ data: paginated([PROJECT]), isLoading: false } as any)
    renderProjects()
    await userEvent.click(screen.getByText('Aménagement Jardin Dupont'))
    expect(mockNavigate).toHaveBeenCalledWith('/chantiers/proj-1')
  })
})
