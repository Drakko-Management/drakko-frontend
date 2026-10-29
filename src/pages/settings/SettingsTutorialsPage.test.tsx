import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useAuthStore } from '@/store/auth.store'
import { SettingsTutorialsPage } from './SettingsTutorialsPage'

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u1', permissions: null })
})

describe('SettingsTutorialsPage', () => {
  it('range les guides en deux sections : création réelle d\'abord, puis visites guidées', () => {
    render(
      <MemoryRouter>
        <SettingsTutorialsPage />
      </MemoryRouter>,
    )

    const create = screen.getByText('Créer pour de vrai').closest('section')!
    const tour = screen.getByText('Visites guidées').closest('section')!

    expect(within(create).getByText('Créer un client')).toBeInTheDocument()
    expect(within(create).queryByText('Remplir le rapport d\'intervention')).not.toBeInTheDocument()
    expect(within(tour).getByText('Remplir le rapport d\'intervention')).toBeInTheDocument()
    expect(within(tour).queryByText('Créer un client')).not.toBeInTheDocument()
    expect(create.compareDocumentPosition(tour) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
