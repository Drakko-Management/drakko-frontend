import type { PermAction, PermModule } from '@/types/api'

export type TutorialId = 'create_client' | 'create_project' | 'express_project' | 'create_role' | 'send_signature' | 'sign_page'

/** Page (ou module) à laquelle un tutoriel est rattaché : sert au bouton « ? » de la page. */
export type TutorialScope = 'clients' | 'projects' | 'team' | 'sign'

/**
 * - `next`   : l'utilisateur appuie sur « Suivant » dans la bulle.
 * - `click`  : l'utilisateur appuie sur l'élément en surbrillance sans changer de page
 *              (ex. un onglet) ; le tutoriel avance au clic.
 * - `action` : l'utilisateur effectue lui-même l'action sur l'élément en surbrillance ;
 *              le tutoriel avance quand la route change (étape suivante sur une autre page).
 */
export type StepAdvance = 'next' | 'action' | 'click'

export interface TutorialStepDef {
  /** Suffixe des clés i18n : `tutorials.<tutorial>.<id>_title` / `_body` */
  id: string
  /** Pathname sur lequel l'étape est affichée */
  route: RegExp
  /** Valeur de l'attribut `data-tutorial` de l'élément ciblé (`center` = pas de cible) */
  target: string | 'center'
  advance: StepAdvance
  /** Empêche de cliquer sur l'élément en surbrillance (étape purement explicative) */
  blockInteraction?: boolean
  /** Si la cible n'existe pas (selon l'état de la page), l'étape est sautée au lieu d'arrêter le tutoriel */
  optional?: boolean
  /** Zone où l'utilisateur doit agir (saisir, choisir, signer) : contour coloré + repère dans la bulle */
  interactive?: boolean
  /** « Suivant » reste bloqué tant que les champs obligatoires de la zone ne sont pas remplis */
  gate?: boolean
  /** Capture affichée dans la bulle : `public/tutorials/<image>-<langue>.png` */
  image?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Marge de la zone cliquable autour de la cible (ex. pour inclure une liste déroulante) */
  spotlightPadding?: { top?: number; right?: number; bottom?: number; left?: number }
}

export interface TutorialDef {
  id: TutorialId
  scope: TutorialScope
  /** Page de départ du tutoriel (`null` : on reste sur la page courante) */
  startRoute: string | null
  /**
   * `public` : tutoriel d'une page accessible sans connexion (ex. signature du client).
   * Il n'a pas de permission et n'est pas listé dans Paramètres → Tutoriels.
   */
  audience?: 'staff' | 'public'
  permission?: { module: PermModule; action: PermAction }
  /** Réservé aux administrateurs (en plus de la permission) */
  adminOnly?: boolean
  steps: TutorialStepDef[]
  /**
   * Le tutoriel s'appuie sur une donnée existante (ex. un chantier en attente de signature) :
   * le provider la cherche au démarrage et ouvre la page correspondante.
   */
  needs?: 'awaiting_signature_project'
  /** Étapes explicatives utilisées quand la donnée requise n'existe pas */
  fallbackSteps?: TutorialStepDef[]
}

export type TutorialVariant = 'main' | 'fallback'

export function getSteps(def: TutorialDef, variant: TutorialVariant): TutorialStepDef[] {
  return variant === 'fallback' && def.fallbackSteps ? def.fallbackSteps : def.steps
}

const SIGN_PAGE = /^\/sign\/[^/]+$/
const PROJECT_DETAIL = /^\/chantiers\/(?!nouveau$|express$)[^/]+$/

export const TUTORIALS: TutorialDef[] = [
  {
    id: 'create_client',
    scope: 'clients',
    startRoute: '/clients',
    permission: { module: 'clients', action: 'create' },
    steps: [
      { id: 'new', route: /^\/clients$/, target: 'clients-new', advance: 'action' },
      { id: 'name', route: /^\/clients\/nouveau$/, target: 'client-name', advance: 'next', gate: true },
      { id: 'email', route: /^\/clients\/nouveau$/, target: 'client-email', advance: 'next', gate: true },
      { id: 'phone', route: /^\/clients\/nouveau$/, target: 'client-phone', advance: 'next' },
      { id: 'address', route: /^\/clients\/nouveau$/, target: 'client-address', advance: 'next', gate: true },
      { id: 'notes', route: /^\/clients\/nouveau$/, target: 'client-notes', advance: 'next' },
      { id: 'submit', route: /^\/clients\/nouveau$/, target: 'client-submit', advance: 'action', placement: 'top' },
      { id: 'done', route: /^\/clients\/(?!nouveau$)[^/]+$/, target: 'center', advance: 'next' },
    ],
  },
  {
    id: 'create_project',
    scope: 'projects',
    startRoute: '/chantiers',
    permission: { module: 'chantiers', action: 'create' },
    steps: [
      { id: 'new', route: /^\/chantiers$/, target: 'projects-new', advance: 'action' },
      { id: 'title', route: /^\/chantiers\/nouveau$/, target: 'project-title', advance: 'next', gate: true },
      // La liste déroulante des clients dépasse de la cible : on étend la zone cliquable vers le bas
      { id: 'client', route: /^\/chantiers\/nouveau$/, target: 'project-client', advance: 'next', placement: 'top', spotlightPadding: { bottom: 340 }, gate: true },
      { id: 'address', route: /^\/chantiers\/nouveau$/, target: 'project-address', advance: 'next', gate: true },
      { id: 'planning', route: /^\/chantiers\/nouveau$/, target: 'project-planning', advance: 'next' },
      { id: 'submit', route: /^\/chantiers\/nouveau$/, target: 'project-submit', advance: 'action', placement: 'top' },
      { id: 'done', route: /^\/chantiers\/(?!nouveau$|express$)[^/]+$/, target: 'center', advance: 'next' },
    ],
  },
  {
    id: 'express_project',
    scope: 'projects',
    startRoute: '/chantiers',
    permission: { module: 'chantiers', action: 'create' },
    steps: [
      { id: 'new', route: /^\/chantiers$/, target: 'projects-express', advance: 'action' },
      { id: 'client', route: /^\/chantiers\/express$/, target: 'express-client', advance: 'next', gate: true },
      { id: 'project', route: /^\/chantiers\/express$/, target: 'express-project', advance: 'next' },
      { id: 'submit', route: /^\/chantiers\/express$/, target: 'express-submit', advance: 'action', placement: 'top' },
      { id: 'done', route: /^\/chantiers\/[^/]+\/rapport$/, target: 'center', advance: 'next' },
    ],
  },
  {
    id: 'send_signature',
    scope: 'projects',
    startRoute: '/chantiers',
    permission: { module: 'chantiers', action: 'update' },
    needs: 'awaiting_signature_project',
    steps: [
      { id: 'choose', route: PROJECT_DETAIL, target: 'project-sig-options', advance: 'next', blockInteraction: true },
      { id: 'onsite', route: PROJECT_DETAIL, target: 'project-sig-onsite', advance: 'next', blockInteraction: true },
      { id: 'remote', route: PROJECT_DETAIL, target: 'project-sig-remote', advance: 'next', blockInteraction: true },
      { id: 'done', route: PROJECT_DETAIL, target: 'center', advance: 'next' },
    ],
    // Aucun chantier en attente de signature : on explique le principe sans cible
    fallbackSteps: [
      { id: 'none_1', route: /^\/chantiers$/, target: 'center', advance: 'next', image: 'signature-options' },
      { id: 'none_2', route: /^\/chantiers$/, target: 'center', advance: 'next' },
      { id: 'none_3', route: /^\/chantiers$/, target: 'center', advance: 'next' },
    ],
  },
  {
    id: 'sign_page',
    scope: 'sign',
    audience: 'public',
    startRoute: null,
    // Les éléments dépendent du choix de l'utilisateur (ex. « refuser » masque la signature) : tout est optionnel
    steps: [
      { id: 'report', route: SIGN_PAGE, target: 'sign-report', advance: 'next', optional: true },
      { id: 'accepted', route: SIGN_PAGE, target: 'sign-choice-accepted', advance: 'next', optional: true, interactive: true },
      { id: 'reserves', route: SIGN_PAGE, target: 'sign-choice-accepted_with_reserves', advance: 'next', optional: true, interactive: true },
      { id: 'refused', route: SIGN_PAGE, target: 'sign-choice-refused', advance: 'next', optional: true, interactive: true },
      { id: 'identity', route: SIGN_PAGE, target: 'sign-identity', advance: 'next', optional: true, interactive: true, gate: true },
      { id: 'signature', route: SIGN_PAGE, target: 'sign-canvas', advance: 'next', optional: true, interactive: true },
      { id: 'submit', route: SIGN_PAGE, target: 'sign-submit', advance: 'next', blockInteraction: true, placement: 'top', optional: true, interactive: true },
    ],
  },
  {
    id: 'create_role',
    scope: 'team',
    startRoute: '/utilisateurs',
    permission: { module: 'equipe', action: 'create' },
    adminOnly: true,
    steps: [
      { id: 'tab', route: /^\/utilisateurs$/, target: 'team-roles-tab', advance: 'click' },
      { id: 'new', route: /^\/utilisateurs$/, target: 'team-new', advance: 'action' },
      { id: 'name', route: /^\/utilisateurs\/roles\/nouveau$/, target: 'role-name', advance: 'next', gate: true },
      { id: 'permissions', route: /^\/utilisateurs\/roles\/nouveau$/, target: 'role-permissions', advance: 'next', placement: 'top' },
      { id: 'submit', route: /^\/utilisateurs\/roles\/nouveau$/, target: 'role-submit', advance: 'action', placement: 'top' },
      { id: 'done', route: /^\/utilisateurs$/, target: 'center', advance: 'next' },
    ],
  },
]

/** Un tutoriel est proposé seulement si l'utilisateur peut réellement faire les actions qu'il décrit. */
export function isTutorialAvailable(
  def: TutorialDef,
  can: (module: PermModule, action: PermAction) => boolean,
  isAdmin: boolean,
): boolean {
  if (def.audience === 'public') return true
  if (def.adminOnly && !isAdmin) return false
  return def.permission ? can(def.permission.module, def.permission.action) : true
}

export function getTutorial(id: TutorialId): TutorialDef {
  const def = TUTORIALS.find((t) => t.id === id)
  if (!def) throw new Error(`Unknown tutorial: ${id}`)
  return def
}
