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
import type { InvoiceInput } from '@/hooks/use-invoices'
import { formatMoney } from '@/modules/devis/format'
import { centsToNumber, percentOfCents, toCents, vatOfCents } from '@/modules/devis/totals'

type Mode = 'percent' | 'amount'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  quoteReference: string
  /** Le total hors taxe du devis, en centimes : la base du pourcentage */
  quoteSubtotal: bigint
  /** Ce que les acomptes déjà demandés (non annulés, brouillons compris) totalisent hors taxe, en centimes */
  alreadyBilled?: bigint
  /** Le taux de TVA du devis (« 20 », « 0 » sous franchise), pour l'aperçu */
  vatRate: string
  vatExempt: boolean
  pending?: boolean
  onConfirm: (deposit: NonNullable<InvoiceInput['deposit']>) => void
}

const DEFAULT_PERCENT = '30'

/**
 * « Facture d'acompte » (ADR-033) : une part du devis, en pourcentage ou en montant hors taxe. L'aperçu montre ce que le client
 * paiera ; l'API reste juge (plafond des acomptes, régime de TVA).
 */
export function DepositDialog({
  open,
  onOpenChange,
  quoteReference,
  quoteSubtotal,
  alreadyBilled = 0n,
  vatRate,
  vatExempt,
  pending = false,
  onConfirm,
}: Props) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('percent')
  const [value, setValue] = useState(DEFAULT_PERCENT)

  // Chaque ouverture repart de 30 % : le geste précédent ne reste pas en mémoire
  useEffect(() => {
    if (open) {
      setMode('percent')
      setValue(DEFAULT_PERCENT)
    }
  }, [open])

  function changeMode(next: Mode) {
    setMode(next)
    setValue(next === 'percent' ? DEFAULT_PERCENT : '')
  }

  // Le montant hors taxe de l'acompte, ou null tant que la saisie n'est pas un acompte possible
  const cents = value.trim() === '' ? null : mode === 'percent' ? percentOfCents(quoteSubtotal, value) : toCents(value)
  const percentCents = mode === 'percent' ? toCents(value) : null
  const percentOk = mode !== 'percent' || (percentCents !== null && percentCents > 0n && percentCents < 10000n)
  // Les acomptes ne couvrent jamais tout le devis : il doit rester un solde à facturer (l'API le refuse aussi, au centime près)
  const maxCents = quoteSubtotal - alreadyBilled - 1n
  const tooHigh = cents !== null && cents > maxCents
  const valid = cents !== null && cents > 0n && percentOk && !tooHigh

  function submit() {
    if (!valid) return
    const number = Number(value.trim().replace(',', '.'))
    onConfirm(mode === 'percent' ? { percent: number } : { amount: number })
  }

  const preview = valid
    ? vatExempt
      ? t('invoices.deposit_preview_exempt', { ht: formatMoney(centsToNumber(cents)) })
      : t('invoices.deposit_preview', {
          ht: formatMoney(centsToNumber(cents)),
          ttc: formatMoney(centsToNumber(cents + vatOfCents(cents, vatRate))),
        })
    : null

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('invoices.deposit_title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('invoices.deposit_description', { reference: quoteReference })}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('invoices.deposit_title')}>
            {(['percent', 'amount'] as const).map((m) => (
              <Button
                key={m}
                type="button"
                variant={mode === m ? 'default' : 'outline'}
                className="min-h-[44px] whitespace-normal text-center"
                aria-pressed={mode === m}
                onClick={() => changeMode(m)}
              >
                {t(m === 'percent' ? 'invoices.deposit_mode_percent' : 'invoices.deposit_mode_amount')}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deposit-value">{t(mode === 'percent' ? 'invoices.deposit_percent' : 'invoices.deposit_amount')}</Label>
            <Input
              id="deposit-value"
              inputMode="decimal"
              className="min-h-[44px]"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                }
              }}
            />
          </div>
          {alreadyBilled > 0n && (
            <p className="text-xs text-muted-foreground" data-testid="deposit-already">
              {maxCents > 0n
                ? t('invoices.deposit_already', {
                    already: formatMoney(centsToNumber(alreadyBilled)),
                    max: formatMoney(centsToNumber(maxCents)),
                  })
                : t('invoices.deposit_none_left')}
            </p>
          )}
          {tooHigh && (
            <p className="text-sm text-destructive" role="alert" data-testid="deposit-too-high">
              {maxCents > 0n ? t('invoices.deposit_too_high', { max: formatMoney(centsToNumber(maxCents)) }) : t('invoices.deposit_none_left')}
            </p>
          )}
          <p className="min-h-5 text-sm font-medium" data-testid="deposit-preview" aria-live="polite">
            {preview}
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('common.cancel')}</AlertDialogCancel>
          <Button type="button" className="min-h-[44px]" disabled={!valid || pending} onClick={submit}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('invoices.deposit_confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
