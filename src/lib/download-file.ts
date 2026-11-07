import { apiBlob, apiRequest } from '@/lib/api-client'

/**
 * Télécharge un fichier de l'API sous le nom donné. La requête porte la session (jeton en mémoire) : un simple lien
 * vers l'API ne suffirait pas. Avec `init`, la requête n'est plus un simple GET (l'archive du journal est un POST).
 */
export async function downloadFile(path: string, filename: string, init?: RequestInit): Promise<void> {
  const blob = init ? await apiRequest<Blob>(path, init, 'blob') : await apiBlob(path)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Le navigateur a eu le temps d'enregistrer le fichier ; on libère la mémoire
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
