import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18n from 'i18next'
import { apiRequest } from '@/lib/api-client'
import { openPdf } from '@/lib/open-pdf'
import type { Organization } from '@/types/api'

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: () => apiRequest<Organization>('/organizations/me'),
    staleTime: 5 * 60 * 1000,
  })
}

/** Ce que l'API reçoit : un champ facultatif vidé part en `null` (il s'efface), absent il ne change pas. */
export type OrganizationUpdate = {
  [K in keyof Omit<Organization, 'id' | 'logoUrl' | 'insuranceAttestationName' | 'insuranceAttestationAt'>]?: Organization[K] | null
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: OrganizationUpdate) =>
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

/** L'attestation d'assurance décennale (ADR-037) : un PDF joint à la fin de chaque devis et de chaque facture. */
export function useUploadInsuranceAttestation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return apiRequest<{ name: string; uploadedAt: string }>('/organizations/me/insurance-attestation', {
        method: 'POST',
        body: form,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organization'] })
    },
  })
}

export function useDeleteInsuranceAttestation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiRequest('/organizations/me/insurance-attestation', { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organization'] })
    },
  })
}

/** Ouvre le fichier tel qu'il est stocké, pour vérifier ce qui part avec les documents */
export const openInsuranceAttestation = (): Promise<void> => openPdf('/organizations/me/insurance-attestation')
