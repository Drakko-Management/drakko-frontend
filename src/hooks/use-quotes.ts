import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { openPdf } from '@/lib/open-pdf'
import { queryClient } from '@/lib/query-client'
import type { Quote, QuoteStatus, QuotesSummary } from '@/types/api'

export interface QuoteFilters {
  status?: QuoteStatus
  clientId?: string
  q?: string
  /** Seulement les devis dont aucun chantier n'est issu (ADR-032) */
  withoutProject?: boolean
  /** Combien au plus (200 sans ce paramètre) : « Afficher plus » le fait grandir */
  limit?: number
}

/** Une ligne telle que l'API la reçoit : avec `serviceId` la prestation est recopiée, ce qui est envoyé la remplace. */
export interface QuoteLineInput {
  serviceId?: string
  title?: string
  description?: string
  unit?: string
  quantity?: number
  unitPrice?: number
}

export interface QuoteInput {
  clientId: string
  title?: string | null
  comment?: string | null
  vatRate?: number
  validUntil?: string | null
  lines?: QuoteLineInput[]
}

/** `undecide` défait un « accepté » ou un « refusé » donné par erreur : le devis redevient « envoyé » */
export type QuoteAction = 'send' | 'reopen' | 'accept' | 'reject' | 'undecide'

const refresh = () => queryClient.invalidateQueries({ queryKey: ['quotes'] })

export function useQuotes(filters: QuoteFilters = {}, enabled = true) {
  const qs = new URLSearchParams()
  if (filters.status) qs.set('status', filters.status)
  if (filters.clientId) qs.set('clientId', filters.clientId)
  if (filters.q) qs.set('q', filters.q)
  if (filters.withoutProject) qs.set('withoutProject', 'true')
  if (filters.limit) qs.set('limit', String(filters.limit))
  const text = qs.toString()
  return useQuery({
    queryKey: ['quotes', 'list', filters],
    queryFn: () => apiRequest<Quote[]>(`/quotes${text ? `?${text}` : ''}`),
    enabled,
    // « Afficher plus » ou une frappe dans la recherche : la liste reste affichée le temps de la suivante
    placeholderData: keepPreviousData,
  })
}

/** Les comptes du tableau de bord : lus en base, jamais déduits de la liste. */
export function useQuotesSummary() {
  return useQuery({
    queryKey: ['quotes', 'summary'],
    queryFn: () => apiRequest<QuotesSummary>('/quotes/summary'),
  })
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quotes', 'one', id],
    queryFn: () => apiRequest<Quote>(`/quotes/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateQuote() {
  return useMutation({
    mutationFn: (data: QuoteInput) => apiRequest<Quote>('/quotes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: refresh,
  })
}

export function useUpdateQuote() {
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<QuoteInput> & { id: string }) =>
      apiRequest<Quote>(`/quotes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: refresh,
  })
}

export function useQuoteAction() {
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: QuoteAction }) =>
      apiRequest<Quote>(`/quotes/${id}/${action}`, { method: 'POST' }),
    onSuccess: refresh,
  })
}

/** Envoie le devis au client par email, avec son PDF et le lien pour répondre en ligne (ADR-031). */
export function useEmailQuote() {
  return useMutation({
    mutationFn: (id: string) => apiRequest<Quote>(`/quotes/${id}/email`, { method: 'POST' }),
    onSuccess: refresh,
  })
}

export function useDeleteQuote() {
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/quotes/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  })
}

/** Ouvre le PDF d'un devis dans un nouvel onglet. */
export const openQuotePdf = (id: string): Promise<void> => openPdf(`/quotes/${id}/pdf`)
