import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { TutorialProvider, useTutorial } from './TutorialProvider'
import type { TutorialId } from './definitions'

// Joyride (fond sombre, bulles) est testé dans le navigateur : ici on observe seulement ce que le moteur lui demande
vi.mock('react-joyride', () => ({
  Joyride: ({ run, stepIndex, steps }: { run: boolean; stepIndex: number; steps: unknown[] }) => (
    <div data-testid="joyride" data-run={String(run)} data-index={stepIndex} data-steps={steps.length} />
  ),
  EVENTS: { TARGET_NOT_FOUND: 'error:target_not_found', STEP_AFTER: 'step:after' },
  ACTIONS: { NEXT: 'next', PREV: 'prev', SKIP: 'skip', CLOSE: 'close' },
}))

function Launcher({ id }: { id: TutorialId }) {
  const { start } = useTutorial()
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => { start(id) }}>lancer</button>
      <button onClick={() => { void navigate('/ailleurs') }}>partir</button>
    </>
  )
}

function renderAt(path: string, id: TutorialId) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TutorialProvider>
        <Routes>
          <Route path="/parametres/tutoriels" element={<Launcher id={id} />} />
          <Route path="/clients" element={<><Launcher id={id} /><div data-tutorial="clients-new">Nouveau</div></>} />
          <Route path="/ailleurs" element={<div>ailleurs</div>} />
        </Routes>
      </TutorialProvider>
    </MemoryRouter>,
  )
}

const joyride = () => screen.getByTestId('joyride')

describe('TutorialProvider — lancement', () => {
  it('lancé depuis une autre page : le guide reste actif une fois la page arrivée (la navigation est asynchrone)', async () => {
    renderAt('/parametres/tutoriels', 'create_client')
    expect(joyride()).toHaveAttribute('data-run', 'false')

    await userEvent.click(screen.getByText('lancer'))

    // la page des clients est arrivée…
    await waitFor(() => { expect(screen.getByText('Nouveau')).toBeInTheDocument() })
    // …et le guide est démarré à la première étape, sans s'être arrêté pendant le trajet
    await waitFor(() => { expect(joyride()).toHaveAttribute('data-run', 'true') })
    expect(joyride()).toHaveAttribute('data-index', '0')
    await act(async () => { await new Promise((r) => setTimeout(r, 150)) })
    expect(joyride()).toHaveAttribute('data-run', 'true')
  })

  it('lancé depuis la page de départ : démarre tout de suite', async () => {
    renderAt('/clients', 'create_client')
    await userEvent.click(screen.getByText('lancer'))
    await waitFor(() => { expect(joyride()).toHaveAttribute('data-run', 'true') })
    expect(joyride()).toHaveAttribute('data-index', '0')
  })

  it('l\'utilisateur quitte la page en cours de guide : le guide s\'arrête', async () => {
    renderAt('/clients', 'create_client')
    await userEvent.click(screen.getByText('lancer'))
    await waitFor(() => { expect(joyride()).toHaveAttribute('data-run', 'true') })

    await userEvent.click(screen.getByText('partir'))

    await waitFor(() => { expect(joyride()).toHaveAttribute('data-run', 'false') })
  })
})
