import { useEffect, useState } from 'react'
import { evaluatePassword, quickCheck, type PasswordCheck } from '@/lib/password-policy'

// Délai avant d'évaluer : la saisie reste fluide sur un téléphone, et on n'évalue pas chaque lettre
const DEBOUNCE_MS = 200

/** Évalue le mot de passe saisi selon la règle (longueur, solidité, informations du compte). */
export function usePasswordCheck(
  password: string,
  userInputs: (string | null | undefined)[] = [],
): PasswordCheck {
  const [result, setResult] = useState<{ key: string; check: PasswordCheck } | null>(null)
  const key = JSON.stringify([password, userInputs])

  useEffect(() => {
    if (quickCheck(password)) return
    let cancelled = false
    const timer = setTimeout(() => {
      void evaluatePassword(password, userInputs).then((check) => {
        if (!cancelled) setResult({ key, check })
      })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // userInputs est un tableau recréé à chaque rendu : la clé sérialisée porte son contenu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Vide ou trop court : immédiat. Sinon, le résultat de CE mot de passe, ou « en cours » tant qu'il n'est pas prêt
  // (un résultat ancien ne s'affiche jamais pour un mot de passe qui a changé depuis).
  return quickCheck(password) ?? (result?.key === key ? result.check : { status: 'checking', score: 0 })
}
