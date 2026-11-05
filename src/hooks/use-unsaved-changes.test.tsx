import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUnsavedChanges } from './use-unsaved-changes'

const closeTab = () => {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

describe('useUnsavedChanges', () => {
  it('une saisie non enregistrée fait demander confirmation au navigateur qui ferme ou recharge', () => {
    renderHook(() => useUnsavedChanges(true))

    expect(closeTab()).toBe(true)
  })

  it('sans saisie, rien ne gêne', () => {
    renderHook(() => useUnsavedChanges(false))

    expect(closeTab()).toBe(false)
  })

  it('une fois enregistré, plus rien ne gêne', () => {
    const { result } = renderHook(() => useUnsavedChanges(true))

    result.current.markSaved()

    expect(closeTab()).toBe(false)
    expect(result.current.shouldBlock()).toBe(false)
  })

  it('shouldBlock suit la saisie à l\'instant de la navigation, pas celle du dernier rendu', () => {
    const { result, rerender } = renderHook(({ dirty }) => useUnsavedChanges(dirty), { initialProps: { dirty: false } })
    expect(result.current.shouldBlock()).toBe(false)

    rerender({ dirty: true })
    expect(result.current.shouldBlock()).toBe(true)

    rerender({ dirty: false })
    expect(result.current.shouldBlock()).toBe(false)
  })

  it('quitter la page retire l\'écouteur', () => {
    const { unmount } = renderHook(() => useUnsavedChanges(true))

    unmount()

    expect(closeTab()).toBe(false)
  })

  it('le même objet de garde est rendu à chaque rendu (il sert de dépendance)', () => {
    const { result, rerender } = renderHook(({ dirty }) => useUnsavedChanges(dirty), { initialProps: { dirty: true } })
    const first = result.current

    rerender({ dirty: false })

    expect(result.current).toBe(first)
  })
})
