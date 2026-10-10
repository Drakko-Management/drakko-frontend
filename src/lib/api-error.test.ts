import { describe, it, expect } from 'vitest'
import i18n from 'i18next'
import { ApiError, apiErrorFromResponse } from './api-client'
import { apiErrorMessage } from './api-error'

// ── apiErrorFromResponse ───────────────────────────────────────────────────

describe('apiErrorFromResponse', () => {
  it('reprend le statut, le message et le code renvoyés par le serveur', async () => {
    const res = new Response(
      JSON.stringify({ message: 'Un rôle avec ce nom existe déjà', code: 'ROLE_NAME_TAKEN' }),
      { status: 400 },
    )
    const err = await apiErrorFromResponse(res)

    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(400)
    expect(err.message).toBe('Un rôle avec ce nom existe déjà')
    expect(err.code).toBe('ROLE_NAME_TAKEN')
  })

  it('assemble les messages de validation renvoyés sous forme de tableau', async () => {
    const res = new Response(JSON.stringify({ message: ['name must be a string', 'name should not be empty'] }), {
      status: 400,
    })

    expect((await apiErrorFromResponse(res)).message).toBe('name must be a string, name should not be empty')
  })

  it('retombe sur le libellé HTTP quand la réponse n\'est pas du JSON', async () => {
    const res = new Response('oops', { status: 502, statusText: 'Bad Gateway' })
    const err = await apiErrorFromResponse(res)

    expect(err.status).toBe(502)
    expect(err.message).toBe('Bad Gateway')
    expect(err.code).toBeUndefined()
  })
})

// ── apiErrorMessage ────────────────────────────────────────────────────────

describe('apiErrorMessage', () => {
  const t = i18n.getFixedT('fr')

  it('traduit un code d\'erreur connu', () => {
    expect(apiErrorMessage(new ApiError(400, 'x', 'ROLE_NAME_TAKEN'), t, 'users.role_create_error')).toBe(
      'Un rôle avec ce nom existe déjà',
    )
    expect(apiErrorMessage(new ApiError(400, 'x', 'ROLE_IN_USE'), t, 'users.role_delete_error')).toBe(
      'Ce rôle est encore assigné à des utilisateurs',
    )
  })

  it('traduit CLIENT_NOT_FOUND (client absent de l\'organisation) dans chaque langue', () => {
    const message = (lng: string) =>
      apiErrorMessage(new ApiError(404, 'Client introuvable', 'CLIENT_NOT_FOUND'), i18n.getFixedT(lng), 'create_project.error')

    expect(message('fr')).toBe('Client introuvable. Choisissez-en un autre ou créez-le.')
    expect(message('en')).toBe('Client not found. Pick another one or create it.')
    expect(message('de')).toContain('Kunde nicht gefunden')
  })

  it('traduit ROLE_NOT_FOUND (rôle absent de l\'organisation) dans chaque langue', () => {
    const message = (lng: string) =>
      apiErrorMessage(new ApiError(404, 'Rôle introuvable', 'ROLE_NOT_FOUND'), i18n.getFixedT(lng), 'users.update_error')

    expect(message('fr')).toBe('Rôle introuvable. Choisissez-en un autre.')
    expect(message('en')).toBe('Role not found. Pick another one.')
    expect(message('es')).toBe('Rol no encontrado. Elige otro.')
    expect(message('it')).toBe('Ruolo non trovato. Scegline un altro.')
    expect(message('de')).toBe('Rolle nicht gefunden. Wählen Sie eine andere.')
  })

  it('traduit ADMIN_REQUIRED (compte administrateur réservé aux administrateurs) dans chaque langue', () => {
    const message = (lng: string) =>
      apiErrorMessage(new ApiError(403, 'Seul un administrateur', 'ADMIN_REQUIRED'), i18n.getFixedT(lng), 'users.update_error')

    expect(message('fr')).toBe('Seul un administrateur peut créer ou modifier un compte administrateur')
    expect(message('en')).toBe('Only an administrator can create or edit an administrator account')
    expect(message('es')).toBe('Solo un administrador puede crear o modificar una cuenta de administrador')
    expect(message('it')).toBe('Solo un amministratore può creare o modificare un account amministratore')
    expect(message('de')).toBe('Nur ein Administrator kann ein Administratorkonto erstellen oder ändern')
  })

  it.each([
    ['OWNER_PROTECTED', 'Seul le propriétaire peut modifier son compte'],
    ['OWNER_TRANSFER_REQUIRED', 'Transférez d\'abord la propriété pour désactiver ce compte ou lui retirer le rôle d\'administrateur'],
    ['OWNER_REQUIRED', 'Seul le propriétaire peut transférer la propriété'],
    ['OWNER_TARGET_INVALID', 'La propriété ne peut être transférée qu\'à un administrateur actif'],
    ['ROLE_EXCEEDS_PERMISSIONS', 'Vous ne pouvez pas attribuer un rôle qui donne des droits que vous n\'avez pas'],
    ['USER_EXCEEDS_PERMISSIONS', 'Ce compte a des droits que vous n\'avez pas : vous ne pouvez pas le modifier'],
  ])('traduit %s dans chaque langue (jamais le message de repli)', (code, french) => {
    const message = (lng: string) =>
      apiErrorMessage(new ApiError(403, 'Texte technique', code), i18n.getFixedT(lng), 'users.update_error')
    const fallback = (lng: string) => i18n.getFixedT(lng)('users.update_error')

    expect(message('fr')).toBe(french)
    for (const lng of ['fr', 'en', 'es', 'it', 'de']) {
      expect(message(lng)).not.toBe(fallback(lng))
      expect(message(lng)).not.toContain('technique')
    }
  })

  it('traduit PROJECT_LOCKED (chantier envoyé à la signature ou signé) dans chaque langue, jamais le message de repli', () => {
    const message = (lng: string) =>
      apiErrorMessage(new ApiError(409, 'Texte technique', 'PROJECT_LOCKED'), i18n.getFixedT(lng), 'project.delete_error')
    const fallback = (lng: string) => i18n.getFixedT(lng)('project.delete_error')

    expect(message('fr')).toBe(
      'Ce chantier est verrouillé : il a été envoyé à la signature ou signé, il ne peut plus être modifié ni supprimé',
    )
    for (const lng of ['fr', 'en', 'es', 'it', 'de']) {
      expect(message(lng)).not.toBe(fallback(lng))
      expect(message(lng)).not.toContain('technique')
    }
  })

  it('traduit INVALID_RESET_TOKEN (lien de réinitialisation expiré ou déjà utilisé) dans chaque langue', () => {
    const message = (lng: string) =>
      apiErrorMessage(new ApiError(400, 'Texte technique', 'INVALID_RESET_TOKEN'), i18n.getFixedT(lng), 'password_reset.error')
    const fallback = (lng: string) => i18n.getFixedT(lng)('password_reset.error')

    expect(message('fr')).toBe("Ce lien n'est plus valable : il a expiré ou a déjà été utilisé")
    for (const lng of ['fr', 'en', 'es', 'it', 'de']) {
      expect(message(lng)).not.toBe(fallback(lng))
      expect(message(lng)).not.toContain('technique')
    }
  })

  it('utilise le message de repli, sans jamais afficher le texte du serveur', () => {
    const message = apiErrorMessage(new ApiError(500, 'Internal server error'), t, 'users.role_create_error')

    expect(message).toBe('Erreur lors de la création')
    expect(message).not.toContain('Internal')
  })

  it('utilise le message de repli pour un code inconnu ou une erreur qui ne vient pas de l\'API', () => {
    expect(apiErrorMessage(new ApiError(400, 'x', 'CODE_INCONNU'), t, 'users.role_delete_error')).toBe(
      'Erreur lors de la suppression',
    )
    expect(apiErrorMessage(new Error('boom'), t, 'users.role_delete_error')).toBe('Erreur lors de la suppression')
  })

  it('suit la langue demandée', () => {
    const de = i18n.getFixedT('de')

    expect(apiErrorMessage(new ApiError(400, 'x', 'ROLE_NAME_TAKEN'), de, 'users.role_create_error')).toBe(
      'Eine Rolle mit diesem Namen existiert bereits',
    )
  })
})
