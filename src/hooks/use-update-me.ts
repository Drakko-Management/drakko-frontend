import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import type { User } from '@/types/api'
import type { DefaultFilters } from '@/lib/default-filters'

interface UpdateMePayload {
  language?: string
  theme?: string
  accentColor?: string
  handedness?: string
  navSlots?: string[]
  defaultFilters?: Partial<DefaultFilters>
}

export function useUpdateMe() {
  return useMutation({
    mutationFn: (data: UpdateMePayload) =>
      apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  })
}

/** Le compte connecté, tel que le renvoie GET /users/me (adresse email comprise). */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiRequest<User>('/users/me'),
  })
}
