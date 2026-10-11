import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import { useChangePassword } from '@/hooks/use-change-password'
import { useMe } from '@/hooks/use-update-me'
import { useAuthStore } from '@/store/auth.store'
import { ChangePasswordCard } from './ChangePasswordCard'

vi.mock('@/hooks/use-change-password', () => ({ useChangePassword: vi.fn() }))
vi.mock('@/hooks/use-update-me', () => ({ useMe: vi.fn() }))
vi.mock('@/lib/api-client', () => {
  class ApiError extends Error {
    status: number
    code?: string
    constructor(status: number, message: string, code?: string) {
      super(message)
      this.status = status
      this.code = code
      this.name = 'ApiError'
    }
  }
  return { apiRequest: vi.fn(), ApiError }
})
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const STRONG = 'correct cheval pile agrafe'
const mutateAsync = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mutateAsync.mockResolvedValue({})
  vi.mocked(useChangePassword).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useChangePassword>)
  vi.mocked(useMe).mockReturnValue({
    data: { email: 'lea@acme.test', firstName: 'Léa', lastName: 'Martin' },
  } as unknown as ReturnType<typeof useMe>)
  useAuthStore.setState({ accessToken: 'tok', username: 'lea.martin', role: 'MEMBER', userId: 'u1' })
})

// La carte est repliée au départ : on la déplie comme la fiche d'un membre
const header = () => screen.getByRole('button', { name: /Modifier mon mot de passe/ })
async function open() {
  await userEvent.click(header())
}
const current = () => screen.getByLabelText('Mot de passe actuel')
const next = () => screen.getByLabelText('Nouveau mot de passe')
const confirm = () => screen.getByLabelText('Confirmer le nouveau mot de passe')
const submit = () => screen.getByRole('button', { name: 'Changer le mot de passe' })
const accepted = () => screen.findByText('Mot de passe accepté', {}, { timeout: 8000 })

async function fill(cur: string, nw: string, conf = nw) {
  await userEvent.type(current(), cur)
  await userEvent.type(next(), nw)
  await userEvent.type(confirm(), conf)
}

describe('ChangePasswordCard', () => {
  it('repliée au départ : seul l’en-tête est visible, aucun champ', () => {
    render(<ChangePasswordCard />)

    expect(header()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Mot de passe actuel')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nouveau mot de passe')).not.toBeInTheDocument()
  })

  it('un clic sur l’en-tête déplie les champs, un second les replie', async () => {
    render(<ChangePasswordCard />)

    await open()
    expect(header()).toHaveAttribute('aria-expanded', 'true')
    expect(current()).toBeInTheDocument()

    await open()
    expect(header()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Mot de passe actuel')).not.toBeInTheDocument()
  })

  it('après un changement réussi, la carte se replie', async () => {
    render(<ChangePasswordCard />)
    await open()

    await fill('ancien-mot-de-passe', STRONG)
    await accepted()
    await userEvent.click(submit())

    await waitFor(() => expect(header()).toHaveAttribute('aria-expanded', 'false'))
    expect(screen.queryByLabelText('Mot de passe actuel')).not.toBeInTheDocument()
  })

  it('demande l’ancien mot de passe, le nouveau et sa confirmation, et rassure sur les autres appareils', async () => {
    render(<ChangePasswordCard />)
    await open()

    expect(current()).toBeInTheDocument()
    expect(next()).toBeInTheDocument()
    expect(confirm()).toBeInTheDocument()
    expect(screen.getByText(/autres appareils seront déconnectés/)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('envoie l’ancien et le nouveau mot de passe, puis vide le formulaire', async () => {
    render(<ChangePasswordCard />)
    await open()

    await fill('ancien-mot-de-passe', STRONG)
    await accepted()
    await userEvent.click(submit())

    expect(mutateAsync).toHaveBeenCalledWith({ currentPassword: 'ancien-mot-de-passe', newPassword: STRONG })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Mot de passe modifié. Vos autres appareils ont été déconnectés.'),
    )
    // repliée : on la rouvre, les champs sont vides
    await waitFor(() => expect(header()).toHaveAttribute('aria-expanded', 'false'))
    await open()
    expect(current()).toHaveValue('')
    expect(next()).toHaveValue('')
    expect(confirm()).toHaveValue('')
  })

  it('sans l’ancien mot de passe, rien ne s’envoie', async () => {
    render(<ChangePasswordCard />)
    await open()

    await userEvent.type(next(), STRONG)
    await userEvent.type(confirm(), STRONG)
    await accepted()

    expect(submit()).toBeDisabled()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it.each([
    ['court', 'Encore trop court : 12 caractères minimum'],
    ['Motdepasse1!', /Trop facile à deviner/],
    ['xK9#lea.martin#2$vL7', 'Ne doit pas contenir votre identifiant, votre nom ou votre email'],
  ])('nouveau mot de passe « %s » : conseil affiché, bouton inactif', async (password, advice) => {
    render(<ChangePasswordCard />)
    await open()

    await fill('ancien', password)

    expect(await screen.findByText(advice, {}, { timeout: 8000 })).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('confirmation différente : alerte précise sous le champ, champ marqué, envoi bloqué', async () => {
    render(<ChangePasswordCard />)
    await open()

    await fill('ancien', STRONG, 'autre chose')
    await accepted()

    expect(screen.getByRole('alert')).toHaveTextContent('Les deux nouveaux mots de passe ne correspondent pas')
    expect(confirm()).toHaveAttribute('aria-invalid', 'true')
    expect(next()).not.toHaveAttribute('aria-invalid')
    expect(submit()).toBeDisabled()
  })

  it('nouveau mot de passe identique à l’ancien : alerte précise sous le champ, envoi bloqué', async () => {
    render(<ChangePasswordCard />)
    await open()

    await fill(STRONG, STRONG)
    await accepted()

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Le nouveau mot de passe est identique à l'ancien : choisissez-en un différent",
    )
    expect(next()).toHaveAttribute('aria-invalid', 'true')
    expect(current()).not.toHaveAttribute('aria-invalid')
    expect(submit()).toBeDisabled()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('l’alerte « identique » disparaît dès que le nouveau mot de passe change', async () => {
    render(<ChangePasswordCard />)
    await open()
    await fill(STRONG, STRONG)

    await userEvent.type(next(), ' 47')

    await waitFor(() => expect(screen.queryByText(/identique à l'ancien/)).not.toBeInTheDocument())
  })

  it('nouveau mot de passe qui contient l’identifiant, le nom ou l’email : conseil précis', async () => {
    render(<ChangePasswordCard />)
    await open()

    await fill('ancien', 'xK9#lea.martin#2$vL7')

    expect(
      await screen.findByText('Ne doit pas contenir votre identifiant, votre nom ou votre email', {}, { timeout: 8000 }),
    ).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('aucune alerte tant que tout va bien', async () => {
    render(<ChangePasswordCard />)
    await open()

    await fill('ancien', STRONG)
    await accepted()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ancien mot de passe incorrect : alerte précise sous le champ, notification, focus, formulaire conservé', async () => {
    mutateAsync.mockRejectedValue(new ApiError(400, 'Current password is incorrect', 'CURRENT_PASSWORD_INVALID'))
    render(<ChangePasswordCard />)
    await open()

    await fill('pas-le-bon', STRONG)
    await accepted()
    await userEvent.click(submit())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Le mot de passe actuel est incorrect'))
    expect(screen.getByRole('alert')).toHaveTextContent('Le mot de passe actuel est incorrect')
    expect(current()).toHaveAttribute('aria-invalid', 'true')
    expect(current()).toHaveFocus()
    expect(next()).toHaveValue(STRONG)
  })

  it('l’alerte sur l’ancien mot de passe disparaît dès qu’on le corrige', async () => {
    mutateAsync.mockRejectedValue(new ApiError(400, 'Current password is incorrect', 'CURRENT_PASSWORD_INVALID'))
    render(<ChangePasswordCard />)
    await open()
    await fill('pas-le-bon', STRONG)
    await accepted()
    await userEvent.click(submit())
    await screen.findByRole('alert')

    await userEvent.type(current(), 'x')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(current()).not.toHaveAttribute('aria-invalid')
  })

  it('le serveur dit « identique » (PASSWORD_UNCHANGED) : message précis', async () => {
    mutateAsync.mockRejectedValue(new ApiError(400, 'x', 'PASSWORD_UNCHANGED'))
    render(<ChangePasswordCard />)
    await open()
    await fill('ancien', STRONG)
    await accepted()
    await userEvent.click(submit())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Le nouveau mot de passe est identique à l'ancien : choisissez-en un différent"),
    )
  })

  it('compte bloqué après des échecs : message de blocage', async () => {
    mutateAsync.mockRejectedValue(new ApiError(429, 'Too many failed attempts', 'TOO_MANY_ATTEMPTS'))
    render(<ChangePasswordCard />)
    await open()

    await fill('pas-le-bon', STRONG)
    await accepted()
    await userEvent.click(submit())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Trop de tentatives échouées')),
    )
  })

  it('trop d’essais par minute (429 sans code) : message dédié', async () => {
    mutateAsync.mockRejectedValue(new ApiError(429, 'ThrottlerException'))
    render(<ChangePasswordCard />)
    await open()

    await fill('ancien', STRONG)
    await accepted()
    await userEvent.click(submit())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Trop de demandes, réessayez dans une minute'))
  })

  it('autre erreur : message générique, jamais le texte du serveur', async () => {
    mutateAsync.mockRejectedValue(new ApiError(500, 'Internal server error'))
    render(<ChangePasswordCard />)
    await open()

    await fill('ancien', STRONG)
    await accepted()
    await userEvent.click(submit())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Impossible de changer le mot de passe, réessayez'))
  })

  it('chaque champ a son propre œil', async () => {
    render(<ChangePasswordCard />)
    await open()
    const eyes = screen.getAllByRole('button', { name: 'Afficher ou masquer le mot de passe' })

    expect(eyes).toHaveLength(3)
    await userEvent.click(eyes[1])
    expect(next()).toHaveAttribute('type', 'text')
    expect(current()).toHaveAttribute('type', 'password')
    expect(confirm()).toHaveAttribute('type', 'password')
  })

  describe('avec la double authentification', () => {
    const codeField = () => screen.getByLabelText("Code de l'application (ou code de secours)")
    beforeEach(() => {
      vi.mocked(useMe).mockReturnValue({
        data: { email: 'lea@acme.test', firstName: 'Léa', lastName: 'Martin', totpEnabledAt: '2026-10-11T10:00:00Z' },
      } as unknown as ReturnType<typeof useMe>)
    })

    it('sans double authentification, aucun champ de code', async () => {
      vi.mocked(useMe).mockReturnValue({
        data: { email: 'lea@acme.test', firstName: 'Léa', lastName: 'Martin', totpEnabledAt: null },
      } as unknown as ReturnType<typeof useMe>)
      render(<ChangePasswordCard />)
      await open()

      expect(screen.queryByLabelText("Code de l'application (ou code de secours)")).not.toBeInTheDocument()
    })

    it('prévient que le code sera demandé en dernier, et le place juste avant le bouton (il ne dure que 30 secondes)', async () => {
      render(<ChangePasswordCard />)
      await open()

      expect(screen.getByText(/code de votre application vous sera demandé en dernier/)).toBeInTheDocument()
      expect(screen.getByText(/le code ne dure que 30 secondes/)).toBeInTheDocument()
      // l'ordre du formulaire : mot de passe actuel, nouveau, confirmation, puis le code, puis le bouton
      const order = [current(), next(), confirm(), codeField(), submit()]
      for (let i = 1; i < order.length; i += 1) {
        expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      }
    })

    it('le code est demandé, et l’envoi reste bloqué sans lui', async () => {
      render(<ChangePasswordCard />)
      await open()

      await fill('ancien-mot-de-passe', STRONG)
      await accepted()

      expect(codeField()).toBeInTheDocument()
      expect(submit()).toBeDisabled()
    })

    it('envoie le code avec les mots de passe, puis vide le formulaire', async () => {
      render(<ChangePasswordCard />)
      await open()

      await fill('ancien-mot-de-passe', STRONG)
      await userEvent.type(codeField(), ' 123456 ')
      await accepted()
      await userEvent.click(submit())

      expect(mutateAsync).toHaveBeenCalledWith({
        currentPassword: 'ancien-mot-de-passe',
        newPassword: STRONG,
        code: '123456',
      })
      await waitFor(() => expect(header()).toHaveAttribute('aria-expanded', 'false'))
      await open()
      expect(codeField()).toHaveValue('')
    })

    it('code refusé : alerte précise sous le champ, notification, focus, formulaire conservé', async () => {
      mutateAsync.mockRejectedValue(new ApiError(400, 'The code is not valid', 'INVALID_TWO_FACTOR_CODE'))
      render(<ChangePasswordCard />)
      await open()
      await fill('ancien-mot-de-passe', STRONG)
      await userEvent.type(codeField(), '000001')
      await accepted()
      await userEvent.click(submit())

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Ce code n'est pas valable")))
      expect(screen.getByRole('alert')).toHaveTextContent("Ce code n'est pas valable")
      expect(codeField()).toHaveAttribute('aria-invalid', 'true')
      expect(codeField()).toHaveFocus()
      expect(next()).toHaveValue(STRONG)
    })

    it('l’alerte sur le code disparaît dès qu’on le corrige', async () => {
      mutateAsync.mockRejectedValue(new ApiError(400, 'x', 'INVALID_TWO_FACTOR_CODE'))
      render(<ChangePasswordCard />)
      await open()
      await fill('ancien-mot-de-passe', STRONG)
      await userEvent.type(codeField(), '000001')
      await accepted()
      await userEvent.click(submit())
      await screen.findByRole('alert')

      await userEvent.type(codeField(), '2')

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
