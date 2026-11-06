import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { ClientKind } from '@/types/api'
import { companyErrors, type CompanyField, type CompanyValues } from './client-company'

interface ClientCompanyFieldsProps {
  values: CompanyValues
  onChange: (values: CompanyValues) => void
  /** Vrai après un envoi refusé : toutes les erreurs s'affichent, sans attendre que chaque champ soit quitté */
  attempted?: boolean
  /** Place le curseur sur la dénomination quand on passe à « professionnel » (formulaire de création) */
  focusOnSwitch?: boolean
}

const KINDS: { kind: ClientKind; label: string }[] = [
  { kind: 'INDIVIDUAL', label: 'create_client.kind_individual' },
  { kind: 'PROFESSIONAL', label: 'create_client.kind_professional' },
]

/**
 * Particulier ou professionnel, puis les champs de l'entreprise pour un professionnel. La loi traite les deux clients
 * différemment (SIREN sur la facture, indemnité de 40 €, rétractation) : le choix se fait toujours, jamais par défaut caché.
 */
export function ClientCompanyFields({ values, onChange, attempted = false, focusOnSwitch = false }: ClientCompanyFieldsProps) {
  const { t } = useTranslation()
  // Une erreur de format ne s'affiche qu'une fois le champ quitté, ou après un envoi refusé : pas pendant la frappe
  const [touched, setTouched] = useState<Set<CompanyField>>(new Set())
  const errors = companyErrors(values)
  const shown = (field: CompanyField) => (attempted || touched.has(field) ? errors[field] : undefined)
  const touch = (field: CompanyField) => setTouched((s) => new Set(s).add(field))
  const set = (patch: Partial<CompanyValues>) => onChange({ ...values, ...patch })
  const professional = values.kind === 'PROFESSIONAL'

  function field(id: CompanyField, label: string, props: React.ComponentProps<typeof Input> = {}, hint?: string) {
    const error = shown(id)
    return (
      <div className="space-y-2">
        <Label htmlFor={`client-${id}`}>{label}</Label>
        <Input
          id={`client-${id}`}
          className={cn('min-h-[44px]', error && 'border-destructive focus-visible:ring-destructive')}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `client-${id}-error` : hint ? `client-${id}-hint` : undefined}
          value={values[id]}
          onChange={(e) => set({ [id]: e.target.value })}
          onBlur={() => touch(id)}
          {...props}
        />
        {error ? (
          <p id={`client-${id}-error`} className="text-sm text-destructive" role="alert">
            {t(error)}
          </p>
        ) : hint ? (
          <p id={`client-${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label id="client-kind-label">{t('create_client.kind_label')}</Label>
        <div role="radiogroup" aria-labelledby="client-kind-label" className="grid grid-cols-2 gap-2">
          {KINDS.map(({ kind, label }) => {
            const selected = values.kind === kind
            return (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`client-kind-${kind}`}
                className={cn(
                  'min-h-[44px] rounded-md border px-3 text-sm font-medium transition-colors',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted active:bg-muted',
                )}
                onClick={() => {
                  set({ kind })
                  if (kind === 'PROFESSIONAL' && focusOnSwitch) {
                    // le champ n'existe pas encore : on attend le rendu
                    window.setTimeout(() => document.getElementById('client-companyName')?.focus(), 0)
                  }
                }}
              >
                {t(label)}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">{t('create_client.kind_hint')}</p>
      </div>

      {professional && (
        <>
          {field('companyName', `${t('create_client.company_name')} *`, {
            placeholder: t('create_client.company_placeholder'),
            autoComplete: 'organization',
          })}
          {field(
            'siren',
            t('create_client.siren'),
            { inputMode: 'numeric', autoComplete: 'off' },
            t('create_client.siren_hint'),
          )}
          {field('vatNumber', t('create_client.vat_number'), { autoComplete: 'off', placeholder: 'FR40303265045' })}
        </>
      )}
    </div>
  )
}
