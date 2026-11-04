export type UserRole = 'ADMIN' | 'MEMBER'

export type PermModule = 'chantiers' | 'clients' | 'equipe' | 'prestations' | 'devis'
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
  /** Propriétaire de l'organisation : toujours administrateur et actif, personne d'autre ne modifie son compte */
  isOwner: boolean
  /** Date d'activation de la double authentification, null si elle n'est pas configurée */
  totpEnabledAt?: string | null
  /** Seulement dans GET /users/me : les modules activables que l'organisation a (ADR-029) */
  modules?: string[]
  /** Seulement dans GET /users/me */
  twoFactorAvailable?: boolean
  twoFactorRequired?: boolean
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
  /** Le devis accepté dont le chantier est issu (ADR-032) */
  quoteId?: string | null
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
  /** Le devis dont le chantier est issu, s'il y en a un (ADR-032) */
  quote?: { id: string; reference: string } | null
  assignments: Required<ProjectAssignment>[]
  signatureRequests?: Array<{
    id: string
    refusedAt: string
    refusalComment: string | null
  }>
  signature?: {
    reserveNotes: string | null
    signaturePlace: string | null
    receptionChoice: ReceptionChoice
    signedAt: string
  } | null
  reserveLiftSignature?: {
    signedAt: string
    signerName: string
    pdfSentAt: string | null
  } | null
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

/** Réponse de la connexion d'un compte qui a la double authentification : le mot de passe ne suffit pas. */
export interface MfaChallenge {
  mfaRequired: true
  mfaToken: string
}

/** Configuration de la double authentification : le secret n'est montré que cette fois, pour le scan. */
export interface TwoFactorSetup {
  secret: string
  otpauthUri: string
  qrCode: string
}

export interface TwoFactorStatus {
  available: boolean
  enabled: boolean
  required: boolean
  codesLeft: number
}

export type Trade = 'LANDSCAPER' | 'PLUMBER' | 'ELECTRICIAN' | 'PAINTER' | 'MASON' | 'ROOFER' | 'OTHER'

export interface Service {
  id: string
  title: string
  description: string | null
  unit: string | null
  /** Chaîne décimale (« 12.5 ») : l'API sérialise les Decimal en chaînes */
  defaultPrice: string | null
  active: boolean
  order: number
  organizationId: string
  createdAt: string
  updatedAt: string
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'

/** Une ligne de devis : instantané de la prestation (titre, description, unité), prix et quantité en chaînes décimales. */
export interface QuoteLine {
  id: string
  quoteId: string
  serviceId: string | null
  snapshotTitle: string
  snapshotDescription: string | null
  snapshotUnit: string | null
  quantity: string
  unitPrice: string
  order: number
  /** Total hors taxe de la ligne, calculé par l'API */
  total: string
}

export interface Quote {
  id: string
  organizationId: string
  clientId: string
  /** « DEV-2026-0001 » */
  reference: string
  status: QuoteStatus
  title: string | null
  comment: string | null
  /** Taux de TVA en pourcentage, chaîne décimale */
  vatRate: string
  validUntil: string | null
  sentAt: string | null
  decidedAt: string | null
  createdAt: string
  updatedAt: string
  client: Pick<Client, 'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'address'>
  lines: QuoteLine[]
  /** Calculés par l'API depuis les lignes : jamais stockés */
  subtotal: string
  vatAmount: string
  total: string
  /** Le dernier lien envoyé au client, ou null si le devis n'a jamais été envoyé par Drakko */
  acceptance: QuoteAcceptance | null
  /** Le chantier créé depuis ce devis, s'il existe (ADR-032) : un devis ne donne qu'un chantier */
  project: { id: string; reference: string; title: string; status: ProjectStatus } | null
}

/** Où en est le lien de réponse en ligne d'un devis (ADR-031) */
export type QuoteLinkState = 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN'

export interface QuoteAcceptance {
  state: QuoteLinkState
  sentTo: string | null
  sentAt: string | null
  expiresAt: string
  /** Quand le client a répondu */
  respondedAt: string | null
  /** Le nom que le client a tapé en acceptant */
  signerName: string | null
  comment: string | null
  /** L'adresse du lien à copier : seulement sur la fiche, et seulement tant qu'il est ouvert */
  url: string | null
}

/** Ce que la page publique d'un devis reçoit : rien de plus que ce que le client doit voir (ADR-031) */
export interface PublicQuote {
  state: QuoteLinkState
  /** Langue de l'entreprise, celle de l'email et du PDF */
  language: string
  organization: { name: string; phone: string | null; email: string | null }
  /** Absent d'un lien périmé ou repris par l'équipe */
  quote: {
    reference: string
    title: string | null
    comment: string | null
    validUntil: string | null
    vatRate: string
    clientName: string
    lines: {
      title: string
      description: string | null
      unit: string | null
      quantity: string
      unitPrice: string
      total: string
    }[]
    subtotal: string
    vatAmount: string
    total: string
  } | null
  answer: { respondedAt: string; signerName: string | null; comment: string | null } | null
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
