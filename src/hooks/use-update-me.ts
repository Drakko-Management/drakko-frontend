import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import type { User } from '@/types/api'

interface UpdateMePayload {
  language?: string
  theme?: string
  accentColor?: string
  handedness?: string
  navSlots?: string[]
  email?: string
}

export function useUpdateMe() {
  return useMutation({
    mutationFn: (data: UpdateMePayload) =>
      apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}

/** Le compte connecté, tel que le renvoie GET /users/me (adresse email comprise). */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiRequest<User>('/users/me'),
  })
}
