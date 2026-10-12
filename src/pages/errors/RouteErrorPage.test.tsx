import { describe, it, expect, afterEach, beforeEach, vi, type MockInstance } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from 'i18next'
import { Outlet, RouterProvider, createMemoryRouter, type RouteObject } from 'react-router'
import { RouteErrorPage } from './RouteErrorPage'

const TECHNICAL_MESSAGE = 'boom: détail technique qui ne doit jamais s’afficher'

function Boom(): never {
  throw new Error(TECHNICAL_MESSAGE)
}

// Comme l'application : une coque (navigation) dont les écrans ont leur page d'erreur
function Shell() {
  return (
    <div>
      <nav>navigation</nav>
      <Outlet />
    </div>
  )
}

function renderRoutes(routes: RouteObject[], path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

const insideShell: RouteObject[] = [
  {
    element: <Shell />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { path: 'boom', element: <Boom /> },
          { path: 'ok', element: <div>écran normal</div> },
        ],
      },
    ],
  },
]

let consoleError: MockInstance<(typeof console)['error']>

beforeEach(() => {
  // React et le composant écrivent l'erreur dans la console : on la capte pour la vérifier et garder la sortie des tests lisible
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(async () => {
  consoleError.mockRestore()
  vi.unstubAllGlobals()
  await i18n.changeLanguage('fr')
})

describe('RouteErrorPage', () => {
  it('une erreur d’affichage donne un message traduit, sans le texte technique ni l’écran du routeur', () => {
    renderRoutes(insideShell, '/boom')

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Une erreur est survenue' })).toBeInTheDocument()
    expect(screen.queryByText(/boom|developer|Unexpected/i)).not.toBeInTheDocument()
  })

  it('garde le détail dans la console pour le diagnostic', () => {
    renderRoutes(insideShell, '/boom')

    const logged = consoleError.mock.calls.find((call) => call[0] === 'Route error:')
    expect((logged?.[1] as Error).message).toBe(TECHNICAL_MESSAGE)
  })

  it('dans la coque, la navigation reste affichée ; un écran qui va bien n’est pas touché', () => {
    renderRoutes(insideShell, '/boom')
    expect(screen.getByText('navigation')).toBeInTheDocument()
  })

  it('un écran sans erreur s’affiche normalement', () => {
    renderRoutes(insideShell, '/ok')

    expect(screen.getByText('écran normal')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('« Recharger la page » recharge l’application', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    renderRoutes(insideShell, '/boom')

    await userEvent.click(screen.getByRole('button', { name: 'Recharger la page' }))

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('« Retour au tableau de bord » est un lien ordinaire vers / (recharge tout, même si la coque est en cause)', () => {
    renderRoutes(insideShell, '/boom')

    expect(screen.getByRole('link', { name: 'Retour au tableau de bord' })).toHaveAttribute('href', '/')
  })

  it('hors de la coque (variante plein écran), la page remplace tout', () => {
    renderRoutes(
      [{ errorElement: <RouteErrorPage screen />, children: [{ path: 'boom', element: <Boom /> }] }],
      '/boom',
    )

    expect(screen.getByRole('alert')).toHaveClass('min-h-dvh')
    expect(screen.queryByText('navigation')).not.toBeInTheDocument()
  })

  it.each([
    ['en', 'Something went wrong', 'Reload the page', 'Back to the dashboard'],
    ['es', 'Ha ocurrido un error', 'Recargar la página', 'Volver al panel'],
    ['it', 'Si è verificato un errore', 'Ricarica la pagina', 'Torna alla dashboard'],
    ['de', 'Ein Fehler ist aufgetreten', 'Seite neu laden', 'Zurück zur Übersicht'],
  ])('%s : titre et boutons dans la langue de l’interface', async (lang, title, reload, home) => {
    await i18n.changeLanguage(lang)
    renderRoutes(insideShell, '/boom')

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: reload })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: home })).toBeInTheDocument()
  })
})
