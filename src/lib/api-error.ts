import type { TFunction } from 'i18next'
import { ApiError } from '@/lib/api-client'

// Code d'erreur renvoyé par l'API → clé de traduction. Le texte du serveur n'est jamais affiché.
const API_ERROR_KEYS: Record<string, string> = {
  ROLE_NAME_TAKEN: 'users.role_name_taken',
  ROLE_IN_USE: 'users.role_in_use',
  ROLE_NOT_FOUND: 'users.role_not_found',
  ADMIN_REQUIRED: 'users.admin_required',
  ROLE_EXCEEDS_PERMISSIONS: 'users.role_exceeds_permissions',
  USER_EXCEEDS_PERMISSIONS: 'users.user_exceeds_permissions',
  OWNER_PROTECTED: 'users.owner_protected',
  OWNER_TRANSFER_REQUIRED: 'users.owner_transfer_required',
  OWNER_REQUIRED: 'users.owner_required',
  OWNER_TARGET_INVALID: 'users.owner_target_invalid',
  CLIENT_NOT_FOUND: 'create_project.client_not_found',
  PROJECT_LOCKED: 'project.locked_error',
  INVALID_RESET_TOKEN: 'password_reset.invalid_link',
  CURRENT_PASSWORD_INVALID: 'password_change.current_invalid',
  EMAIL_TAKEN: 'settings.email_taken',
  EMAIL_UNCHANGED: 'settings.email_unchanged',
  OWN_CREDENTIALS_ROUTE: 'users.own_credentials_error',
  PASSWORD_UNCHANGED: 'password_change.same_as_current',
  PASSWORD_CONTAINS_PERSONAL_INFO: 'password_strength.hint_personal',
  PASSWORD_TOO_SHORT: 'password_strength.hint_short',
  PASSWORD_TOO_WEAK: 'password_strength.hint_weak',
  TOO_MANY_ATTEMPTS: 'login.error_locked',
}

/** Message traduit pour une erreur API : celui du code connu, sinon le message générique de repli. */
export function apiErrorMessage(err: unknown, t: TFunction, fallbackKey: string): string {
  const key = err instanceof ApiError && err.code ? API_ERROR_KEYS[err.code] : undefined
  return t(key ?? fallbackKey)
}
