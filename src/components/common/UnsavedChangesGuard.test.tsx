import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, RouterProvider, createMemoryRouter, useNavigate } from 'react-router'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { UnsavedChangesDialog } from './UnsavedChangesGuard'

function Page({ dirty }: { dirty: boolean }) {
  const guard = useUnsavedChanges(dirty)
  const navigate = useNavigate()
  return (
    <div>
      <p>Formulaire</p>
      <Link to="/ailleurs">Aller ailleurs</Link>
      <button
        type="button"
        onClick={() => {
          guard.markSaved()
          void navigate('/ailleurs')
        }}
      >
        Enregistrer
      </button>
      <UnsavedChangesDialog guard={guard} />
    </div>
  )
}

function renderRouted(dirty: boolean) {
  const router = createMemoryRouter(
    [
      { path: '/formulaire', element: <Page dirty={dirty} /> },
      { path: '/ailleurs', element: <p>Autre page</p> },
    ],
    { initialEntries: ['/formulaire'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('UnsavedChangesDialog', () => {
  it('sans saisie, on quitte la page sans rien demander', async () => {
    renderRouted(false)

    await userEvent.click(screen.getByRole('link', { name: 'Aller ailleurs' }))

    expect(await screen.findByText('Autre page')).toBeInTheDocument()
    expect(screen.queryByText('Quitter sans enregistrer ?')).not.toBeInTheDocument()
  })

  it('avec une saisie, quitter la page demande confirmation et ne part pas encore', async () => {
    const router = renderRouted(true)

    await userEvent.click(screen.getByRole('link', { name: 'Aller ailleurs' }))

    expect(await screen.findByText('Quitter sans enregistrer ?')).toBeInTheDocument()
    expect(screen.getByText(/vous le perdez/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/formulaire')
  })

  it('« Rester sur la page » garde la saisie et ferme la fenêtre', async () => {
    const router = renderRouted(true)
    await userEvent.click(screen.getByRole('link', { name: 'Aller ailleurs' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Rester sur la page' }))

    expect(screen.queryByText('Quitter sans enregistrer ?')).not.toBeInTheDocument()
    expect(screen.getByText('Formulaire')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/formulaire')
  })

  it('« Quitter sans enregistrer » laisse partir', async () => {
    renderRouted(true)
    await userEvent.click(screen.getByRole('link', { name: 'Aller ailleurs' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Quitter sans enregistrer' }))

    expect(await screen.findByText('Autre page')).toBeInTheDocument()
  })

  it('après un enregistrement réussi, la navigation qui suit n\'est pas bloquée', async () => {
    renderRouted(true)

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Autre page')).toBeInTheDocument()
    expect(screen.queryByText('Quitter sans enregistrer ?')).not.toBeInTheDocument()
  })

  it('hors d\'un routeur de données (un simple MemoryRouter), il ne fait rien et ne plante pas', () => {
    render(
      <MemoryRouter>
        <Page dirty />
      </MemoryRouter>,
    )

    expect(screen.getByText('Formulaire')).toBeInTheDocument()
    expect(screen.queryByText('Quitter sans enregistrer ?')).not.toBeInTheDocument()
  })
})
