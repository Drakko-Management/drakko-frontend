import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiRequest } from '@/lib/api-client'
import { downloadFile } from '@/lib/download-file'
import { downloadLedgerArchive, verifyLedger } from './use-ledger'

vi.mock('@/lib/api-client', () => ({ apiRequest: vi.fn() }))
vi.mock('@/lib/download-file', () => ({ downloadFile: vi.fn().mockResolvedValue(undefined) }))

beforeEach(() => vi.clearAllMocks())

describe('use-ledger', () => {
  it('le contrôle est une lecture du journal', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ ok: true })

    await expect(verifyLedger()).resolves.toEqual({ ok: true })

    expect(apiRequest).toHaveBeenCalledWith('/ledger/verify')
  })

  it('l\'archive est un POST de l\'année, enregistré sous un nom qui la dit', async () => {
    await downloadLedgerArchive(2026)

    expect(downloadFile).toHaveBeenCalledWith('/ledger/archives', 'archive-2026.json', {
      method: 'POST',
      body: JSON.stringify({ year: 2026 }),
    })
  })
})
