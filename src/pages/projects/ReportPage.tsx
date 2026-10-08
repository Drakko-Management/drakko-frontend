import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Save, Loader2, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useReport, useUpdateReport, useReportLines, useAddReportLine, useUpdateReportLine, useDeleteReportLine } from '@/hooks/use-report'
import { useServices } from '@/hooks/use-services'
import { useProject } from '@/hooks/use-projects'
import { usePermissions } from '@/hooks/use-permissions'
import type { ReportLine } from '@/types/api'
import { TutorialHelpButton } from '@/tutorials/TutorialHelpButton'

function ReportLineCard({
  line,
  onUpdate,
  onDelete,
  isLocked,
}: {
  line: ReportLine
  onUpdate: (id: string, data: { snapshotTitle: string; complement: string }) => Promise<void>
  onDelete: (id: string) => void
  isLocked: boolean
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(line.snapshotTitle)
  const [editComplement, setEditComplement] = useState(line.complement ?? '')
  const [saving, setSaving] = useState(false)

  function handleCancel() {
    setEditTitle(line.snapshotTitle)
    setEditComplement(line.complement ?? '')
    setEditing(false)
  }

  async function handleSave() {
    if (!editTitle.trim()) return
    setSaving(true)
    try {
      await onUpdate(line.id, { snapshotTitle: editTitle.trim(), complement: editComplement.trim() })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl border bg-card p-3 space-y-2">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="min-h-[40px] text-sm"
          autoFocus
        />
        <Input
          value={editComplement}
          onChange={(e) => setEditComplement(e.target.value)}
          placeholder={t('report.line_complement_placeholder')}
          className="min-h-[40px] text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !editTitle.trim()}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t('common.save')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{line.snapshotTitle}</p>
        {line.snapshotUnit && (
          <p className="text-xs text-muted-foreground">{line.snapshotUnit}</p>
        )}
        {line.complement && (
          <p className="text-xs text-muted-foreground mt-0.5">{line.complement}</p>
        )}
      </div>
      {!isLocked && (
        <div className="flex shrink-0 gap-1">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
            onClick={() => setEditing(true)}
            aria-label={t('common.edit')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(line.id)}
            aria-label={t('common.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

export function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { can } = usePermissions()

  const { data: project } = useProject(id ?? '')
  const { data: report, isLoading } = useReport(id ?? '')
  const { data: lines = [], isLoading: linesLoading } = useReportLines(id ?? '')
  const { data: services = [] } = useServices(true)
  const updateReport = useUpdateReport(id ?? '')
  const addLine = useAddReportLine(id ?? '')
  const updateLine = useUpdateReportLine(id ?? '')
  const deleteLine = useDeleteReportLine(id ?? '')

  const [comment, setComment] = useState('')
  const [dirty, setDirty] = useState(false)

  // Add-line form state
  const [addOpen, setAddOpen] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState<string>('__free__')
  const [freeTitle, setFreeTitle] = useState('')
  const [complement, setComplement] = useState('')

  useEffect(() => {
    if (report?.comment !== undefined) {
      setComment(report.comment ?? '')
    }
  }, [report?.comment])

  const canEdit = can('chantiers', 'update')
  const isLocked = project?.status === 'AWAITING_SIGNATURE' || project?.status === 'COMPLETED' || project?.status === 'DISPUTED'

  async function handleSave() {
    try {
      await updateReport.mutateAsync(comment)
      setDirty(false)
      toast.success(t('report.report_saved'))
    } catch {
      toast.error(t('report.save_error'))
    }
  }

  async function handleAddLine() {
    const isFree = selectedServiceId === '__free__'
    if (isFree && !freeTitle.trim()) return

    try {
      await addLine.mutateAsync(
        isFree
          ? { title: freeTitle.trim(), complement: complement.trim() || undefined }
          : { serviceId: selectedServiceId, complement: complement.trim() || undefined }
      )
      toast.success(t('report.line_added'))
      setAddOpen(false)
      setSelectedServiceId('__free__')
      setFreeTitle('')
      setComplement('')
    } catch {
      toast.error(t('report.line_add_error'))
    }
  }

  async function handleUpdateLine(lineId: string, data: { snapshotTitle: string; complement: string }) {
    try {
      await updateLine.mutateAsync({
        lineId,
        data: { snapshotTitle: data.snapshotTitle, complement: data.complement || undefined },
      })
      toast.success(t('report.line_updated'))
    } catch {
      toast.error(t('report.line_update_error'))
    }
  }

  async function handleDeleteLine(lineId: string) {
    try {
      await deleteLine.mutateAsync(lineId)
      toast.success(t('report.line_deleted'))
    } catch {
      toast.error(t('report.line_delete_error'))
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
            onClick={() => void navigate(`/chantiers/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold">{t('report.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <TutorialHelpButton scope="report" className="h-10 w-10 shrink-0" />
          {canEdit && !isLocked && dirty && (
            <Button
              size="sm"
              className="min-h-[44px] gap-1.5"
              onClick={() => void handleSave()}
              disabled={updateReport.isPending}
            >
              {updateReport.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {t('report.save')}
            </Button>
          )}
        </div>
      </div>

      {project && (
        <div className="text-sm text-muted-foreground">
          {project.reference} · {project.title}
        </div>
      )}

      {isLocked && (
        <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          {t('report.locked_notice')}
        </div>
      )}

      {/* Service lines section */}
      <div className="space-y-2" data-tutorial="report-lines">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{t('report.lines_title')}</p>
          {canEdit && !isLocked && !addOpen && (
            <button
              className="flex items-center gap-1 text-xs text-primary font-medium min-h-[36px] px-2 rounded-lg active:bg-primary/10"
              data-tutorial="report-add"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('report.add_line')}
            </button>
          )}
        </div>

        {linesLoading ? (
          <Skeleton className="h-12 rounded-xl" />
        ) : lines.length === 0 && !addOpen ? (
          <p className="text-xs text-muted-foreground py-1">{t('report.no_lines')}</p>
        ) : (
          lines.map((line) => (
            <ReportLineCard
              key={line.id}
              line={line}
              onUpdate={(lid, data) => handleUpdateLine(lid, data)}
              onDelete={(lid) => void handleDeleteLine(lid)}
              isLocked={isLocked}
            />
          ))
        )}

        {addOpen && canEdit && !isLocked && (
          <div className="rounded-xl border bg-card p-3 space-y-3">
            <div className="space-y-1" data-tutorial="report-service">
              <Label htmlFor="line-service">{t('report.line_title_label')}</Label>
              <select
                id="line-service"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[44px]"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
              >
                <option value="__free__">{t('report.line_free')}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}{s.unit ? ` (${s.unit})` : ''}
                  </option>
                ))}
              </select>
              {selectedServiceId === '__free__' && (
                <Input
                  className="mt-1 min-h-[44px]"
                  placeholder={t('report.line_title_placeholder')}
                  value={freeTitle}
                  onChange={(e) => setFreeTitle(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1" data-tutorial="report-complement">
              <Label htmlFor="line-complement">{t('report.line_complement_label')}</Label>
              <Input
                id="line-complement"
                placeholder={t('report.line_complement_placeholder')}
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <div className="flex gap-2" data-tutorial="report-validate">
              <Button
                type="button"
                variant="outline"
                className="flex-1 min-h-[44px]"
                onClick={() => {
                  setAddOpen(false)
                  setSelectedServiceId('__free__')
                  setFreeTitle('')
                  setComplement('')
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                className="flex-1 min-h-[44px]"
                onClick={() => void handleAddLine()}
                disabled={
                  addLine.isPending ||
                  (selectedServiceId === '__free__' && !freeTitle.trim())
                }
              >
                {addLine.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('common.add')
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-4 space-y-2" data-tutorial="report-comment">
        <Label htmlFor="comment">{t('report.comment_label')}</Label>

        {isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value)
              setDirty(true)
            }}
            disabled={!canEdit || isLocked}
            placeholder={
              canEdit && !isLocked
                ? t('report.placeholder_edit')
                : t('report.placeholder_readonly')
            }
            className="min-h-[200px] text-sm"
            readOnly={!canEdit || isLocked}
          />
        )}
      </div>

      {canEdit && !isLocked && (
        <Button
          className="w-full min-h-[48px]"
          data-tutorial="report-save"
          onClick={() => void handleSave()}
          disabled={updateReport.isPending || !dirty}
        >
          {updateReport.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {dirty ? t('report.save') : t('report.saved')}
        </Button>
      )}
    </div>
  )
}
