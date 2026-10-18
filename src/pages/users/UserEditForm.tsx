import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { RecordActions } from '@/components/common/RecordActions'
import { useUpdateUser, useTransferOwnership, useDeleteUser } from '@/hooks/use-users'
import { useAssignableRoles } from '@/hooks/use-roles'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuthStore } from '@/store/auth.store'
import { apiErrorMessage } from '@/lib/api-error'
import { fullName } from '@/lib/utils'
import { PasswordInput } from '@/components/common/PasswordInput'
import { ResetTwoFactorButton } from './ResetTwoFactorButton'
import { PasswordStrength } from '@/components/common/PasswordStrength'
import { usePasswordCheck } from '@/hooks/use-password-check'
import { PASSWORD_MAX_LENGTH, passwordHintKey } from '@/lib/password-policy'
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
  const { data: roles } = useAssignableRoles()
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
      disabled={disabled}
      className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Un membre sans rôle personnalisé affiche cette option, pas la suivante */}
      <option value="" disabled>{t('users.choose_role')}</option>
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

// Fiche d'un membre : identité, rôle, mot de passe, désactivation, transfert de propriété. Affichée par EditUserPage.
export function UserEditForm({ user, viewerIsOwner }: { user: User; viewerIsOwner: boolean }) {
  const { t } = useTranslation()
  // Son propre mot de passe et sa propre adresse se changent depuis Paramètres → Profil (mot de passe actuel
  // demandé) : la fiche de l'équipe ne les propose pas pour son propre compte
  const isSelf = useAuthStore((s) => s.userId) === user.id
  // Seul un administrateur débloque la double authentification d'un collègue (le serveur le refuse aux autres)
  const viewerIsAdmin = useAuthStore((s) => s.role) === 'ADMIN'
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
  const transfer = useTransferOwnership(user.id)
  // Le champ est facultatif : la règle ne s'applique que si un nouveau mot de passe est saisi
  const passwordCheck = usePasswordCheck(form.password, [
    form.username,
    form.email,
    form.firstName,
    form.lastName,
  ])

  // « Enregistrer » ne s'active que si la fiche a changé (son propre mail et mot de passe ne s'y modifient pas)
  const dirty =
    form.username.trim() !== user.username ||
    form.firstName.trim() !== user.firstName ||
    form.lastName.trim() !== user.lastName ||
    form.role !== user.role ||
    form.customRoleId !== user.customRoleId ||
    (!isSelf && (form.email.trim() !== (user.email ?? '') || form.password !== ''))

  function setField(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!isSelf && form.password && passwordCheck.status === 'short') {
      toast.error(t('users.password_min_error'))
      return
    }
    if (!isSelf && form.password && passwordCheck.status !== 'ok') {
      toast.error(t(passwordHintKey(passwordCheck)))
      return
    }
    try {
      await update.mutateAsync({
        username: form.username.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        ...(isSelf ? {} : { email: form.email.trim() || undefined }),
        role: form.role as never,
        customRoleId: form.customRoleId,
        ...(form.password && !isSelf ? { password: form.password } : {}),
      })
      setForm((f) => ({ ...f, password: '' }))
      toast.success(t('users.updated'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'users.update_error'))
    }
  }

  async function handleTransfer() {
    try {
      await transfer.mutateAsync()
      toast.success(t('users.transfer_success', { name: fullName(user) }))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'users.transfer_error'))
    }
  }


  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor={`fn-${user.id}`}>{t('common.first_name')}</Label>
          <Input
            id={`fn-${user.id}`}
            className="min-h-[44px]"
            value={form.firstName}
            onChange={(e) => setField('firstName', e.target.value)}
            disabled={update.isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor={`ln-${user.id}`}>{t('common.last_name')}</Label>
          <Input
            id={`ln-${user.id}`}
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
          disabled={update.isPending || isSelf}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t('common.role')}</Label>
        <RoleSelect
          value={form.role}
          customRoleId={form.customRoleId}
          onChange={(role, customRoleId) => setForm((f) => ({ ...f, role, customRoleId }))}
          disabled={update.isPending || user.isOwner}
        />
      </div>
      {isSelf ? (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          {t('users.own_credentials_hint')}
        </p>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor={`pw-${user.id}`}>{t('users.new_password')}</Label>
          <PasswordInput
            id={`pw-${user.id}`}
            autoComplete="new-password"
            placeholder={t('users.password_placeholder')}
            value={form.password}
            onChange={(value) => setField('password', value)}
            disabled={update.isPending}
            required={false}
            maxLength={PASSWORD_MAX_LENGTH}
          />
          {form.password && <PasswordStrength check={passwordCheck} />}
        </div>
      )}
      {viewerIsAdmin && !isSelf && user.totpEnabledAt && <ResetTwoFactorButton user={user} />}
      <Button
        className="w-full min-h-[48px]"
        onClick={() => void handleSave()}
        disabled={update.isPending || !dirty}
      >
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save')}
      </Button>
      {user.isOwner && (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">{t('users.owner_hint')}</p>
      )}
      {viewerIsOwner && !user.isOwner && user.active && (
        user.role === 'ADMIN' ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full min-h-[44px]"
                disabled={update.isPending || transfer.isPending}
              >
                {t('users.transfer_ownership')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('users.transfer_title', { name: fullName(user) })}</AlertDialogTitle>
                <AlertDialogDescription>{t('users.transfer_body')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleTransfer()}>
                  {t('users.transfer_confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <p className="text-xs text-muted-foreground">{t('users.transfer_hint_member')}</p>
        )
      )}
    </div>

  )
}

// L'œil et la corbeille de la fiche, dans son en-tête (comme sur la ligne de la liste) : ni sur son propre compte,
// ni sur celui du propriétaire ; la corbeille demande aussi equipe.delete.
export function UserHeaderActions({ user }: { user: User }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can, isAdmin } = usePermissions()
  const isSelf = useAuthStore((s) => s.userId) === user.id
  const update = useUpdateUser(user.id)
  const deleteUser = useDeleteUser()

  if (isSelf || user.isOwner) return null

  async function handleToggle() {
    try {
      await update.mutateAsync({ active: !user.active })
      toast.success(user.active ? t('users.deactivated_account') : t('users.activated'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'users.toggle_error'))
    }
  }

  async function handleDelete() {
    try {
      const { result } = await deleteUser.mutateAsync(user.id)
      toast.success(t(result === 'deleted' ? 'users.deleted' : 'users.deleted_kept'))
      void navigate('/utilisateurs')
    } catch (err) {
      toast.error(apiErrorMessage(err, t, 'users.delete_error'))
    }
  }

  return (
    <RecordActions
      active={user.active}
      pending={update.isPending || deleteUser.isPending}
      onToggle={() => void handleToggle()}
      toggleLabel={user.active ? t('users.deactivate_account') : t('users.activate_account')}
      onDelete={isAdmin || can('equipe', 'delete') ? handleDelete : undefined}
      deleteLabel={t('users.row_delete')}
      deleteTitle={t('users.delete_title', { name: fullName(user) })}
      deleteDescription={t('users.delete_message')}
      deleteConfirmLabel={t('users.delete_confirm')}
    />
  )
}
