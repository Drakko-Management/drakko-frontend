import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { openPdf } from '@/lib/open-pdf'
import { queryClient } from '@/lib/query-client'
import type { Invoice, InvoiceKind, InvoiceStatus, InvoicesSummary, PaymentMethod } from '@/types/api'
import type { QuoteLineInput } from './use-quotes'

export interface InvoiceFilters {
  status?: InvoiceStatus
  kind?: InvoiceKind
  /** Seulement les factures émises dont l'échéance est passée */
  overdue?: boolean
  clientId?: string
  q?: string
  /** Combien au plus (200 sans ce paramètre) : « Afficher plus » le fait grandir */
  limit?: number
}

/**
 * Le corps d'une création (ADR-033) : à partir de rien (`clientId`), d'un devis accepté (`quoteId` seul : le client, les
 * lignes et le taux viennent du devis, moins les acomptes déjà facturés) ou de l'acompte d'un devis (`quoteId` et `deposit`).
 */
export interface InvoiceInput {
  clientId?: string
  quoteId?: string
  /** Avec `quoteId` : l'acompte du devis, en pourcentage ou en somme hors taxe (l'un des deux) */
  deposit?: { percent: number } | { amount: number }
  title?: string | null
  comment?: string | null
  vatRate?: number
  dueDate?: string | null
  /** Le jour de la prestation, quand il diffère de l'émission (facultatif) */
  serviceDate?: string | null
  lines?: QuoteLineInput[]
}

export interface PayInput {
  /** Jour du paiement (« 2026-11-04 ») ; absent : aujourd'hui */
  paidAt?: string
  method?: PaymentMethod
}

// Une facture touche aussi son devis (le lien « facturé ») : les deux listes se relisent ensemble
const refresh = () =>
  Promise.all([queryClient.invalidateQueries({ queryKey: ['invoices'] }), queryClient.invalidateQueries({ queryKey: ['quotes'] })])

export function useInvoices(filters: InvoiceFilters = {}, enabled = true) {
  const qs = new URLSearchParams()
  if (filters.status) qs.set('status', filters.status)
  if (filters.kind) qs.set('kind', filters.kind)
  if (filters.overdue) qs.set('overdue', 'true')
  if (filters.clientId) qs.set('clientId', filters.clientId)
  if (filters.q) qs.set('q', filters.q)
  if (filters.limit) qs.set('limit', String(filters.limit))
  const text = qs.toString()
  return useQuery({
    queryKey: ['invoices', 'list', filters],
    queryFn: () => apiRequest<Invoice[]>(`/invoices${text ? `?${text}` : ''}`),
    enabled,
    // « Afficher plus » ou une frappe dans la recherche : la liste reste affichée le temps de la suivante
    placeholderData: keepPreviousData,
  })
}

/** Les comptes du tableau de bord (brouillons, à encaisser et son montant, retards) : lus en base, jamais déduits de la liste. */
export function useInvoicesSummary() {
  return useQuery({
    queryKey: ['invoices', 'summary'],
    queryFn: () => apiRequest<InvoicesSummary>('/invoices/summary'),
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', 'one', id],
    queryFn: () => apiRequest<Invoice>(`/invoices/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateInvoice() {
  return useMutation({
    mutationFn: (data: InvoiceInput) => apiRequest<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: refresh,
  })
}

export function useUpdateInvoice() {
  return useMutation({
    mutationFn: ({ id, ...data }: Omit<InvoiceInput, 'quoteId'> & { id: string }) =>
      apiRequest<Invoice>(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: refresh,
  })
}

/** Émettre : le brouillon reçoit son numéro, sa date et son échéance, et ne change plus. */
export function useIssueInvoice() {
  return useMutation({
    mutationFn: (id: string) => apiRequest<Invoice>(`/invoices/${id}/issue`, { method: 'POST' }),
    onSuccess: refresh,
  })
}

export function usePayInvoice() {
  return useMutation({
    mutationFn: ({ id, ...data }: PayInput & { id: string }) =>
      apiRequest<Invoice>(`/invoices/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: refresh,
  })
}

/** Défaire un « payée » saisi par erreur. */
export function useUnpayInvoice() {
  return useMutation({
    mutationFn: (id: string) => apiRequest<Invoice>(`/invoices/${id}/unpay`, { method: 'POST' }),
    onSuccess: refresh,
  })
}

/** Annuler une facture émise : renvoie l'avoir créé. */
export function useCreditNote() {
  return useMutation({
    mutationFn: (id: string) => apiRequest<Invoice>(`/invoices/${id}/credit-note`, { method: 'POST' }),
    onSuccess: refresh,
  })
}

/** Envoie la facture (ou l'avoir) émis au client par email, avec son PDF : ne change rien d'autre que la trace de l'envoi. */
export function useEmailInvoice() {
  return useMutation({
    mutationFn: (id: string) => apiRequest<Invoice>(`/invoices/${id}/email`, { method: 'POST' }),
    onSuccess: refresh,
  })
}

export function useDeleteInvoice() {
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/invoices/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  })
}

/** Ouvre le PDF d'une facture ou d'un avoir dans un nouvel onglet. */
export const openInvoicePdf = (id: string): Promise<void> => openPdf(`/invoices/${id}/pdf`)
