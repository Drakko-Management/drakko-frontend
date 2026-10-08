import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18n from 'i18next'
import { apiRequest } from '@/lib/api-client'
import type { Organization } from '@/types/api'

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: () => apiRequest<Organization>('/organizations/me'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Omit<Organization, 'id' | 'logoUrl'>>) =>
      apiRequest<Organization>('/organizations/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organization'] })
    },
    onError: () => toast.error(i18n.t('settings.org_update_error')),
  })
}

export function useUploadLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return apiRequest<{ logoUrl: string }>('/organizations/me/logo', {
        method: 'POST',
        body: form,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organization'] })
    },
  })
}

export function useDeleteLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiRequest('/organizations/me/logo', { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organization'] })
    },
  })
}
