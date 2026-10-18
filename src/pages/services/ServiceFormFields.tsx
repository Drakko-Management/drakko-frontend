import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ServiceFormValues {
  title: string
  unit: string
  description: string
}

// Champs communs à la création et à la modification d'une prestation. Les data-tutorial servent au tutoriel
// « Créer une prestation » : ne pas les retirer.
export function ServiceFormFields({
  values,
  onChange,
  onSubmit,
  isPending,
}: {
  values: ServiceFormValues
  onChange: (next: ServiceFormValues) => void
  onSubmit: () => void
  isPending: boolean
}) {
  const { t } = useTranslation()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (values.title.trim()) onSubmit()
      }}
      className="space-y-4"
    >
      <div className="space-y-2" data-tutorial="service-title">
        <Label htmlFor="svc-title">{t('services.form_title_label')} *</Label>
        <Input
          id="svc-title"
          className="min-h-[44px]"
          value={values.title}
          onChange={(e) => onChange({ ...values, title: e.target.value })}
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
          value={values.unit}
          onChange={(e) => onChange({ ...values, unit: e.target.value })}
          placeholder={t('services.form_unit_placeholder')}
        />
      </div>
      <div className="space-y-2" data-tutorial="service-description">
        <Label htmlFor="svc-desc">{t('services.form_description_label')}</Label>
        <Input
          id="svc-desc"
          className="min-h-[44px]"
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
          placeholder={t('services.form_description_placeholder')}
        />
      </div>
      <Button
        type="submit"
        className="w-full min-h-[48px] text-base"
        data-tutorial="service-submit"
        disabled={isPending || !values.title.trim()}
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {t('common.save')}
      </Button>
    </form>
  )
}
