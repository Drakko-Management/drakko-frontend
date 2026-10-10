import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { ClientForm } from '@/components/clients/ClientForm'
import { TutorialHelpButton } from '@/tutorials/TutorialHelpButton'

export function CreateClientPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate('/clients')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">{t('create_client.title')}</h1>
        <TutorialHelpButton scope="client_form" className="ml-auto h-10 w-10 shrink-0" />
      </div>

      <ClientForm onCreated={(client) => void navigate(`/clients/${client.id}`)} />
    </div>
  )
}
