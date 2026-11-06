import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { toast } from 'sonner'
import { useDeleteQuote, useEmailQuote, useQuote, useQuoteAction, openQuotePdf } from '@/hooks/use-quotes'
import { useCreateInvoice } from '@/hooks/use-invoices'
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

vi.mock('@/hooks/use-invoices', () => ({ useCreateInvoice: vi.fn() }))

const act = vi.fn()
const makeInvoice = vi.fn()
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
  makeInvoice.mockResolvedValue({ id: 'i1' })
  vi.mocked(useCreateInvoice).mockReturnValue({ mutateAsync: makeInvoice, isPending: false } as never)
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

  describe('devis expiré (validité passée)', () => {
    const expired = (over: Partial<Quote> = {}) =>
      quote({ status: 'SENT', sentAt: '2026-11-03T10:00:00.000Z', validUntil: '2026-11-10T00:00:00.000Z', expired: true, ...over })

    it('la pastille dit « Expiré » et la date de validité est mise en avant', () => {
      show(expired())

      expect(screen.getByText('Expiré', { selector: 'span' })).toBeInTheDocument()
      expect(screen.queryByText('Envoyé', { selector: 'span' })).not.toBeInTheDocument()
      expect(screen.getByTestId('quote-valid-until')).toHaveTextContent('Valable jusqu\'au 10 nov. 2026')
      expect(screen.getByTestId('quote-valid-until')).toHaveClass('text-amber-800')
    })

    it('une phrase dit quoi faire : rouvrir pour prolonger, ou décider à la main', () => {
      show(expired())

      expect(screen.getByTestId('quote-expired-hint')).toHaveTextContent(/Rouvrez-le pour la prolonger/)
      expect(screen.queryByText(/Votre client répond par le lien reçu/)).not.toBeInTheDocument()
    })

    it('pas de « Renvoyer par email » (le serveur le refuserait), mais on peut encore décider ou rouvrir', () => {
      show(expired())

      expect(button('Renvoyer par email')).not.toBeInTheDocument()
      for (const name of ['Télécharger le PDF', 'Marquer comme accepté', 'Marquer comme refusé', 'Rouvrir pour modifier']) {
        expect(button(name)).toBeInTheDocument()
      }
    })

    it('un devis envoyé encore valable garde son bouton, sa phrase et sa pastille « Envoyé »', () => {
      show(quote({ status: 'SENT', sentAt: '2026-11-03T10:00:00.000Z', validUntil: '2099-12-31T00:00:00.000Z', expired: false }))

      expect(screen.getByText('Envoyé', { selector: 'span' })).toBeInTheDocument()
      expect(button('Renvoyer par email')).toBeInTheDocument()
      expect(screen.getByText(/Votre client répond par le lien reçu/)).toBeInTheDocument()
      expect(screen.queryByTestId('quote-expired-hint')).not.toBeInTheDocument()
      expect(screen.getByTestId('quote-valid-until')).not.toHaveClass('text-amber-800')
    })

    it('lecture seule : la pastille le dit, aucune consigne de geste', () => {
      useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ devis: ['read'] }) })
      show(expired())

      expect(screen.getByText('Expiré', { selector: 'span' })).toBeInTheDocument()
      expect(screen.queryByTestId('quote-expired-hint')).not.toBeInTheDocument()
    })

    it('la date de validité est un jour : lue en UTC, jamais la veille', () => {
      show(quote({ status: 'SENT', validUntil: '2026-12-01T00:00:00.000Z' }))

      expect(screen.getByTestId('quote-valid-until')).toHaveTextContent('Valable jusqu\'au 1 déc. 2026')
    })
  })

  it.each(['ACCEPTED', 'REJECTED'] as const)('%s : le PDF et l\'annulation de la décision, rien d\'autre qui écrive sur le devis', (status) => {
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

describe('QuoteDetailPage — chantier issu du devis (ADR-032)', () => {
  const accepted = quote({ status: 'ACCEPTED', decidedAt: '2026-11-04T09:00:00.000Z' })
  const withProject = quote({
    status: 'ACCEPTED',
    project: { id: 'p1', reference: 'CH-2026-001', title: 'Terrasse bois', status: 'IN_PROGRESS' },
  })
  const createLabel = 'Créer le chantier'

  it('accepté, sans chantier : « Créer le chantier » ouvre le formulaire pré-rempli de ce devis', async () => {
    show(accepted)

    await userEvent.click(button(createLabel)!)

    expect(mockNavigate).toHaveBeenCalledWith('/chantiers/nouveau?devis=q1')
  })

  it.each(['DRAFT', 'SENT', 'REJECTED'] as const)('un devis %s ne propose pas de créer un chantier', (status) => {
    show(quote({ status }))

    expect(button(createLabel)).not.toBeInTheDocument()
  })

  it('accepté, avec un chantier : un lien vers lui, plus de bouton', () => {
    show(withProject)

    expect(screen.getByRole('link', { name: 'CH-2026-001 · Terrasse bois' })).toHaveAttribute('href', '/chantiers/p1')
    expect(button(createLabel)).not.toBeInTheDocument()
  })

  it('sans le droit de créer des chantiers, pas de bouton', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ devis: ['read'], chantiers: ['read'] }) })
    show(accepted)

    expect(button(createLabel)).not.toBeInTheDocument()
  })

  it('sans le droit de lire les chantiers, le chantier lié n\'est pas un lien', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ devis: ['read'] }) })
    show(withProject)

    expect(screen.queryByTestId('quote-project')).not.toBeInTheDocument()
  })

  it('« Devis seul » (module Chantiers absent) : ni bouton ni chantier lié, même pour l\'administrateur', () => {
    useAuthStore.setState({ role: 'ADMIN', modules: ['devis'] })
    show(accepted)

    expect(button(createLabel)).not.toBeInTheDocument()
  })

  it('« Devis seul » : un devis resté lié à un chantier ne montre pas ce chantier', () => {
    useAuthStore.setState({ role: 'ADMIN', modules: ['devis'] })
    show(withProject)

    expect(screen.queryByTestId('quote-project')).not.toBeInTheDocument()
  })
})

describe('QuoteDetailPage — facture tirée du devis (ADR-033)', () => {
  const accepted = quote({ status: 'ACCEPTED', decidedAt: '2026-11-04T09:00:00.000Z' })
  const invoiced = quote({
    status: 'ACCEPTED',
    invoice: { id: 'i1', reference: 'FAC-2026-0001', status: 'ISSUED', subtotal: '125.00', total: '137.50' },
  })
  const createLabel = 'Créer la facture'

  it('accepté, sans facture : « Créer la facture » en crée le brouillon depuis le devis et l\'ouvre', async () => {
    show(accepted)

    await userEvent.click(button(createLabel)!)

    expect(makeInvoice).toHaveBeenCalledWith({ quoteId: 'q1' })
    expect(toast.success).toHaveBeenCalledWith('Brouillon de facture créé')
    expect(mockNavigate).toHaveBeenCalledWith('/factures/i1')
  })

  it.each(['DRAFT', 'SENT', 'REJECTED'] as const)('un devis %s ne propose pas de créer une facture', (status) => {
    show(quote({ status }))

    expect(button(createLabel)).not.toBeInTheDocument()
  })

  it('accepté, avec une facture : un lien vers elle, plus de bouton', () => {
    show(invoiced)

    expect(screen.getByRole('link', { name: 'FAC-2026-0001' })).toHaveAttribute('href', '/factures/i1')
    expect(button(createLabel)).not.toBeInTheDocument()
  })

  it('une facture encore brouillon n\'a pas de numéro : le lien dit « Brouillon »', () => {
    show(quote({ status: 'ACCEPTED', invoice: { id: 'i1', reference: null, status: 'DRAFT', subtotal: '125.00', total: '137.50' } }))

    expect(screen.getByTestId('quote-invoice')).toHaveTextContent('Facture : Brouillon')
  })

  it('le devis a un chantier ET une facture : les deux liens, aucun des deux boutons', () => {
    show(
      quote({
        status: 'ACCEPTED',
        project: { id: 'p1', reference: 'CH-2026-001', title: 'Terrasse bois', status: 'IN_PROGRESS' },
        invoice: { id: 'i1', reference: 'FAC-2026-0001', status: 'ISSUED', subtotal: '125.00', total: '137.50' },
      }),
    )

    expect(screen.getByTestId('quote-project')).toBeInTheDocument()
    expect(screen.getByTestId('quote-invoice')).toBeInTheDocument()
    expect(button('Créer le chantier')).not.toBeInTheDocument()
    expect(button(createLabel)).not.toBeInTheDocument()
  })

  it('sans le droit de créer des factures, pas de bouton', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ devis: ['read'], factures: ['read'] }) })
    show(accepted)

    expect(button(createLabel)).not.toBeInTheDocument()
  })

  it('sans le droit de lire les factures, la facture liée n\'est pas un lien', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ devis: ['read'] }) })
    show(invoiced)

    expect(screen.queryByTestId('quote-invoice')).not.toBeInTheDocument()
  })

  it('« Devis seul » (module Facturation absent) : ni bouton ni facture liée, même pour l\'administrateur', () => {
    useAuthStore.setState({ role: 'ADMIN', modules: ['devis'] })
    show(invoiced)
    expect(screen.queryByTestId('quote-invoice')).not.toBeInTheDocument()
    expect(button(createLabel)).not.toBeInTheDocument()
  })

  it('« Devis seul » : un devis accepté sans facture ne propose pas d\'en créer une', () => {
    useAuthStore.setState({ role: 'ADMIN', modules: ['devis'] })
    show(accepted)

    expect(button(createLabel)).not.toBeInTheDocument()
  })

  it('un refus de l\'API est dit avec sa traduction, sans quitter la page', async () => {
    makeInvoice.mockRejectedValue(new ApiError(409, 'x', 'QUOTE_ALREADY_INVOICED'))
    show(accepted)

    await userEvent.click(button(createLabel)!)

    expect(toast.error).toHaveBeenCalledWith('Ce devis a déjà une facture')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

describe('QuoteDetailPage — franchise de TVA (ADR-033)', () => {
  it('sous franchise : la mention légale remplace la ligne de TVA', () => {
    show(quote({ vatExempt: true, vatRate: '0', vatAmount: '0.00', total: '125.00' }))

    expect(screen.getByTestId('quote-vat-exempt')).toHaveTextContent('TVA non applicable, art. 293 B du CGI')
    expect(screen.queryByText(/^TVA \(/)).not.toBeInTheDocument()
  })

  it('hors franchise : la ligne de TVA, comme avant', () => {
    show(quote())

    expect(screen.getByText('TVA (10 %)')).toBeInTheDocument()
    expect(screen.queryByTestId('quote-vat-exempt')).not.toBeInTheDocument()
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

describe('QuoteDetailPage — acompte (ADR-033)', () => {
  const accepted = quote({ status: 'ACCEPTED', decidedAt: '2026-11-04T09:00:00.000Z' })
  const withDeposits = quote({
    status: 'ACCEPTED',
    deposits: [
      { id: 'd1', reference: 'FAC-2026-0001', status: 'PAID', subtotal: '69.00', total: '82.80' },
      { id: 'd2', reference: null, status: 'DRAFT', subtotal: '50.00', total: '60.00' },
    ],
  })

  it('accepté, sans facture : « Facture d\'acompte » ouvre le dialogue, 30 % proposé', async () => {
    show(accepted)

    await userEvent.click(button('Facture d\'acompte')!)

    expect(screen.getByLabelText('Pourcentage (%)')).toHaveValue('30')
    expect(makeInvoice).not.toHaveBeenCalled()
  })

  it('crée le brouillon d\'acompte depuis le devis et l\'ouvre', async () => {
    show(accepted)
    await userEvent.click(button('Facture d\'acompte')!)

    await userEvent.click(screen.getByRole('button', { name: 'Créer l\'acompte' }))

    expect(makeInvoice).toHaveBeenCalledWith({ quoteId: 'q1', deposit: { percent: 30 } })
    expect(toast.success).toHaveBeenCalledWith('Brouillon d\'acompte créé')
    expect(mockNavigate).toHaveBeenCalledWith('/factures/i1')
  })

  it('un refus de l\'API (acomptes trop élevés) est dit avec sa traduction, sans quitter la page', async () => {
    makeInvoice.mockRejectedValue(new ApiError(409, 'x', 'INVOICE_DEPOSIT_TOO_HIGH'))
    show(accepted)
    await userEvent.click(button('Facture d\'acompte')!)

    await userEvent.click(screen.getByRole('button', { name: 'Créer l\'acompte' }))

    expect(toast.error).toHaveBeenCalledWith(
      'Les acomptes ne peuvent pas couvrir tout le devis : il doit rester un solde à facturer.',
    )
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('liste les acomptes avec leur montant et leur état, un brouillon se lit « Brouillon »', () => {
    show(withDeposits)

    const items = screen.getAllByTestId('quote-deposit')
    expect(items).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'FAC-2026-0001' })).toHaveAttribute('href', '/factures/d1')
    expect(plain(items[0].textContent)).toContain('82,80 €')
    expect(items[0]).toHaveTextContent('Payée')
    expect(screen.getByRole('link', { name: 'Brouillon' })).toHaveAttribute('href', '/factures/d2')
  })

  it('avec des acomptes, la facture se crée comme « facture de solde »', async () => {
    show(withDeposits)

    await userEvent.click(button('Créer la facture de solde')!)

    expect(makeInvoice).toHaveBeenCalledWith({ quoteId: 'q1' })
    expect(button('Créer la facture')).not.toBeInTheDocument()
  })

  it('on peut encore demander un acompte quand il y en a déjà', () => {
    show(withDeposits)

    expect(button('Facture d\'acompte')).toBeInTheDocument()
  })

  it('la fenêtre d\'acompte connaît les acomptes déjà demandés : ils comptent hors taxe, et le plafond suit', async () => {
    show(withDeposits)

    await userEvent.click(button('Facture d\'acompte')!)

    // Devis de 125,00 HT, dont 69,00 + 50,00 déjà demandés : il reste 6,00, donc 5,99 au plus
    expect(plain(screen.getByTestId('deposit-already').textContent)).toBe(
      'Déjà demandé en acompte : 119,00 € HT. Vous pouvez encore demander 5,99 € HT au plus : il faut garder un solde à facturer.',
    )
    // Les 30 % proposés (37,50) dépassent : le bouton est bloqué avant d'appeler l'API
    expect(screen.getByTestId('deposit-too-high')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer l\'acompte' })).toBeDisabled()
    expect(makeInvoice).not.toHaveBeenCalled()
  })

  it('une fois la facture de solde créée, plus d\'acompte ni de second solde', () => {
    show(
      quote({
        status: 'ACCEPTED',
        deposits: withDeposits.deposits,
        invoice: { id: 'i9', reference: null, status: 'DRAFT', subtotal: '161.00', total: '193.20' },
      }),
    )

    expect(button('Facture d\'acompte')).not.toBeInTheDocument()
    expect(button('Créer la facture de solde')).not.toBeInTheDocument()
    expect(screen.getByTestId('quote-invoice')).toBeInTheDocument()
  })

  it.each(['DRAFT', 'SENT', 'REJECTED'] as const)('un devis %s ne propose pas d\'acompte', (status) => {
    show(quote({ status }))

    expect(button('Facture d\'acompte')).not.toBeInTheDocument()
  })

  it('sans le droit de créer des factures : ni acompte ni facture, et les acomptes restent lisibles', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ devis: ['read'], factures: ['read'] }),
      modules: ['devis', 'factures'],
    })
    show(withDeposits)

    expect(button('Facture d\'acompte')).not.toBeInTheDocument()
    expect(button('Créer la facture de solde')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('quote-deposit')).toHaveLength(2)
  })

  it('sans le droit de lire les factures, les acomptes ne sont pas listés', () => {
    useAuthStore.setState({
      role: 'MEMBER',
      permissions: makePermissions({ devis: ['read'] }),
      modules: ['devis', 'factures'],
    })
    show(withDeposits)

    expect(screen.queryByTestId('quote-deposits')).not.toBeInTheDocument()
  })
})

describe('QuoteDetailPage — décider à la main : confirmer, et pouvoir revenir (ADR-030)', () => {
  const sent = quote({ status: 'SENT' })

  it.each([
    ['accept', 'Marquer comme accepté', 'Marquer ce devis comme accepté ?', 'Devis marqué comme accepté'],
    ['reject', 'Marquer comme refusé', 'Marquer ce devis comme refusé ?', 'Devis marqué comme refusé'],
  ] as const)('« %s » demande confirmation avant d\'écrire', async (action, label, title, message) => {
    show(sent)

    await userEvent.click(screen.getByRole('button', { name: label }))

    expect(screen.getByText(title)).toBeInTheDocument()
    expect(act).not.toHaveBeenCalled()
    const confirm = screen.getAllByRole('button', { name: label })
    await userEvent.click(confirm[confirm.length - 1])
    expect(act).toHaveBeenCalledWith({ id: 'q1', action })
    expect(toast.success).toHaveBeenCalledWith(message)
  })

  it('annuler la confirmation n\'écrit rien', async () => {
    show(sent)
    await userEvent.click(screen.getByRole('button', { name: 'Marquer comme accepté' }))

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(act).not.toHaveBeenCalled()
  })

  it('un refus de l\'API reste affiché et ferme la confirmation', async () => {
    act.mockRejectedValue(new ApiError(409, 'x', 'QUOTE_INVALID_STATUS'))
    show(sent)
    await userEvent.click(screen.getByRole('button', { name: 'Marquer comme accepté' }))

    const confirm = screen.getAllByRole('button', { name: 'Marquer comme accepté' })
    await userEvent.click(confirm[confirm.length - 1])

    expect(toast.error).toHaveBeenCalled()
    expect(screen.queryByText('Marquer ce devis comme accepté ?')).not.toBeInTheDocument()
  })

  describe('annuler la décision', () => {
    const undo = 'Annuler la décision'

    it.each(['ACCEPTED', 'REJECTED'] as const)('un devis %s qu\'aucune suite ne verrouille propose « Annuler la décision »', (status) => {
      show(quote({ status, decidedAt: '2026-11-04T10:00:00.000Z' }))

      expect(button(undo)).toBeInTheDocument()
      expect(screen.queryByTestId('quote-decision-locked')).not.toBeInTheDocument()
    })

    it('demande confirmation, puis redonne « envoyé » au devis', async () => {
      show(quote({ status: 'ACCEPTED', decidedAt: '2026-11-04T10:00:00.000Z' }))

      await userEvent.click(button(undo)!)
      expect(screen.getByText('Annuler la décision ?')).toBeInTheDocument()
      expect(act).not.toHaveBeenCalled()
      const confirm = screen.getAllByRole('button', { name: undo })
      await userEvent.click(confirm[confirm.length - 1])

      expect(act).toHaveBeenCalledWith({ id: 'q1', action: 'undecide' })
      expect(toast.success).toHaveBeenCalledWith('Décision annulée : le devis est de nouveau envoyé')
    })

    it.each([
      ['un chantier en est issu', { project: { id: 'p1', reference: 'CH-1', title: 'T', status: 'IN_PROGRESS' as const } }],
      ['une facture de solde en est issue', { invoice: { id: 'i1', reference: null, status: 'DRAFT' as const, subtotal: '10.00', total: '10.00' } }],
      ['un acompte en est issu', { deposits: [{ id: 'd1', reference: null, status: 'DRAFT' as const, subtotal: '10.00', total: '10.00' }] }],
      ['le client l\'a accepté en ligne', { acceptance: acceptance({ state: 'ACCEPTED', signerName: 'Léa Martin', respondedAt: '2026-11-04T09:00:00.000Z' }) }],
    ])('accepté mais %s : pas d\'annulation, et la raison est dite', (_name, patch) => {
      show(quote({ status: 'ACCEPTED', decidedAt: '2026-11-04T10:00:00.000Z', ...patch }))

      expect(button(undo)).not.toBeInTheDocument()
      expect(screen.getByTestId('quote-decision-locked')).toHaveTextContent('Cette décision ne se défait plus')
    })

    it('un refus se défait même quand le client l\'a donné en ligne', () => {
      show(
        quote({
          status: 'REJECTED',
          decidedAt: '2026-11-04T10:00:00.000Z',
          acceptance: acceptance({ state: 'REJECTED', respondedAt: '2026-11-04T09:00:00.000Z' }),
        }),
      )

      expect(button(undo)).toBeInTheDocument()
    })

    it('sans le droit de modifier les devis : rien à défaire', () => {
      useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ devis: ['read'] }) })
      show(quote({ status: 'REJECTED', decidedAt: '2026-11-04T10:00:00.000Z' }))

      expect(button(undo)).not.toBeInTheDocument()
    })

    it('un devis envoyé ou brouillon n\'a pas de décision à défaire', () => {
      show(quote({ status: 'SENT' }))

      expect(button(undo)).not.toBeInTheDocument()
    })

    it('le refus du serveur (une suite est apparue) est dit avec sa traduction', async () => {
      act.mockRejectedValue(new ApiError(409, 'x', 'QUOTE_HAS_FOLLOW_UP'))
      show(quote({ status: 'ACCEPTED', decidedAt: '2026-11-04T10:00:00.000Z' }))
      await userEvent.click(button(undo)!)

      const confirm = screen.getAllByRole('button', { name: undo })
      await userEvent.click(confirm[confirm.length - 1])

      expect(toast.error).toHaveBeenCalledWith(
        'Un chantier ou une facture est issu de ce devis : supprimez-les ou annulez la facture avant de défaire la décision.',
      )
    })
  })
})

