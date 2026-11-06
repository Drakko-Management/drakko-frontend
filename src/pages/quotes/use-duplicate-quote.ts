import { useDuplicateId, useDuplicateSource } from '@/hooks/use-duplicate-source'
import { useQuote } from '@/hooks/use-quotes'
import { duplicateOfQuote } from './quote-form'

/** Le devis d'un « Dupliquer » (`/devis/nouveau?duplicate=<id>`), mis en forme de saisie. */
export function useDuplicateQuote() {
  const id = useDuplicateId()
  return useDuplicateSource(id, useQuote(id), duplicateOfQuote)
}
