import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { SettingsProfilPage } from './SettingsProfilPage'

vi.mock('@/lib/patch-me', () => ({ patchMe: vi.fn() }))
vi.mock('./ChangeEmailForm', () => ({ ChangeEmailForm: () => <div>formulaire adresse</div> }))
vi.mock('./ChangePasswordCard', () => ({ ChangePasswordCard: () => <div>carte mot de passe</div> }))
vi.mock('./TwoFactorCard', () => ({ TwoFactorCard: () => <div>carte double authentification</div> }))

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'tok', username: 'lea', role: 'ADMIN', userId: 'u1' })
})

describe('SettingsProfilPage', () => {
  it("affiche l'identifiant de connexion", () => {
    render(
      <MemoryRouter>
        <SettingsProfilPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('lea')).toBeInTheDocument()
  })

  it('propose de changer son adresse email, son mot de passe, et de configurer la double authentification', () => {
    render(
      <MemoryRouter>
        <SettingsProfilPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('formulaire adresse')).toBeInTheDocument()
    expect(screen.getByText('carte mot de passe')).toBeInTheDocument()
    expect(screen.getByText('carte double authentification')).toBeInTheDocument()
  })
})
