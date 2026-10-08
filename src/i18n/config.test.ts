import { describe, it, expect, afterEach } from 'vitest'
import i18n from './config'

afterEach(async () => {
  await i18n.changeLanguage('fr')
})

describe('i18n — langue du document', () => {
  it('<html lang> suit la langue choisie', async () => {
    await i18n.changeLanguage('de')
    expect(document.documentElement.lang).toBe('de')

    await i18n.changeLanguage('es')
    expect(document.documentElement.lang).toBe('es')
  })
})
