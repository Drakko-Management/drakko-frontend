import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** Le serveur a refusé ce code : le message reste sous le champ jusqu'à ce qu'on le corrige */
  rejected?: boolean
}

// Le code de l'application (ou un code de secours), demandé en plus du mot de passe quand le compte a la
// double authentification et qu'on fait une action qui le prendrait : changer de mot de passe ou d'adresse.
export function SecondFactorCodeField({ id, value, onChange, disabled, rejected }: Props) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t('two_factor.current_code_label')}</Label>
      <Input
        id={id}
        autoComplete="one-time-code"
        className={`min-h-[44px] ${rejected ? 'border-destructive' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={rejected || undefined}
      />
      {rejected && (
        <p role="alert" className="text-xs text-destructive">
          {t('two_factor.code_invalid')}
        </p>
      )}
    </div>
  )
}
