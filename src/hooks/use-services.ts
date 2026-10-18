import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import type { Service } from '@/types/api'

export function useServices(activeOnly?: boolean) {
  const qs = activeOnly ? '?active=true' : ''
  return useQuery({
    queryKey: ['services', activeOnly ?? 'all'],
    queryFn: () => apiRequest<Service[]>(`/services${qs}`),
  })
}

export function useCreateService() {
  return useMutation({
    mutationFn: (data: { title: string; description?: string; unit?: string }) =>
      apiRequest<Service>('/services', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useUpdateService() {
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string; unit?: string }) =>
      apiRequest<Service>(`/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useDeactivateService() {
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<Service>(`/services/${id}/deactivate`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useActivateService() {
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<Service>(`/services/${id}/activate`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useDeleteService() {
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useSeedServices() {
  return useMutation({
    mutationFn: () =>
      apiRequest<{ seeded: number }>('/organizations/me/seed-services', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })
}

export interface DeleteServicesResult {
  deleted: number
  // Prestations déjà utilisées dans un rapport : désactivées plutôt qu'effacées
  deactivated: number
}

export function useDeleteServices() {
  return useMutation({
    mutationFn: (serviceIds: string[]) =>
      apiRequest<DeleteServicesResult>('/services/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ serviceIds }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useDeleteAllServices() {
  return useMutation({
    mutationFn: () => apiRequest<DeleteServicesResult>('/services', { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })
}
