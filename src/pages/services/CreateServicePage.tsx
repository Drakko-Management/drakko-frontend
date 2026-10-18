import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useCreateService } from '@/hooks/use-services'
import { ServiceFormFields } from './ServiceFormFields'
import { TutorialHelpButton } from '@/tutorials/TutorialHelpButton'

export function CreateServicePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const createService = useCreateService()

  const [form, setForm] = useState({ title: '', unit: '', description: '' })

  async function handleSubmit() {
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
        <TutorialHelpButton scope="service_form" className="ml-auto h-10 w-10 shrink-0" />
      </div>

      <ServiceFormFields
        values={form}
        onChange={setForm}
        onSubmit={() => void handleSubmit()}
        isPending={createService.isPending}
        autoFocus
      />
    </div>
  )
}
