import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { CheckCircle, XCircle, Loader2, RotateCcw, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicReport, useSign, useSignLift, useRefuse } from '@/hooks/use-signature'
import { formatDate } from '@/lib/utils'

function SignatureCanvas({
  onHasStrokes,
  canvasRef,
  placeholder,
  clearLabel,
}: {
  onHasStrokes: (v: boolean) => void
  canvasRef: React.RefObject<HTMLCanvasElement>
  placeholder: string
  clearLabel: string
}) {
  const [drawing, setDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setDrawing(true)
  }

  function move(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e, canvas)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    if (!hasStrokes) {
      setHasStrokes(true)
      onHasStrokes(true)
    }
  }

  function end() { setDrawing(false) }

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
    onHasStrokes(false)
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-input bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full touch-none"
          style={{ height: 160 }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {!hasStrokes && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {placeholder}
          </div>
        )}
      </div>
      {hasStrokes && (
        <button
          type="button"
          onClick={clear}
          className="flex min-h-[44px] items-center gap-1 text-xs text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {clearLabel}
        </button>
      )}
    </div>
  )
}

const SUPPORTED_LANGS = ['fr', 'en', 'es', 'it', 'de']

export function SignPage() {
  const { i18n } = useTranslation()
  const browserLang = navigator.language.slice(0, 2)
  const lang = SUPPORTED_LANGS.includes(browserLang) ? browserLang : 'fr'
  const t = i18n.getFixedT(lang)

  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const isOnsite = searchParams.get('back') === '1'
  const { data, isLoading, error } = usePublicReport(token ?? '')
  const sign = useSign(token ?? '')
  const signLift = useSignLift(token ?? '')
  const refuse = useRefuse(token ?? '')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signerName, setSignerName] = useState('')
  const [receptionChoice, setReceptionChoice] = useState<'ACCEPTED' | 'ACCEPTED_WITH_RESERVES' | 'REFUSED'>('ACCEPTED')
  const [reserveNotes, setReserveNotes] = useState('')
  const [hasSignature, setHasSignature] = useState(false)
  const [signed, setSigned] = useState(false)
  const [refuseComment, setRefuseComment] = useState('')
  const [refused, setRefused] = useState(false)

  const isReserveLift = data?.signatureRequestType === 'RESERVE_LIFT'

  useEffect(() => {
    if (data?.client) {
      setSignerName(`${data.client.firstName} ${data.client.lastName}`)
    }
  }, [data?.client])

  function getSignatureImage() {
    const canvas = canvasRef.current
    if (!canvas) return null
    const dataUrl = canvas.toDataURL('image/png')
    return dataUrl.split(',')[1] ?? null
  }

  async function handleSubmitReception(e: React.FormEvent) {
    e.preventDefault()
    if (!hasSignature) { toast.error(t('sign.error_sign_required')); return }
    if (!signerName.trim()) { toast.error(t('sign.error_name_required')); return }
    if (receptionChoice === 'ACCEPTED_WITH_RESERVES' && !reserveNotes.trim()) {
      toast.error(t('sign.error_reserves_required')); return
    }
    const signatureImage = getSignatureImage()
    if (!signatureImage) return
    const choice = receptionChoice as 'ACCEPTED' | 'ACCEPTED_WITH_RESERVES'
    try {
      await sign.mutateAsync({
        signerName: signerName.trim(),
        receptionChoice: choice,
        reserveNotes: receptionChoice === 'ACCEPTED_WITH_RESERVES' ? reserveNotes.trim() : undefined,
        signatureImage,
      })
      setSigned(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('sign.error_sign_failed'))
    }
  }

  async function handleSubmitLift(e: React.FormEvent) {
    e.preventDefault()
    if (!hasSignature) { toast.error(t('sign.error_sign_required')); return }
    if (!signerName.trim()) { toast.error(t('sign.error_name_required')); return }
    const signatureImage = getSignatureImage()
    if (!signatureImage) return
    try {
      await signLift.mutateAsync({ signerName: signerName.trim(), signatureImage })
      setSigned(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('sign.error_sign_failed'))
    }
  }

  if (signed) {
    const isWithReserves = receptionChoice === 'ACCEPTED_WITH_RESERVES' && !isReserveLift
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
        <div className={`flex h-16 w-16 items-center justify-center rounded-full ${isWithReserves ? 'bg-amber-100' : 'bg-green-100'}`}>
          {isWithReserves
            ? <AlertCircle className="h-8 w-8 text-amber-600" />
            : <CheckCircle className="h-8 w-8 text-green-600" />
          }
        </div>
        <div>
          <h1 className="text-xl font-bold">
            {isReserveLift ? t('sign.lift_success_title') : isWithReserves ? t('sign.reserves_success_title') : t('sign.success_title')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isReserveLift ? t('sign.lift_success_desc') : isWithReserves ? t('sign.reserves_success_desc') : t('sign.success_desc')}
          </p>
        </div>
        {isOnsite ? (
          <button
            onClick={() => { window.location.href = `/chantiers/${data?.project.id}` }}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('sign.back_to_project')}
          </button>
        ) : data?.pdfUrl ? (
          <a
            href={data.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground"
          >
            {t('sign.pdf_ready')}
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">{t('sign.pdf_generating')}</p>
        )}
      </div>
    )
  }

  if (refused) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
          <XCircle className="h-8 w-8 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t('sign.refused_title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('sign.refused_desc')}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-semibold">{t('sign.invalid_title')}</p>
        <p className="text-sm text-muted-foreground">{t('sign.invalid_desc')}</p>
      </div>
    )
  }

  if (data.alreadyRefused) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
          <XCircle className="h-8 w-8 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t('sign.already_refused_title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('sign.already_refused_desc')}</p>
          {data.refusalComment && (
            <p className="mt-3 rounded-lg bg-muted p-3 text-left text-sm italic text-muted-foreground">
              « {data.refusalComment} »
            </p>
          )}
        </div>
      </div>
    )
  }

  if (data.alreadySigned) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t('sign.already_signed_title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('sign.already_signed_desc')}</p>
        </div>
        {data.pdfUrl && (
          <a
            href={data.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground"
          >
            {t('sign.pdf_ready')}
          </a>
        )}
      </div>
    )
  }

  const { project, client, report, photos } = data
  const beforePhotos = photos.filter((p) => p.type === 'BEFORE')
  const afterPhotos = photos.filter((p) => p.type === 'AFTER')

  // ── LEVÉE DES RÉSERVES ──
  if (isReserveLift) {
    return (
      <div className="mx-auto max-w-lg space-y-6 p-4 pb-12">
        <div className="flex items-center gap-2 pt-2">
          {isOnsite && (
            <button
              onClick={() => window.history.back()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-card"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <span className="font-bold text-foreground">Drakko</span>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{project.reference}</p>
          <h1 className="text-xl font-bold">{project.title}</h1>
          <p className="text-sm text-muted-foreground">{project.address}</p>
        </div>

        {data.reserveNotes && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">{t('sign.initial_reserves')}</p>
            <p className="text-sm text-amber-800 dark:text-amber-300">{data.reserveNotes}</p>
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmitLift(e) }} className="space-y-5 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">{t('sign.lift_form_title')}</h2>
          <p className="text-sm text-muted-foreground">{t('sign.lift_form_desc')}</p>

          <div className="space-y-2">
            <Label htmlFor="signerName">{t('sign.signer_name')}</Label>
            <Input
              id="signerName"
              className="min-h-[44px]"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t('sign.signature_label')}</Label>
            <SignatureCanvas canvasRef={canvasRef} onHasStrokes={setHasSignature} placeholder={t('sign.canvas_placeholder')} clearLabel={t('sign.canvas_clear')} />
          </div>

          <Button type="submit" className="w-full min-h-[52px] text-base" disabled={signLift.isPending}>
            {signLift.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {t('sign.lift_submit_btn')}
          </Button>
        </form>
      </div>
    )
  }

  // ── SIGNATURE INITIALE ──
  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 pb-12">
      <div className="flex items-center gap-2 pt-2">
        {isOnsite && (
          <button
            onClick={() => window.history.back()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-card"
            aria-label={t('sign.back_to_project')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="font-bold text-foreground">Drakko</span>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{project.reference}</p>
        <h1 className="text-xl font-bold">{project.title}</h1>
        <p className="text-sm text-muted-foreground">{project.address}</p>
        {(project.startDate ?? project.expectedEndDate) && (
          <p className="text-xs text-muted-foreground">
            {formatDate(project.startDate)} → {formatDate(project.expectedEndDate)}
          </p>
        )}
      </div>

      <div className="rounded-xl bg-muted/50 p-4">
        <p className="mb-1 text-xs text-muted-foreground">{t('sign.recipient')}</p>
        <p className="font-semibold">{client.firstName} {client.lastName}</p>
        {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}

      {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
        <div className="space-y-3">
          <h2 className="font-semibold">{t('sign.photos_section')}</h2>
          {beforePhotos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t('sign.photos_before')}</p>
              <div className="grid grid-cols-3 gap-2">
                {beforePhotos.map((p) => (
                  <img key={p.id} src={p.signedUrl ?? ''} alt={t('sign.photos_before')} className="aspect-square rounded-lg object-cover" />
                ))}
              </div>
            </div>
          )}
          {afterPhotos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t('sign.photos_after')}</p>
              <div className="grid grid-cols-3 gap-2">
                {afterPhotos.map((p) => (
                  <img key={p.id} src={p.signedUrl ?? ''} alt={t('sign.photos_after')} className="aspect-square rounded-lg object-cover" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {report && (report.lines.length > 0 || report.comment) && (
        <div className="space-y-3">
          <h2 className="font-semibold">{t('sign.report_section')}</h2>
          {report.lines.length > 0 && (
            <div className="space-y-1.5">
              {report.lines.map((line, i) => (
                <div key={i} className="rounded-xl bg-muted/50 px-4 py-2.5">
                  <p className="text-sm font-medium leading-snug">
                    {line.snapshotTitle}
                    {line.snapshotUnit && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">({line.snapshotUnit})</span>
                    )}
                  </p>
                  {line.complement && (
                    <p className="text-xs text-muted-foreground mt-0.5">{line.complement}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {report.comment && (
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="whitespace-pre-wrap text-sm">{report.comment}</p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={(e) => { void handleSubmitReception(e) }} className="space-y-5 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">{t('sign.form_title')}</h2>

        {/* 3 choix de réception */}
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('sign.reception_choice_label')}</p>
          {(['ACCEPTED', 'ACCEPTED_WITH_RESERVES', 'REFUSED'] as const).map((choice) => (
            <label
              key={choice}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${receptionChoice === choice ? 'border-primary bg-primary/5' : ''}`}
            >
              <input
                type="radio"
                name="receptionChoice"
                value={choice}
                checked={receptionChoice === choice}
                onChange={() => setReceptionChoice(choice)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="text-sm leading-snug">
                {t(`sign.choice_${choice.toLowerCase()}`)}
              </span>
            </label>
          ))}
        </div>

        {/* Champ réserves */}
        {receptionChoice === 'ACCEPTED_WITH_RESERVES' && (
          <div className="space-y-2">
            <Label htmlFor="reserveNotes">{t('sign.reserves_notes_label')} *</Label>
            <textarea
              id="reserveNotes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={4}
              placeholder={t('sign.reserves_notes_placeholder')}
              value={reserveNotes}
              onChange={(e) => setReserveNotes(e.target.value)}
            />
          </div>
        )}

        {/* Formulaire refus */}
        {receptionChoice === 'REFUSED' && (
          <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">{t('sign.refuse_title')}</p>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={4}
              placeholder={t('sign.refuse_placeholder')}
              value={refuseComment}
              onChange={(e) => setRefuseComment(e.target.value)}
            />
            <Button
              type="button"
              variant="destructive"
              className="w-full min-h-[44px]"
              disabled={!refuseComment.trim() || refuse.isPending}
              onClick={async () => {
                try {
                  await refuse.mutateAsync({ comment: refuseComment.trim() })
                  setRefused(true)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t('sign.error_refuse_failed'))
                }
              }}
            >
              {refuse.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('sign.refuse_confirm')}
            </Button>
          </div>
        )}

        {receptionChoice !== 'REFUSED' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="signerName">{t('sign.signer_name')}</Label>
              <Input
                id="signerName"
                className="min-h-[44px]"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t('sign.signature_label')}</Label>
              <SignatureCanvas canvasRef={canvasRef} onHasStrokes={setHasSignature} placeholder={t('sign.canvas_placeholder')} clearLabel={t('sign.canvas_clear')} />
            </div>

            <Button type="submit" className="w-full min-h-[52px] text-base" disabled={sign.isPending || refuse.isPending}>
              {sign.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {t('sign.submit_btn')}
            </Button>
          </>
        )}
      </form>
    </div>
  )
}
