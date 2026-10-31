import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete'

export interface AddressValue {
  street: string
  postalCode: string
  city: string
}

interface AddressFieldsProps {
  value: AddressValue
  onChange: (value: AddressValue) => void
  /** Rend la rue obligatoire (le code postal et la ville se remplissent d'eux-mêmes en choisissant une suggestion) */
  required?: boolean
}

/** Rue avec suggestions, code postal et ville : le bloc d'adresse des formulaires. */
export function AddressFields({ value, onChange, required }: AddressFieldsProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <AddressAutocomplete
        placeholder={t('common.street_placeholder')}
        className="min-h-[44px]"
        value={value.street}
        onChange={(street) => onChange({ ...value, street })}
        onSelect={(s) => onChange({ street: s.street, postalCode: s.postalCode, city: s.city })}
        required={required}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder={t('common.postal_code')}
          className="min-h-[44px]"
          inputMode="numeric"
          autoComplete="postal-code"
          value={value.postalCode}
          onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
        />
        <Input
          placeholder={t('common.city')}
          className="min-h-[44px]"
          autoComplete="address-level2"
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
        />
      </div>
    </div>
  )
}
