import { describe, it, expect } from 'vitest'
import { pdfPollInterval } from './use-report'

describe('pdfPollInterval', () => {
  it("redemande toutes les 3 s tant que le PDF n'existe pas", () => {
    expect(pdfPollInterval(null, 1)).toBe(3000)
  })

  it("s'arrête dès que le PDF existe", () => {
    expect(pdfPollInterval('https://stockage.test/rapport.pdf', 3)).toBe(false)
  })

  it('ne démarre pas avant la première réponse', () => {
    expect(pdfPollInterval(undefined, 0)).toBe(false)
  })

  it('abandonne après 40 réponses sans PDF (génération en échec)', () => {
    expect(pdfPollInterval(null, 39)).toBe(3000)
    expect(pdfPollInterval(null, 40)).toBe(false)
  })
})
