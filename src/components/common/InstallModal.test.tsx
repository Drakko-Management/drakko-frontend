import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { InstallModal } from './InstallModal'
import { parseSafariMajor } from '@/hooks/use-pwa-install'

// iOS gèle « iPhone OS 18_6 » dans le user-agent : seule la version de Safari change sous iOS 26
const SAFARI_26 =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const SAFARI_18 =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1'
const CHROME_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1'

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
