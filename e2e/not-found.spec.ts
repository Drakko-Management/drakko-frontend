import { test, expect } from '@playwright/test'
import { mockLoggedIn, mockLoggedOut } from './helpers'

test('adresse inconnue, connecté : page « introuvable » dans l’application, retour au tableau de bord', async ({ page }) => {
  await mockLoggedIn(page)
  await page.goto('/cette-page-nexiste-pas')

  await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible()
  await expect(page.getByText(/Hey developer|Unexpected Application Error/)).toHaveCount(0)

  await page.getByRole('link', { name: 'Retour au tableau de bord' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Page introuvable' })).toHaveCount(0)
})

test('adresse inconnue, non connecté : renvoyé vers la connexion', async ({ page }) => {
  await mockLoggedOut(page)
  await page.goto('/cette-page-nexiste-pas')

  await expect(page).toHaveURL(/\/login$/)
})
