import { describe, it, expect } from 'vitest'
import { matchRoutes } from 'react-router'
import { routes } from './routes'
import { PrivateRoute } from './PrivateRoute'
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
