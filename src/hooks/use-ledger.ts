import { apiRequest } from '@/lib/api-client'
import { downloadFile } from '@/lib/download-file'
import type { LedgerVerification } from '@/types/api'

/**
 * Contrôle le journal des factures et des règlements : la chaîne d'empreintes, le contenu des factures émises et leur
 * état (ADR-038). Une lecture : rien n'est écrit.
 */
export const verifyLedger = (): Promise<LedgerVerification> => apiRequest<LedgerVerification>('/ledger/verify')

/**
 * Télécharge l'archive d'une année (un fichier JSON avec sa notice en français). Sa génération est inscrite au journal :
 * c'est un POST, qui n'existe pas en mode dépannage.
 */
export const downloadLedgerArchive = (year: number): Promise<void> =>
  downloadFile('/ledger/archives', `archive-${year}.json`, {
    method: 'POST',
    body: JSON.stringify({ year }),
  })
