import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useProject } from '@/hooks/use-projects'
import {
  useReport,
  useUpdateReport,
  useReportLines,
  useAddReportLine,
  useUpdateReportLine,
  useDeleteReportLine,
} from '@/hooks/use-report'
import { useServices } from '@/hooks/use-services'
import { useAuthStore } from '@/store/auth.store'
import { ReportPage } from './ReportPage'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-projects', () => ({ useProject: vi.fn() }))
vi.mock('@/hooks/use-services', () => ({ useServices: vi.fn() }))
vi.mock('@/hooks/use-report', () => ({
  useReport: vi.fn(),
  useUpdateReport: vi.fn(),
  useReportLines: vi.fn(),
  useAddReportLine: vi.fn(),
  useUpdateReportLine: vi.fn(),
  useDeleteReportLine: vi.fn(),
}))

const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })

function projectWith(status: string) {
  vi.mocked(useProject).mockReturnValue({
    data: { id: 'proj-1', reference: 'CH-001', title: 'Jardin', status },
    isLoading: false,
  } as unknown as ReturnType<typeof useProject>)
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/chantiers/proj-1/rapport']}>
      <Routes>
        <Route path="/chantiers/:id/rapport" element={<ReportPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useReport).mockReturnValue({ data: { comment: '' }, isLoading: false } as unknown as ReturnType<typeof useReport>)
  vi.mocked(useReportLines).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof useReportLines>)
  vi.mocked(useServices).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useServices>)
  vi.mocked(useUpdateReport).mockReturnValue(mutation() as never)
  vi.mocked(useAddReportLine).mockReturnValue(mutation() as never)
  vi.mocked(useUpdateReportLine).mockReturnValue(mutation() as never)
  vi.mocked(useDeleteReportLine).mockReturnValue(mutation() as never)
  useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u1', permissions: null })
})

describe('ReportPage — chantier verrouillé', () => {
  it.each(['AWAITING_SIGNATURE', 'AWAITING_RESERVE_LIFT', 'COMPLETED', 'DISPUTED'])(
    'annonce le verrouillage et masque l\'ajout de ligne quand le chantier est %s',
    (status) => {
      projectWith(status)
      renderPage()
      expect(screen.getByText('Le rapport est verrouillé après signature.')).toBeInTheDocument()
      expect(screen.queryByText('Ajouter')).not.toBeInTheDocument()
    },
  )

  it.each(['DRAFT', 'PLANNED', 'IN_PROGRESS'])('reste modifiable quand le chantier est %s', (status) => {
    projectWith(status)
    renderPage()
    expect(screen.queryByText('Le rapport est verrouillé après signature.')).not.toBeInTheDocument()
    expect(screen.getByText('Ajouter')).toBeInTheDocument()
  })
})
