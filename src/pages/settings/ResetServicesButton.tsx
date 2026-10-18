import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { ConfirmDestructiveDialog } from '@/components/common/ConfirmDestructiveDialog'
import { useDeleteAllServices } from '@/hooks/use-services'
import { apiErrorMessage } from '@/lib/api-error'

// Remise à zéro de la bibliothèque de prestations : tout est effacé, sauf ce que des rapports utilisent encore
// (désactivé à la place). La bibliothèque vide peut ensuite être réimportée depuis l'écran Prestations.
export function ResetServicesButton() {
  const { t } = useTranslation()
  const deleteAll = useDeleteAllServices()
  const [open, setOpen] = useState(false)

  async function handleConfirm() {
    try {
      const { deleted, deactivated } = await deleteAll.mutateAsync()
      toast.success(t('settings.reset_services_done', { deleted, deactivated }))
      setOpen(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'services.delete_error'))
    }
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-destructive">{t('settings.reset_services')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.reset_services_sub')}</p>
          </div>
        </button>
      </Card>

      <ConfirmDestructiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t('settings.reset_services_title')}
        description={t('settings.reset_services_message')}
        confirmLabel={t('settings.reset_services_confirm')}
        pending={deleteAll.isPending}
        onConfirm={() => void handleConfirm()}
      />
    </>
  )
}
