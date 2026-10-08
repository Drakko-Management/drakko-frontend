import type { PermAction, PermModule } from '@/types/api'

export type TutorialId = 'create_client' | 'create_project' | 'express_project' | 'create_role' | 'send_signature' | 'sign_page' | 'create_service' | 'install_app' | 'run_project' | 'fill_report' | 'create_member'

/** Page (ou module) à laquelle un tutoriel est rattaché : sert au bouton « ? » de la page. */
export type TutorialScope = 'clients' | 'projects' | 'project' | 'report' | 'team' | 'sign' | 'services' | 'settings'

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
  /** Page(s) dont le bouton « ? » propose ce tutoriel */
  scope: TutorialScope | TutorialScope[]
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
  needs?: 'awaiting_signature_project' | 'editable_project'
  /**
   * Page à ouvrir quand la donnée requise existe (`:id` = id du chantier trouvé).
   * Sinon on reste sur `startRoute` avec les `fallbackSteps`.
   */
  dataRoute?: string
  /** Condition d'environnement : le tutoriel n'a de sens que si elle est remplie */
  requires?: 'pwa_installable'
  /** Étapes explicatives utilisées quand la donnée requise n'existe pas */
  fallbackSteps?: TutorialStepDef[]
}

export type TutorialVariant = 'main' | 'fallback'

export function getSteps(def: TutorialDef, variant: TutorialVariant): TutorialStepDef[] {
  return variant === 'fallback' && def.fallbackSteps ? def.fallbackSteps : def.steps
}

const PROJECT_PHOTOS = /^\/chantiers\/(?!nouveau$|express$)[^/]+\/photos$/
const PROJECT_REPORT = /^\/chantiers\/(?!nouveau$|express$)[^/]+\/rapport$/
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
    scope: ['projects', 'project'],
    startRoute: '/chantiers',
    permission: { module: 'chantiers', action: 'update' },
    needs: 'awaiting_signature_project',
    dataRoute: '/chantiers/:id',
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
    id: 'create_service',
    scope: 'services',
    startRoute: '/prestations',
    permission: { module: 'prestations', action: 'create' },
    steps: [
      { id: 'new', route: /^\/prestations$/, target: 'services-new', advance: 'action' },
      { id: 'title', route: /^\/prestations\/nouveau$/, target: 'service-title', advance: 'next', gate: true },
      { id: 'unit', route: /^\/prestations\/nouveau$/, target: 'service-unit', advance: 'next' },
      { id: 'description', route: /^\/prestations\/nouveau$/, target: 'service-description', advance: 'next' },
      { id: 'submit', route: /^\/prestations\/nouveau$/, target: 'service-submit', advance: 'action', placement: 'top' },
      { id: 'done', route: /^\/prestations$/, target: 'center', advance: 'next' },
    ],
  },
  {
    id: 'create_member',
    scope: 'team',
    startRoute: '/utilisateurs',
    permission: { module: 'equipe', action: 'create' },
    steps: [
      { id: 'new', route: /^\/utilisateurs$/, target: 'team-new', advance: 'action' },
      { id: 'name', route: /^\/utilisateurs\/nouveau$/, target: 'user-name', advance: 'next', gate: true },
      { id: 'identifier', route: /^\/utilisateurs\/nouveau$/, target: 'user-identifier', advance: 'next', gate: true },
      { id: 'email', route: /^\/utilisateurs\/nouveau$/, target: 'user-email', advance: 'next' },
      { id: 'password', route: /^\/utilisateurs\/nouveau$/, target: 'user-password', advance: 'next', gate: true },
      { id: 'role', route: /^\/utilisateurs\/nouveau$/, target: 'user-role', advance: 'next' },
      { id: 'submit', route: /^\/utilisateurs\/nouveau$/, target: 'user-submit', advance: 'action', placement: 'top' },
      { id: 'done', route: /^\/utilisateurs$/, target: 'center', advance: 'next' },
    ],
  },
  {
    id: 'install_app',
    scope: 'settings',
    startRoute: '/parametres',
    requires: 'pwa_installable',
    steps: [
      { id: 'open', route: /^\/parametres$/, target: 'install-open', advance: 'click' },
      { id: 'modal', route: /^\/parametres$/, target: 'install-modal', advance: 'next' },
      { id: 'done', route: /^\/parametres$/, target: 'center', advance: 'next' },
    ],
  },
  {
    id: 'run_project',
    scope: ['projects', 'project'],
    startRoute: '/chantiers',
    dataRoute: '/chantiers/:id',
    permission: { module: 'chantiers', action: 'update' },
    needs: 'editable_project',
    // Visite guidée sur un vrai chantier : les actions qui modifient des données sont verrouillées
    steps: [
      { id: 'stepper', route: PROJECT_DETAIL, target: 'project-stepper', advance: 'next' },
      { id: 'action', route: PROJECT_DETAIL, target: 'project-action', advance: 'next', blockInteraction: true, interactive: true, optional: true },
      { id: 'team', route: PROJECT_DETAIL, target: 'project-team', advance: 'next', blockInteraction: true, interactive: true, optional: true },
      { id: 'photos', route: PROJECT_DETAIL, target: 'project-photos', advance: 'action', interactive: true, optional: true },
      { id: 'before', route: PROJECT_PHOTOS, target: 'photos-before', advance: 'next', blockInteraction: true, interactive: true },
      { id: 'after', route: PROJECT_PHOTOS, target: 'photos-after', advance: 'next', blockInteraction: true, interactive: true },
      { id: 'back', route: PROJECT_PHOTOS, target: 'photos-back', advance: 'action' },
      { id: 'report', route: PROJECT_DETAIL, target: 'project-report', advance: 'next', blockInteraction: true, interactive: true, optional: true },
    ],
    // Aucun chantier en cours de préparation : on explique le principe, avec une capture
    fallbackSteps: [
      { id: 'none_1', route: /^\/chantiers$/, target: 'center', advance: 'next', image: 'project-lifecycle' },
      { id: 'none_2', route: /^\/chantiers$/, target: 'center', advance: 'next' },
      { id: 'none_3', route: /^\/chantiers$/, target: 'center', advance: 'next' },
    ],
  },
  {
    id: 'fill_report',
    scope: ['projects', 'project', 'report'],
    startRoute: '/chantiers',
    dataRoute: '/chantiers/:id/rapport',
    permission: { module: 'chantiers', action: 'update' },
    needs: 'editable_project',
    // Les boutons qui enregistrent sont verrouillés : on peut saisir, rien n'est enregistré par le guide
    steps: [
      { id: 'lines', route: PROJECT_REPORT, target: 'report-lines', advance: 'next' },
      { id: 'add', route: PROJECT_REPORT, target: 'report-add', advance: 'click', optional: true },
      { id: 'service', route: PROJECT_REPORT, target: 'report-service', advance: 'next', interactive: true, optional: true },
      { id: 'complement', route: PROJECT_REPORT, target: 'report-complement', advance: 'next', interactive: true, optional: true },
      { id: 'validate', route: PROJECT_REPORT, target: 'report-validate', advance: 'next', blockInteraction: true, optional: true },
      { id: 'comment', route: PROJECT_REPORT, target: 'report-comment', advance: 'next', interactive: true },
      { id: 'save', route: PROJECT_REPORT, target: 'report-save', advance: 'next', blockInteraction: true, optional: true },
    ],
    fallbackSteps: [
      { id: 'none_1', route: /^\/chantiers$/, target: 'center', advance: 'next', image: 'report-page' },
      { id: 'none_2', route: /^\/chantiers$/, target: 'center', advance: 'next' },
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
export interface TutorialEnv {
  /** Appareil mobile sur lequel l'appli n'est pas encore installée */
  pwaInstallable?: boolean
}

export function isTutorialAvailable(
  def: TutorialDef,
  can: (module: PermModule, action: PermAction) => boolean,
  isAdmin: boolean,
  env: TutorialEnv = {},
): boolean {
  if (def.requires === 'pwa_installable' && !env.pwaInstallable) return false
  if (def.audience === 'public') return true
  if (def.adminOnly && !isAdmin) return false
  return def.permission ? can(def.permission.module, def.permission.action) : true
}

export function getTutorial(id: TutorialId): TutorialDef {
  const def = TUTORIALS.find((t) => t.id === id)
  if (!def) throw new Error(`Unknown tutorial: ${id}`)
  return def
}
