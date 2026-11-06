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
import { dateRangeBounds } from '@/lib/utils'
import { todayInput } from './format'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending?: boolean
  /** Les deux jours de la période, « AAAA-MM-JJ », inclus */
  onConfirm: (period: { from: string; to: string }) => void
}

/**
 * « Exporter » : la période du fichier CSV que le comptable reçoit (les factures, acomptes et avoirs émis ces jours-là).
 * Elle s'ouvre sur l'année en cours ; deux raccourcis donnent l'année en cours et la précédente, les deux périodes
 * qu'un comptable demande presque toujours.
 */
export function ExportInvoicesDialog({ open, onOpenChange, pending = false, onConfirm }: Props) {
  const { t } = useTranslation()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Chaque ouverture repart de l'année en cours : la période du geste précédent ne reste pas en mémoire
  useEffect(() => {
    if (open) {
      const today = todayInput()
      setFrom(`${today.slice(0, 4)}-01-01`)
      setTo(today)
    }
  }, [open])

  const year = Number(todayInput().slice(0, 4))
  const bounds = dateRangeBounds(from, to)
  const valid = from !== '' && to !== '' && from <= to

  function pickYear(value: number) {
    setFrom(`${value}-01-01`)
    // L'année en cours s'arrête à aujourd'hui : l'export ne demande pas des jours qui ne sont pas venus
    setTo(value === year ? todayInput() : `${value}-12-31`)
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('invoices.export_title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('invoices.export_description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="min-h-[36px]" onClick={() => pickYear(year)}>
              {t('invoices.export_this_year')}
            </Button>
            <Button type="button" variant="outline" size="sm" className="min-h-[36px]" onClick={() => pickYear(year - 1)}>
              {t('invoices.export_last_year')}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="export-from">{t('invoices.export_from')}</Label>
              <Input
                id="export-from"
                type="date"
                className="min-h-[44px]"
                value={from}
                min={bounds.start.min}
                max={bounds.start.max}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-to">{t('invoices.export_to')}</Label>
              <Input
                id="export-to"
                type="date"
                className="min-h-[44px]"
                value={to}
                min={bounds.end.min}
                max={bounds.end.max}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('common.cancel')}</AlertDialogCancel>
          <Button type="button" disabled={pending || !valid} onClick={() => onConfirm({ from, to })}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('invoices.export_confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
