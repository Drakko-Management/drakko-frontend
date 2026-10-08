import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PwaAutoUpdate } from './PwaAutoUpdate'

// Le module virtuel n'existe que dans le build Vite : on capte les options passées à useRegisterSW
type RegisterOptions = { onRegisteredSW?: (url: string, reg: ServiceWorkerRegistration | undefined) => void }
let mockRegisterOptions: RegisterOptions = {}

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options: RegisterOptions) => {
    mockRegisterOptions = options
    return { needRefresh: [false, vi.fn()], offlineReady: [false, vi.fn()], updateServiceWorker: vi.fn() }
  },
}))

const update = vi.fn()

function setup() {
  const queryClient = new QueryClient()
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/a']}>
        <PwaAutoUpdate />
        <Routes>
          <Route path="/a" element={<><input aria-label="champ" /><Link to="/b">aller en b</Link></>} />
          <Route path="/b" element={<p>écran B</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  // le navigateur confirme l'enregistrement du service worker
  act(() => { mockRegisterOptions.onRegisteredSW?.('/sw.js', { update } as unknown as ServiceWorkerRegistration) })
  return { queryClient, ...view }
}

const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
}
const returnToApp = () => { setVisibility('visible') }
const advance = (ms: number) => { act(() => { vi.advanceTimersByTime(ms) }) }

const HOUR = 60 * 60 * 1000

beforeEach(() => {
  // setTimeout reste réel : le routeur et testing-library s'en servent
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
  update.mockReset()
  update.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
  setVisibility('visible')
})

describe('PwaAutoUpdate', () => {
  it('n\'affiche rien : plus de bouton « Recharger », la mise à jour est automatique', () => {
    const queryClient = new QueryClient()
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><PwaAutoUpdate /></MemoryRouter>
      </QueryClientProvider>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('cherche une nouvelle version au retour sur l\'appli', () => {
    setup()

    returnToApp()

    expect(update).toHaveBeenCalledTimes(1)
  })

  it('ne cherche pas quand l\'appli passe en arrière-plan', () => {
    setup()

    setVisibility('hidden')

    expect(update).not.toHaveBeenCalled()
  })

  it('cherche une nouvelle version toutes les heures', () => {
    setup()

    advance(HOUR)
    expect(update).toHaveBeenCalledTimes(1)

    advance(HOUR)
    expect(update).toHaveBeenCalledTimes(2)
  })

  it('ne multiplie pas les recherches : au plus une toutes les 30 secondes', () => {
    setup()

    returnToApp()
    returnToApp()
    expect(update).toHaveBeenCalledTimes(1)

    advance(31_000)
    returnToApp()
    expect(update).toHaveBeenCalledTimes(2)
  })

  it('ne cherche pas tant que l\'utilisateur a saisi quelque chose : le rechargement l\'effacerait', () => {
    setup()
    fireEvent.input(screen.getByLabelText('champ'), { target: { value: 'Jardin Dupont' } })

    returnToApp()
    advance(HOUR)

    expect(update).not.toHaveBeenCalled()
  })

  it('reprend la recherche dès que l\'utilisateur change d\'écran', () => {
    setup()
    fireEvent.input(screen.getByLabelText('champ'), { target: { value: 'Jardin Dupont' } })
    returnToApp()
    expect(update).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('aller en b'))

    expect(screen.getByText('écran B')).toBeInTheDocument()
    expect(update).toHaveBeenCalledTimes(1)
    // et la saisie de l'écran précédent ne bloque plus rien
    advance(31_000)
    returnToApp()
    expect(update).toHaveBeenCalledTimes(2)
  })

  it('ne cherche pas pendant qu\'un enregistrement est en cours (envoi de photos, signature…)', () => {
    const { queryClient } = setup()
    const isMutating = vi.spyOn(queryClient, 'isMutating').mockReturnValue(1)

    returnToApp()
    expect(update).not.toHaveBeenCalled()

    isMutating.mockReturnValue(0)
    returnToApp()
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('ignore une erreur réseau pendant la recherche (hors ligne)', async () => {
    update.mockRejectedValue(new Error('offline'))
    setup()

    returnToApp()
    // un rejet non géré ferait échouer toute la suite de tests
    await Promise.resolve()

    expect(update).toHaveBeenCalledTimes(1)
  })

  it('ne cherche rien tant que le service worker n\'est pas enregistré', () => {
    const queryClient = new QueryClient()
    mockRegisterOptions = {}
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><PwaAutoUpdate /></MemoryRouter>
      </QueryClientProvider>,
    )

    returnToApp()

    expect(update).not.toHaveBeenCalled()
  })
})

describe('configuration PWA', () => {
  const [config] = Object.values(
    import.meta.glob('/vite.config.ts', { query: '?raw', import: 'default', eager: true }),
  ) as string[]

  // Un rechargement automatique peut interrompre une saisie : en changer doit être une décision
  // assumée (voir ADR-006), pas un effet de bord d'un autre chantier.
  it('le service worker se met à jour tout seul (registerType: "autoUpdate")', () => {
    expect(config).toMatch(/registerType:\s*["']autoUpdate["']/)
  })
})
