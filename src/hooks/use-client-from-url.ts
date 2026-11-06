import { useSearchParams } from 'react-router'
import { useClient } from '@/hooks/use-clients'
import type { Client } from '@/types/api'

/**
 * Le client d'un raccourci de la fiche client (`/devis/nouveau?client=<id>`, `/factures/nouveau?client=<id>`).
 *
 * - `ready` : la recherche est finie, le formulaire peut s'ouvrir ;
 * - `client` : la fiche à présélectionner, ou null quand il n'y a pas de paramètre, que le client est introuvable ou
 *   désactivé (un client désactivé n'est plus proposé dans les formulaires). Le formulaire s'ouvre alors sans client,
 *   comme sans raccourci.
 */
export function useClientFromUrl(): { ready: boolean; client: Client | null } {
  const [params] = useSearchParams()
  const id = params.get('client') ?? ''
  const { data, isLoading } = useClient(id)
  return { ready: !isLoading, client: data && data.active ? data : null }
}
