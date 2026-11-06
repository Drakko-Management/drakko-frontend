import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { downloadFile } from './download-file'

const mockBlob = vi.fn()
vi.mock('@/lib/api-client', () => ({ apiBlob: (path: string) => mockBlob(path) }))

describe('downloadFile', () => {
  const create = vi.fn()
  const revoke = vi.fn()
  let clicked: { href: string; download: string } | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    clicked = null
    create.mockReturnValue('blob:fichier')
    URL.createObjectURL = create
    URL.revokeObjectURL = revoke
    mockBlob.mockResolvedValue(new Blob(['a;b']))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked = { href: this.href, download: this.download }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('demande le fichier à l\'API avec la session, puis l\'enregistre sous le nom donné', async () => {
    await downloadFile('/invoices/export?from=2026-01-01&to=2026-12-31', 'factures-2026.csv')

    expect(mockBlob).toHaveBeenCalledWith('/invoices/export?from=2026-01-01&to=2026-12-31')
    expect(clicked).toEqual({ href: 'blob:fichier', download: 'factures-2026.csv' })
  })

  it('ne laisse pas de lien dans la page, et libère la mémoire un peu plus tard', async () => {
    await downloadFile('/x', 'x.csv')

    expect(document.querySelector('a[download]')).toBeNull()
    expect(revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60_000)
    expect(revoke).toHaveBeenCalledWith('blob:fichier')
  })

  it('une erreur de l\'API remonte, sans rien enregistrer', async () => {
    mockBlob.mockRejectedValue(new Error('refusé'))

    await expect(downloadFile('/x', 'x.csv')).rejects.toThrow('refusé')
    expect(clicked).toBeNull()
  })
})
