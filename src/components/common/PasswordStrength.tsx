import { useTranslation } from 'react-i18next'
import { passwordHintKey, type PasswordCheck } from '@/lib/password-policy'

const BAR_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600']

interface Props {
  check: PasswordCheck
  id?: string
}

// Jauge et conseil sous un champ de mot de passe. Le résultat vient de usePasswordCheck : la règle est celle
// du serveur (12 caractères, pas devinable), la jauge ne fait que guider.
export function PasswordStrength({ check, id }: Props) {
  const { t } = useTranslation()
  const { status, score } = check
  const measured = status === 'weak' || status === 'ok'

  const hint = t(passwordHintKey(check))

  return (
    <div className="space-y-1.5" id={id}>
      {status !== 'empty' && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((segment) => (
              <span
                key={segment}
                data-testid="strength-segment"
                className={`h-1.5 flex-1 rounded-full ${
                  measured && segment < Math.max(score, 1) ? BAR_COLORS[score] : 'bg-muted'
                }`}
              />
            ))}
          </div>
          {measured && (
            <span className="text-xs font-medium text-muted-foreground">
              {t(`password_strength.level_${score}`)}
            </span>
          )}
        </div>
      )}
      <p
        role="status"
        className={`text-xs ${
          status === 'weak' || status === 'short'
            ? 'text-destructive'
            : status === 'ok'
              ? 'text-green-600 dark:text-green-500'
              : 'text-muted-foreground'
        }`}
      >
        {hint}
      </p>
    </div>
  )
}
