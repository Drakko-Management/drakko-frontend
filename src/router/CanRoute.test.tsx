import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions } from '@/lib/permissions'
import { CanRoute } from './CanRoute'

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/" element={<p>Accueil</p>} />
        <Route element={<CanRoute module="chantiers" action="read" />}>
          <Route path="/chantiers" element={<p>Liste des chantiers</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => useAuthStore.setState({ role: 'ADMIN', permissions: null, modules: null }))

describe('CanRoute — modules activables (ADR-029)', () => {
  it('une organisation qui a le module ouvre la page', () => {
    useAuthStore.setState({ modules: ['chantiers'] })
    renderAt('/chantiers')

    expect(screen.getByText('Liste des chantiers')).toBeInTheDocument()
  })

  it('« Devis seul » : l\'adresse tapée à la main renvoie à l\'accueil, même pour un administrateur', () => {
    useAuthStore.setState({ modules: ['devis'] })
    renderAt('/chantiers')

    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.queryByText('Liste des chantiers')).not.toBeInTheDocument()
  })

  it('un membre sans droit de lecture est renvoyé à l\'accueil aussi', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ clients: ['read'] }), modules: ['chantiers'] })
    renderAt('/chantiers')

    expect(screen.getByText('Accueil')).toBeInTheDocument()
  })
})
