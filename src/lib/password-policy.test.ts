import { describe, it, expect } from 'vitest'
import { evaluatePassword, passwordHintKey, personalInputs, quickCheck, PASSWORD_MIN_LENGTH } from './password-policy'

// Les mêmes cas que le serveur (03-back/src/common/password/password-policy.spec.ts) : la jauge et l'API
// doivent s'accorder.
describe('quickCheck (sans dictionnaire)', () => {
  it('vide', () => {
    expect(quickCheck('')).toEqual({ status: 'empty', score: 0 })
  })

  it('trop court : la limite est exactement 12 caractères', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12)
    expect(quickCheck('xK9#mQ2$vL7')?.status).toBe('short')
    expect(quickCheck('xK9#mQ2$vL7p')).toBeNull()
  })

  it('compte les caractères, pas les octets', () => {
    expect(quickCheck('éééééééééééé')).toBeNull()
  })
})

describe('evaluatePassword', () => {
  it.each(['passwordpassword', 'azertyuiop123', 'Motdepasse1!', 'aaaaaaaaaaaa', '123456789012', 'Password1234!', 'qwertyuiopas'])(
    '« %s » : trop facile à deviner',
    async (password) => {
      expect((await evaluatePassword(password)).status).toBe('weak')
    },
  )

  it.each([
    'correct cheval pile agrafe',
    'xK9#mQ2$vL7pRt',
    'MonChantierDuPrintemps',
    // aucun symbole, aucune majuscule : la longueur suffit
    'violet tortue jardin nuage',
  ])('« %s » : accepté, sans règle de composition', async (password) => {
    const check = await evaluatePassword(password)
    expect(check.status).toBe('ok')
    expect(check.score).toBeGreaterThanOrEqual(3)
  })

  it("refuse un mot de passe qui contient l'identifiant, même solide par ailleurs", async () => {
    expect((await evaluatePassword('xK9#jean.dupont7', ['jean.dupont'])).status).toBe('weak')
  })

  it("refuse un mot de passe qui contient la partie locale de l'email, sans tenir compte de la casse", async () => {
    expect((await evaluatePassword('xK9#MARIE.durand#2$vL7', [null, 'marie.durand@acme.fr'])).status).toBe('weak')
  })

  it('un mot de passe court n\'attend pas les dictionnaires', async () => {
    expect((await evaluatePassword('court')).status).toBe('short')
  })
})

describe('personalInputs', () => {
  it('ignore les éléments de moins de 4 caractères, vides ou absents, et garde la partie locale d\'un email', () => {
    expect(personalInputs(['ab', '', null, undefined, 'Jean.Dupont', 'marie@acme.fr'])).toEqual(['jean.dupont', 'marie@acme.fr', 'marie'])
  })
})

describe('conseil le plus précis possible', () => {
  it('un mot de passe qui contient les informations du compte a sa raison propre', async () => {
    const check = await evaluatePassword('xK9#jean.dupont7', ['jean.dupont'])

    expect(check.reason).toBe('personal')
    expect(passwordHintKey(check)).toBe('password_strength.hint_personal')
  })

  it('un mot de passe simplement devinable n’a pas cette raison', async () => {
    const check = await evaluatePassword('Motdepasse1!')

    expect(check.reason).toBeUndefined()
    expect(passwordHintKey(check)).toBe('password_strength.hint_weak')
  })

  it.each([
    [{ status: 'empty', score: 0 }, 'password_strength.hint_empty'],
    [{ status: 'short', score: 0 }, 'password_strength.hint_short'],
    [{ status: 'checking', score: 0 }, 'password_strength.hint_checking'],
    [{ status: 'ok', score: 4 }, 'password_strength.hint_ok'],
  ] as const)('%j → %s', (check, key) => {
    expect(passwordHintKey({ ...check })).toBe(key)
  })
})
