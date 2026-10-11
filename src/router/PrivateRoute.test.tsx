import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { PrivateRoute } from './PrivateRoute'
import { TWO_FACTOR_ROUTE } from './two-factor-route'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>page de connexion</div>} />
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<div>tableau de bord</div>} />
          <Route path="/chantiers" element={<div>chantiers</div>} />
          <Route path={TWO_FACTOR_ROUTE} element={<div>configuration de la double authentification</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'tok', twoFactorRequired: false })
})

describe('PrivateRoute', () => {
  it('sans session : renvoie vers la connexion', () => {
    useAuthStore.setState({ accessToken: null })
    renderAt('/chantiers')

    expect(screen.getByText('page de connexion')).toBeInTheDocument()
  })

  it('avec une session : laisse passer', () => {
    renderAt('/chantiers')

    expect(screen.getByText('chantiers')).toBeInTheDocument()
  })

  it('administrateur sans double authentification : toute page renvoie vers sa configuration', () => {
    useAuthStore.setState({ twoFactorRequired: true })
    renderAt('/chantiers')

    expect(screen.getByText('configuration de la double authentification')).toBeInTheDocument()
    expect(screen.queryByText('chantiers')).not.toBeInTheDocument()
  })

  it('… y compris l’accueil', () => {
    useAuthStore.setState({ twoFactorRequired: true })
    renderAt('/')

    expect(screen.getByText('configuration de la double authentification')).toBeInTheDocument()
  })

  it('la page de configuration elle-même reste accessible (pas de boucle de redirection)', () => {
    useAuthStore.setState({ twoFactorRequired: true })
    renderAt(TWO_FACTOR_ROUTE)

    expect(screen.getByText('configuration de la double authentification')).toBeInTheDocument()
  })

  it('sans session, la connexion passe avant la configuration', () => {
    useAuthStore.setState({ accessToken: null, twoFactorRequired: true })
    renderAt('/chantiers')

    expect(screen.getByText('page de connexion')).toBeInTheDocument()
  })
})
