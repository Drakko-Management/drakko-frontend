import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useCreateService } from '@/hooks/use-services'
import { CreateServicePage } from './CreateServicePage'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-services', () => ({ useCreateService: vi.fn() }))

beforeEach(() => {
  vi.mocked(useCreateService).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
})

describe('CreateServicePage', () => {
  it("à la création, le curseur arrive dans l'intitulé", () => {
    render(
      <MemoryRouter>
        <CreateServicePage />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText(/Intitulé/)).toHaveFocus()
  })

  it("« Enregistrer » reste inactif tant que l'intitulé est vide", () => {
    render(
      <MemoryRouter>
        <CreateServicePage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })
})
