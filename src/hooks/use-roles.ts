import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import type { Role, Permissions } from '@/types/api'

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => apiRequest<Role[]>('/roles'),
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; permissions: Permissions; isDefault?: boolean }) =>
      apiRequest<Role>('/roles', { method: 'POST', body: JSON.stringify(data) }),
    // Les rôles sont affichés (nom, permissions) dans la liste des utilisateurs
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roles'] })
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; permissions?: Permissions; isDefault?: boolean }) =>
      apiRequest<Role>(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    // Les rôles sont affichés (nom, permissions) dans la liste des utilisateurs
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roles'] })
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/roles/${id}`, { method: 'DELETE' }),
    // Les rôles sont affichés (nom, permissions) dans la liste des utilisateurs
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roles'] })
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
