import { useMutation, useQuery } from '@tanstack/react-query'
import { apiErrorFromResponse } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import type { PublicQuote } from '@/types/api'

const API_URL = import.meta.env.VITE_API_URL as string

// La page publique d'un devis (ADR-031) : sans compte, par le jeton du lien. Elle n'utilise pas `apiRequest` : pas de
// jeton de session à joindre, et un 401 ne doit jamais renouveler ni couper une session de l'appli.
export function usePublicQuote(token: string) {
  return useQuery({
    queryKey: ['public-quote', token],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/public/quotes/${token}`)
      if (!res.ok) throw await apiErrorFromResponse(res)
      return (await res.json()) as PublicQuote
    },
    enabled: Boolean(token),
    retry: false,
  })
}

interface AcceptInput {
  signerName: string
  comment?: string
}

async function post(token: string, action: 'accept' | 'reject', body: object): Promise<void> {
  const res = await fetch(`${API_URL}/public/quotes/${token}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await apiErrorFromResponse(res)
}

const refresh = (token: string) => () => queryClient.invalidateQueries({ queryKey: ['public-quote', token] })

export function useAcceptPublicQuote(token: string) {
  return useMutation({
    mutationFn: (input: AcceptInput) =>
      post(token, 'accept', { signerName: input.signerName, agreed: true, ...(input.comment ? { comment: input.comment } : {}) }),
    onSuccess: refresh(token),
  })
}

export function useRejectPublicQuote(token: string) {
  return useMutation({
    mutationFn: (comment: string) => post(token, 'reject', comment ? { comment } : {}),
    onSuccess: refresh(token),
  })
}

/** Le PDF du devis, ouvert dans un nouvel onglet. L'adresse est publique : pas besoin de jeton de session. */
export function publicQuotePdfUrl(token: string): string {
  return `${API_URL}/public/quotes/${token}/pdf`
}
