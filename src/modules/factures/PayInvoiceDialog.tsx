import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PayInput } from '@/hooks/use-invoices'
import type { PaymentMethod } from '@/types/api'
import { todayInput } from './format'

const PAYMENT_METHODS: PaymentMethod[] = ['TRANSFER', 'CHECK', 'CASH', 'CARD', 'OTHER']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Premier jour possible : le paiement ne précède pas l'émission */
  minDay: string
  pending?: boolean
  onConfirm: (input: PayInput) => void
}

/**
 * « Marquer payée » : le jour du paiement (aujourd'hui) et son mode, qui sont une information saisie par l'équipe.
 * Drakko ne reçoit aucun paiement (ADR-033).
 */
export function PayInvoiceDialog({ open, onOpenChange, minDay, pending = false, onConfirm }: Props) {
  const { t } = useTranslation()
  const [day, setDay] = useState(todayInput())
  const [method, setMethod] = useState<PaymentMethod | ''>('')

  // Chaque ouverture repart d'aujourd'hui et sans mode : le geste précédent ne reste pas en mémoire
  useEffect(() => {
    if (open) {
      setDay(todayInput())
      setMethod('')
    }
  }, [open])

  const today = todayInput()
  const valid = day !== '' && day >= minDay && day <= today

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('invoices.pay_title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('invoices.pay_description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pay-date">{t('invoices.pay_date')}</Label>
            <Input
              id="pay-date"
              type="date"
              className="min-h-[44px]"
              value={day}
              min={minDay}
              max={today}
              onChange={(e) => setDay(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-method">{t('invoices.pay_method')}</Label>
            <select
              id="pay-method"
              className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod | '')}
            >
              <option value="">{t('invoices.method_unspecified')}</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`invoices.method_${m}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('common.cancel')}</AlertDialogCancel>
          <Button
            type="button"
            disabled={pending || !valid}
            onClick={() => onConfirm({ paidAt: day, ...(method ? { method } : {}) })}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('invoices.pay_confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
