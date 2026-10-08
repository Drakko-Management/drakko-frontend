import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface Props {
  title: string
}

export function SettingsSubHeader({ title }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-1 mb-6">
      <button
        onClick={() => navigate('/parametres')}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
        aria-label={t('common.back')}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h1 className="text-xl font-bold">{title}</h1>
    </div>
  )
}
