import { useContext } from 'react'
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { UnsavedChanges } from '@/hooks/use-unsaved-changes'

/** La fenêtre « Quitter sans enregistrer ? » quand on quitte la page avec une saisie non enregistrée. */
export function UnsavedChangesDialog({ guard }: { guard: UnsavedChanges }) {
  // `useBlocker` n'existe que dans un routeur de données (celui de l'application) ; un test rendu dans un simple
  // `MemoryRouter` n'a pas à le savoir
  const inDataRouter = useContext(UNSAFE_DataRouterContext) !== null
  return inDataRouter ? <BlockerDialog guard={guard} /> : null
}

function BlockerDialog({ guard }: { guard: UnsavedChanges }) {
  const { t } = useTranslation()
  const blocker = useBlocker(() => guard.shouldBlock())
  const blocked = blocker.state === 'blocked'
  return (
    <AlertDialog open={blocked} onOpenChange={(open) => !open && blocked && blocker.reset()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('common.unsaved_title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('common.unsaved_description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.unsaved_stay')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => blocked && blocker.proceed()}>{t('common.unsaved_leave')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
