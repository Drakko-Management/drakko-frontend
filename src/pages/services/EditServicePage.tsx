import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { EditPageTitle } from '@/components/common/EditPageTitle'
import { Skeleton } from '@/components/ui/skeleton'
import { RecordActions } from '@/components/common/RecordActions'
import {
  useServices,
  useUpdateService,
  useDeactivateService,
  useActivateService,
  useDeleteService,
} from '@/hooks/use-services'
import { usePermissions } from '@/hooks/use-permissions'
import { apiErrorMessage } from '@/lib/api-error'
import type { Service } from '@/types/api'
import { ServiceFormFields, type ServiceFormValues } from './ServiceFormFields'

function EditServiceView({ service }: { service: Service }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { can } = usePermissions()
  const updateService = useUpdateService()
  const deactivate = useDeactivateService()
  const activate = useActivateService()
  const deleteService = useDeleteService()
  const [form, setForm] = useState<ServiceFormValues>({
    title: service.title,
    unit: service.unit ?? '',
    description: service.description ?? '',
  })

  // « Enregistrer » ne s'active que si la fiche a changé (un espace autour d'un texte n'en est pas un)
  const unchanged =
    form.title.trim() === service.title.trim() &&
    form.unit.trim() === (service.unit ?? '').trim() &&
    form.description.trim() === (service.description ?? '').trim()

  async function handleSubmit() {
    try {
      await updateService.mutateAsync({
        id: service.id,
        title: form.title.trim(),
        unit: form.unit.trim() || undefined,
        description: form.description.trim() || undefined,
      })
      toast.success(t('services.updated'))
      void navigate('/prestations')
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'services.update_error'))
    }
  }

  async function handleToggle() {
    try {
      await (service.active ? deactivate : activate).mutateAsync(service.id)
      toast.success(t(service.active ? 'services.deactivated' : 'services.activated'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'services.update_error'))
    }
  }

  async function handleDelete() {
    try {
      const { result } = await deleteService.mutateAsync(service.id)
      toast.success(t(result === 'deleted' ? 'services.deleted' : 'services.deleted_kept'))
      void navigate('/prestations')
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'services.delete_error'))
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
        <EditPageTitle kind={t('services.form_edit_title')} name={service.title} />
        <div className="ml-auto flex items-center gap-2">
          <RecordActions
            active={service.active}
            pending={deactivate.isPending || activate.isPending || deleteService.isPending}
            onToggle={can('prestations', 'update') ? () => void handleToggle() : undefined}
            toggleLabel={t(service.active ? 'services.deactivate' : 'services.activate')}
            onDelete={can('prestations', 'delete') ? handleDelete : undefined}
            deleteLabel={t('services.delete')}
            deleteTitle={t('services.confirm_delete')}
            deleteDescription={t('services.bulk_confirm_message')}
            deleteConfirmLabel={t('services.delete')}
          />
        </div>
      </div>
      <ServiceFormFields
        values={form}
        onChange={setForm}
        onSubmit={() => void handleSubmit()}
        isPending={updateService.isPending}
        unchanged={unchanged}
      />
    </div>
  )
}

export function EditServicePage() {
  const { id } = useParams<{ id: string }>()
  const { data: services, isLoading } = useServices()

  const service = services?.find((s) => s.id === id)

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />
  if (!service) return <Navigate to="/prestations" replace />

  return <EditServiceView service={service} />
}
