import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCreateExpressProject } from '@/hooks/use-projects'

export function ExpressProjectPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const create = useCreateExpressProject()

  const [form, setForm] = useState({
    clientFirstName: '',
    clientLastName: '',
    clientEmail: '',
    title: '',
    description: '',
    address: '',
  })

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const project = await create.mutateAsync({
        clientFirstName: form.clientFirstName,
        clientLastName: form.clientLastName,
        clientEmail: form.clientEmail,
        title: form.title || undefined,
        description: form.description || undefined,
        address: form.address || undefined,
      })
      toast.success(t('express_project.success'))
      void navigate(`/chantiers/${project.id}/rapport`)
    } catch {
      toast.error(t('express_project.error'))
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start gap-3">
        <button
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h1 className="text-lg font-bold">{t('express_project.title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t('express_project.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* Client */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('express_project.client_section')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('common.first_name')} *</label>
              <input
                className="h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={form.clientFirstName}
                onChange={set('clientFirstName')}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('common.last_name')} *</label>
              <input
                className="h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={form.clientLastName}
                onChange={set('clientLastName')}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('common.email')} *</label>
            <input
              type="email"
              className="h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={form.clientEmail}
              onChange={set('clientEmail')}
              required
            />
          </div>
        </section>

        {/* Chantier */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('express_project.project_section')}
          </h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('express_project.title_label')}</label>
            <input
              className="h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('express_project.title_placeholder')}
              value={form.title}
              onChange={set('title')}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('common.address')}</label>
            <input
              className="h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('express_project.address_placeholder')}
              value={form.address}
              onChange={set('address')}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('common.description')}</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder={t('express_project.description_placeholder')}
              value={form.description}
              onChange={set('description')}
            />
          </div>
        </section>

        <Button
          type="submit"
          className="w-full min-h-[48px] gap-2 text-base"
          disabled={create.isPending}
        >
          {create.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {create.isPending ? t('express_project.creating') : t('express_project.submit')}
        </Button>
      </form>
    </div>
  )
}
