import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { MailCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiRequest, ApiError } from '@/lib/api-client'
import { AuthLayout } from './AuthLayout'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      })
      // Même écran que l'adresse corresponde à un compte ou non : la réponse ne le révèle pas
      setSent(true)
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 429
          ? t('password_reset.too_many')
          : t('password_reset.error'),
      )
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-lg font-semibold">{t('password_reset.sent_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('password_reset.sent_message')}</p>
          <p className="text-xs text-muted-foreground">{t('password_reset.no_email_hint')}</p>
          <Link to="/login" className="block text-sm font-medium text-primary underline-offset-4 hover:underline">
            {t('password_reset.back_to_login')}
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold">{t('password_reset.forgot_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('password_reset.forgot_intro')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="forgot-email">{t('password_reset.email_label')}</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            className="min-h-[44px] text-base"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <Button type="submit" className="min-h-[44px] w-full text-base" disabled={loading}>
          {loading ? t('password_reset.sending') : t('password_reset.send')}
        </Button>

        <Link to="/login" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
          {t('password_reset.back_to_login')}
        </Link>
      </form>
    </AuthLayout>
  )
}
