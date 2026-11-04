import { useMutation, useQuery } from '@tanstack/react-query'
import { apiBlob, apiRequest } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import type { Quote, QuoteStatus } from '@/types/api'

export interface QuoteFilters {
  status?: QuoteStatus
  clientId?: string
  q?: string
  /** Seulement les devis dont aucun chantier n'est issu (ADR-032) */
  withoutProject?: boolean
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

export type QuoteAction = 'send' | 'reopen' | 'accept' | 'reject'

const refresh = () => queryClient.invalidateQueries({ queryKey: ['quotes'] })

export function useQuotes(filters: QuoteFilters = {}, enabled = true) {
  const qs = new URLSearchParams()
  if (filters.status) qs.set('status', filters.status)
  if (filters.clientId) qs.set('clientId', filters.clientId)
  if (filters.q) qs.set('q', filters.q)
  if (filters.withoutProject) qs.set('withoutProject', 'true')
  const text = qs.toString()
  return useQuery({
    queryKey: ['quotes', 'list', filters],
    queryFn: () => apiRequest<Quote[]>(`/quotes${text ? `?${text}` : ''}`),
    enabled,
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

/**
 * Ouvre le PDF d'un devis dans un nouvel onglet. L'onglet est ouvert avant la requête, pendant le geste de
 * l'utilisateur : après une attente, un navigateur de téléphone bloquerait l'ouverture.
 */
export async function openQuotePdf(id: string): Promise<void> {
  const tab = window.open('', '_blank')
  try {
    const blob = await apiBlob(`/quotes/${id}/pdf`)
    const url = URL.createObjectURL(blob)
    if (tab) tab.location.href = url
    else window.location.assign(url)
    // Le navigateur a eu le temps de charger le fichier ; on libère la mémoire
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    tab?.close()
    throw error
  }
}
