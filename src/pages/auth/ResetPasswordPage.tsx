import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiRequest, ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error'
import { AuthLayout } from './AuthLayout'

export const MIN_PASSWORD_LENGTH = 8

// Le jeton est dans le fragment de l'adresse (#token=…) : le navigateur ne l'envoie jamais au serveur web
// ni dans un en-tête Referer. Lecture pure (React peut appeler cette fonction deux fois en développement) :
// l'effacement de la barre d'adresse se fait dans un effet.
function readTokenFromHash(): string {
  return new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') ?? ''
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [token] = useState(readTokenFromHash)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [invalidLink, setInvalidLink] = useState(!token)

  // Une fois lu, le jeton n'a plus rien à faire dans la barre d'adresse ni dans l'historique
  useEffect(() => {
    if (token) window.history.replaceState(null, '', window.location.pathname)
  }, [token])

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH
  const mismatch = confirm.length > 0 && confirm !== password

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH || password !== confirm) return
    setLoading(true)
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      toast.success(t('password_reset.success'))
      void navigate('/login', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_RESET_TOKEN') {
        setInvalidLink(true)
      } else {
        toast.error(
          err instanceof ApiError && err.status === 429
            ? t('password_reset.too_many')
            : apiErrorMessage(err, t, 'password_reset.error'),
        )
      }
    } finally {
      setLoading(false)
    }
  }

  if (invalidLink) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <h1 className="text-lg font-semibold">{t('password_reset.reset_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('password_reset.invalid_link')}</p>
          <Link to="/mot-de-passe-oublie" className="block text-sm font-medium text-primary underline-offset-4 hover:underline">
            {t('password_reset.request_new')}
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
        <h1 className="text-center text-lg font-semibold">{t('password_reset.reset_title')}</h1>

        <div className="space-y-2">
          <Label htmlFor="new-password">{t('password_reset.password_label')}</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="min-h-[44px] pr-11 text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={t('password_reset.toggle_visibility')}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className={`text-xs ${tooShort ? 'text-destructive' : 'text-muted-foreground'}`}>
            {t('password_reset.password_hint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">{t('password_reset.confirm_label')}</Label>
          <Input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="min-h-[44px] text-base"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
            required
          />
          {mismatch && <p className="text-xs text-destructive">{t('password_reset.mismatch')}</p>}
        </div>

        <Button
          type="submit"
          className="min-h-[44px] w-full text-base"
          disabled={loading || password.length < MIN_PASSWORD_LENGTH || password !== confirm}
        >
          {loading ? t('password_reset.submitting') : t('password_reset.submit')}
        </Button>
      </form>
    </AuthLayout>
  )
}
