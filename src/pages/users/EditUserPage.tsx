import { Navigate, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { EditPageTitle } from '@/components/common/EditPageTitle'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsers } from '@/hooks/use-users'
import { useCanEditUser } from '@/hooks/use-can-edit-user'
import { useAuthStore } from '@/store/auth.store'
import { fullName } from '@/lib/utils'
import { UserEditForm, UserHeaderActions } from './UserEditForm'

export function EditUserPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: users, isLoading } = useUsers()
  const canEdit = useCanEditUser()
  const viewerId = useAuthStore((s) => s.userId)

  const user = users?.find((u) => u.id === id)
  const viewerIsOwner = users?.some((u) => u.id === viewerId && u.isOwner) ?? false

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />
  // Inconnu, ou plus modifiable (droits changés, propriété transférée) : retour à la liste
  if (!user || !canEdit(user)) return <Navigate to="/utilisateurs" replace />

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate('/utilisateurs')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <EditPageTitle kind={t('users.edit_title')} name={fullName(user)} />
        <div className="ml-auto flex items-center gap-2">
          <UserHeaderActions user={user} />
        </div>
      </div>
      <UserEditForm user={user} viewerIsOwner={viewerIsOwner} />
    </div>
  )
}
