import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { queryClient } from '@/lib/query-client'
import { useAcceptPublicQuote, usePublicQuote, useRejectPublicQuote, publicQuotePdfUrl } from './use-public-quote'
import { publicQuote } from '@/test/quote-fixtures'

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  queryClient.clear()
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

const ok = (body: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(body) })
const failure = (status: number, code: string) => ({ ok: false, status, json: () => Promise.resolve({ message: 'detail', code }) })

describe('use-public-quote', () => {
  it('lit le devis par son jeton, sans en-tête d\'autorisation', async () => {
    fetchMock.mockResolvedValue(ok(publicQuote()))

    const { result } = renderHook(() => usePublicQuote('tok-123'), { wrapper })

    await waitFor(() => expect(result.current.data?.state).toBe('OPEN'))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/public\/quotes\/tok-123$/)
    expect(init).toBeUndefined()
  })

  it('un jeton vide ne lance aucune requête', () => {
    renderHook(() => usePublicQuote(''), { wrapper })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('un lien inconnu donne une erreur, sans nouvel essai', async () => {
    fetchMock.mockResolvedValue(failure(404, 'QUOTE_LINK_NOT_FOUND'))

    const { result } = renderHook(() => usePublicQuote('nope'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('accepter envoie le nom, la case cochée et le message éventuel', async () => {
    fetchMock.mockResolvedValue(ok({ success: true }))
    const { result } = renderHook(() => useAcceptPublicQuote('tok-123'), { wrapper })

    await result.current.mutateAsync({ signerName: 'Léa Martin', comment: 'Pour mars' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/public\/quotes\/tok-123\/accept$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ signerName: 'Léa Martin', agreed: true, comment: 'Pour mars' })
  })

  it('accepter sans message n\'envoie pas de champ vide', async () => {
    fetchMock.mockResolvedValue(ok({ success: true }))
    const { result } = renderHook(() => useAcceptPublicQuote('tok-123'), { wrapper })

    await result.current.mutateAsync({ signerName: 'Léa Martin' })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ signerName: 'Léa Martin', agreed: true })
  })

  it('refuser envoie le motif, ou rien', async () => {
    fetchMock.mockResolvedValue(ok({ success: true }))
    const { result } = renderHook(() => useRejectPublicQuote('tok-123'), { wrapper })

    await result.current.mutateAsync('Trop cher')
    await result.current.mutateAsync('')

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/public\/quotes\/tok-123\/reject$/)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ comment: 'Trop cher' })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({})
  })

  it('une réponse refusée par le serveur remonte avec son code', async () => {
    fetchMock.mockResolvedValue(failure(409, 'QUOTE_LINK_CLOSED'))
    const { result } = renderHook(() => useAcceptPublicQuote('tok-123'), { wrapper })

    await expect(result.current.mutateAsync({ signerName: 'Léa Martin' })).rejects.toMatchObject({ status: 409, code: 'QUOTE_LINK_CLOSED' })
  })

  it('l\'adresse du PDF porte le jeton', () => {
    expect(publicQuotePdfUrl('tok-123')).toMatch(/\/public\/quotes\/tok-123\/pdf$/)
  })
})
