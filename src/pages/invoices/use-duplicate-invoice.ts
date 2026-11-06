import { useDuplicateId, useDuplicateSource } from '@/hooks/use-duplicate-source'
import { useInvoice } from '@/hooks/use-invoices'
import { duplicateOfInvoice } from './invoice-form'

/** La facture d'un « Dupliquer » (`/factures/nouveau?duplicate=<id>`), mise en forme de saisie. */
export function useDuplicateInvoice() {
  const id = useDuplicateId()
  return useDuplicateSource(id, useInvoice(id), duplicateOfInvoice)
}
