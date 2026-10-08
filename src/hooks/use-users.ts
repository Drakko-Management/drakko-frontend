import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/store/auth.store'
import type { User, UserRole } from '@/types/api'

export function useUsers(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiRequest<User[]>('/users'),
    enabled: options.enabled !== false,
  })
}

interface CreateUserInput {
  username: string
  firstName: string
  lastName: string
  password: string
  role: UserRole
  customRoleId?: string | null
  email?: string
}

export function useCreateUser() {
  return useMutation({
    mutationFn: (dto: CreateUserInput) =>
      apiRequest<User>('/users', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

interface UpdateUserInput {
  username?: string
  firstName?: string
  lastName?: string
  password?: string
  role?: UserRole
  customRoleId?: string | null
  email?: string
  active?: boolean
}

export function useUpdateUser(id: string) {
  return useMutation({
    mutationFn: (dto: UpdateUserInput) =>
      apiRequest<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      // Nom, identifiant ou statut d'un membre : visibles dans les affectations des chantiers
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      if ('role' in variables || 'customRoleId' in variables) {
        queryClient.invalidateQueries({ queryKey: ['roles'] })
      }
      const { userId, accessToken, setAuth, setName } = useAuthStore.getState()
      if (updated.id === userId) {
        if (updated.username && accessToken) setAuth(accessToken, updated.username)
        if (updated.firstName !== undefined || updated.lastName !== undefined) {
          setName(updated.firstName, updated.lastName)
        }
      }
    },
  })
}
