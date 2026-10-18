import { useState } from 'react'
import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { ConfirmDestructiveDialog } from '@/components/common/ConfirmDestructiveDialog'

interface RecordActionsProps {
  /** État actuel : choisit l'icône de l'œil (barré = le bouton désactive) */
  active: boolean
  pending?: boolean
  /** Absent : pas d'œil « désactiver / réactiver » (réversible, sans confirmation) */
  onToggle?: () => void
  toggleLabel?: string
  /** Absent : pas de corbeille ; présent : avertissement puis confirmation */
  onDelete?: () => Promise<void> | void
  deleteLabel?: string
  deleteTitle?: string
  deleteDescription?: string
  deleteConfirmLabel?: string
}

const ICON_BUTTON =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card transition-colors active:bg-muted disabled:opacity-50'

// Les mêmes deux actions que sur la ligne de liste, en petites icônes dans l'en-tête de la fiche d'un client,
// d'un membre ou d'une prestation : l'œil désactive ou réactive, la corbeille supprime après avertissement.
// À placer dans un conteneur `flex items-center gap-2`.
export function RecordActions({
  active,
  pending = false,
  onToggle,
  toggleLabel,
  onDelete,
  deleteLabel,
  deleteTitle,
  deleteDescription,
  deleteConfirmLabel,
}: RecordActionsProps) {
  const [confirming, setConfirming] = useState(false)

  if (!onToggle && !onDelete) return null

  async function handleConfirm() {
    await onDelete?.()
    setConfirming(false)
  }

  return (
    <>
      {onToggle && (
        <button
          type="button"
          className={`${ICON_BUTTON} text-muted-foreground hover:text-foreground`}
          disabled={pending}
          onClick={onToggle}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          {active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
      {onDelete && (
        <>
          <button
            type="button"
            className={`${ICON_BUTTON} border-destructive/40 text-destructive hover:bg-destructive/10`}
            disabled={pending}
            onClick={() => setConfirming(true)}
            aria-label={deleteLabel}
            title={deleteLabel}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <ConfirmDestructiveDialog
            open={confirming}
            onOpenChange={setConfirming}
            title={deleteTitle ?? ''}
            description={deleteDescription ?? ''}
            confirmLabel={deleteConfirmLabel ?? ''}
            pending={pending}
            onConfirm={() => void handleConfirm()}
          />
        </>
      )}
    </>
  )
}
