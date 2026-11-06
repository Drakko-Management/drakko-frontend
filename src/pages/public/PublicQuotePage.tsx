import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle, Clock, FileDown, Loader2, Mail, Phone, SearchX, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { publicQuotePdfUrl, useAcceptPublicQuote, usePublicQuote, useRejectPublicQuote } from '@/hooks/use-public-quote'
import { apiErrorMessage } from '@/lib/api-error'
import { formatDate, formatDay } from '@/lib/utils'
import { formatMoney, formatQuantity } from '@/modules/devis/format'
import type { PublicQuote } from '@/types/api'

const SUPPORTED_LANGS = ['fr', 'en', 'es', 'it', 'de']

type Quote = NonNullable<PublicQuote['quote']>

/**
 * La page d'un devis pour son client (ADR-031) : sans compte, par le lien reçu par email. Sa langue est celle de
 * l'entreprise (celle de l'email et du PDF), le navigateur seulement le temps de charger.
 */
export function PublicQuotePage() {
  const { i18n } = useTranslation()
  const { token = '' } = useParams<{ token: string }>()
  const { data, isLoading, error } = usePublicQuote(token)
  const accept = useAcceptPublicQuote(token)
  const reject = useRejectPublicQuote(token)

  const browserLang = navigator.language.slice(0, 2)
  const preferred = data?.language ?? browserLang
  const lang = SUPPORTED_LANGS.includes(preferred) ? preferred : 'fr'
  const t = i18n.getFixedT(lang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const [signerName, setSignerName] = useState('')
  const [message, setMessage] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return <Notice icon="missing" title={t('quote_public.invalid_title')} description={t('quote_public.invalid_desc')} />
  }

  const org = data.organization

  if (data.state === 'EXPIRED') {
    return <Notice icon="expired" title={t('quote_public.expired_title')} description={t('quote_public.expired_desc', { org: org.name })} org={org} lang={lang} />
  }
  if (data.state === 'WITHDRAWN' || !data.quote) {
    return <Notice icon="withdrawn" title={t('quote_public.withdrawn_title')} description={t('quote_public.withdrawn_desc', { org: org.name })} org={org} lang={lang} />
  }

  const quote = data.quote
  const answered = data.state === 'ACCEPTED' || data.state === 'REJECTED'
  const nameValid = signerName.trim().length >= 2

  async function handleAccept(event: React.FormEvent) {
    event.preventDefault()
    if (!nameValid || !agreed) return
    try {
      await accept.mutateAsync({ signerName: signerName.trim(), comment: message.trim() || undefined })
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'quote_public.error_answer'))
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync(reason.trim())
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'quote_public.error_answer'))
    }
  }

  return (
    <main className="mx-auto max-w-lg space-y-5 p-4 pb-10">
      <header className="space-y-1 pt-2">
        <p className="text-sm text-muted-foreground">{org.name}</p>
        <h1 className="text-xl font-bold">{t('quote_public.title', { reference: quote.reference })}</h1>
        {quote.title && <p className="font-medium">{quote.title}</p>}
        <p className="text-sm text-muted-foreground">{t('quote_public.for_client', { name: quote.clientName })}</p>
        {quote.validUntil && (
          <p className="text-xs text-muted-foreground">{t('quote_public.valid_until', { date: formatDay(quote.validUntil, lang) })}</p>
        )}
      </header>

      {answered && <Answer data={data} t={t} lang={lang} />}

      <QuoteBody quote={quote} lang={lang} t={t} />

      <a
        href={publicQuotePdfUrl(token)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium active:bg-muted"
      >
        <FileDown className="h-4 w-4" />
        {t('quote_public.download_pdf')}
      </a>

      {data.state === 'OPEN' && !rejecting && (
        <form onSubmit={(e) => void handleAccept(e)} className="space-y-4 rounded-xl border bg-card p-4" noValidate>
          <h2 className="font-semibold">{t('quote_public.accept_title')}</h2>
          {/* Un particulier : le droit de rétractation se dit avant d'accepter, les textes officiels sont dans le PDF (ADR-036) */}
          {quote.clientKind !== 'PROFESSIONAL' && (
            <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground" data-testid="public-quote-withdrawal">
              {t('quote_public.withdrawal_notice')}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="signer-name">{t('quote_public.name_label')}</Label>
            <Input
              id="signer-name"
              className="min-h-[44px]"
              autoComplete="name"
              maxLength={120}
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signer-message">{t('quote_public.message_label')}</Label>
            <Textarea id="signer-message" rows={2} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>{t('quote_public.agree_label', { total: formatMoney(quote.total, lang) })}</span>
          </label>
          <Button type="submit" className="min-h-[48px] w-full" disabled={!nameValid || !agreed || accept.isPending}>
            {accept.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('quote_public.accept_button')}
          </Button>
          <button
            type="button"
            className="flex min-h-[44px] w-full items-center justify-center text-sm text-muted-foreground underline"
            onClick={() => setRejecting(true)}
          >
            {t('quote_public.reject_button')}
          </button>
        </form>
      )}

      {data.state === 'OPEN' && rejecting && (
        <section className="space-y-4 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">{t('quote_public.reject_title')}</h2>
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">{t('quote_public.reject_reason_label')}</Label>
            <Textarea id="reject-reason" rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <Button type="button" variant="destructive" className="min-h-[48px] w-full" disabled={reject.isPending} onClick={() => void handleReject()}>
            {reject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('quote_public.reject_confirm')}
          </Button>
          <button type="button" className="flex min-h-[44px] w-full items-center justify-center text-sm text-muted-foreground underline" onClick={() => setRejecting(false)}>
            {t('quote_public.reject_back')}
          </button>
        </section>
      )}

      <Contact org={org} t={t} />
    </main>
  )
}

type Translate = ReturnType<ReturnType<typeof useTranslation>['i18n']['getFixedT']>

function Answer({ data, t, lang }: { data: PublicQuote; t: Translate; lang: string }) {
  const accepted = data.state === 'ACCEPTED'
  const answer = data.answer
  return (
    <section
      role="status"
      className={`space-y-1 rounded-xl border p-4 ${accepted ? 'border-green-300 bg-green-50 text-green-900' : 'border-orange-300 bg-orange-50 text-orange-900'}`}
    >
      <p className="flex items-center gap-2 font-semibold">
        {accepted ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
        {t(accepted ? 'quote_public.accepted_title' : 'quote_public.rejected_title')}
      </p>
      <p className="text-sm">
        {accepted
          ? t('quote_public.accepted_desc', { name: answer?.signerName ?? '', date: formatDate(answer?.respondedAt, lang), org: data.organization.name })
          : t('quote_public.rejected_desc', { date: formatDate(answer?.respondedAt, lang), org: data.organization.name })}
      </p>
      {answer?.comment && <p className="text-sm italic">« {answer.comment} »</p>}
    </section>
  )
}

function QuoteBody({ quote, lang, t }: { quote: Quote; lang: string; t: Translate }) {
  return (
    <>
      <section className="space-y-2" aria-label={t('quote_public.lines')}>
        {quote.lines.map((line, index) => (
          <div key={index} className="flex items-start justify-between gap-3 rounded-xl border bg-card p-3" data-testid="public-quote-line">
            <div className="min-w-0">
              <p className="text-sm font-medium">{line.title}</p>
              {line.description && <p className="mt-0.5 text-xs text-muted-foreground">{line.description}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {formatQuantity(line.quantity, lang)}
                {line.unit ? ` ${line.unit}` : ''} × {formatMoney(line.unitPrice, lang)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold">{formatMoney(line.total, lang)}</p>
          </div>
        ))}
      </section>

      <dl className="space-y-1 rounded-xl border bg-card p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('quote_public.subtotal')}</dt>
          <dd>{formatMoney(quote.subtotal, lang)}</dd>
        </div>
        {quote.vatExempt ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground" data-testid="public-quote-vat-exempt">
              {t('quote_public.vat_exempt_note')}
            </dt>
          </div>
        ) : (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('quote_public.vat', { rate: parseFloat(quote.vatRate) })}</dt>
            <dd>{formatMoney(quote.vatAmount, lang)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t pt-1 text-base font-bold">
          <dt>{t('quote_public.total')}</dt>
          <dd data-testid="public-quote-total">{formatMoney(quote.total, lang)}</dd>
        </div>
      </dl>

      {quote.comment && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold">{t('quote_public.comment_title')}</h2>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{quote.comment}</p>
        </section>
      )}
    </>
  )
}

function Contact({ org, t }: { org: PublicQuote['organization']; t: Translate }) {
  if (!org.phone && !org.email) return null
  return (
    <footer className="space-y-1 pt-2 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{t('quote_public.contact', { org: org.name })}</p>
      {org.phone && (
        <a href={`tel:${org.phone}`} className="flex min-h-[44px] items-center gap-2">
          <Phone className="h-4 w-4" />
          {org.phone}
        </a>
      )}
      {org.email && (
        <a href={`mailto:${org.email}`} className="flex min-h-[44px] items-center gap-2">
          <Mail className="h-4 w-4" />
          {org.email}
        </a>
      )}
    </footer>
  )
}

function Notice({
  icon,
  title,
  description,
  org,
  lang,
}: {
  icon: 'missing' | 'expired' | 'withdrawn'
  title: string
  description: string
  org?: PublicQuote['organization']
  lang?: string
}) {
  const { i18n } = useTranslation()
  const t = i18n.getFixedT(lang ?? 'fr')
  const Icon = icon === 'missing' ? SearchX : icon === 'expired' ? Clock : AlertCircle
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {org && <Contact org={org} t={t} />}
    </main>
  )
}
