import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  useProject,
  useUpdateProjectStatus,
  useAssignUsers,
  useUnassignUser,
  useDeleteProject,
} from '@/hooks/use-projects'
import { usePhotos } from '@/hooks/use-photos'
import {
  useReport,
  useReportPdfUrl,
  useSendReport,
  useGenerateReport,
  useReserveLiftPdfUrl,
  useSendReserveLiftReport,
} from '@/hooks/use-report'
import { useCreateSignatureRequest, useSendReserveLiftRequest } from '@/hooks/use-signature'
import { useUsers } from '@/hooks/use-users'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions, EMPTY_PERMISSIONS } from '@/lib/permissions'
import { ProjectDetailPage } from './ProjectDetailPage'
import type { Project, User } from '@/types/api'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/components/common/PhotoLightbox', () => ({
  PhotoLightbox: () => null,
}))

vi.mock('@/hooks/use-projects', () => ({
  useProject: vi.fn(),
  useUpdateProjectStatus: vi.fn(),
  useAssignUsers: vi.fn(),
  useUnassignUser: vi.fn(),
  useDeleteProject: vi.fn(),
  useProjects: vi.fn(),
}))

vi.mock('@/hooks/use-photos', () => ({ usePhotos: vi.fn() }))
vi.mock('@/hooks/use-report', () => ({
  useReport: vi.fn(),
  useReportPdfUrl: vi.fn(),
  useSendReport: vi.fn(),
  useGenerateReport: vi.fn(),
  useReserveLiftPdfUrl: vi.fn(),
  useSendReserveLiftReport: vi.fn(),
}))
vi.mock('@/hooks/use-signature', () => ({
  useCreateSignatureRequest: vi.fn(),
  useSendReserveLiftRequest: vi.fn(),
}))
vi.mock('@/hooks/use-users', () => ({ useUsers: vi.fn(), useCreateUser: vi.fn(), useUpdateUser: vi.fn() }))

// ── Fixtures ───────────────────────────────────────────────────────────────

const PROJECT_DRAFT: Project & { client: { email: string }; assignments: []; signatureRequests: [] } = {
  id: 'proj-1',
  reference: 'CH-001',
  title: 'Aménagement Jardin',
  address: '12 rue des Roses, Lyon',
  status: 'DRAFT',
  clientId: 'client-1',
  client: { id: 'client-1', firstName: 'Pierre', lastName: 'Durand', email: 'pierre@test.com' } as never,
  assignments: [],
  signatureRequests: [],
  description: null,
  notes: null,
  quoteAmount: null,
  startDate: null,
  expectedEndDate: null,
  actualEndDate: null,
  createdById: 'u1',
  closedById: null,
  closedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const USER_MEMBER: User = {
  id: 'u-member',
  username: 'jean.dupont',
  email: null,
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'MEMBER',
  customRoleId: null,
  active: true,
  navSlots: [],
  language: 'fr',
  theme: 'light',
  accentColor: '#000',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function mockMutation(overrides = {}) {
  return { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, ...overrides }
}

// ── Reset ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useProject).mockReturnValue({ data: PROJECT_DRAFT, isLoading: false } as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(usePhotos).mockReturnValue({ data: [] } as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useReport).mockReturnValue({ data: { comment: '', lastSentAt: null } } as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useReportPdfUrl).mockReturnValue({ data: { pdfUrl: null } } as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useReserveLiftPdfUrl).mockReturnValue({ data: { pdfUrl: null } } as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useUsers).mockReturnValue({ data: [] } as any)

  vi.mocked(useUpdateProjectStatus).mockReturnValue(mockMutation() as never)
  vi.mocked(useAssignUsers).mockReturnValue(mockMutation() as never)
  vi.mocked(useUnassignUser).mockReturnValue(mockMutation() as never)
  vi.mocked(useDeleteProject).mockReturnValue(mockMutation() as never)
  vi.mocked(useSendReport).mockReturnValue(mockMutation() as never)
  vi.mocked(useGenerateReport).mockReturnValue(mockMutation() as never)
  vi.mocked(useCreateSignatureRequest).mockReturnValue(mockMutation() as never)
  vi.mocked(useSendReserveLiftRequest).mockReturnValue(mockMutation() as never)
  vi.mocked(useSendReserveLiftReport).mockReturnValue(mockMutation() as never)

  useAuthStore.setState({
    accessToken: 'tok',
    username: 'admin',
    role: 'ADMIN',
    userId: 'u1',
    permissions: null,
  })
})

// ── Helpers ────────────────────────────────────────────────────────────────

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/chantiers/proj-1']}>
      <Routes>
        <Route path="/chantiers/:id" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ── Chargement ─────────────────────────────────────────────────────────────

describe('ProjectDetailPage — chargement', () => {
  it('affiche des skeletons pendant isLoading', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProject).mockReturnValue({ data: undefined, isLoading: true } as any)
    renderDetail()
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('affiche "Chantier introuvable" quand data=undefined et isLoading=false', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProject).mockReturnValue({ data: undefined, isLoading: false } as any)
    renderDetail()
    expect(screen.getByText('Chantier introuvable')).toBeInTheDocument()
  })
})

// ── Rendu de base ──────────────────────────────────────────────────────────

describe('ProjectDetailPage — rendu', () => {
  it('affiche le titre du chantier', () => {
    renderDetail()
    expect(screen.getByText('Aménagement Jardin')).toBeInTheDocument()
  })

  it('affiche la référence', () => {
    renderDetail()
    expect(screen.getByText('CH-001')).toBeInTheDocument()
  })

  it('affiche l\'adresse', () => {
    renderDetail()
    expect(screen.getByText('12 rue des Roses, Lyon')).toBeInTheDocument()
  })

  it('affiche le nom du client', () => {
    renderDetail()
    expect(screen.getByText('Pierre Durand')).toBeInTheDocument()
  })

  it('affiche le stepper pour un statut non-DISPUTED', () => {
    renderDetail()
    // StatusBadge affiche "Brouillon" pour DRAFT, mais Stepper affiche aussi d'autres étapes
    // On vérifie un label présent uniquement dans le Stepper (pas dans le StatusBadge pour DRAFT).
    // Le stepper est rendu deux fois (desktop en haut de page, mobile dans une carte) : happy-dom ignore les classes responsive.
    expect(screen.getAllByText('Planifié').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Terminé').length).toBeGreaterThan(0)
  })
})

// ── Bouton modifier — permissions ──────────────────────────────────────────

describe('ProjectDetailPage — bouton modifier (RBAC)', () => {
  it('visible pour ADMIN sur un chantier non verrouillé', () => {
    renderDetail()
    expect(screen.getByLabelText('Modifier le chantier')).toBeInTheDocument()
  })

  it('absent pour MEMBER sans permission chantiers.update', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ chantiers: ['read'] }),
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderDetail()
    expect(screen.queryByLabelText('Modifier le chantier')).not.toBeInTheDocument()
  })

  it('visible pour MEMBER avec permission chantiers.update', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ chantiers: ['read', 'update'] }),
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderDetail()
    expect(screen.getByLabelText('Modifier le chantier')).toBeInTheDocument()
  })

  it('absent sur un chantier verrouillé (COMPLETED) même pour ADMIN', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProject).mockReturnValue({
      data: { ...PROJECT_DRAFT, status: 'COMPLETED' },
      isLoading: false,
    } as any)
    renderDetail()
    expect(screen.queryByLabelText('Modifier le chantier')).not.toBeInTheDocument()
  })
})

// ── Bouton de transition — permissions ────────────────────────────────────

describe('ProjectDetailPage — bouton de transition', () => {
  it('affiche "Planifier" pour ADMIN avec un chantier DRAFT', () => {
    renderDetail()
    expect(screen.getByRole('button', { name: 'Planifier' })).toBeInTheDocument()
  })

  it('absent pour MEMBER sans permission chantiers.update', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: EMPTY_PERMISSIONS,
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderDetail()
    expect(screen.queryByRole('button', { name: 'Planifier' })).not.toBeInTheDocument()
  })

  it('absent pour MEMBER avec permission read seulement', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ chantiers: ['read'] }),
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderDetail()
    expect(screen.queryByRole('button', { name: 'Planifier' })).not.toBeInTheDocument()
  })

  it('affiche "Démarrer le chantier" pour un chantier PLANNED', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProject).mockReturnValue({
      data: { ...PROJECT_DRAFT, status: 'PLANNED' },
      isLoading: false,
    } as any)
    renderDetail()
    expect(screen.getByRole('button', { name: 'Démarrer le chantier' })).toBeInTheDocument()
  })

  it('absent pour un chantier COMPLETED (pas de transition suivante)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProject).mockReturnValue({
      data: { ...PROJECT_DRAFT, status: 'COMPLETED' },
      isLoading: false,
    } as any)
    renderDetail()
    expect(screen.queryByRole('button', { name: /Planifier|Démarrer|Clôturer/i })).not.toBeInTheDocument()
  })
})

// ── Équipe — gestion des membres ──────────────────────────────────────────

describe('ProjectDetailPage — équipe (RBAC)', () => {
  it('affiche le bouton "Retirer" pour les membres assignés si ADMIN', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProject).mockReturnValue({
      data: {
        ...PROJECT_DRAFT,
        assignments: [{ userId: 'u-foreman', user: { id: 'u-foreman', firstName: 'Jean', lastName: 'Dupont', role: 'MEMBER' } }],
      },
      isLoading: false,
    } as any)
    renderDetail()
    expect(screen.getByRole('button', { name: 'Retirer' })).toBeInTheDocument()
  })

  it('absent pour MEMBER sans permission chantiers.update', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: EMPTY_PERMISSIONS,
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProject).mockReturnValue({
      data: {
        ...PROJECT_DRAFT,
        assignments: [{ userId: 'u-foreman', user: { id: 'u-foreman', firstName: 'Jean', lastName: 'Dupont', role: 'MEMBER' } }],
      },
      isLoading: false,
    } as any)
    renderDetail()
    expect(screen.queryByRole('button', { name: 'Retirer' })).not.toBeInTheDocument()
  })

  it('affiche la section "Ajouter un membre" si ADMIN avec utilisateurs disponibles', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useUsers).mockReturnValue({ data: [USER_MEMBER] } as any)
    renderDetail()
    expect(screen.getByText('Ajouter un membre')).toBeInTheDocument()
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
  })

  it('section Ajouter absente pour MEMBER sans permission', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: EMPTY_PERMISSIONS,
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useUsers).mockReturnValue({ data: [USER_MEMBER] } as any)
    renderDetail()
    expect(screen.queryByText('Ajouter un membre')).not.toBeInTheDocument()
  })
})

// ── Rapport — lien d'édition ───────────────────────────────────────────────

describe('ProjectDetailPage — rapport (RBAC)', () => {
  it('affiche le lien "Modifier" le rapport si ADMIN et chantier non verrouillé', () => {
    renderDetail()
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument()
  })

  it('absent pour MEMBER sans permission chantiers.update', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: EMPTY_PERMISSIONS,
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    renderDetail()
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument()
  })

  it('absent sur un chantier verrouillé (COMPLETED)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProject).mockReturnValue({
      data: { ...PROJECT_DRAFT, status: 'COMPLETED' },
      isLoading: false,
    } as any)
    renderDetail()
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument()
  })
})

// ── Lien de signature ──────────────────────────────────────────────────────

describe('ProjectDetailPage — lien de signature', () => {
  it('affiche le bouton "Envoyer le lien de signature" pour AWAITING_SIGNATURE + ADMIN', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProject).mockReturnValue({
      data: { ...PROJECT_DRAFT, status: 'AWAITING_SIGNATURE' },
      isLoading: false,
    } as any)
    renderDetail()
    expect(
      screen.getByRole('button', { name: /Envoyer le lien de signature/ }),
    ).toBeInTheDocument()
  })

  it('absent si MEMBER sans permission update', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: EMPTY_PERMISSIONS,
      accessToken: 'tok',
      username: 'user',
      userId: 'u2',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useProject).mockReturnValue({
      data: { ...PROJECT_DRAFT, status: 'AWAITING_SIGNATURE' },
      isLoading: false,
    } as any)
    renderDetail()
    expect(
      screen.queryByRole('button', { name: /Envoyer le lien de signature/ }),
    ).not.toBeInTheDocument()
  })
})

// ── Clic sur les boutons de transition ────────────────────────────────────

describe('ProjectDetailPage — interaction transition', () => {
  it('cliquer "Planifier" appelle updateStatus.mutateAsync avec PLANNED', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useUpdateProjectStatus).mockReturnValue({ mutateAsync, isPending: false } as never)
    renderDetail()
    await userEvent.click(screen.getByRole('button', { name: 'Planifier' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('PLANNED'))
  })
})
