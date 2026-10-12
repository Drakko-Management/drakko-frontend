import { test, expect, type Page } from '@playwright/test'
import { mockLoggedIn } from './helpers'

type Marked = { __avantRechargement?: boolean }

// Une fiche chantier dont la réponse est incomplète (pas d'« assignments ») fait planter l'écran
async function mockBrokenProject(page: Page) {
  await page.route('**/projects/proj-1', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'proj-1', title: 'Chantier cassé' }) }),
  )
}

test('un écran qui plante : message traduit dans l’application, sans écran du routeur ni texte technique', async ({ page }) => {
  await mockLoggedIn(page)
  await mockBrokenProject(page)
  await page.goto('/chantiers/proj-1')

  await expect(page.getByRole('heading', { name: 'Une erreur est survenue' })).toBeVisible()
  await expect(page.getByText(/Hey developer|Unexpected Application Error|Cannot read properties/)).toHaveCount(0)
  // la coque (navigation) est toujours là : un écran cassé ne prend pas toute l'application avec lui
  await expect(page.locator('a[href="/chantiers"]').first()).toBeAttached()
})

test('« Recharger la page » recharge l’application, « Retour au tableau de bord » en sort', async ({ page }) => {
  await mockLoggedIn(page)
  await mockBrokenProject(page)
  await page.goto('/chantiers/proj-1')
  await expect(page.getByRole('heading', { name: 'Une erreur est survenue' })).toBeVisible()

  await page.evaluate(() => { (globalThis as Marked).__avantRechargement = true })
  await page.getByRole('button', { name: 'Recharger la page' }).click()
  await expect(page.getByRole('heading', { name: 'Une erreur est survenue' })).toBeVisible()
  expect(await page.evaluate(() => (globalThis as Marked).__avantRechargement)).toBeUndefined()

  await page.getByRole('link', { name: 'Retour au tableau de bord' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Une erreur est survenue' })).toHaveCount(0)
})
