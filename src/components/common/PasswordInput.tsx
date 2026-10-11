import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  disabled?: boolean
}

// Champ de mot de passe avec son propre œil : chaque champ s'affiche ou se masque indépendamment
export function PasswordInput({ id, value, onChange, autoComplete, disabled }: Props) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        className="min-h-[44px] pr-11 text-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        onClick={() => setVisible((v) => !v)}
        aria-label={t('password_reset.toggle_visibility')}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
