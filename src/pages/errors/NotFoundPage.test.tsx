import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from 'i18next'
import { MemoryRouter, Route, Routes } from 'react-router'
import { NotFoundPage } from './NotFoundPage'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>tableau de bord</div>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => i18n.changeLanguage('fr'))

describe('NotFoundPage', () => {
  it('dit en français que la page est introuvable, sans écran d’erreur de développeur', () => {
    renderAt('/cette-page-nexiste-pas')

    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.queryByText(/developer/i)).not.toBeInTheDocument()
  })

  it('ramène au tableau de bord', async () => {
    renderAt('/cette-page-nexiste-pas')

    const link = screen.getByRole('link', { name: 'Retour au tableau de bord' })
    expect(link).toHaveAttribute('href', '/')
    await userEvent.click(link)

    expect(screen.getByText('tableau de bord')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Page introuvable' })).not.toBeInTheDocument()
  })

  it.each([
    ['en', 'Page not found', 'Back to the dashboard'],
    ['es', 'Página no encontrada', 'Volver al panel'],
    ['it', 'Pagina non trovata', 'Torna alla dashboard'],
    ['de', 'Seite nicht gefunden', 'Zurück zur Übersicht'],
  ])('%s : titre et bouton dans la langue de l’interface', async (lang, title, home) => {
    await i18n.changeLanguage(lang)
    renderAt('/inconnu')

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: home })).toBeInTheDocument()
  })
})
