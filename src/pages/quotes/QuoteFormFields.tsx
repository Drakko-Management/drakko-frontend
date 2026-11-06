import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ClientCreateDialog } from '@/components/clients/ClientCreateDialog'
import { ClientSearch } from '@/components/clients/ClientSearch'
import { useServices } from '@/hooks/use-services'
import { cn, DATE_INPUT_MAX, DATE_INPUT_MIN, todayInput } from '@/lib/utils'
import { centsToNumber, computeBalanceTotals, toCents } from '@/modules/devis/totals'
import { formatMoney } from '@/modules/devis/format'
import type { Client } from '@/types/api'
import { FREE_LINE, decimal, isLineValid, lineFromService, newKey, type FormLine, type QuoteFormValues } from './quote-form'

interface Props {
  /** Le formulaire sert aux devis et aux factures (ADR-033) : seul le champ de date et le régime de TVA changent. */
  kind?: 'quote' | 'invoice'
  /** Franchise de TVA : le taux est 0 et ne se change pas, la mention légale remplace la ligne de TVA */
  vatExempt?: boolean
  /** Facture : le délai de paiement de l'organisation, dit sous le champ d'échéance laissé vide */
  dueDays?: number
  /** Facture de solde : les acomptes déjà facturés (montants hors taxe en centimes, positifs), retranchés des totaux */
  deductions?: { reference: string; cents: bigint }[]
  values: QuoteFormValues
  onChange: (values: QuoteFormValues) => void
  onSubmit: () => void
  isPending: boolean
  submitLabel: string
  /** Taux appliqué quand le champ est vide (réglage de l'organisation) */
  defaultVatRate: number
}

export function QuoteFormFields({
  kind = 'quote',
  vatExempt = false,
  dueDays,
  deductions = [],
  values,
  onChange,
  onSubmit,
  isPending,
  submitLabel,
  defaultVatRate,
}: Props) {
  const { t } = useTranslation()
  const { data: services } = useServices(true)
  const [attempted, setAttempted] = useState(false)
  // Texte tapé dans la recherche quand la fenêtre de création de client est ouverte (null = fermée)
  const [newClientName, setNewClientName] = useState<string | null>(null)

  const set = <K extends keyof QuoteFormValues>(key: K, value: QuoteFormValues[K]) => onChange({ ...values, [key]: value })
  const setLine = (key: string, patch: Partial<FormLine>) =>
    set('lines', values.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)))

  const rate = vatExempt ? '0' : values.vatRate.trim() === '' ? String(defaultVatRate) : values.vatRate
  const deducted = deductions.reduce((sum, item) => sum + item.cents, 0n)
  const totals = computeBalanceTotals(values.lines, rate, deducted)
  const invalidLines = values.lines.filter((line) => !isLineValid(line))
  const rateInvalid = !vatExempt && values.vatRate.trim() !== '' && (toCents(values.vatRate) === null || decimal(values.vatRate) > 100)
  // Une validité déjà passée n'est pas refusée à la saisie (on peut reprendre un vieux devis), mais le devis ne partira pas
  const validityPast = kind === 'quote' && values.date !== '' && values.date < todayInput()
  const clientMissing = attempted && !values.client
  const linesInvalid = attempted && invalidLines.length > 0

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setAttempted(true)
    if (!values.client || invalidLines.length > 0 || rateInvalid) return
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="client-search">{t('quotes.form_client')}</Label>
        <ClientSearch
          value={values.client as Client | null}
          onChange={(client) => set('client', client)}
          onCreate={setNewClientName}
          invalid={clientMissing}
        />
        {clientMissing && (
          <p id="client-error" className="text-sm text-destructive">
            {t('quotes.form_client_required')}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="quote-title">{t('quotes.form_title')}</Label>
        <Input
          id="quote-title"
          className="min-h-[44px]"
          maxLength={200}
          placeholder={t('quotes.form_title_placeholder')}
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="quote-valid-until">{t(kind === 'invoice' ? 'invoices.form_due_date' : 'quotes.form_valid_until')}</Label>
          <Input
            id="quote-valid-until"
            type="date"
            className="min-h-[44px]"
            value={values.date}
            min={DATE_INPUT_MIN}
            max={DATE_INPUT_MAX}
            onChange={(e) => set('date', e.target.value)}
            aria-describedby={kind === 'invoice' ? 'quote-date-hint' : validityPast ? 'quote-date-past' : undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quote-vat">{t('quotes.form_vat')}</Label>
          <Input
            id="quote-vat"
            inputMode="decimal"
            className={cn('min-h-[44px]', rateInvalid && 'border-destructive')}
            placeholder={String(defaultVatRate)}
            value={vatExempt ? '0' : values.vatRate}
            disabled={vatExempt}
            onChange={(e) => set('vatRate', e.target.value)}
            aria-invalid={rateInvalid}
          />
        </div>
      </div>
      {validityPast && (
        <p id="quote-date-past" role="status" className="-mt-3 text-xs text-amber-800" data-testid="valid-until-past">
          {t('quotes.form_valid_until_past')}
        </p>
      )}
      {kind === 'invoice' && values.date === '' && dueDays !== undefined && (
        <p id="quote-date-hint" className="-mt-3 text-xs text-muted-foreground">
          {t('invoices.form_due_date_hint', { days: dueDays })}
        </p>
      )}
      {vatExempt && <p className="-mt-3 text-xs text-muted-foreground">{t('quotes.vat_exempt_note')}</p>}
      {kind === 'invoice' && (
        <div className="space-y-1.5">
          <Label htmlFor="invoice-service-date">{t('invoices.form_service_date')}</Label>
          <Input
            id="invoice-service-date"
            type="date"
            className="min-h-[44px] sm:max-w-[50%]"
            value={values.serviceDate}
            min={DATE_INPUT_MIN}
            max={DATE_INPUT_MAX}
            onChange={(e) => set('serviceDate', e.target.value)}
            aria-describedby="invoice-service-date-hint"
          />
          <p id="invoice-service-date-hint" className="text-xs text-muted-foreground">
            {t('invoices.form_service_date_hint')}
          </p>
        </div>
      )}

      <section className="space-y-3" aria-label={t('quotes.form_lines')}>
        <h2 className="text-sm font-semibold">{t('quotes.form_lines')}</h2>

        {values.lines.length === 0 && <p className="text-sm text-muted-foreground">{t('quotes.form_no_lines')}</p>}

        {values.lines.map((line, index) => {
          const total = totals.lines[index]
          const invalid = attempted && !isLineValid(line)
          return (
            <div
              key={line.key}
              className={cn('space-y-2 rounded-xl border bg-card p-3', invalid && 'border-destructive')}
              data-testid="quote-line"
            >
              <div className="flex items-start gap-2">
                <Input
                  aria-label={t('quotes.form_line_title')}
                  className="min-h-[44px] font-medium"
                  maxLength={200}
                  placeholder={t('quotes.form_line_title')}
                  value={line.title}
                  onChange={(e) => setLine(line.key, { title: e.target.value })}
                />
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-destructive/70 hover:bg-destructive/10 active:bg-destructive/10"
                  aria-label={t('quotes.form_remove_line')}
                  onClick={() => set('lines', values.lines.filter((l) => l.key !== line.key))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Textarea
                aria-label={t('quotes.form_line_description')}
                className="min-h-[56px]"
                rows={2}
                maxLength={2000}
                placeholder={t('quotes.form_line_description')}
                value={line.description}
                onChange={(e) => setLine(line.key, { description: e.target.value })}
              />
              <div className="grid grid-cols-[1fr_1fr_1fr] items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground" htmlFor={`${line.key}-qty`}>
                    {t('quotes.form_line_quantity')}
                  </Label>
                  <Input
                    id={`${line.key}-qty`}
                    inputMode="decimal"
                    className="min-h-[44px]"
                    value={line.quantity}
                    onChange={(e) => setLine(line.key, { quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground" htmlFor={`${line.key}-unit`}>
                    {t('quotes.form_line_unit')}
                  </Label>
                  <Input
                    id={`${line.key}-unit`}
                    className="min-h-[44px]"
                    maxLength={20}
                    value={line.unit}
                    onChange={(e) => setLine(line.key, { unit: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground" htmlFor={`${line.key}-price`}>
                    {t('quotes.form_line_price')}
                  </Label>
                  <Input
                    id={`${line.key}-price`}
                    inputMode="decimal"
                    className="min-h-[44px]"
                    value={line.unitPrice}
                    onChange={(e) => setLine(line.key, { unitPrice: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-right text-sm font-medium" data-testid="quote-line-total">
                {total === null ? '—' : formatMoney(centsToNumber(total))}
              </p>
            </div>
          )
        })}

        {linesInvalid && <p className="text-sm text-destructive">{t('quotes.form_lines_invalid')}</p>}

        <div className="flex flex-wrap gap-2">
          {services && services.length > 0 && (
            <select
              aria-label={t('quotes.form_add_service')}
              className="h-11 min-w-0 flex-1 rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value=""
              onChange={(e) => {
                const service = services.find((s) => s.id === e.target.value)
                if (service) set('lines', [...values.lines, lineFromService(service)])
              }}
            >
              <option value="">{t('quotes.form_add_service')}</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
          )}
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => set('lines', [...values.lines, { ...FREE_LINE, key: newKey() }])}
          >
            <Plus className="h-4 w-4" />
            {t('quotes.form_add_free_line')}
          </Button>
        </div>
      </section>

      <div className="space-y-1.5">
        <Label htmlFor="quote-comment">{t('quotes.form_comment')}</Label>
        <Textarea
          id="quote-comment"
          rows={3}
          maxLength={2000}
          value={values.comment}
          onChange={(e) => set('comment', e.target.value)}
        />
      </div>

      <dl className="space-y-1 rounded-xl border bg-card p-4 text-sm" aria-label={t('quotes.form_totals')}>
        {deductions.length > 0 && (
          <>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('invoices.works_total')}</dt>
              <dd data-testid="quote-works-total">{formatMoney(centsToNumber(totals.worksSubtotal))}</dd>
            </div>
            {deductions.map((item) => (
              <div key={item.reference} className="flex justify-between" data-testid="quote-deduction">
                <dt className="text-muted-foreground">{t('invoices.deposit_deducted', { reference: item.reference })}</dt>
                <dd>{formatMoney(centsToNumber(-item.cents))}</dd>
              </div>
            ))}
          </>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('quotes.subtotal')}</dt>
          <dd data-testid="quote-subtotal">{formatMoney(centsToNumber(totals.subtotal))}</dd>
        </div>
        {!vatExempt && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('quotes.vat', { rate: rateInvalid ? '?' : rate })}</dt>
            <dd data-testid="quote-vat-amount">{formatMoney(centsToNumber(totals.vatAmount))}</dd>
          </div>
        )}
        <div className="flex justify-between border-t pt-1 text-base font-bold">
          <dt>{t(deductions.length > 0 ? 'invoices.balance_due' : 'quotes.total')}</dt>
          <dd data-testid="quote-total">{formatMoney(centsToNumber(totals.total))}</dd>
        </div>
      </dl>
      {deductions.length > 0 && <p className="text-xs text-muted-foreground">{t('invoices.form_deductions_note')}</p>}
      {totals.subtotal < 0n && (
        <p className="text-sm text-destructive" role="alert" data-testid="quote-balance-negative">
          {t('invoices.form_balance_negative')}
        </p>
      )}

      <Button type="submit" className="min-h-[48px] w-full" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>

      {newClientName !== null && (
        <ClientCreateDialog
          name={newClientName}
          onClose={() => setNewClientName(null)}
          onCreated={(client) => {
            set('client', client)
            setNewClientName(null)
          }}
        />
      )}
    </form>
  )
}
