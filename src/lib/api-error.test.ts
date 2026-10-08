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
