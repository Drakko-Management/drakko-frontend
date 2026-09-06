export type UserRole = 'ADMIN' | 'MEMBER'

export type PermModule = 'chantiers' | 'clients' | 'equipe' | 'prestations'
export type PermAction = 'read' | 'create' | 'update' | 'delete'
export type Permissions = Record<PermModule, PermAction[]>

export interface Role {
  id: string
  name: string
  organizationId: string
  permissions: Permissions
  isDefault: boolean
  _count?: { users: number }
  createdAt: string
  updatedAt: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  navSlots: string[]
  language: string
  logoUrl?: string
  active: boolean
  createdAt: string
  updatedAt: string

  // Identité légale
  tradeName?: string
  siret?: string
  vatNumber?: string
  legalForm?: string
  shareCapital?: string

  // Coordonnées
  phone?: string
  mobile?: string
  email?: string
  website?: string

  // Adresse
  address?: string
  addressLine2?: string
  postalCode?: string
  city?: string
  country?: string

  // Banque
  bankHolder?: string
  iban?: string
  bic?: string

  // Assurance
  insurerName?: string
  insurerPolicy?: string
  insurerExpiry?: string

  // Apparence
  primaryColor?: string

  // Documents
  projectPrefix?: string
  autoProjectReference?: boolean
  quotePrefix?: string
  invoicePrefix?: string
  reportPrefix?: string
  defaultVatRate?: number
  defaultPaymentTerms?: string
  latePaymentPenalties?: string
  documentFooter?: string
}

export type ProjectStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'AWAITING_SIGNATURE'
  | 'AWAITING_RESERVE_LIFT'
  | 'COMPLETED'
  | 'DISPUTED'

export type ReceptionChoice = 'ACCEPTED' | 'ACCEPTED_WITH_RESERVES'
export type SignatureRequestType = 'RECEPTION' | 'RESERVE_LIFT'

export type PhotoType = 'BEFORE' | 'AFTER'

export interface User {
  id: string
  username: string
  email: string | null
  firstName: string
  lastName: string
  role: UserRole
  customRoleId: string | null
  customRole?: Pick<Role, 'id' | 'name' | 'permissions'>
  navSlots: string[]
  active: boolean
  language: string
  theme: string
  accentColor: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  address: string | null
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ProjectAssignment {
  userId: string
  user?: {
    id: string
    firstName: string
    lastName: string
    role: UserRole
    customRole?: { name: string } | null
  }
}

export interface Project {
  id: string
  reference: string
  title: string
  description: string | null
  notes: string | null
  address: string
  projectManager?: string | null
  quoteAmount: string | null
  startDate: string | null
  expectedEndDate: string | null
  actualEndDate: string | null
  status: ProjectStatus
  clientId: string
  createdById: string
  closedById: string | null
  closedAt: string | null
  client?: {
    id: string
    firstName: string
    lastName: string
  }
  assignments?: ProjectAssignment[]
  createdAt: string
  updatedAt: string
}

export interface ProjectDetail extends Omit<Project, 'client' | 'assignments'> {
  client: Client
  assignments: Required<ProjectAssignment>[]
  signatureRequests?: Array<{
    id: string
    refusedAt: string
    refusalComment: string | null
  }>
}

export interface Photo {
  id: string
  projectId: string
  uploadedById: string
  storageKey: string
  type: PhotoType
  order: number
  signedUrl: string | null
  createdAt: string
}

export interface Report {
  id: string
  projectId: string
  comment: string | null
  pdfKey: string | null
  lastSentAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SignatureRequest {
  id: string
  projectId: string
  token: string
  usedAt: string | null
  refusedAt: string | null
  refusalComment: string | null
  createdAt: string
}

export interface PublicProject {
  id: string
  reference: string
  title: string
  description: string | null
  address: string
  status: ProjectStatus
  startDate: string | null
  expectedEndDate: string | null
  actualEndDate: string | null
}

export interface PublicClient {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
}

export interface PublicReport {
  signatureRequestType: SignatureRequestType
  project: PublicProject
  client: PublicClient
  report: {
    comment: string | null
    lines: { snapshotTitle: string; snapshotUnit: string | null; complement: string | null }[]
  } | null
  photos: Photo[]
  pdfUrl: string | null
  reserveNotes: string | null
  alreadySigned: boolean
  alreadyRefused: boolean
  refusalComment: string | null
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
}

export type Trade = 'LANDSCAPER' | 'PLUMBER' | 'ELECTRICIAN' | 'PAINTER' | 'MASON' | 'ROOFER' | 'OTHER'

export interface Service {
  id: string
  title: string
  description: string | null
  unit: string | null
  defaultPrice: number | null
  active: boolean
  order: number
  organizationId: string
  createdAt: string
  updatedAt: string
}

export interface ReportLine {
  id: string
  reportId: string
  snapshotTitle: string
  snapshotDescription: string | null
  snapshotUnit: string | null
  complement: string | null
  order: number
  serviceId: string | null
  createdAt: string
  updatedAt: string
}
