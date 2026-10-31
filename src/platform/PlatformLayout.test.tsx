import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { PlatformLayout } from './PlatformLayout'
import { usePlatformStore } from './store'
import * as api from './api'

vi.mock('./api', () => ({
  refreshPlatformSession: vi.fn(),
  startPlatformSession: vi.fn((token: string) => usePlatformStore.getState().setSession(token)),
  loadPlatformAdmin: vi.fn(async () => {
    const admin = { id: 'a', username: 'root', name: 'Julien Root' }
    usePlatformStore.getState().setAdmin(admin)
    return admin
  }),
  endPlatformSession: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  usePlatformStore.setState({ accessToken: null, admin: null })
})

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/plateforme/connexion" element={<p>page de connexion</p>} />
        <Route path="/plateforme" element={<PlatformLayout />}>
          <Route index element={<p>contenu protégé</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('PlatformLayout', () => {
  it('sans session plateforme et sans cookie valable : renvoie vers la connexion, sans rien montrer', async () => {
    vi.mocked(api.refreshPlatformSession).mockResolvedValue(null)
    renderAt('/plateforme')

    expect(await screen.findByText('page de connexion')).toBeInTheDocument()
    expect(screen.queryByText('contenu protégé')).toBeNull()
  })

  it('un cookie de renouvellement valable rouvre la session (rechargement de la page)', async () => {
    vi.mocked(api.refreshPlatformSession).mockResolvedValue('plat-2')
    renderAt('/plateforme')

    expect(await screen.findByText('contenu protégé')).toBeInTheDocument()
    expect(api.startPlatformSession).toHaveBeenCalledWith('plat-2')
    await waitFor(() => expect(screen.getByText('Julien Root')).toBeInTheDocument())
  })

  it('un réseau coupé au chargement ne donne pas accès non plus', async () => {
    vi.mocked(api.refreshPlatformSession).mockResolvedValue(false)
    renderAt('/plateforme')

    expect(await screen.findByText('page de connexion')).toBeInTheDocument()
  })

  it('la session d’une organisation ne donne aucun accès à la plateforme', async () => {
    const { useAuthStore } = await import('@/store/auth.store')
    useAuthStore.setState({ accessToken: 'jeton-organisation', role: 'ADMIN' })
    vi.mocked(api.refreshPlatformSession).mockResolvedValue(null)
    renderAt('/plateforme')

    expect(await screen.findByText('page de connexion')).toBeInTheDocument()
    useAuthStore.setState({ accessToken: null, role: null })
  })

  it('avec une session : les liens de la plateforme et la déconnexion', async () => {
    usePlatformStore.setState({ accessToken: 'plat-1', admin: { id: 'a', username: 'root', name: 'Julien Root' } })
    renderAt('/plateforme')

    expect(await screen.findByText('contenu protégé')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Organisations' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Liste d'attente" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Journal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument()
    expect(api.refreshPlatformSession).not.toHaveBeenCalled()
  })
})
