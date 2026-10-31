import { useEffect, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const MIN_REASON_LENGTH = 5

interface ReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  pending?: boolean
  /** Message d'erreur déjà traduit, affiché dans la fenêtre */
  error?: string | null
  destructive?: boolean
  /** Champs en plus du motif ; `extraValid` dit s'ils sont remplis */
  children?: ReactNode
  extraValid?: boolean
  onConfirm: (reason: string) => void
}

// Tout geste qui touche un client demande un motif (ADR-028) : il est écrit tel quel au journal d'audit.
// La fenêtre reste ouverte pendant l'envoi, et se vide à chaque ouverture.
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending = false,
  error,
  destructive = false,
  children,
  extraValid = true,
  onConfirm,
}: ReasonDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const valid = reason.trim().length >= MIN_REASON_LENGTH && extraValid

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          {children}
          <div className="space-y-2">
            <Label htmlFor="platform-reason">{t('platform.reason_label')}</Label>
            <Textarea
              id="platform-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('platform.reason_placeholder')}
              maxLength={500}
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">{t('platform.reason_hint', { min: MIN_REASON_LENGTH })}</p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('common.cancel')}</AlertDialogCancel>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending || !valid}
            onClick={() => onConfirm(reason.trim())}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
