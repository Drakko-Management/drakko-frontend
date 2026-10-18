import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import type { Client, Paginated } from '@/types/api'

export type ClientSort = 'name' | 'recent' | 'updated'

interface ClientsParams {
  search?: string
  active?: boolean
  page?: number
  limit?: number
  sort?: ClientSort
}

export function useClients(params: ClientsParams = {}) {
  const { search, active, page = 1, limit = 20, sort } = params
  const qs = new URLSearchParams()
  if (search) qs.set('search', search)
  if (active !== undefined) qs.set('active', String(active))
  if (sort && sort !== 'name') qs.set('sort', sort)
  qs.set('page', String(page))
  qs.set('limit', String(limit))

  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => apiRequest<Paginated<Client>>(`/clients?${qs.toString()}`),
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => apiRequest<Client>(`/clients/${id}`),
    enabled: Boolean(id),
  })
}

interface CreateClientInput {
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  notes?: string
}

export function useCreateClient() {
  return useMutation({
    mutationFn: (dto: CreateClientInput) =>
      apiRequest<Client>('/clients', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })
}

interface UpdateClientInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  active?: boolean
}

export function useUpdateClient(id: string) {
  return useMutation({
    mutationFn: (dto: UpdateClientInput) =>
      apiRequest<Client>(`/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', id] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeactivateClient(id: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest<Client>(`/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: false }),
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]),
  })
}

const invalidateClients = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['clients'] }),
    queryClient.invalidateQueries({ queryKey: ['projects'] }),
  ])

// Depuis la liste : l'identifiant se donne à l'appel, pas à la création du hook
export function useSetClientActive() {
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest<Client>(`/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      }),
    onSuccess: invalidateClients,
  })
}

export interface DeleteResult {
  // Un client (ou un membre) qui laisse des traces n'est pas effacé : il est désactivé
  result: 'deleted' | 'deactivated'
}

export function useDeleteClient() {
  return useMutation({
    mutationFn: (id: string) => apiRequest<DeleteResult>(`/clients/${id}`, { method: 'DELETE' }),
    onSuccess: invalidateClients,
  })
}
