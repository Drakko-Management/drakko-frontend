// Règle des mots de passe (ADR-013), la même que celle du serveur (03-back/src/common/password) : de la
// longueur et pas de mot de passe facile à deviner, sans règle de composition. Le serveur fait foi ; ici elle
// sert à guider la saisie (jauge) et à ne pas envoyer ce qui sera refusé.
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128
// Échelle de zxcvbn : 0 (devinable tout de suite) à 4 (très solide)
export const PASSWORD_MIN_SCORE = 3

export type PasswordStatus = 'empty' | 'checking' | 'short' | 'weak' | 'ok'

export interface PasswordCheck {
  status: PasswordStatus
  /** Score zxcvbn de 0 à 4 ; 0 tant qu'il n'est pas calculé */
  score: number
  /** Pourquoi il est refusé quand la cause est précise : il contient l'identifiant, le nom ou l'email du compte */
  reason?: 'personal'
}

/** Clé de traduction du conseil à afficher pour ce résultat (le plus précis possible). */
export function passwordHintKey(check: PasswordCheck): string {
  if (check.status === 'ok') return 'password_strength.hint_ok'
  if (check.status === 'short') return 'password_strength.hint_short'
  if (check.status === 'checking') return 'password_strength.hint_checking'
  if (check.status === 'weak') {
    return check.reason === 'personal' ? 'password_strength.hint_personal' : 'password_strength.hint_weak'
  }
  return 'password_strength.hint_empty'
}

type Checker = { check: (password: string, userInputs?: string[]) => { score: number } }

// Les dictionnaires pèsent lourd : on ne les charge qu'au premier mot de passe saisi, dans leur propre fichier
let checkerPromise: Promise<Checker> | undefined
function loadChecker(): Promise<Checker> {
  checkerPromise ??= (async () => {
    const [core, common, en, fr, de, es, it] = await Promise.all([
      import('@zxcvbn-ts/core'),
      import('@zxcvbn-ts/language-common'),
      import('@zxcvbn-ts/language-en'),
      import('@zxcvbn-ts/language-fr'),
      import('@zxcvbn-ts/language-de'),
      import('@zxcvbn-ts/language-es-es'),
      import('@zxcvbn-ts/language-it'),
    ])
    return new core.ZxcvbnFactory({
      graphs: common.adjacencyGraphs,
      translations: en.translations,
      dictionary: {
        ...common.dictionary,
        ...en.dictionary,
        ...fr.dictionary,
        ...de.dictionary,
        ...es.dictionary,
        ...it.dictionary,
      },
    })
  })()
  return checkerPromise
}

// Identifiant, nom, partie locale de l'email : ils ne doivent pas se retrouver dans le mot de passe.
// Un élément de moins de 4 caractères est ignoré (il serait trouvé par hasard).
export function personalInputs(userInputs: (string | null | undefined)[]): string[] {
  const inputs = userInputs
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => [value, value.split('@')[0]])
    .map((value) => value.trim().toLowerCase())
    .filter((value) => [...value].length >= 4)
  return [...new Set(inputs)]
}

/** Partie de la règle qui se vérifie tout de suite, sans dictionnaire : vide ou trop court. */
export function quickCheck(password: string): PasswordCheck | null {
  if (password.length === 0) return { status: 'empty', score: 0 }
  if ([...password].length < PASSWORD_MIN_LENGTH) return { status: 'short', score: 0 }
  return null
}

export async function evaluatePassword(
  password: string,
  userInputs: (string | null | undefined)[] = [],
): Promise<PasswordCheck> {
  const quick = quickCheck(password)
  if (quick) return quick

  const personal = personalInputs(userInputs)
  const lower = password.toLowerCase()
  const checker = await loadChecker()
  const { score } = checker.check(password, personal)
  const containsPersonalInfo = personal.some((input) => lower.includes(input))
  if (containsPersonalInfo) {
    return { status: 'weak', score: Math.min(score, PASSWORD_MIN_SCORE - 1), reason: 'personal' }
  }
  return { status: score < PASSWORD_MIN_SCORE ? 'weak' : 'ok', score }
}
