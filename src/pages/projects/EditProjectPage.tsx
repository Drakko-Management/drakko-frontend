import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete'
import { useProject, useUpdateProject } from '@/hooks/use-projects'
import { buildAddress, parseAddress } from '@/lib/utils'

export function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: project, isLoading } = useProject(id ?? '')
  const updateProject = useUpdateProject(id ?? '')

  const [form, setForm] = useState({
    title: '',
    street: '',
    postalCode: '',
    city: '',
    projectManager: '',
    description: '',
    notes: '',
    quoteAmount: '',
    startDate: '',
    expectedEndDate: '',
  })

  useEffect(() => {
    if (!project) return
    if (['AWAITING_SIGNATURE', 'COMPLETED', 'DISPUTED'].includes(project.status)) {
      void navigate(`/chantiers/${id}`, { replace: true })
      return
    }
    const { street, postalCode, city } = parseAddress(project.address)
    setForm({
      title: project.title,
      street,
      postalCode,
      city,
      projectManager: project.projectManager ?? '',
      description: project.description ?? '',
      notes: project.notes ?? '',
      quoteAmount: project.quoteAmount ?? '',
      startDate: project.startDate ?? '',
      expectedEndDate: project.expectedEndDate ?? '',
    })
  }, [project])

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const address = buildAddress(form.street, form.postalCode, form.city)
    if (!form.title.trim() || !address) {
      toast.error(t('edit_project.required_error'))
      return
    }
    try {
      await updateProject.mutateAsync({
        title: form.title.trim(),
        address,
        projectManager: form.projectManager.trim() || undefined,
        description: form.description.trim() || undefined,
        notes: form.notes.trim() || undefined,
        quoteAmount: form.quoteAmount ? parseFloat(form.quoteAmount) : undefined,
        startDate: form.startDate || undefined,
        expectedEndDate: form.expectedEndDate || undefined,
      })
      toast.success(t('edit_project.success'))
      void navigate(`/chantiers/${id ?? ''}`)
    } catch {
      toast.error(t('edit_project.error'))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 pb-4">
        <Skeleton className="h-6 w-48" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[44px] rounded-md" />
        ))}
      </div>
    )
  }

  if (!project) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">{t('project.not_found')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate(`/chantiers/${id ?? ''}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="text-xs font-mono text-muted-foreground">{project.reference}</p>
          <h1 className="text-lg font-bold">{t('edit_project.title')}</h1>
        </div>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">{t('create_project.label_title')} *</Label>
          <Input
            id="title"
            className="min-h-[44px]"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>{t('common.address')} *</Label>
          <AddressAutocomplete
            placeholder={t('common.street_placeholder')}
            className="min-h-[44px]"
            value={form.street}
            onChange={(v) => set('street', v)}
            onSelect={(s) => setForm((f) => ({ ...f, street: s.street, postalCode: s.postalCode, city: s.city }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder={t('common.postal_code')}
              className="min-h-[44px]"
              inputMode="numeric"
              autoComplete="postal-code"
              value={form.postalCode}
              onChange={(e) => set('postalCode', e.target.value)}
            />
            <Input
              placeholder={t('common.city')}
              className="min-h-[44px]"
              autoComplete="address-level2"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="startDate">{t('common.start_date')}</Label>
            <Input
              id="startDate"
              type="date"
              className="min-h-[44px]"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expectedEndDate">{t('common.end_date')}</Label>
            <Input
              id="expectedEndDate"
              type="date"
              className="min-h-[44px]"
              value={form.expectedEndDate}
              onChange={(e) => set('expectedEndDate', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quoteAmount">{t('common.quote_amount')}</Label>
          <Input
            id="quoteAmount"
            type="number"
            min="0"
            step="0.01"
            className="min-h-[44px]"
            value={form.quoteAmount}
            onChange={(e) => set('quoteAmount', e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectManager">{t('common.project_manager')}</Label>
          <Input
            id="projectManager"
            className="min-h-[44px]"
            value={form.projectManager}
            onChange={(e) => set('projectManager', e.target.value)}
            placeholder={t('create_project.project_manager_placeholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('common.description')}</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder={t('create_project.description_placeholder')}
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">{t('common.internal_notes')}</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder={t('create_project.notes_placeholder')}
            className="min-h-[80px]"
          />
        </div>

        <Button
          type="submit"
          className="w-full min-h-[48px] text-base"
          disabled={updateProject.isPending}
        >
          {updateProject.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {t('edit_project.submit')}
        </Button>
      </form>
    </div>
  )
}
