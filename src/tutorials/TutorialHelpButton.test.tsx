import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuthStore } from '@/store/auth.store'
import { TutorialHelpButton } from './TutorialHelpButton'

// Hors TutorialProvider, `useTutorial()` renvoie des valeurs par défaut : t(clé) → la clé elle-même
const HELP_BTN = 'tutorials.help_btn'

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'tok', username: 'admin', role: 'ADMIN', userId: 'u1', permissions: null })
})

async function openHelp(scope: 'projects' | 'clients' | 'team' = 'projects') {
  render(<TutorialHelpButton scope={scope} />)
  await userEvent.click(screen.getByRole('button', { name: HELP_BTN }))
  return screen.getByRole('dialog')
}

describe('TutorialHelpButton', () => {
  it('ne s\'affiche pas quand la page n\'a aucun tutoriel disponible', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: { chantiers: [], clients: [], equipe: [], prestations: [] } })
    render(<TutorialHelpButton scope="projects" />)

    expect(screen.queryByRole('button', { name: HELP_BTN })).not.toBeInTheDocument()
  })

  it('ouvre une fenêtre listant les tutoriels de la page', async () => {
    const dialog = await openHelp('projects')

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByText('tutorials.create_project.title')).toBeInTheDocument()
    expect(within(dialog).getByText('tutorials.express_project.title')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('button', { name: /tutorials\.start/ }).length).toBeGreaterThanOrEqual(2)
  })

  it('est centrée sur l\'écran, y compris sur mobile', async () => {
    const dialog = await openHelp()

    expect(dialog).toHaveClass('items-center', 'justify-center')
    // plus de cadrage en bas d'écran sur mobile
    expect(dialog).not.toHaveClass('items-end')
  })

  it('passe au-dessus de la barre de navigation du bas (z-50)', async () => {
    const dialog = await openHelp()

    expect(dialog).toHaveClass('z-[60]')
  })

  it('le titre reste fixe et seule la liste défile quand elle dépasse l\'écran', async () => {
    const dialog = await openHelp()

    const title = within(dialog).getByRole('heading', { name: 'tutorials.help_title' })
    const firstTutorial = within(dialog).getByText('tutorials.create_project.title')
    const scrollZone = firstTutorial.closest('.overflow-y-auto')

    expect(scrollZone).not.toBeNull()
    expect(scrollZone).not.toContainElement(title)
    // la carte est bornée à la hauteur de l'écran, sinon la liste ne défilerait jamais
    expect(scrollZone!.parentElement).toHaveClass('max-h-full', 'flex-col')
  })

  it('se ferme avec la croix ou en touchant le fond', async () => {
    const dialog = await openHelp()
    await userEvent.click(within(dialog).getByRole('button', { name: 'common.cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: HELP_BTN }))
    const backdrop = screen.getByRole('dialog').querySelector('.bg-black\\/40') as HTMLElement
    await userEvent.click(backdrop)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
