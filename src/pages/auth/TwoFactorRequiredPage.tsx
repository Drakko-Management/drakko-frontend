import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TwoFactorSetupFlow } from '@/components/two-factor/TwoFactorSetupFlow'
import { toast } from 'sonner'
import { logout } from '@/lib/logout'
import { useAuthStore } from '@/store/auth.store'
import { AuthLayout } from './AuthLayout'

// La double authentification est exigée des administrateurs : tant qu'elle n'est pas configurée, rien d'autre
// n'est accessible (le serveur refuse le reste, 403 TWO_FACTOR_REQUIRED).
export function TwoFactorRequiredPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setRequired = useAuthStore((s) => s.setTwoFactorRequired)

  async function signOut() {
    if ((await logout()) === 'failed') {
      toast.error(t('settings.logout_failed'))
      return
    }
    void navigate('/login', { replace: true })
  }

  return (
    <AuthLayout>
      <div className="space-y-4">
        <div className="space-y-2 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-lg font-semibold">{t('two_factor.required_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('two_factor.required_intro')}</p>
        </div>

        <TwoFactorSetupFlow
          onDone={() => {
            setRequired(false)
            void navigate('/', { replace: true })
          }}
        />

        <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => void signOut()}>
          {t('two_factor.sign_out')}
        </Button>
      </div>
    </AuthLayout>
  )
}
