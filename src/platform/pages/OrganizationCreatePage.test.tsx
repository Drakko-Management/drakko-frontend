import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { ApiError } from '@/lib/api-client'
import { OrganizationCreatePage } from './OrganizationCreatePage'
import * as api from '../api'

vi.mock('../api', () => ({ platformRequest: vi.fn() }))
const request = vi.mocked(api.platformRequest)

function renderAt(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <OrganizationCreatePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const CREATED = {
  organization: { id: 'org-1', name: 'Paysages Pierre', slug: 'paysages-pierre' },
  owner: { id: 'u-1', username: 'pierre.martin', email: 'pierre@paysages.test' },
  welcomeEmailSent: true,
}

beforeEach(() => vi.clearAllMocks())

describe('OrganizationCreatePage', () => {
  it('envoie l’organisation et son propriétaire, puis annonce l’email de bienvenue', async () => {
    request.mockResolvedValueOnce(CREATED)
    renderAt('/plateforme/organisations/nouvelle')

    await userEvent.type(screen.getByLabelText("Nom de l'entreprise"), 'Paysages Pierre')
    await userEvent.type(screen.getByLabelText('Prénom'), 'Pierre')
    await userEvent.type(screen.getByLabelText('Nom'), 'Martin')
    await userEvent.type(screen.getByLabelText('Email'), 'pierre@paysages.test')
    await userEvent.click(screen.getByRole('button', { name: "Créer l'organisation" }))

    expect(await screen.findByText('Paysages Pierre est créée')).toBeInTheDocument()
    expect(request).toHaveBeenCalledWith('/platform/organizations', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Paysages Pierre',
        trade: 'LANDSCAPER',
        language: 'fr',
        owner: { firstName: 'Pierre', lastName: 'Martin', email: 'pierre@paysages.test' },
      }),
    })
    expect(screen.getByRole('status')).toHaveTextContent("L'email de bienvenue est parti")
    expect(screen.getByRole('link', { name: 'Ouvrir la fiche' })).toHaveAttribute('href', '/plateforme/organisations/org-1')
  })

  it('le bouton reste inactif tant que le nom, le propriétaire et son email manquent', async () => {
    renderAt('/plateforme/organisations/nouvelle')
    expect(screen.getByRole('button', { name: "Créer l'organisation" })).toBeDisabled()
  })

  it('depuis la liste d’attente : le formulaire arrive pré-rempli avec la fiche, et la création la mentionne', async () => {
    request.mockImplementation((path: string) =>
      path === '/platform/waitlist/w-1'
        ? Promise.resolve({
            id: 'w-1',
            email: 'pierre@paysages.test',
            language: 'de',
            firstName: 'Pierre',
            company: 'Paysages Pierre',
            trade: 'MASON',
            teamSize: 'SMALL',
            phone: null,
            pilotInterest: true,
            confirmedAt: '2026-10-20T10:00:00Z',
            createdAt: '2026-10-19T10:00:00Z',
          })
        : Promise.resolve(CREATED),
    )
    renderAt('/plateforme/organisations/nouvelle?liste-attente=w-1')

    await waitFor(() => expect(screen.getByLabelText("Nom de l'entreprise")).toHaveValue('Paysages Pierre'))
    expect(screen.getByLabelText('Prénom')).toHaveValue('Pierre')
    expect(screen.getByLabelText('Email')).toHaveValue('pierre@paysages.test')
    expect(screen.getByLabelText('Métier')).toHaveValue('MASON')
    expect(screen.getByLabelText('Langue')).toHaveValue('de')
    expect(screen.getByText(/pré-rempli à partir de la liste d'attente/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Nom'), 'Martin')
    await userEvent.click(screen.getByRole('button', { name: "Créer l'organisation" }))

    await screen.findByText('Paysages Pierre est créée')
    const body = JSON.parse((request.mock.calls[request.mock.calls.length - 1][1] as { body: string }).body) as Record<string, unknown>
    expect(body).toMatchObject({ fromWaitlist: 'w-1', trade: 'MASON', language: 'de' })
  })

  it('un email de bienvenue qui n’est pas parti est signalé avec la marche à suivre', async () => {
    request.mockResolvedValueOnce({ ...CREATED, welcomeEmailSent: false })
    renderAt('/plateforme/organisations/nouvelle')
    await userEvent.type(screen.getByLabelText("Nom de l'entreprise"), 'X Jardins')
    await userEvent.type(screen.getByLabelText('Prénom'), 'A')
    await userEvent.type(screen.getByLabelText('Nom'), 'B')
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.test')
    await userEvent.click(screen.getByRole('button', { name: "Créer l'organisation" }))

    expect(await screen.findByRole('status')).toHaveTextContent("n'est pas parti")
  })

  it('une adresse déjà prise s’affiche en clair, sans quitter le formulaire', async () => {
    request.mockRejectedValueOnce(new ApiError(409, 'x', 'ORGANIZATION_SLUG_TAKEN'))
    renderAt('/plateforme/organisations/nouvelle')
    await userEvent.type(screen.getByLabelText("Nom de l'entreprise"), 'X Jardins')
    await userEvent.type(screen.getByLabelText('Prénom'), 'A')
    await userEvent.type(screen.getByLabelText('Nom'), 'B')
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.test')
    await userEvent.click(screen.getByRole('button', { name: "Créer l'organisation" }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Cette adresse est déjà prise')
    expect(screen.getByLabelText("Nom de l'entreprise")).toHaveValue('X Jardins')
  })
})
