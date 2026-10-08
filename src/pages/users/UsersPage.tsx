import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Plus, ChevronDown, ChevronUp, Loader2, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { Fab } from '@/components/common/Fab'
import { Avatar } from '@/components/common/Avatar'
import { useUsers, useUpdateUser } from '@/hooks/use-users'
import { useRoles } from '@/hooks/use-roles'
import { usePermissions } from '@/hooks/use-permissions'
import { fullName } from '@/lib/utils'
import { RolesTab } from './RolesTab'
import { TutorialHelpButton } from '@/tutorials/TutorialHelpButton'
import type { User, UserRole } from '@/types/api'

function RoleSelect({
  value,
  customRoleId,
  onChange,
  disabled,
}: {
  value: string
  customRoleId: string | null
  onChange: (role: UserRole, customRoleId: string | null) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const { data: roles } = useRoles()

  const selectValue = value === 'ADMIN' ? 'ADMIN' : (customRoleId ?? '')

  function handleChange(v: string) {
    if (v === 'ADMIN') {
      onChange('ADMIN', null)
    } else {
      onChange('MEMBER', v)
    }
  }

  return (
    <select
      value={selectValue}
      onChange={(e) => handleChange(e.target.value)}
      disabled={disabled}
      className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="ADMIN">{t('users.role_admin')}</option>
      {roles?.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
      {(!roles || roles.length === 0) && (
        <option value="" disabled>{t('users.no_custom_roles')}</option>
      )}
    </select>
  )
}

function UserRow({ user, canUpdate }: { user: User; canUpdate: boolean }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email ?? '',
    role: user.role,
    customRoleId: user.customRoleId,
    password: '',
  })
  const update = useUpdateUser(user.id)

  function setField(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (form.password && form.password.length < 8) {
      toast.error(t('users.password_min_error'))
      return
    }
    try {
      await update.mutateAsync({
        username: form.username.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        role: form.role as never,
        customRoleId: form.customRoleId,
        ...(form.password ? { password: form.password } : {}),
      })
      setForm((f) => ({ ...f, password: '' }))
      toast.success(t('users.updated'))
    } catch {
      toast.error(t('users.update_error'))
    }
  }

  async function handleToggleActive() {
    try {
      await update.mutateAsync({ active: !user.active })
      toast.success(user.active ? t('users.deactivated_account') : t('users.activated'))
    } catch {
      toast.error(t('users.toggle_error'))
    }
  }

  const roleLabel = user.customRole?.name ?? (user.role === 'ADMIN' ? t('users.role_admin') : t('users.role_member'))

  return (
    <div className="divide-y last:divide-y-0">
      <button
        onClick={() => canUpdate && setExpanded((v) => !v)}
        className={['flex min-h-[64px] w-full items-center gap-3 p-4 text-left transition-colors', canUpdate ? 'active:bg-muted' : 'cursor-default'].join(' ')}
      >
        <Avatar id={user.id} firstName={user.firstName} lastName={user.lastName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{fullName(user)}</p>
            {!user.active && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {t('common.inactive')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {roleLabel} · @{user.username}
          </p>
        </div>
        {canUpdate && (expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ))}
      </button>

      {expanded && (
        <div className="space-y-3 bg-muted/30 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('common.first_name')}</Label>
              <Input
                className="min-h-[44px]"
                value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                disabled={update.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('common.last_name')}</Label>
              <Input
                className="min-h-[44px]"
                value={form.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
                disabled={update.isPending}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('common.identifier')}</Label>
            <Input
              className="min-h-[44px]"
              autoCapitalize="none"
              autoComplete="off"
              value={form.username}
              onChange={(e) => setField('username', e.target.value)}
              disabled={update.isPending}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('common.email')}</Label>
            <Input
              type="email"
              className="min-h-[44px]"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              disabled={update.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('common.role')}</Label>
            <RoleSelect
              value={form.role}
              customRoleId={form.customRoleId}
              onChange={(role, customRoleId) => setForm((f) => ({ ...f, role, customRoleId }))}
              disabled={update.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('users.new_password')}</Label>
            <Input
              type="password"
              autoComplete="new-password"
              className="min-h-[44px]"
              placeholder={t('users.password_placeholder')}
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              disabled={update.isPending}
            />
          </div>
          <Button
            className="w-full min-h-[44px]"
            onClick={() => void handleSave()}
            disabled={update.isPending}
          >
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save')}
          </Button>
          <Button
            variant={user.active ? 'destructive' : 'outline'}
            size="sm"
            className="w-full min-h-[44px]"
            onClick={() => void handleToggleActive()}
            disabled={update.isPending}
          >
            {user.active ? t('users.deactivate_account') : t('users.activate_account')}
          </Button>
        </div>
      )}
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
  const canUpdate = isAdmin || can('equipe', 'update')

  const active = users?.filter((u) => u.active) ?? []
  const inactive = users?.filter((u) => !u.active) ?? []

  return (
    <div className="flex flex-col space-y-4 pb-4">
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
              {t('common.new')}
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
              data-tutorial={t_ === 'roles' ? 'team-roles-tab' : undefined}
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
            <div className="overflow-hidden rounded-xl border bg-card">
              {active.map((user) => <UserRow key={user.id} user={user} canUpdate={canUpdate} />)}
            </div>
          )}
          {inactive.length > 0 && (
            <div className="space-y-1">
              <p className="px-1 text-xs font-medium text-muted-foreground">
                {t('users.inactive_accounts')}
              </p>
              <div className="overflow-hidden rounded-xl border bg-card opacity-60">
                {inactive.map((user) => <UserRow key={user.id} user={user} canUpdate={canUpdate} />)}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'roles' && <RolesTab isAdmin={isAdmin} />}

      {canCreate && (
        <Fab tutorial="team-new" onClick={() => void navigate(tab === 'roles' ? '/utilisateurs/roles/nouveau' : '/utilisateurs/nouveau')} />
      )}
    </div>
  )
}
