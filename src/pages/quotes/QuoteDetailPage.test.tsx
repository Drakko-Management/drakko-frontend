import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { toast } from 'sonner'
import { useDeleteQuote, useQuote, useQuoteAction, openQuotePdf } from '@/hooks/use-quotes'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions } from '@/lib/permissions'
import { ApiError } from '@/lib/api-client'
import { QuoteDetailPage } from './QuoteDetailPage'
import { plain, quote } from '@/test/quote-fixtures'
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
  useDeleteQuote: vi.fn(),
  openQuotePdf: vi.fn(),
}))

const act = vi.fn()
const remove = vi.fn()

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
  it('brouillon : télécharger, modifier, marquer comme envoyé, supprimer ; pas de réponse du client', () => {
    show(quote({ status: 'DRAFT' }))

    for (const name of ['Télécharger le PDF', 'Modifier', 'Marquer comme envoyé', 'Supprimer']) {
      expect(button(name)).toBeInTheDocument()
    }
    for (const name of ['Marquer comme accepté', 'Marquer comme refusé', 'Rouvrir pour modifier']) {
      expect(button(name)).not.toBeInTheDocument()
    }
    expect(screen.getByText(/n'envoie pas le devis par email/)).toBeInTheDocument()
  })

  it('envoyé : accepter, refuser, rouvrir ; ni modifier ni supprimer', () => {
    show(quote({ status: 'SENT', sentAt: '2026-11-03T10:00:00.000Z' }))

    for (const name of ['Télécharger le PDF', 'Marquer comme accepté', 'Marquer comme refusé', 'Rouvrir pour modifier']) {
      expect(button(name)).toBeInTheDocument()
    }
    for (const name of ['Modifier', 'Supprimer', 'Marquer comme envoyé']) {
      expect(button(name)).not.toBeInTheDocument()
    }
  })

  it.each(['ACCEPTED', 'REJECTED'] as const)('%s : seulement le PDF', (status) => {
    show(quote({ status, decidedAt: '2026-11-04T10:00:00.000Z' }))

    expect(button('Télécharger le PDF')).toBeInTheDocument()
    for (const name of ['Modifier', 'Supprimer', 'Marquer comme envoyé', 'Marquer comme accepté', 'Rouvrir pour modifier']) {
      expect(button(name)).not.toBeInTheDocument()
    }
  })

  it('lecture seule (devis:read) : le PDF, aucun geste qui écrit', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ devis: ['read'] }) })
    show(quote({ status: 'DRAFT' }))

    expect(button('Télécharger le PDF')).toBeInTheDocument()
    for (const name of ['Modifier', 'Marquer comme envoyé', 'Supprimer']) {
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

    expect(toast.error).toHaveBeenCalledWith('Ajoutez au moins une ligne avant de marquer le devis comme envoyé.')
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
