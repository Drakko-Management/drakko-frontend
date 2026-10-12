import { describe, it, expect } from 'vitest'
import { matchRoutes } from 'react-router'
import { routes } from './routes'
import { PrivateRoute } from './PrivateRoute'
import { AppShell } from '@/components/layout/AppShell'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { TWO_FACTOR_ROUTE } from './two-factor-route'

function lastRoute(path: string) {
  const matches = matchRoutes(routes, path) ?? []
  return matches[matches.length - 1]?.route
}

describe('routes : adresse inconnue', () => {
  it.each(['/cette-page-nexiste-pas', '/chantiers/abc/inconnu', '/a/b/c/d', '/sign', '/clients/abc/encore'])(
    '%s tombe sur la page « introuvable »',
    (path) => {
      const route = lastRoute(path)

      expect(route?.path).toBe('*')
      expect((route?.element as { type: unknown }).type).toBe(NotFoundPage)
    },
  )

  it('la page « introuvable » est derrière la connexion : sans session, on est renvoyé vers /login', () => {
    const chain = matchRoutes(routes, '/cette-page-nexiste-pas') ?? []

    expect(chain.some((m) => (m.route.element as { type?: unknown } | undefined)?.type === PrivateRoute)).toBe(true)
  })

  it.each([
    '/', '/login', '/mot-de-passe-oublie', '/reinitialiser-mot-de-passe', '/sign/un-jeton', TWO_FACTOR_ROUTE,
    '/chantiers', '/chantiers/abc', '/chantiers/abc/photos', '/chantiers/abc/rapport', '/chantiers/abc/modifier',
    '/chantiers/nouveau', '/chantiers/express',
    '/clients', '/clients/abc', '/clients/nouveau',
    '/utilisateurs', '/utilisateurs/nouveau', '/utilisateurs/roles/nouveau',
    '/prestations', '/prestations/nouveau',
    '/parametres', '/parametres/profil', '/parametres/apparence', '/parametres/navigation',
    '/parametres/entreprise', '/parametres/tutoriels',
  ])('%s garde son écran (la route « * » ne l’avale pas)', (path) => {
    expect(lastRoute(path)?.path).not.toBe('*')
  })
})

describe('routes : page d’erreur d’affichage', () => {
  const SCREENS_IN_SHELL = [
    '/', '/chantiers', '/chantiers/abc', '/chantiers/abc/photos', '/chantiers/abc/rapport', '/chantiers/abc/modifier',
    '/chantiers/nouveau', '/clients', '/clients/abc', '/utilisateurs', '/prestations', '/parametres',
    '/parametres/profil', '/cette-page-nexiste-pas',
  ]
  const OUTSIDE_SHELL = ['/login', '/mot-de-passe-oublie', '/reinitialiser-mot-de-passe', '/sign/un-jeton', TWO_FACTOR_ROUTE]

  it('chaque route de premier niveau a sa page d’erreur plein écran', () => {
    expect(routes.length).toBeGreaterThan(0)
    for (const route of routes) {
      expect(route.errorElement, `route ${route.path ?? '(groupe protégé)'}`).toBeDefined()
    }
  })

  it.each(OUTSIDE_SHELL)('%s : une erreur est reprise par la page plein écran', (path) => {
    const chain = matchRoutes(routes, path) ?? []

    expect(chain.some((m) => m.route.errorElement !== undefined)).toBe(true)
  })

  it.each(SCREENS_IN_SHELL)('%s : une erreur d’écran est reprise sous la coque, la navigation reste affichée', (path) => {
    const chain = matchRoutes(routes, path) ?? []
    const shell = chain.findIndex((m) => (m.route.element as { type?: unknown } | undefined)?.type === AppShell)
    const belowShell = chain.slice(shell + 1)

    expect(shell).toBeGreaterThanOrEqual(0)
    // une page d'erreur placée sous la coque : elle s'affiche dans la coque, qui n'est pas remplacée
    expect(belowShell.some((m) => m.route.errorElement !== undefined)).toBe(true)
  })
})

