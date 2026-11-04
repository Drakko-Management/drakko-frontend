import { apiBlob } from '@/lib/api-client'

/**
 * Ouvre un PDF de l'API dans un nouvel onglet. L'onglet est ouvert avant la requête, pendant le geste de
 * l'utilisateur : après une attente, un navigateur de téléphone bloquerait l'ouverture.
 */
export async function openPdf(path: string): Promise<void> {
  const tab = window.open('', '_blank')
  try {
    const blob = await apiBlob(path)
    const url = URL.createObjectURL(blob)
    if (tab) tab.location.href = url
    else window.location.assign(url)
    // Le navigateur a eu le temps de charger le fichier ; on libère la mémoire
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    tab?.close()
    throw error
  }
}
