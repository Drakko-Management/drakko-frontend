import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { apiRequest } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import { useQuotes } from './use-quotes'
import { useCreateProject, useDeleteProject } from './use-projects'

// Le lien entre un chantier et le devis dont il est issu (ADR-032) : la liste des devis à relier, et ce qui la rafraîchit.

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()
  return { ...actual, apiRequest: vi.fn() }
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
  queryClient.clear()
  vi.mocked(apiRequest).mockResolvedValue([])
})

describe('useQuotes — devis à relier à un chantier', () => {
  it('demande les devis acceptés qui n\'ont pas de chantier, pour un client', async () => {
    renderHook(() => useQuotes({ status: 'ACCEPTED', withoutProject: true, clientId: 'c1' }), { wrapper })

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1))
    const url = new URL(String(vi.mocked(apiRequest).mock.calls[0][0]), 'http://api.test')
    expect(url.pathname).toBe('/quotes')
    expect(Object.fromEntries(url.searchParams)).toEqual({ status: 'ACCEPTED', clientId: 'c1', withoutProject: 'true' })
  })

  it('sans le filtre, ne l\'envoie pas', async () => {
    renderHook(() => useQuotes({ status: 'ACCEPTED' }), { wrapper })

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1))
    expect(String(vi.mocked(apiRequest).mock.calls[0][0])).toBe('/quotes?status=ACCEPTED')
  })
})

describe('devis et chantier : ce qui se rafraîchit', () => {
  it('créer un chantier recharge les devis : celui dont il est issu n\'est plus à relier', async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateProject(), { wrapper })

    await result.current.mutateAsync({ title: 'Terrasse', address: '1 rue', clientId: 'c1', quoteId: 'q1' })

    expect(spy).toHaveBeenCalledWith({ queryKey: ['projects'] })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['quotes'] })
    const [path, init] = vi.mocked(apiRequest).mock.calls[0]
    expect(path).toBe('/projects')
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({ quoteId: 'q1' })
  })

  it('supprimer un chantier recharge les devis : celui dont il était issu est de nouveau libre', async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteProject(), { wrapper })

    await result.current.mutateAsync('p1')

    expect(spy).toHaveBeenCalledWith({ queryKey: ['projects'] })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['quotes'] })
  })
})
