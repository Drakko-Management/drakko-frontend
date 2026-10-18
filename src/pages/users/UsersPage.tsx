import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Plus, ChevronRight, UserCog, Eye, EyeOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { Fab } from '@/components/common/Fab'
import { Avatar } from '@/components/common/Avatar'
import { ConfirmDestructiveDialog } from '@/components/common/ConfirmDestructiveDialog'
import { useUsers, useSetUserActive, useDeleteUser } from '@/hooks/use-users'
import { useAuthStore } from '@/store/auth.store'
import { apiErrorMessage } from '@/lib/api-error'
import { usePermissions } from '@/hooks/use-permissions'
import { useCanEditUser } from '@/hooks/use-can-edit-user'
import { fullName } from '@/lib/utils'
import { RolesTab } from './RolesTab'
import { TutorialHelpButton } from '@/tutorials/TutorialHelpButton'
import type { User } from '@/types/api'

function UserRow({
  user,
  canUpdate,
  canToggle,
  canDelete,
  onToggle,
  onDelete,
}: {
  user: User
  canUpdate: boolean
  // L'œil et la corbeille ne s'offrent ni pour son propre compte ni pour le propriétaire
  canToggle: boolean
  canDelete: boolean
  onToggle: (user: User) => void
  onDelete: (user: User) => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const roleLabel = user.customRole?.name ?? (user.role === 'ADMIN' ? t('users.role_admin') : t('users.role_member'))

  return (
    <div className="flex items-center pr-2">
      <button
        onClick={() => canUpdate && void navigate(`/utilisateurs/${user.id}`)}
        className={['flex min-h-[64px] min-w-0 flex-1 items-center gap-3 p-4 text-left transition-colors', canUpdate ? 'active:bg-muted' : 'cursor-default'].join(' ')}
      >
        <Avatar id={user.id} firstName={user.firstName} lastName={user.lastName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{fullName(user)}</p>
            {user.isOwner && (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-foreground">
                {t('users.owner_badge')}
              </span>
            )}
            {!user.active && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {t('common.inactive')}
              </span>
            )}
            {user.totpEnabledAt ? (
              <span
                title={t('two_factor.badge_on_title')}
                className="rounded-full border border-green-600/30 bg-green-600/10 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400"
              >
                {t('two_factor.badge_on')}
              </span>
            ) : user.role === 'ADMIN' ? (
              <span
                title={t('two_factor.badge_missing_title')}
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
              >
                {t('two_factor.badge_missing')}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {roleLabel} · @{user.username}
          </p>
        </div>
      </button>
      <div className="flex shrink-0 items-center">
        {canToggle && (
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted"
            onClick={() => onToggle(user)}
            aria-label={t(user.active ? 'users.row_deactivate' : 'users.row_activate')}
          >
            {user.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        {canDelete && (
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-destructive/70 hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10"
            onClick={() => onDelete(user)}
            aria-label={t('users.row_delete')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        {canUpdate && <ChevronRight className="ml-1 h-4 w-4 text-muted-foreground" />}
      </div>
    </div>
  )
}

type Tab = 'membres' | 'roles'

export function UsersPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { can, isAdmin } = usePermissions()
  const { data: users, isLoading } = useUsers()
  const [tab, setTab] = useState<Tab>('membres')

  const canCreate = isAdmin || can('equipe', 'create')
  const canEdit = useCanEditUser()
  const viewerId = useAuthStore((s) => s.userId)
  const setActive = useSetUserActive()
  const deleteUser = useDeleteUser()
  const [toDelete, setToDelete] = useState<User | null>(null)

  // Comme la fiche : on ne désactive ni ne supprime son propre compte, ni celui du propriétaire
  const canToggle = (u: User) => canEdit(u) && !u.isOwner && u.id !== viewerId
  const canDelete = (u: User) => canToggle(u) && can('equipe', 'delete')

  async function handleToggle(u: User) {
    try {
      await setActive.mutateAsync({ id: u.id, active: !u.active })
      toast.success(u.active ? t('users.deactivated_account') : t('users.activated'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'users.toggle_error'))
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    try {
      const { result } = await deleteUser.mutateAsync(toDelete.id)
      toast.success(t(result === 'deleted' ? 'users.deleted' : 'users.deleted_kept'))
      setToDelete(null)
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'users.delete_error'))
    }
  }

  const active = users?.filter((u) => u.active) ?? []
  const inactive = users?.filter((u) => !u.active) ?? []

  return (
    <div className="flex flex-col space-y-4 pb-4" data-team-tabs={isAdmin ? 'on' : 'off'}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('users.title')}</h1>
        <div className="flex items-center gap-2">
          <TutorialHelpButton scope="team" />
          {canCreate && (
            <Button
              size="sm"
              className="min-h-[44px] hidden md:flex"
              data-tutorial="team-new"
              onClick={() => void navigate(tab === 'roles' ? '/utilisateurs/roles/nouveau' : '/utilisateurs/nouveau')}
            >
              <Plus className="mr-1 h-4 w-4" />
              {tab === 'roles' ? t('users.new_role') : t('users.new_member')}
            </Button>
          )}
        </div>
      </div>

      {/* Onglets — tab Rôles visible uniquement pour l'admin */}
      {isAdmin && (
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {(['membres', 'roles'] as Tab[]).map((t_) => (
            <button
              key={t_}
              onClick={() => setTab(t_)}
              data-tutorial={`team-${t_}-tab`}
              data-active={tab === t_}
              className={[
                'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
                tab === t_
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {t(`users.tab_${t_}`)}
            </button>
          ))}
        </div>
      )}

      {tab === 'membres' && (
        <>
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-[64px] rounded-xl" />)}
            </div>
          )}
          {!isLoading && users?.length === 0 && (
            <EmptyState icon={UserCog} title={t('users.empty')} />
          )}
          {active.length > 0 && (
            <div className="divide-y overflow-hidden rounded-xl border bg-card">
              {active.map((user) => <UserRow key={user.id} user={user} canUpdate={canEdit(user)} canToggle={canToggle(user)} canDelete={canDelete(user)} onToggle={(u) => void handleToggle(u)} onDelete={setToDelete} />)}
            </div>
          )}
          {inactive.length > 0 && (
            <div className="space-y-1">
              <p className="px-1 text-xs font-medium text-muted-foreground">
                {t('users.inactive_accounts')}
              </p>
              <div className="divide-y overflow-hidden rounded-xl border bg-card opacity-60">
                {inactive.map((user) => <UserRow key={user.id} user={user} canUpdate={canEdit(user)} canToggle={canToggle(user)} canDelete={canDelete(user)} onToggle={(u) => void handleToggle(u)} onDelete={setToDelete} />)}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'roles' && <RolesTab isAdmin={isAdmin} />}

      <ConfirmDestructiveDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('users.delete_title', { name: toDelete ? fullName(toDelete) : '' })}
        description={t('users.delete_message')}
        confirmLabel={t('users.delete_confirm')}
        pending={deleteUser.isPending}
        onConfirm={() => void handleDelete()}
      />

      {canCreate && (
        <Fab tutorial="team-new" onClick={() => void navigate(tab === 'roles' ? '/utilisateurs/roles/nouveau' : '/utilisateurs/nouveau')} />
      )}
    </div>
  )
}
