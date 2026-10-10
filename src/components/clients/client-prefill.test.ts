import { describe, it, expect } from 'vitest'
import { clientPrefill } from './client-prefill'

describe('clientPrefill', () => {
  it.each([
    ['Paul Dupont', { firstName: 'Paul', lastName: 'Dupont' }],
    ['  Paul   Dupont  ', { firstName: 'Paul', lastName: 'Dupont' }],
    ['Jean Pierre Martin', { firstName: 'Jean', lastName: 'Pierre Martin' }],
    ['Dupont', { lastName: 'Dupont' }],
    ['paul@dupont.fr', { email: 'paul@dupont.fr' }],
    ['', {}],
    ['   ', {}],
  ])('« %s » → %j', (text, expected) => {
    expect(clientPrefill(text)).toEqual(expected)
  })
})
