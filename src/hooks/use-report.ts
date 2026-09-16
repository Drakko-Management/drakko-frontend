import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import type { Report, ReportLine } from '@/types/api'

export function useReport(projectId: string) {
  return useQuery({
    queryKey: ['report', projectId],
    queryFn: () => apiRequest<Report | null>(`/projects/${projectId}/report`),
    enabled: Boolean(projectId),
  })
}

export function useReportPdfUrl(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['report-pdf', projectId],
    queryFn: () => apiRequest<{ pdfUrl: string | null }>(`/projects/${projectId}/report/pdf-url`),
    enabled: Boolean(projectId) && enabled,
  })
}

export function useUpdateReport(projectId: string) {
  return useMutation({
    mutationFn: (comment: string) =>
      apiRequest<Report>(`/projects/${projectId}/report`, {
        method: 'PATCH',
        body: JSON.stringify({ comment }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['report', projectId] }),
  })
}

export function useGenerateReport(projectId: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest<void>(`/projects/${projectId}/report/generate`, {
        method: 'POST',
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['report', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['report-pdf', projectId] }),
      ]),
  })
}

export function useSendReport(projectId: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest<{ success: true }>(`/projects/${projectId}/report/send`, {
        method: 'POST',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['report', projectId] }),
  })
}

export function useReserveLiftPdfUrl(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['reserve-lift-pdf', projectId],
    queryFn: () => apiRequest<{ pdfUrl: string | null }>(`/projects/${projectId}/report/reserve-lift/pdf-url`),
    enabled: Boolean(projectId) && enabled,
  })
}

export function useSendReserveLiftReport(projectId: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest<{ success: true }>(`/projects/${projectId}/report/reserve-lift/send`, {
        method: 'POST',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
  })
}

export function useReportLines(projectId: string) {
  return useQuery({
    queryKey: ['report-lines', projectId],
    queryFn: () => apiRequest<ReportLine[]>(`/projects/${projectId}/report/lines`),
    enabled: Boolean(projectId),
  })
}

export function useAddReportLine(projectId: string) {
  return useMutation({
    mutationFn: (data: { serviceId?: string; title?: string; complement?: string }) =>
      apiRequest<ReportLine>(`/projects/${projectId}/report/lines`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['report-lines', projectId] }),
  })
}

export function useUpdateReportLine(projectId: string) {
  return useMutation({
    mutationFn: ({ lineId, data }: { lineId: string; data: { snapshotTitle?: string; complement?: string } }) =>
      apiRequest<ReportLine>(`/projects/${projectId}/report/lines/${lineId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['report-lines', projectId] }),
  })
}

export function useDeleteReportLine(projectId: string) {
  return useMutation({
    mutationFn: (lineId: string) =>
      apiRequest<void>(`/projects/${projectId}/report/lines/${lineId}`, {
        method: 'DELETE',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['report-lines', projectId] }),
  })
}
