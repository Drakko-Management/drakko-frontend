import { describe, it, expect } from 'vitest'
import type { Organization } from '@/types/api'
import { missingIdentity } from './identity'

const ORG = {
  address: '3 chemin des Oliviers',
  postalCode: '13000',
  city: 'Marseille',
  siret: '12345678900012',
  vatNumber: 'FR12345678901',
} as Organization

describe('missingIdentity', () => {
  it('une identité complète ne manque de rien', () => {
    expect(missingIdentity(ORG, false)).toEqual([])
  })

  it('dit quels champs manquent, avec la clé de leur libellé dans les réglages', () => {
    expect(missingIdentity({ ...ORG, siret: undefined, city: '  ' } as Organization, false)).toEqual([
      'settings.org_city',
      'settings.org_siret',
    ])
  })

  it('le numéro de TVA est exigé, sauf sous franchise', () => {
    const noVat = { ...ORG, vatNumber: undefined } as Organization
    expect(missingIdentity(noVat, false)).toEqual(['settings.org_vat_number'])
    expect(missingIdentity(noVat, true)).toEqual([])
  })

  it('tant que l\'organisation n\'est pas chargée, rien ne manque (l\'API reste seule juge)', () => {
    expect(missingIdentity(undefined, false)).toEqual([])
  })
})
