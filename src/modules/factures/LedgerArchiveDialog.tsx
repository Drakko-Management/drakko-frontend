import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { downloadLedgerArchive, verifyLedger } from '@/hooks/use-ledger'
import { apiErrorMessage } from '@/lib/api-error'
import type { LedgerVerification } from '@/types/api'
import { todayInput } from './format'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Les six dernières années, l'année en cours d'abord : la loi demande une archive au moins une fois par an
const YEARS = 6

/**
 * « Archive » : l'archive annuelle du journal des factures et des règlements, et son contrôle (ADR-038,
 * 12-legal-compliance.md § 3). Générer l'archive écrit une ligne au journal (sa propre date) ; contrôler ne
 * modifie rien.
 */
export function LedgerArchiveDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const current = Number(todayInput().slice(0, 4))
  const [year, setYear] = useState(current)
  const [generating, setGenerating] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<LedgerVerification | null>(null)
  const busy = generating || verifying

  // Chaque ouverture repart de l'année en cours, sans le constat d'avant
  useEffect(() => {
    if (open) {
      setYear(current)
      setResult(null)
    }
  }, [open, current])

  async function generate() {
    setGenerating(true)
    try {
      await downloadLedgerArchive(year)
      toast.success(t('invoices.ledger_generated'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'invoices.ledger_error'))
    } finally {
      setGenerating(false)
    }
  }

  async function verify() {
    setVerifying(true)
    try {
      setResult(await verifyLedger())
    } catch (err) {
      setResult(null)
      toast.error(apiErrorMessage(err, t, 'invoices.ledger_verify_error'))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('invoices.ledger_title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('invoices.ledger_description')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ledger-year">{t('invoices.ledger_year')}</Label>
              <select
                id="ledger-year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Array.from({ length: YEARS }, (_, index) => current - index).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" className="min-h-[44px] w-full" disabled={busy} onClick={() => void generate()}>
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('invoices.ledger_generate')}
            </Button>
          </section>

          <section className="space-y-3 border-t pt-4">
            <Button type="button" variant="outline" className="min-h-[44px] w-full" disabled={busy} onClick={() => void verify()}>
              {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('invoices.ledger_verify')}
            </Button>

            {result?.ok && (
              <div
                role="status"
                className="flex gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900"
                data-testid="ledger-ok"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {t('invoices.ledger_ok', { events: result.events, invoices: result.invoices })}
                  {result.legacyInvoices > 0 && ` ${t('invoices.ledger_legacy', { count: result.legacyInvoices })}`}
                </p>
              </div>
            )}

            {result && !result.ok && (
              <div
                role="alert"
                className="space-y-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
                data-testid="ledger-problems"
              >
                <p className="flex gap-2 font-medium">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  {t('invoices.ledger_problems', { count: result.problems.length })}
                </p>
                <ul className="list-disc space-y-0.5 pl-6 text-xs">
                  {result.problems.slice(0, 20).map((problem, index) => (
                    <li key={index}>
                      {t(`invoices.ledger_problem_${problem.code}`)}
                      {problem.invoice ? ` — ${problem.invoice}` : ''}
                      {problem.sequence ? ` (#${problem.sequence})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t('common.close')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
