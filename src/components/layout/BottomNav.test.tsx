import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useOrganization } from '@/hooks/use-organization'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions } from '@/lib/permissions'
import { BottomNav } from './BottomNav'

vi.mock('@/hooks/use-organization', () => ({ useOrganization: vi.fn() }))

function renderNav() {
  render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>,
  )
}

const labels = () => screen.getAllByRole('link').map((link) => link.textContent)

beforeEach(() => {
  useAuthStore.setState({ role: 'ADMIN', permissions: null, modules: ['chantiers'], navSlots: [] })
  vi.mocked(useOrganization).mockReturnValue({ data: { navSlots: ['chantiers', 'clients', 'prestations'] } } as never)
})

describe('BottomNav — modules activables (ADR-029)', () => {
  it('Chantiers seul : la barre choisie par l\'organisation', () => {
    renderNav()

    expect(labels()).toEqual(['Tableau', 'Chantiers', 'Clients', 'Presta.'])
  })

  it('« Devis seul » : l\'emplacement Chantiers choisi avant est ignoré', () => {
    useAuthStore.setState({ modules: ['devis'] })
    renderNav()

    expect(labels()).toEqual(['Tableau', 'Clients', 'Presta.'])
  })

  it('les deux modules : l\'emplacement Devis apparaît quand l\'organisation l\'a choisi', () => {
    useAuthStore.setState({ modules: ['chantiers', 'devis'] })
    vi.mocked(useOrganization).mockReturnValue({ data: { navSlots: ['chantiers', 'devis', 'clients'] } } as never)
    renderNav()

    expect(labels()).toEqual(['Tableau', 'Chantiers', 'Devis', 'Clients'])
  })

  it('un membre : ses emplacements, sans le module coupé même si son rôle lui en donne le droit', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      modules: ['devis'],
      permissions: makePermissions({ chantiers: ['read'], devis: ['read'], clients: ['read'] }),
      navSlots: ['chantiers', 'devis', 'clients'],
    })
    renderNav()

    expect(labels()).toEqual(['Tableau', 'Devis', 'Clients'])
  })

  it('sans la liste des modules (pas encore lue), rien n\'est masqué', () => {
    useAuthStore.setState({ modules: null })
    renderNav()

    expect(labels()).toEqual(['Tableau', 'Chantiers', 'Clients', 'Presta.'])
  })
})
