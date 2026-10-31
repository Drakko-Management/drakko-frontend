import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { OrganizationDetailPage } from './OrganizationDetailPage'
import * as api from '../api'
import * as support from '@/lib/support-session'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('../api', () => ({ platformRequest: vi.fn() }))
vi.mock('@/lib/support-session', () => ({ enterSupportSession: vi.fn().mockResolvedValue(undefined) }))
const request = vi.mocked(api.platformRequest)

const user = (over: object = {}) => ({
  id: 'u-owner',
  username: 'lea.martin',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'lea@jardins.test',
  role: 'ADMIN',
  isOwner: true,
  active: true,
  twoFactorEnabled: true,
  createdAt: '2026-09-01T10:00:00Z',
  ...over,
})
const org = (over: object = {}) => ({
  id: 'org-1',
  name: 'Jardins du Sud',
  slug: 'jardins-du-sud',
  active: true,
  trade: 'LANDSCAPER',
  language: 'fr',
  createdAt: '2026-09-01T10:00:00Z',
  usersCount: 2,
  clientsCount: 5,
  projectsCount: 9,
  users: [user(), user({ id: 'u-member', username: 'paul', firstName: 'Paul', lastName: 'Durand', role: 'MEMBER', isOwner: false, twoFactorEnabled: false })],
  recentActions: [],
  ...over,
})

function setup(detail = org()) {
  request.mockImplementation((path: string, options?: RequestInit) =>
    Promise.resolve(path === '/platform/organizations/org-1' && !options ? detail : { ok: true, emailMasked: 'l**@jardins.test' }),
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/plateforme/organisations/org-1']}>
        <Routes>
          <Route path="/plateforme/organisations/:id" element={<OrganizationDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const posted = () =>
  request.mock.calls
    .filter(([, o]) => (o as RequestInit | undefined)?.method === 'POST')
    .map(([path, o]) => [path, JSON.parse((o as { body: string }).body)] as const)

beforeEach(() => vi.clearAllMocks())

describe('OrganizationDetailPage — suspension', () => {
  it('demande un motif : le bouton reste inactif sans lui, puis suspend avec ce motif', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Suspendre' }))
    const dialog = await screen.findByRole('alertdialog')
    const confirm = within(dialog).getByRole('button', { name: 'Suspendre' })
    expect(confirm).toBeDisabled()

    await userEvent.type(within(dialog).getByLabelText('Motif'), 'ok')
    expect(confirm).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText('Motif'), ' impayé trois mois')
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)

    await waitFor(() => expect(posted()).toEqual([['/platform/organizations/org-1/suspend', { reason: 'ok impayé trois mois' }]]))
    expect(await screen.findByRole('status')).toHaveTextContent('Organisation suspendue.')
  })

  it('des espaces ne sont pas un motif', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Suspendre' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.type(within(dialog).getByLabelText('Motif'), '          ')
    expect(within(dialog).getByRole('button', { name: 'Suspendre' })).toBeDisabled()
  })

  it('une organisation suspendue propose de la réactiver, pas de la suspendre ni de l’ouvrir en dépannage', async () => {
    setup(org({ active: false }))
    expect(await screen.findByRole('button', { name: 'Réactiver' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspendre' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Voir ce que voit le client' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Voir comme' })).toBeNull()
  })
})

describe('OrganizationDetailPage — dépannage', () => {
  it('« Voir ce que voit le client » : motif obligatoire, session de lecture seule en tant que le propriétaire, puis ouverture de l’application', async () => {
    const grant = { accessToken: 'support-token', expiresAt: '2026-10-31T12:30:00Z', reason: 'Ticket 4512', organization: { id: 'org-1', name: 'Jardins du Sud' }, user: user() }
    request.mockImplementation((path: string) => Promise.resolve(path.endsWith('/support-session') ? grant : org()))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/plateforme/organisations/org-1']}>
          <Routes>
            <Route path="/plateforme/organisations/:id" element={<OrganizationDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Voir ce que voit le client' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('Lecture seule pendant 30 minutes, en tant que Léa Martin')
    const open = within(dialog).getByRole('button', { name: 'Ouvrir en lecture seule' })
    expect(open).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText('Motif'), 'Ticket 4512')
    await userEvent.click(open)

    await waitFor(() => expect(support.enterSupportSession).toHaveBeenCalledWith(grant))
    expect(posted()[0]).toEqual(['/platform/organizations/org-1/support-session', { reason: 'Ticket 4512' }])
    // navigation dans la page (un rechargement effacerait le jeton gardé en mémoire)
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('« Voir comme » un membre : la session vise ce membre', async () => {
    setup()
    const row = (await screen.findByText(/Paul Durand/)).closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: 'Voir comme' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('en tant que Paul Durand')
    await userEvent.type(within(dialog).getByLabelText('Motif'), 'Il ne voit pas les clients')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ouvrir en lecture seule' }))

    await waitFor(() => expect(posted()).toEqual([['/platform/organizations/org-1/support-session', { reason: 'Il ne voit pas les clients', viewAs: 'u-member' }]]))
  })

  it('lever la double authentification : désactivé si le propriétaire n’en a pas, motif obligatoire sinon', async () => {
    setup(org({ users: [user({ twoFactorEnabled: false })] }))
    expect(await screen.findByRole('button', { name: 'Lever la double authentification du propriétaire' })).toBeDisabled()
  })

  it('lever la double authentification du propriétaire avec un motif', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Lever la double authentification du propriétaire' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.type(within(dialog).getByLabelText('Motif'), 'Téléphone perdu, identité vérifiée')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lever la double authentification' }))

    await waitFor(() => expect(posted()).toEqual([['/platform/organizations/org-1/owner/reset-two-factor', { reason: 'Téléphone perdu, identité vérifiée' }]]))
  })

  it('envoyer un lien : l’adresse du propriétaire est utilisée, sans la redemander', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Envoyer un lien au propriétaire' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).queryByLabelText('Email')).toBeNull()
    await userEvent.type(within(dialog).getByLabelText('Motif'), 'Mot de passe perdu')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Envoyer le lien' }))

    await waitFor(() => expect(posted()).toEqual([['/platform/organizations/org-1/owner/reset-link', { reason: 'Mot de passe perdu' }]]))
    expect(await screen.findByRole('status')).toHaveTextContent('Lien envoyé à l**@jardins.test')
  })

  it('envoyer un lien à un propriétaire sans adresse : l’adresse est demandée et envoyée', async () => {
    setup(org({ users: [user({ email: null })] }))
    await userEvent.click(await screen.findByRole('button', { name: 'Envoyer un lien au propriétaire' }))
    const dialog = await screen.findByRole('alertdialog')
    const send = within(dialog).getByRole('button', { name: 'Envoyer le lien' })
    await userEvent.type(within(dialog).getByLabelText('Motif'), 'Mot de passe perdu')
    expect(send).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText('Email'), 'lea@nouvelle-adresse.test')
    expect(send).toBeEnabled()
    await userEvent.click(send)

    await waitFor(() =>
      expect(posted()).toEqual([['/platform/organizations/org-1/owner/reset-link', { reason: 'Mot de passe perdu', email: 'lea@nouvelle-adresse.test' }]]),
    )
  })
})
