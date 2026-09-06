import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import type {
  Paginated,
  Project,
  ProjectDetail,
  ProjectStatus,
} from '@/types/api'

export type ProjectSort = 'recent' | 'start' | 'updated' | 'title'

interface ProjectsParams {
  status?: ProjectStatus
  clientId?: string
  page?: number
  limit?: number
  sort?: ProjectSort
}

export function useProjects(params: ProjectsParams = {}) {
  const { status, clientId, page = 1, limit = 20, sort } = params
  const qs = new URLSearchParams()
  if (status) qs.set('status', status)
  if (clientId) qs.set('clientId', clientId)
  if (sort && sort !== 'recent') qs.set('sort', sort)
  qs.set('page', String(page))
  qs.set('limit', String(limit))

  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => apiRequest<Paginated<Project>>(`/projects?${qs.toString()}`),
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => apiRequest<ProjectDetail>(`/projects/${id}`),
    enabled: Boolean(id),
  })
}

interface CreateProjectInput {
  reference?: string
  title: string
  address: string
  clientId: string
  description?: string
  notes?: string
  projectManager?: string
  quoteAmount?: number
  startDate?: string
  expectedEndDate?: string
}

export function useCreateProject() {
  return useMutation({
    mutationFn: (dto: CreateProjectInput) =>
      apiRequest<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

interface UpdateProjectInput {
  title?: string
  address?: string
  description?: string
  notes?: string
  projectManager?: string
  quoteAmount?: number
  startDate?: string
  expectedEndDate?: string
  actualEndDate?: string
}

export function useUpdateProject(id: string) {
  return useMutation({
    mutationFn: (dto: UpdateProjectInput) =>
      apiRequest<Project>(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProjectStatus(id: string) {
  return useMutation({
    mutationFn: (status: ProjectStatus) =>
      apiRequest<Project>(`/projects/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useAssignUsers(projectId: string) {
  return useMutation({
    mutationFn: (userIds: string[]) =>
      apiRequest(`/projects/${projectId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({ userIds }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] }),
  })
}

export function useUnassignUser(projectId: string) {
  return useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/projects/${projectId}/assignments/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] }),
  })
}

interface ExpressProjectInput {
  clientFirstName: string
  clientLastName: string
  clientEmail: string
  title?: string
  description?: string
  address?: string
}

export function useCreateExpressProject() {
  return useMutation({
    mutationFn: (dto: ExpressProjectInput) =>
      apiRequest<Project>('/projects/express', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useNextProjectReference(enabled: boolean) {
  return useQuery({
    queryKey: ['projects', 'next-reference'],
    queryFn: () => apiRequest<{ reference: string }>('/projects/next-reference').then((r) => r.reference),
    enabled,
    staleTime: 0,
  })
}
