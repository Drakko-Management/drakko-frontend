import type { TFunction } from 'i18next'
import { ApiError } from '@/lib/api-client'

// Code d'erreur renvoyé par l'API → clé de traduction. Le texte du serveur n'est jamais affiché.
const API_ERROR_KEYS: Record<string, string> = {
  ROLE_NAME_TAKEN: 'users.role_name_taken',
  ROLE_IN_USE: 'users.role_in_use',
  CLIENT_NOT_FOUND: 'create_project.client_not_found',
}

/** Message traduit pour une erreur API : celui du code connu, sinon le message générique de repli. */
export function apiErrorMessage(err: unknown, t: TFunction, fallbackKey: string): string {
  const key = err instanceof ApiError && err.code ? API_ERROR_KEYS[err.code] : undefined
  return t(key ?? fallbackKey)
}
