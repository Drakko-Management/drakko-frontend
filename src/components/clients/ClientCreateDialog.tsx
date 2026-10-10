import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { ClientForm } from './ClientForm'
import { clientPrefill } from './client-prefill'
import type { Client } from '@/types/api'

interface Props {
  /** Texte tapé dans la recherche : pré-remplit le nom */
  name: string
  onClose: () => void
  onCreated: (client: Client) => void
}

/** Création d'un client sans quitter la page en cours (ex. le formulaire d'un chantier). */
export function ClientCreateDialog({ name, onClose, onCreated }: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [onClose])

  // Centrée, titre fixe et seul le formulaire défile (même modèle que la fenêtre d'aide).
  // z-[1100] : au-dessus de la barre du bas (z-50) et du fond sombre des tutoriels (z-1000), pour
  // pouvoir créer un client pendant l'étape « Client » du tutoriel « Créer un chantier ».
  // Portail dans <body> : la fenêtre ne dépend pas de son parent (un `space-y-*` lui ajouterait
  // une marge haute, `overflow-hidden` ou un contexte d'empilement pourraient la rogner).
  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center px-4 py-[max(1rem,env(safe-area-inset-top))]"
      role="dialog"
      aria-modal="true"
      aria-label={t('create_client.title')}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-full w-full max-w-md flex-col rounded-2xl bg-card shadow-xl">
        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-5">
          <h2 className="font-semibold">{t('create_client.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          <ClientForm initial={clientPrefill(name)} autoFocus onCreated={onCreated} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
