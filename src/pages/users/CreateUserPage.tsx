import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateUser } from '@/hooks/use-users'
import { useRoles } from '@/hooks/use-roles'
import { usePermissions } from '@/hooks/use-permissions'
import { apiErrorMessage } from '@/lib/api-error'
import type { UserRole } from '@/types/api'
import { TutorialHelpButton } from '@/tutorials/TutorialHelpButton'

function RoleSelect({
  value,
  customRoleId,
  onChange,
}: {
  value: string
  customRoleId: string | null
  onChange: (role: UserRole, customRoleId: string | null) => void
}) {
  const { t } = useTranslation()
  const { data: roles } = useRoles()
  const { isAdmin } = usePermissions()

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
      className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Seul un administrateur attribue le rôle administrateur (règle aussi appliquée par l'API) */}
      {isAdmin && <option value="ADMIN">{t('users.role_admin')}</option>}
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

export function CreateUserPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const createUser = useCreateUser()

  const [form, setForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'MEMBER',
    customRoleId: null as string | null,
  })

  function setField(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error(t('users.password_min_error'))
      return
    }
    try {
      await createUser.mutateAsync({
        username: form.username.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        password: form.password,
        role: form.role as never,
        customRoleId: form.customRoleId,
        email: form.email.trim() || undefined,
      })
      toast.success(t('users.created'))
      void navigate('/utilisateurs')
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'users.create_error'))
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate('/utilisateurs')}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">{t('users.new_user')}</h1>
        <TutorialHelpButton scope="user_form" className="ml-auto h-10 w-10 shrink-0" />
      </div>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3" data-tutorial="user-name">
          <div className="space-y-2">
            <Label htmlFor="cu-fn">{t('common.first_name')} *</Label>
            <Input
              id="cu-fn"
              className="min-h-[44px]"
              value={form.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-ln">{t('common.last_name')} *</Label>
            <Input
              id="cu-ln"
              className="min-h-[44px]"
              value={form.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2" data-tutorial="user-identifier">
          <Label htmlFor="cu-uname">{t('common.identifier')} *</Label>
          <Input
            id="cu-uname"
            autoCapitalize="none"
            autoComplete="off"
            className="min-h-[44px]"
            value={form.username}
            onChange={(e) => setField('username', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2" data-tutorial="user-email">
          <Label htmlFor="cu-email">{t('common.email')}</Label>
          <Input
            id="cu-email"
            type="email"
            className="min-h-[44px]"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
          />
        </div>
        <div className="space-y-2" data-tutorial="user-password">
          <Label htmlFor="cu-pw">{t('common.password')} *</Label>
          <Input
            id="cu-pw"
            type="password"
            autoComplete="new-password"
            className="min-h-[44px]"
            minLength={8}
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2" data-tutorial="user-role">
          <Label>{t('common.role')}</Label>
          <RoleSelect
            value={form.role}
            customRoleId={form.customRoleId}
            onChange={(role, customRoleId) => setForm((f) => ({ ...f, role, customRoleId }))}
          />
        </div>
        <Button
          type="submit"
          className="w-full min-h-[48px] text-base"
          data-tutorial="user-submit"
          disabled={createUser.isPending}
        >
          {createUser.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {t('common.save')}
        </Button>
      </form>
    </div>
  )
}
