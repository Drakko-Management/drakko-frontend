import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { toast } from 'sonner'
import { useDeleteQuote, useEmailQuote, useQuote, useQuoteAction, openQuotePdf } from '@/hooks/use-quotes'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions } from '@/lib/permissions'
import { ApiError } from '@/lib/api-client'
import { QuoteDetailPage } from './QuoteDetailPage'
import { acceptance, plain, quote } from '@/test/quote-fixtures'
import type { Quote } from '@/types/api'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-quotes', () => ({
  useQuote: vi.fn(),
  useQuoteAction: vi.fn(),
  useEmailQuote: vi.fn(),
  useDeleteQuote: vi.fn(),
  openQuotePdf: vi.fn(),
}))

const act = vi.fn()
const remove = vi.fn()
const email = vi.fn()

function show(q: Quote | undefined, extra: object = {}) {
  vi.mocked(useQuote).mockReturnValue({ data: q, isLoading: false, isError: !q, ...extra } as never)
  render(
    <MemoryRouter initialEntries={['/devis/q1']}>
      <Routes>
        <Route path="/devis/:id" element={<QuoteDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const button = (name: string) => screen.queryByRole('button', { name })

beforeEach(() => {
  vi.clearAllMocks()
  act.mockResolvedValue(quote())
  remove.mockResolvedValue(undefined)
  email.mockResolvedValue(quote({ status: 'SENT' }))
  vi.mocked(useEmailQuote).mockReturnValue({ mutateAsync: email, isPending: false } as never)
  vi.mocked(useQuoteAction).mockReturnValue({ mutateAsync: act, isPending: false } as never)
  vi.mocked(useDeleteQuote).mockReturnValue({ mutateAsync: remove, isPending: false } as never)
  vi.mocked(openQuotePdf).mockResolvedValue(undefined)
  useAuthStore.setState({ role: 'ADMIN', permissions: null, modules: null })
})

describe('QuoteDetailPage — contenu', () => {
  it('montre le numéro, l\'objet, le client, les lignes figées et les montants calculés par l\'API', () => {
    show(quote())

    expect(screen.getByText('DEV-2026-0001')).toBeInTheDocument()
    expect(screen.getByText('Haie du fond')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Léa Martin' })).toHaveAttribute('href', '/clients/c1')
    expect(screen.getByText('Taille de haie')).toBeInTheDocument()
    expect(screen.getByText('Haie vive')).toBeInTheDocument()
    expect(plain(screen.getByTestId('quote-total').textContent)).toBe('137,50 €')
    expect(screen.getByText('Brouillon')).toBeInTheDocument()
  })

  it('un devis introuvable le dit et renvoie à la liste', () => {
    show(undefined)

    expect(screen.getByText('Devis introuvable')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour aux devis' })).toHaveAttribute('href', '/devis')
  })

  it('sans droit sur les clients, le nom du client n\'est pas un lien', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ devis: ['read'] }) })
    show(quote())

    expect(screen.queryByRole('link', { name: 'Léa Martin' })).not.toBeInTheDocument()
    expect(screen.getByText('Léa Martin')).toBeInTheDocument()
  })
})

describe('QuoteDetailPage — les gestes selon l\'état', () => {
  it('brouillon : télécharger, modifier, envoyer par email, marquer comme envoyé, supprimer ; pas de réponse du client', () => {
    show(quote({ status: 'DRAFT' }))

    for (const name of ['Télécharger le PDF', 'Modifier', 'Envoyer par email', 'Marquer comme envoyé', 'Supprimer']) {
      expect(button(name)).toBeInTheDocument()
    }
    for (const name of ['Marquer comme accepté', 'Marquer comme refusé', 'Rouvrir pour modifier']) {
      expect(button(name)).not.toBeInTheDocument()
    }
    expect(screen.getByText(/votre client reçoit le PDF et un lien/)).toBeInTheDocument()
  })

  it('envoyé : renvoyer par email, accepter, refuser, rouvrir ; ni modifier ni supprimer', () => {
    show(quote({ status: 'SENT', sentAt: '2026-11-03T10:00:00.000Z' }))

    for (const name of ['Télécharger le PDF', 'Renvoyer par email', 'Marquer comme accepté', 'Marquer comme refusé', 'Rouvrir pour modifier']) {
      expect(button(name)).toBeInTheDocument()
    }
    for (const name of ['Modifier', 'Supprimer', 'Marquer comme envoyé', 'Envoyer par email']) {
      expect(button(name)).not.toBeInTheDocument()
    }
  })

  it.each(['ACCEPTED', 'REJECTED'] as const)('%s : seulement le PDF', (status) => {
    show(quote({ status, decidedAt: '2026-11-04T10:00:00.000Z' }))

    expect(button('Télécharger le PDF')).toBeInTheDocument()
    for (const name of ['Modifier', 'Supprimer', 'Marquer comme envoyé', 'Envoyer par email', 'Renvoyer par email', 'Marquer comme accepté', 'Rouvrir pour modifier']) {
      expect(button(name)).not.toBeInTheDocument()
    }
  })

  it('lecture seule (devis:read) : le PDF, aucun geste qui écrit', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ devis: ['read'] }) })
    show(quote({ status: 'DRAFT' }))

    expect(button('Télécharger le PDF')).toBeInTheDocument()
    for (const name of ['Modifier', 'Envoyer par email', 'Marquer comme envoyé', 'Supprimer']) {
      expect(button(name)).not.toBeInTheDocument()
    }
  })

  it('sans droit de suppression, un brouillon ne propose pas « Supprimer »', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ devis: ['read', 'update'] }) })
    show(quote({ status: 'DRAFT' }))

    expect(button('Marquer comme envoyé')).toBeInTheDocument()
    expect(button('Supprimer')).not.toBeInTheDocument()
  })
})

describe('QuoteDetailPage — envoi par email et réponse du client', () => {
  it('« Envoyer par email » demande confirmation, avec l\'adresse du client, puis envoie', async () => {
    show(quote({ status: 'DRAFT' }))

    await userEvent.click(screen.getByRole('button', { name: 'Envoyer par email' }))

    expect(screen.getByText('Envoyer le devis par email ?')).toBeInTheDocument()
    expect(screen.getByText(/DEV-2026-0001 part à lea@martin\.test/)).toBeInTheDocument()
    expect(email).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(email).toHaveBeenCalledWith('q1')
    expect(toast.success).toHaveBeenCalledWith('Devis envoyé à lea@martin.test')
    expect(screen.queryByText('Envoyer le devis par email ?')).not.toBeInTheDocument()
  })

  it('annuler la confirmation n\'envoie rien', async () => {
    show(quote({ status: 'DRAFT' }))

    await userEvent.click(screen.getByRole('button', { name: 'Envoyer par email' }))
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(email).not.toHaveBeenCalled()
  })

  it('un email qui ne part pas est dit avec sa traduction, et la fenêtre se ferme', async () => {
    email.mockRejectedValue(new ApiError(502, 'x', 'QUOTE_EMAIL_FAILED'))
    show(quote({ status: 'DRAFT' }))

    await userEvent.click(screen.getByRole('button', { name: 'Envoyer par email' }))
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(toast.error).toHaveBeenCalledWith("L'email n'est pas parti : le devis reste comme avant. Réessayez dans un instant.")
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('une date de validité passée est dite à part', async () => {
    email.mockRejectedValue(new ApiError(409, 'x', 'QUOTE_EXPIRED'))
    show(quote({ status: 'DRAFT' }))

    await userEvent.click(screen.getByRole('button', { name: 'Envoyer par email' }))
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(toast.error).toHaveBeenCalledWith('La date de validité de ce devis est passée : changez-la avant de l\'envoyer.')
  })

  it('un devis envoyé se renvoie après confirmation', async () => {
    show(quote({ status: 'SENT', acceptance: acceptance() }))

    await userEvent.click(screen.getByRole('button', { name: 'Renvoyer par email' }))

    expect(screen.getByText('Renvoyer le devis par email ?')).toBeInTheDocument()
    expect(screen.getByText(/avec son PDF et son lien de réponse/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    expect(email).toHaveBeenCalledWith('q1')
  })

  it('« Copier le lien » met l\'adresse du lien ouvert dans le presse-papiers', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    show(quote({ status: 'SENT', acceptance: acceptance() }))

    await userEvent.click(screen.getByRole('button', { name: 'Copier le lien' }))

    expect(writeText).toHaveBeenCalledWith('https://devapp.drakko.fr/quote/tok-123')
    expect(toast.success).toHaveBeenCalledWith('Lien copié')
  })

  it('sans lien ouvert (envoyé à la main, lien périmé), pas de « Copier le lien »', () => {
    show(quote({ status: 'SENT', acceptance: null }))
    expect(button('Copier le lien')).not.toBeInTheDocument()
  })

  it('un lien ouvert : à qui, quand, et jusqu\'à quand le client peut répondre', () => {
    show(quote({ status: 'SENT', validUntil: '2026-12-15T00:00:00.000Z', acceptance: acceptance({ expiresAt: '2026-12-16T00:00:00.000Z' }) }))

    const info = screen.getByTestId('quote-acceptance')
    expect(info).toHaveTextContent('Envoyé par email à lea@martin.test')
    expect(info).toHaveTextContent('3 nov. 2026')
    // la date du devis, pas le minuit suivant du lien
    expect(info).toHaveTextContent('jusqu\'au 15 déc. 2026')
  })

  it('accepté en ligne : le nom tapé par le client et la date', () => {
    show(quote({
      status: 'ACCEPTED',
      decidedAt: '2026-11-04T10:00:00.000Z',
      acceptance: acceptance({ state: 'ACCEPTED', respondedAt: '2026-11-04T10:00:00.000Z', signerName: 'Léa Martin', comment: 'Pour mars', url: null }),
    }))

    const info = screen.getByTestId('quote-acceptance')
    expect(info).toHaveTextContent('Accepté en ligne par Léa Martin le 4 nov. 2026')
    expect(info).toHaveTextContent('Message du client : « Pour mars »')
  })

  it('refusé en ligne : le motif du client', () => {
    show(quote({
      status: 'REJECTED',
      decidedAt: '2026-11-04T10:00:00.000Z',
      acceptance: acceptance({ state: 'REJECTED', respondedAt: '2026-11-04T10:00:00.000Z', comment: 'Trop cher', url: null }),
    }))

    const info = screen.getByTestId('quote-acceptance')
    expect(info).toHaveTextContent('Refusé en ligne le 4 nov. 2026')
    expect(info).toHaveTextContent('« Trop cher »')
  })

  it('lien périmé : l\'équipe le sait', () => {
    show(quote({ status: 'SENT', acceptance: acceptance({ state: 'EXPIRED', url: null }) }))

    expect(screen.getByTestId('quote-acceptance')).toHaveTextContent('a expiré')
  })

  it('devis rouvert : le brouillon dit que le lien déjà envoyé ne marche plus', () => {
    show(quote({ status: 'DRAFT', acceptance: acceptance({ state: 'WITHDRAWN', url: null }) }))

    expect(screen.getByTestId('quote-acceptance')).toHaveTextContent('ne fonctionne plus')
  })

  it('devis décidé à la main : pas de bloc sur un lien retiré, la date de décision suffit', () => {
    show(quote({ status: 'ACCEPTED', decidedAt: '2026-11-04T10:00:00.000Z', acceptance: acceptance({ state: 'WITHDRAWN', url: null }) }))

    expect(screen.queryByTestId('quote-acceptance')).not.toBeInTheDocument()
  })

  it('sans lien envoyé, aucun bloc', () => {
    show(quote({ status: 'SENT', acceptance: null }))

    expect(screen.queryByTestId('quote-acceptance')).not.toBeInTheDocument()
  })
})

describe('QuoteDetailPage — actions', () => {
  it.each([
    ['DRAFT', 'Marquer comme envoyé', 'send', 'Devis marqué comme envoyé'],
    ['SENT', 'Marquer comme accepté', 'accept', 'Devis marqué comme accepté'],
    ['SENT', 'Marquer comme refusé', 'reject', 'Devis marqué comme refusé'],
    ['SENT', 'Rouvrir pour modifier', 'reopen', 'Devis rouvert, vous pouvez le modifier'],
  ] as const)('%s : « %s » envoie « %s »', async (status, label, action, message) => {
    show(quote({ status }))

    await userEvent.click(screen.getByRole('button', { name: label }))

    expect(act).toHaveBeenCalledWith({ id: 'q1', action })
    expect(toast.success).toHaveBeenCalledWith(message)
  })

  it('un refus de l\'API est dit avec sa traduction', async () => {
    act.mockRejectedValue(new ApiError(400, 'x', 'QUOTE_EMPTY'))
    show(quote({ status: 'DRAFT', lines: [] }))

    await userEvent.click(screen.getByRole('button', { name: 'Marquer comme envoyé' }))

    expect(toast.error).toHaveBeenCalledWith('Ajoutez au moins une ligne avant d\'envoyer le devis.')
  })

  it('« Modifier » ouvre la page de modification', async () => {
    show(quote({ status: 'DRAFT' }))

    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }))

    expect(mockNavigate).toHaveBeenCalledWith('/devis/q1/modifier')
  })

  it('« Télécharger le PDF » ouvre le PDF du devis', async () => {
    show(quote())

    await userEvent.click(screen.getByRole('button', { name: 'Télécharger le PDF' }))

    expect(openQuotePdf).toHaveBeenCalledWith('q1')
  })

  it('supprimer demande confirmation, puis supprime et revient à la liste', async () => {
    show(quote({ status: 'DRAFT' }))

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(screen.getByText('Supprimer ce devis ?')).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()

    const buttons = screen.getAllByRole('button', { name: 'Supprimer' })
    await userEvent.click(buttons[buttons.length - 1])

    expect(remove).toHaveBeenCalledWith('q1')
    expect(mockNavigate).toHaveBeenCalledWith('/devis', { replace: true })
  })

  it('annuler la confirmation ne supprime rien', async () => {
    show(quote({ status: 'DRAFT' }))

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(remove).not.toHaveBeenCalled()
  })
})
