import { describe, it, expect } from 'vitest'
import { DEFAULT_PAYMENT_DAYS, paymentDays } from './payment-terms'

describe('paymentDays', () => {
  it.each([
    ['immediate', 0],
    ['15', 15],
    ['30', 30],
    ['45', 45],
    ['60', 60],
    [' 45 ', 45],
    ['90', 60],
    [null, DEFAULT_PAYMENT_DAYS],
    [undefined, DEFAULT_PAYMENT_DAYS],
    ['', DEFAULT_PAYMENT_DAYS],
    ['Paiement à 30 jours.', DEFAULT_PAYMENT_DAYS],
  ])('%j → %d jours (comme le back, qui calcule l\'échéance)', (terms, days) => {
    expect(paymentDays(terms)).toBe(days)
  })
})
