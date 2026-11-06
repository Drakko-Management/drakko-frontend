import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useClient } from '@/hooks/use-clients'
import type { Client } from '@/types/api'

type ClientRef = Pick<Client, 'id' | 'firstName' | 'lastName' | 'email'>

/** Le paramètre d'adresse des pages de création : `?duplicate=<id>` ouvre le formulaire rempli d'après ce devis ou cette facture. */
const DUPLICATE_PARAM = 'duplicate'

/** L'identifiant du document à copier, ou une chaîne vide quand l'adresse n'en porte pas. */
export function useDuplicateId(): string {
  const [params] = useSearchParams()
  return params.get(DUPLICATE_PARAM) ?? ''
}

export interface DuplicateSource<Values> {
  /** La recherche est finie : le formulaire peut s'ouvrir */
  ready: boolean
  /** Le document copié (pour y revenir par « retour ») ; null sans `?duplicate=` ou quand il est introuvable */
  sourceId: string | null
  /** Le formulaire rempli d'après lui ; null sans `?duplicate=` ou quand le document est introuvable */
  values: Values | null
}

/**
 * Le document d'un « Dupliquer » (devis ou facture) mis en forme de saisie. `build` fait le formulaire (un `duplicateOf…`
 * stable, jamais une fonction écrite à la volée). Le client est relu : un client désactivé n'est plus proposé dans les
 * formulaires, la copie s'ouvre alors sans client. Si la relecture échoue (pas le droit de lire les clients, par
 * exemple), la copie garde celui du document plutôt que de bloquer. Un document introuvable ou illisible ouvre le
 * formulaire vide, comme sans raccourci.
 */
export function useDuplicateSource<Doc extends { clientId: string; client: ClientRef }, Values>(
  id: string,
  query: { data: Doc | undefined; isLoading: boolean },
  build: (doc: Doc, client: ClientRef | null) => Values,
): DuplicateSource<Values> {
  // Sans identifiant dans l'adresse, il n'y a rien à copier (la requête est alors désactivée, mais on ne s'y fie pas)
  const doc = id ? query.data : undefined
  const { data: current, isLoading: clientLoading } = useClient(doc?.clientId ?? '')
  const values = useMemo(() => {
    if (!doc) return null
    return build(doc, current ? (current.active ? current : null) : doc.client)
  }, [doc, current, build])
  return { ready: !id || (!query.isLoading && !clientLoading), sourceId: values ? id : null, values }
}
