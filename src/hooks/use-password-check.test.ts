import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePasswordCheck } from './use-password-check'

const STRONG = 'correct cheval pile agrafe'

describe('usePasswordCheck', () => {
  it('vide et trop court : résultat immédiat, sans attendre les dictionnaires', () => {
    const empty = renderHook(() => usePasswordCheck(''))
    const short = renderHook(() => usePasswordCheck('court'))

    expect(empty.result.current.status).toBe('empty')
    expect(short.result.current.status).toBe('short')
  })

  it('un mot de passe assez long est « en cours » puis évalué', async () => {
    const { result } = renderHook(() => usePasswordCheck(STRONG))

    expect(result.current.status).toBe('checking')
    await waitFor(() => expect(result.current.status).toBe('ok'), { timeout: 8000 })
    expect(result.current.score).toBeGreaterThanOrEqual(3)
  })

  it('le résultat d\'un ancien mot de passe ne s\'affiche jamais pour le nouveau', async () => {
    const { result, rerender } = renderHook(({ password }) => usePasswordCheck(password), {
      initialProps: { password: STRONG },
    })
    await waitFor(() => expect(result.current.status).toBe('ok'), { timeout: 8000 })

    rerender({ password: 'Motdepasse1!!' })

    // tant que le nouveau n'est pas évalué, on ne garde pas le « ok » de l'ancien
    expect(result.current.status).toBe('checking')
    await waitFor(() => expect(result.current.status).toBe('weak'), { timeout: 8000 })
  })

  it('les informations du compte sont prises en compte, et un changement de ces informations réévalue', async () => {
    const { result, rerender } = renderHook(({ inputs }) => usePasswordCheck('xK9#jean.dupont#2$', inputs), {
      initialProps: { inputs: [] as string[] },
    })
    await waitFor(() => expect(result.current.status).toBe('ok'), { timeout: 8000 })

    rerender({ inputs: ['jean.dupont'] })

    await waitFor(() => expect(result.current.status).toBe('weak'), { timeout: 8000 })
  })
})
