import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { apiRequest } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import { useQuoteAction, useQuotes, useQuotesSummary } from './use-quotes'

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()
  return { ...actual, apiRequest: vi.fn(), apiBlob: vi.fn() }
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
  queryClient.clear()
  vi.mocked(apiRequest).mockResolvedValue([])
})

const lastPath = () => {
  const calls = vi.mocked(apiRequest).mock.calls
  return calls[calls.length - 1] as [string, RequestInit | undefined]
}

describe('useQuotes', () => {
  it('sans filtre, la liste entière', async () => {
    renderHook(() => useQuotes(), { wrapper })

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1))
    expect(lastPath()[0]).toBe('/quotes')
  })

  it('envoie chaque filtre, et le nombre demandé sous « limit »', async () => {
    renderHook(() => useQuotes({ status: 'SENT', clientId: 'c1', q: 'haie', withoutProject: true, limit: 100 }), { wrapper })

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1))
    const url = new URL(lastPath()[0], 'http://api.test')
    expect(url.pathname).toBe('/quotes')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      status: 'SENT',
      clientId: 'c1',
      q: 'haie',
      withoutProject: 'true',
      limit: '100',
    })
  })

  it('« Afficher plus » garde la liste affichée le temps de la suivante (pas de retour au squelette)', async () => {
    let release: (value: unknown[]) => void = () => undefined
    vi.mocked(apiRequest)
      .mockResolvedValueOnce([{ id: 'q1' }])
      .mockImplementationOnce(() => new Promise((resolve) => { release = resolve as typeof release }))
    const { result, rerender } = renderHook(({ limit }) => useQuotes({ limit }), { wrapper, initialProps: { limit: 50 } })
    await waitFor(() => expect(result.current.data).toHaveLength(1))

    rerender({ limit: 100 })

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.isLoading).toBe(false)
    release([{ id: 'q1' }, { id: 'q2' }])
    await waitFor(() => expect(result.current.data).toHaveLength(2))
  })

  it('ne demande rien quand il est désactivé', () => {
    renderHook(() => useQuotes({}, false), { wrapper })

    expect(apiRequest).not.toHaveBeenCalled()
  })
})

describe('useQuotesSummary', () => {
  it('lit les comptes du tableau de bord à /quotes/summary', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ drafts: 1, sent: 2, accepted: 3, recent: [] })

    const { result } = renderHook(() => useQuotesSummary(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual({ drafts: 1, sent: 2, accepted: 3, recent: [] }))
    expect(lastPath()[0]).toBe('/quotes/summary')
  })

  it('se relit quand un devis change (la clé commence par « quotes »)', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ drafts: 1, sent: 0, accepted: 0, recent: [] })
    const { result } = renderHook(() => useQuotesSummary(), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    const action = renderHook(() => useQuoteAction(), { wrapper })
    vi.mocked(apiRequest).mockClear()

    await action.result.current.mutateAsync({ id: 'q1', action: 'accept' })

    await waitFor(() => expect(vi.mocked(apiRequest).mock.calls.some(([path]) => path === '/quotes/summary')).toBe(true))
  })
})

describe('useQuoteAction', () => {
  it.each(['send', 'reopen', 'accept', 'reject', 'undecide'] as const)('« %s » appelle POST /quotes/:id/%s', async (name) => {
    vi.mocked(apiRequest).mockResolvedValue({})
    const { result } = renderHook(() => useQuoteAction(), { wrapper })

    await result.current.mutateAsync({ id: 'q1', action: name })

    expect(lastPath()).toEqual([`/quotes/q1/${name}`, { method: 'POST' }])
  })
})
