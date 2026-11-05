import { useEffect, useMemo, useRef } from 'react'

export interface UnsavedChanges {
  /** Vrai tant qu'il y a une saisie non enregistrée et qu'on n'a pas enregistré */
  shouldBlock: () => boolean
  /** À appeler quand l'enregistrement a réussi, avant de quitter la page : la navigation qui suit n'est plus bloquée */
  markSaved: () => void
}

/**
 * Garde-fou d'un formulaire long (devis, facture) : une saisie non enregistrée ne se perd pas d'un retour arrière, d'un
 * lien du menu ou d'un rafraîchissement sans qu'on le demande. Ici le navigateur (fermer l'onglet, recharger) ; la
 * navigation dans l'application passe par `UnsavedChangesDialog`.
 */
export function useUnsavedChanges(dirty: boolean): UnsavedChanges {
  const dirtyRef = useRef(dirty)
  const savedRef = useRef(false)

  useEffect(() => {
    dirtyRef.current = dirty
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      if (savedRef.current) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  return useMemo(
    () => ({
      shouldBlock: () => dirtyRef.current && !savedRef.current,
      markSaved: () => {
        savedRef.current = true
      },
    }),
    [],
  )
}
