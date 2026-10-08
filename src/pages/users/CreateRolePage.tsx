import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import { useCreateRole } from '@/hooks/use-roles'
import { EMPTY_PERMISSIONS } from '@/lib/permissions'
import { PermissionMatrix } from './RolesTab'
import type { Permissions } from '@/types/api'

export function CreateRolePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const createRole = useCreateRole()
  const [name, setName] = useState('')
  const [permissions, setPermissions] = useState<Permissions>(EMPTY_PERMISSIONS)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createRole.mutateAsync({ name: name.trim(), permissions })
      toast.success(t('users.role_created'))
      void navigate('/utilisateurs')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('users.role_create_error')
      toast.error(msg)
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
        <h1 className="text-lg font-bold">{t('users.new_role')}</h1>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
        <div className="space-y-2" data-tutorial="role-name">
          <Label htmlFor="role-name">{t('users.role_name')} *</Label>
          <Input
            id="role-name"
            className="min-h-[44px]"
            placeholder={t('users.role_name_placeholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={30}
            autoFocus
            required
            disabled={createRole.isPending}
          />
        </div>
        <div data-tutorial="role-permissions">
          <p className="mb-2 text-sm font-medium">{t('users.role_permissions')}</p>
          <PermissionMatrix
            permissions={permissions}
            onChange={setPermissions}
            disabled={createRole.isPending}
          />
        </div>
        <Button
          type="submit"
          className="w-full min-h-[48px] text-base"
          data-tutorial="role-submit"
          disabled={createRole.isPending || !name.trim()}
        >
          {createRole.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {t('common.save')}
        </Button>
      </form>
    </div>
  )
}
