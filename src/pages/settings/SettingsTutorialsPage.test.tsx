import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useAuthStore } from '@/store/auth.store'
import { SettingsTutorialsPage } from './SettingsTutorialsPage'

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u1', permissions: null })
})

function rowOf(title: string) {
  return screen.getByText(title).closest('.min-w-0') as HTMLElement
}

describe('SettingsTutorialsPage', () => {
  it('indique pour chaque guide s\'il crée de vraies données ou s\'il s\'agit d\'une visite guidée', () => {
    render(
      <MemoryRouter>
        <SettingsTutorialsPage />
      </MemoryRouter>,
    )

    expect(within(rowOf('Créer un client')).getByText('Crée de vraies données')).toBeInTheDocument()
    expect(within(rowOf('Remplir le rapport d\'intervention')).getByText('Visite guidée')).toBeInTheDocument()
  })
})
