import { describe, expect, it } from 'vitest'
import { PAYMENT_WAIT_DAYS, firstPaymentDay } from './payment-wait'

const accepted = { kind: 'INDIVIDUAL' as const, status: 'ACCEPTED', decidedAt: '2026-11-04T09:00:00.000Z' }

describe('firstPaymentDay (article L221-10, ADR-036)', () => {
  it('sept jours', () => {
    expect(PAYMENT_WAIT_DAYS).toBe(7)
  })

  it('le jour de la conclusion ne compte pas, le septième jour non plus : on attend le huitième', () => {
    // Accepté le 4 novembre : le délai de sept jours expire le 11 au soir, le premier jour possible est le 12
    expect(firstPaymentDay(accepted, '2026-11-04')).toBe('2026-11-12')
    expect(firstPaymentDay(accepted, '2026-11-11')).toBe('2026-11-12')
  })

  it('le jour venu, plus rien à signaler', () => {
    expect(firstPaymentDay(accepted, '2026-11-12')).toBeNull()
    expect(firstPaymentDay(accepted, '2027-01-01')).toBeNull()
  })

  it('le jour de l\'acceptation est celui de Paris, pas celui de Greenwich', () => {
    // 23 h 30 UTC le 4 novembre = 00 h 30 le 5 à Paris (heure d'hiver)
    expect(firstPaymentDay({ ...accepted, decidedAt: '2026-11-04T23:30:00.000Z' }, '2026-11-05')).toBe('2026-11-13')
    // 22 h 30 UTC le 4 juillet = 00 h 30 le 5 à Paris (heure d'été)
    expect(firstPaymentDay({ ...accepted, decidedAt: '2026-07-04T22:30:00.000Z' }, '2026-07-05')).toBe('2026-07-13')
  })

  it('un professionnel : rien (la règle protège un consommateur)', () => {
    expect(firstPaymentDay({ ...accepted, kind: 'PROFESSIONAL' }, '2026-11-05')).toBeNull()
  })

  it('un client dont le type est inconnu compte pour un particulier', () => {
    expect(firstPaymentDay({ status: 'ACCEPTED', decidedAt: accepted.decidedAt }, '2026-11-05')).toBe('2026-11-12')
  })

  it.each(['DRAFT', 'SENT', 'REJECTED'])('un devis « %s » n\'est pas conclu : rien', (status) => {
    expect(firstPaymentDay({ ...accepted, status }, '2026-11-05')).toBeNull()
  })

  it.each([null, undefined])('sans date d\'acceptation (%s) : rien', (decidedAt) => {
    expect(firstPaymentDay({ ...accepted, decidedAt }, '2026-11-05')).toBeNull()
  })

  it('le jour d\'aujourd\'hui est celui de Paris par défaut', () => {
    const justNow = new Date().toISOString()

    expect(firstPaymentDay({ ...accepted, decidedAt: justNow })).not.toBeNull()
    expect(firstPaymentDay({ ...accepted, decidedAt: '2020-01-01T00:00:00.000Z' })).toBeNull()
  })
})
