import { describe, it, expect, afterEach, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { InstallModal } from './InstallModal'
import { parseSafariMajor } from '@/hooks/use-pwa-install'

// iOS gèle « iPhone OS 18_6 » dans le user-agent : seule la version de Safari change sous iOS 26
const SAFARI_26 =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const SAFARI_18 =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1'
const CHROME_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1'

const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36'

function renderWithUserAgent(ua: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
  render(<InstallModal open onClose={() => {}} />)
}

// Chaque étape est un paragraphe ; le titre de la fenêtre est un <h2>
const steps = () => screen.getAllByText(/./, { selector: 'p' })

afterEach(() => vi.restoreAllMocks())

describe('parseSafariMajor', () => {
  it('lit la version de Safari', () => {
    expect(parseSafariMajor(SAFARI_26)).toBe(26)
    expect(parseSafariMajor(SAFARI_18)).toBe(18)
  })

  it('renvoie null sans « Version/ » (Chrome sur iOS)', () => {
    expect(parseSafariMajor(CHROME_IOS)).toBeNull()
  })
})

describe('InstallModal sur Android', () => {
  it('Chrome sans invite native : menu à droite de la barre d\'adresse, « Installer et créer un raccourci », puis Installer', () => {
    renderWithUserAgent(CHROME_ANDROID)

    const [menu, shortcut, confirm] = steps()
    expect(steps()).toHaveLength(3)
    expect(menu).toHaveTextContent('Appuyez sur le menu ⋮ à droite de la barre d\'adresse')
    expect(shortcut).toHaveTextContent('Sélectionnez « Installer et créer un raccourci »')
    // le renommage arrive par paliers : les anciennes versions de Chrome affichent encore l'ancien libellé
    expect(shortcut).toHaveTextContent('« Ajouter à l\'écran d\'accueil » sur une ancienne version de Chrome')
    expect(confirm).toHaveTextContent('Confirmez en appuyant sur « Installer »')
  })

  it('Chrome avec invite native : un bouton Installer, pas d\'étapes manuelles', () => {
    renderWithUserAgent(CHROME_ANDROID)
    // l'invite native arrive après le premier rendu (beforeinstallprompt)
    act(() => { window.dispatchEvent(new Event('beforeinstallprompt')) })

    expect(screen.getByRole('button', { name: 'Installer' })).toBeInTheDocument()
    expect(screen.queryByText(/Installer et créer un raccourci/)).not.toBeInTheDocument()
  })
})

describe('InstallModal sur iPhone', () => {
  it('Safari 26 : passe par le menu de la barre d\'adresse, puis Partager, puis l\'écran d\'accueil, puis Ajouter', () => {
    renderWithUserAgent(SAFARI_26)

    const [menu, share, home, add] = steps()
    expect(steps()).toHaveLength(4)
    expect(menu).toHaveTextContent('Appuyez sur le bouton menu de la barre d\'adresse de Safari')
    expect(share).toHaveTextContent('Appuyez sur « Partager »')
    expect(home).toHaveTextContent('Faites défiler et appuyez sur « Sur l\'écran d\'accueil »')
    expect(add).toHaveTextContent('Laissez l\'ouverture en app web activée, puis appuyez sur « Ajouter »')
  })

  it('Safari 18 : garde le parcours d\'avant, Partager est dans la barre d\'outils', () => {
    renderWithUserAgent(SAFARI_18)

    expect(steps()).toHaveLength(3)
    expect(steps()[0]).toHaveTextContent('Appuyez sur l\'icône Partager')
    expect(screen.queryByText(/bouton menu de la barre d'adresse/)).not.toBeInTheDocument()
  })

  it('un autre navigateur que Safari : demande d\'ouvrir la page dans Safari', () => {
    renderWithUserAgent(CHROME_IOS)

    const dialog = screen.getByText('Installer Drakko').closest('[data-tutorial="install-modal"]') as HTMLElement
    expect(within(dialog).getByText(/ouvrez cette page dans Safari/)).toBeInTheDocument()
  })
})
