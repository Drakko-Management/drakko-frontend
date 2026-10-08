import { test, expect, type Page, type Route } from '@playwright/test'
import { mockLoggedIn, PROJECT_FIXTURE } from './helpers'

const ID = PROJECT_FIXTURE.id

const CLIENT = {
  id: 'client-1',
  firstName: 'Pierre',
  lastName: 'Martin',
  email: 'pierre.martin@example.com',
  phone: null,
  address: null,
  notes: null,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

interface ServerState {
  status: string
  pdfUrl: string | null
  detailCalls: number
}

function respond(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
}

async function mockServer(page: Page, server: ServerState) {
  await page.route(`**/projects/${ID}`, (route) => {
    server.detailCalls += 1
    return respond(route, {
      ...PROJECT_FIXTURE,
      status: server.status,
      client: CLIENT,
      assignments: [],
      signature: null,
      reserveLiftSignature: null,
      signatureRequests: [],
    })
  })
  await page.route(`**/projects/${ID}/photos`, (route) => respond(route, []))
  await page.route(`**/projects/${ID}/report`, (route) => respond(route, null))
  await page.route(`**/projects/${ID}/report/pdf-url`, (route) => respond(route, { pdfUrl: server.pdfUrl }))
}

test.beforeEach(async ({ page }) => {
  await mockLoggedIn(page)
  await page.clock.install()
})

// Le client signe depuis son téléphone : aucun postMessage, la fiche ouverte chez l'employé doit le découvrir seule.
test('la fiche en attente de signature se met à jour seule, puis affiche le PDF une fois généré', async ({ page }) => {
  const server: ServerState = { status: 'AWAITING_SIGNATURE', pdfUrl: null, detailCalls: 0 }
  await mockServer(page, server)

  await page.goto(`/chantiers/${ID}`)
  await expect(page.getByRole('heading', { name: PROJECT_FIXTURE.title })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Générer le procès-verbal' })).toHaveCount(0)

  // Le client signe : le serveur passe le chantier à COMPLETED, le PDF n'est pas encore prêt
  server.status = 'COMPLETED'
  await page.clock.runFor(10_000)
  await expect(page.getByRole('button', { name: 'Générer le procès-verbal' })).toBeVisible()

  // Le PDF est généré en tâche de fond : la fiche le récupère sans rechargement
  server.pdfUrl = 'https://stockage.test/rapport.pdf'
  await page.clock.runFor(3_000)
  await expect(page.getByRole('link', { name: 'Télécharger' })).toHaveAttribute('href', 'https://stockage.test/rapport.pdf')
  await expect(page.getByRole('button', { name: 'Générer le procès-verbal' })).toHaveCount(0)
})

test("n'interroge pas le serveur en boucle quand rien n'attend de signature", async ({ page }) => {
  const server: ServerState = { status: 'IN_PROGRESS', pdfUrl: null, detailCalls: 0 }
  await mockServer(page, server)

  await page.goto(`/chantiers/${ID}`)
  await expect(page.getByRole('heading', { name: PROJECT_FIXTURE.title })).toBeVisible()
  const callsAfterLoad = server.detailCalls

  await page.clock.runFor(60_000)
  await page.waitForTimeout(300)

  expect(server.detailCalls).toBe(callsAfterLoad)
})
