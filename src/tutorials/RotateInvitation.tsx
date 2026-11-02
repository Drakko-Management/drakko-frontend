import { useEffect } from 'react'
import type { TFunction } from 'i18next'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { TOUCH_LANDSCAPE } from './landscape'

interface RotateInvitationProps {
  open: boolean
  /** `t` dans la langue du guide (celle de la page sur les pages publiques) */
  t: TFunction
  onLaunch: () => void
  onCancel: () => void
}

/** Proposé avant de lancer un guide sur un écran tactile en paysage : tourner l'appareil, ou commencer quand même. */
export function RotateInvitation({ open, t, onLaunch, onCancel }: RotateInvitationProps) {
  // L'appareil repasse à la verticale pendant que la fenêtre est ouverte : c'est ce qu'on demandait, le guide démarre
  useEffect(() => {
    if (!open || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(TOUCH_LANDSCAPE)
    const onChange = () => {
      if (!query.matches) onLaunch()
    }
    query.addEventListener('change', onChange)
    return () => {
      query.removeEventListener('change', onChange)
    }
  }, [open, onLaunch])

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('tutorials.rotate_title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('tutorials.rotate_body')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-[44px]">{t('common.cancel')}</AlertDialogCancel>
          <Button type="button" className="min-h-[44px]" onClick={onLaunch}>
            {t('tutorials.rotate_anyway')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
