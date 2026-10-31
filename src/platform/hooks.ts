import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { platformRequest } from './api'
import type { SupportGrant } from '@/lib/support-session'
import type {
  AuditEntry,
  CreatedOrganization,
  CreateOrganizationInput,
  OrganizationDetail,
  OrganizationSummary,
  Page,
  WaitlistEntry,
} from './types'

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const PAGE_SIZE = 25

export function useOrganizations(q: string, page: number) {
  return useQuery({
    queryKey: ['platform', 'organizations', q, page],
    queryFn: () => platformRequest<Page<OrganizationSummary>>(`/platform/organizations${qs({ q, page, pageSize: PAGE_SIZE })}`),
  })
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: ['platform', 'organization', id],
    queryFn: () => platformRequest<OrganizationDetail>(`/platform/organizations/${id}`),
  })
}

export function useWaitlist(page: number) {
  return useQuery({
    queryKey: ['platform', 'waitlist', page],
    queryFn: () => platformRequest<Page<WaitlistEntry>>(`/platform/waitlist${qs({ page, pageSize: PAGE_SIZE })}`),
  })
}

export function useWaitlistEntry(id: string | null) {
  return useQuery({
    queryKey: ['platform', 'waitlist-entry', id],
    queryFn: () => platformRequest<WaitlistEntry>(`/platform/waitlist/${id}`),
    enabled: id !== null,
  })
}

export function useAudit(page: number) {
  return useQuery({
    queryKey: ['platform', 'audit', page],
    queryFn: () => platformRequest<Page<AuditEntry>>(`/platform/audit${qs({ page, pageSize: PAGE_SIZE })}`),
  })
}

export function useCreateOrganization() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOrganizationInput) =>
      platformRequest<CreatedOrganization>('/platform/organizations', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['platform', 'organizations'] }),
  })
}

// Les gestes qui touchent un client portent tous un motif, écrit au journal d'audit
export function useOrganizationAction(id: string) {
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries({ queryKey: ['platform'] })
  const post = <T>(action: string, body: object) =>
    platformRequest<T>(`/platform/organizations/${id}/${action}`, { method: 'POST', body: JSON.stringify(body) })
  return {
    suspend: useMutation({ mutationFn: (reason: string) => post('suspend', { reason }), onSuccess: refresh }),
    reactivate: useMutation({ mutationFn: (reason: string) => post('reactivate', { reason }), onSuccess: refresh }),
    sendResetLink: useMutation({
      mutationFn: (input: { reason: string; email?: string }) => post<{ sent: true; emailMasked: string }>('owner/reset-link', input),
      onSuccess: refresh,
    }),
    resetTwoFactor: useMutation({ mutationFn: (reason: string) => post('owner/reset-two-factor', { reason }), onSuccess: refresh }),
    startSupport: useMutation({
      mutationFn: (input: { reason: string; viewAs?: string }) => post<SupportGrant>('support-session', input),
      onSuccess: refresh,
    }),
  }
}
