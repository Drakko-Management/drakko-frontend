import type { UserRole } from '@/types/api'

export type Trade = 'LANDSCAPER' | 'PLUMBER' | 'ELECTRICIAN' | 'PAINTER' | 'MASON' | 'ROOFER' | 'OTHER'
export const TRADES: Trade[] = ['LANDSCAPER', 'PLUMBER', 'ELECTRICIAN', 'PAINTER', 'MASON', 'ROOFER', 'OTHER']
export const LANGUAGES = ['fr', 'en', 'es', 'it', 'de'] as const

export interface PlatformAdmin {
  id: string
  username: string
  name: string
}

export interface Page<T> {
  total: number
  page: number
  pageSize: number
  items: T[]
}

export interface OrganizationSummary {
  id: string
  name: string
  slug: string
  active: boolean
  trade: Trade
  language: string
  createdAt: string
  usersCount: number
  projectsCount: number
  owner: { firstName: string; lastName: string; email: string | null; username: string } | null
}

export interface OrganizationUser {
  id: string
  username: string
  firstName: string
  lastName: string
  email: string | null
  role: UserRole
  isOwner: boolean
  active: boolean
  twoFactorEnabled: boolean
  createdAt: string
}

export type AuditAction =
  | 'ORGANIZATION_CREATED'
  | 'ORGANIZATION_SUSPENDED'
  | 'ORGANIZATION_REACTIVATED'
  | 'OWNER_RESET_LINK_SENT'
  | 'OWNER_TWO_FACTOR_RESET'
  | 'SUPPORT_SESSION_STARTED'
  | 'PLATFORM_LOGIN'
  | 'PLATFORM_ADMIN_CREATED'
  | 'PLATFORM_ADMIN_RESET'

export const AUDIT_ACTIONS: AuditAction[] = [
  'ORGANIZATION_CREATED',
  'ORGANIZATION_SUSPENDED',
  'ORGANIZATION_REACTIVATED',
  'OWNER_RESET_LINK_SENT',
  'OWNER_TWO_FACTOR_RESET',
  'SUPPORT_SESSION_STARTED',
  'PLATFORM_LOGIN',
  'PLATFORM_ADMIN_CREATED',
  'PLATFORM_ADMIN_RESET',
]

export interface AuditEntry {
  id: string
  action: AuditAction
  source: 'PLATFORM' | 'CLI' | 'SELF_SERVICE'
  actorName: string | null
  organizationId: string | null
  organizationName: string | null
  reason: string | null
  ipAddress: string | null
  createdAt: string
}

export interface OrganizationDetail extends Omit<OrganizationSummary, 'owner' | 'projectsCount' | 'usersCount'> {
  usersCount: number
  clientsCount: number
  projectsCount: number
  users: OrganizationUser[]
  recentActions: AuditEntry[]
}

export interface WaitlistEntry {
  id: string
  email: string
  language: string
  firstName: string | null
  company: string | null
  trade: Trade | null
  teamSize: 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE' | null
  phone: string | null
  pilotInterest: boolean
  confirmedAt: string | null
  createdAt: string
}

export interface CreateOrganizationInput {
  name: string
  slug?: string
  trade?: Trade
  language?: string
  owner: { firstName: string; lastName: string; email: string; username?: string }
  reason?: string
  fromWaitlist?: string
}

export interface CreatedOrganization {
  organization: { id: string; name: string; slug: string }
  owner: { id: string; username: string; email: string }
  welcomeEmailSent: boolean
}

export type LoginStep =
  | { mfaRequired: true; mfaToken: string }
  | { enrolmentRequired: true; enrolmentToken: string }

export interface EnrolmentSetup {
  secret: string
  otpauthUri: string
  qrCode: string
}
