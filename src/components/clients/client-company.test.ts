import { describe, it, expect } from 'vitest'
import {
  companyErrors,
  companyPayload,
  companyValuesOf,
  EMPTY_COMPANY,
  formatSiren,
  type CompanyValues,
} from './client-company'

const PRO: CompanyValues = {
  kind: 'PROFESSIONAL',
  companyName: ' Syndic Les Lilas ',
  siren: '732 829 320',
  vatNumber: 'fr 40 303 265 045',
}

describe('companyErrors', () => {
  it('un particulier n\'a jamais d\'erreur d\'entreprise, même avec des champs saisis', () => {
    expect(companyErrors({ ...EMPTY_COMPANY, companyName: '', siren: 'faux', vatNumber: 'faux' })).toEqual({})
  })

  it('un professionnel complet n\'a pas d\'erreur', () => {
    expect(companyErrors(PRO)).toEqual({})
  })

  it('le SIREN et la TVA sont facultatifs, la dénomination non', () => {
    expect(companyErrors({ ...PRO, siren: '', vatNumber: '' })).toEqual({})
    expect(companyErrors({ ...PRO, companyName: '   ' })).toEqual({ companyName: 'create_client.company_required' })
  })

  it('un SIRET valide passe pour un SIREN, un SIRET faux est refusé', () => {
    expect(companyErrors({ ...PRO, siren: '73282932000074' })).toEqual({})
    expect(companyErrors({ ...PRO, siren: '73282932000075' })).toEqual({ siren: 'create_client.err_siren' })
  })

  it('refuse un SIREN et une TVA faux', () => {
    expect(companyErrors({ ...PRO, siren: '732829321', vatNumber: 'FR41303265045' })).toEqual({
      siren: 'create_client.err_siren',
      vatNumber: 'settings.err_vat_number',
    })
  })
})

describe('companyPayload', () => {
  it('un professionnel part remis en forme, un champ vidé part à null', () => {
    expect(companyPayload(PRO)).toEqual({
      kind: 'PROFESSIONAL',
      companyName: 'Syndic Les Lilas',
      siren: '732829320',
      vatNumber: 'FR40303265045',
    })
    expect(companyPayload({ ...PRO, siren: ' ', vatNumber: '' })).toMatchObject({ siren: null, vatNumber: null })
  })

  it('un particulier n\'envoie aucune donnée d\'entreprise, même saisie avant de changer d\'avis', () => {
    expect(companyPayload({ ...PRO, kind: 'INDIVIDUAL' })).toEqual({
      kind: 'INDIVIDUAL',
      companyName: null,
      siren: null,
      vatNumber: null,
    })
  })
})

describe('formatSiren', () => {
  it('groupe les chiffres par trois, sans toucher à ce qui est incomplet', () => {
    expect(formatSiren('732829320')).toBe('732 829 320')
    expect(formatSiren('7328')).toBe('732 8')
  })
})

describe('companyValuesOf', () => {
  it('remplit un formulaire d\'après un client enregistré', () => {
    expect(
      companyValuesOf({ kind: 'PROFESSIONAL', companyName: 'SCI', siren: null, vatNumber: 'FR40303265045' }),
    ).toEqual({ kind: 'PROFESSIONAL', companyName: 'SCI', siren: '', vatNumber: 'FR40303265045' })
  })
})
