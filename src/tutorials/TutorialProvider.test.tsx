import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { TutorialProvider, useTutorial } from './TutorialProvider'
import { getTutorial } from './definitions'
import type { TutorialId } from './definitions'

// Le chantier de la page du rapport est « en cours » : le guide peut s'y dérouler
vi.mock('@/lib/api-client', () => ({ apiRequest: vi.fn(() => Promise.resolve({ status: 'IN_PROGRESS' })) }))

// Joyride (fond sombre, bulles) est testé dans le navigateur : ici on observe seulement ce que le moteur lui demande
const joyrideProps = vi.hoisted(() => ({ onEvent: undefined as undefined | ((data: object) => void) }))
vi.mock('react-joyride', () => ({
  Joyride: ({ run, stepIndex, steps, onEvent }: { run: boolean; stepIndex: number; steps: unknown[]; onEvent: (data: object) => void }) => {
    joyrideProps.onEvent = onEvent
    return <div data-testid="joyride" data-run={String(run)} data-index={stepIndex} data-steps={steps.length} />
  },
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

describe('TutorialProvider — rapport d\'intervention', () => {
  const total = getTutorial('fill_report').steps.length

  function ReportPage({ lineFormOpen }: { lineFormOpen: boolean }) {
    const [open, setOpen] = useState(lineFormOpen)
    return (
      <>
        <Launcher id="fill_report" />
        <button onClick={() => { setOpen(true) }}>ouvrir le formulaire</button>
        {open && <div data-tutorial="report-service" />}
      </>
    )
  }

  function renderReport(lineFormOpen: boolean) {
    return render(
      <MemoryRouter initialEntries={['/chantiers/p1/rapport']}>
        <TutorialProvider>
          <Routes>
            <Route path="/chantiers/:id/rapport" element={<ReportPage lineFormOpen={lineFormOpen} />} />
          </Routes>
        </TutorialProvider>
      </MemoryRouter>,
    )
  }

  const step = (action: 'next' | 'prev', index: number) => {
    act(() => { joyrideProps.onEvent?.({ type: 'step:after', action, index, size: total }) })
  }

  it('aucune ligne en cours de création : toutes les étapes, dont « Ajouter une prestation »', async () => {
    renderReport(false)
    await userEvent.click(screen.getByText('lancer'))

    await waitFor(() => { expect(joyride()).toHaveAttribute('data-run', 'true') })
    expect(joyride()).toHaveAttribute('data-steps', String(total))
  })

  it('une ligne déjà en cours de création : « Ajouter une prestation » est retirée dès le lancement (pas d\'attente, numérotation juste)', async () => {
    renderReport(true)
    await userEvent.click(screen.getByText('lancer'))

    await waitFor(() => { expect(joyride()).toHaveAttribute('data-run', 'true') })
    expect(joyride()).toHaveAttribute('data-steps', String(total - 1))
  })

  it('« Précédent » après avoir ouvert le formulaire revient aux prestations, sans rejouer « Ajouter » dans le vide', async () => {
    renderReport(false)
    await userEvent.click(screen.getByText('lancer'))
    await waitFor(() => { expect(joyride()).toHaveAttribute('data-run', 'true') })
    step('next', 0) // les prestations → ajouter
    step('next', 1) // ajouter → choisir la prestation
    expect(joyride()).toHaveAttribute('data-index', '2')

    await userEvent.click(screen.getByText('ouvrir le formulaire'))
    step('prev', 2)

    expect(joyride()).toHaveAttribute('data-index', '0')
    expect(joyride()).toHaveAttribute('data-steps', String(total - 1))
  })

  it('« Précédent » reste un simple pas en arrière quand l\'étape d\'avant n\'est pas déjà faite', async () => {
    renderReport(false)
    await userEvent.click(screen.getByText('lancer'))
    await waitFor(() => { expect(joyride()).toHaveAttribute('data-run', 'true') })
    step('next', 0)
    step('next', 1)

    step('prev', 2) // le formulaire est fermé : l'étape « Ajouter » reste à jouer

    expect(joyride()).toHaveAttribute('data-index', '1')
    expect(joyride()).toHaveAttribute('data-steps', String(total))
  })
})
