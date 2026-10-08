import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateService } from '@/hooks/use-services'

export function CreateServicePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const createService = useCreateService()

  const [form, setForm] = useState({ title: '', unit: '', description: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    try {
      await createService.mutateAsync({
        title: form.title.trim(),
        unit: form.unit.trim() || undefined,
        description: form.description.trim() || undefined,
      })
      toast.success(t('services.created'))
      void navigate('/prestations')
    } catch {
      toast.error(t('services.create_error'))
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate('/prestations')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">{t('services.form_add_title')}</h1>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
        <div className="space-y-2" data-tutorial="service-title">
          <Label htmlFor="svc-title">{t('services.form_title_label')} *</Label>
          <Input
            id="svc-title"
            className="min-h-[44px]"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={t('services.form_title_placeholder')}
            autoFocus
            required
          />
        </div>
        <div className="space-y-2" data-tutorial="service-unit">
          <Label htmlFor="svc-unit">{t('services.form_unit_label')}</Label>
          <Input
            id="svc-unit"
            className="min-h-[44px]"
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            placeholder={t('services.form_unit_placeholder')}
          />
        </div>
        <div className="space-y-2" data-tutorial="service-description">
          <Label htmlFor="svc-desc">{t('services.form_description_label')}</Label>
          <Input
            id="svc-desc"
            className="min-h-[44px]"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder={t('services.form_description_placeholder')}
          />
        </div>
        <Button
          type="submit"
          className="w-full min-h-[48px] text-base"
          data-tutorial="service-submit"
          disabled={createService.isPending || !form.title.trim()}
        >
          {createService.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {t('common.save')}
        </Button>
      </form>
    </div>
  )
}
