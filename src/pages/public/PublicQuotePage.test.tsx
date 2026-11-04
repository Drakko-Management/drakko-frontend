import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { toast } from 'sonner'
import { useAcceptPublicQuote, usePublicQuote, useRejectPublicQuote } from '@/hooks/use-public-quote'
import { ApiError } from '@/lib/api-client'
import { PublicQuotePage } from './PublicQuotePage'
import { plain, publicQuote } from '@/test/quote-fixtures'
import type { PublicQuote } from '@/types/api'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-public-quote', () => ({
  usePublicQuote: vi.fn(),
  useAcceptPublicQuote: vi.fn(),
  useRejectPublicQuote: vi.fn(),
  publicQuotePdfUrl: (token: string) => `https://api.test/public/quotes/${token}/pdf`,
}))

const accept = vi.fn()
const reject = vi.fn()

function show(data: PublicQuote | undefined, extra: object = {}) {
  vi.mocked(usePublicQuote).mockReturnValue({ data, isLoading: false, error: data ? null : new Error('404'), ...extra } as never)
  render(
    <MemoryRouter initialEntries={['/quote/tok-123']}>
      <Routes>
        <Route path="/quote/:token" element={<PublicQuotePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  accept.mockResolvedValue(undefined)
  reject.mockResolvedValue(undefined)
  vi.mocked(useAcceptPublicQuote).mockReturnValue({ mutateAsync: accept, isPending: false } as never)
  vi.mocked(useRejectPublicQuote).mockReturnValue({ mutateAsync: reject, isPending: false } as never)
})

describe('PublicQuotePage — un lien ouvert', () => {
  it('montre l\'entreprise, le numéro, le client, les lignes figées et les montants, sans compte', () => {
    show(publicQuote())

    expect(screen.getByRole('heading', { level: 1, name: 'Devis DEV-2026-0001' })).toBeInTheDocument()
    expect(screen.getByText('Paysages Pierre')).toBeInTheDocument()
    expect(screen.getByText('Pour Léa Martin')).toBeInTheDocument()
    expect(screen.getByText('Taille de haie')).toBeInTheDocument()
    expect(screen.getByText('Haie vive')).toBeInTheDocument()
    expect(plain(screen.getByTestId('public-quote-total').textContent)).toBe('137,50 €')
    expect(screen.getByRole('link', { name: 'Télécharger le PDF' })).toHaveAttribute('href', 'https://api.test/public/quotes/tok-123/pdf')
  })

  it('la page parle la langue de l\'entreprise, pas celle du navigateur', () => {
    show(publicQuote({ language: 'de' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Angebot DEV-2026-0001' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Angebot annehmen' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('de')
  })

  it('une langue inconnue retombe sur le français', () => {
    show(publicQuote({ language: 'xx' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Devis DEV-2026-0001' })).toBeInTheDocument()
  })

  it('sous franchise de TVA, le client lit la mention légale à la place de la ligne de TVA, dans la langue de l\'entreprise', () => {
    const data = publicQuote({ language: 'en' })
    show({ ...data, quote: { ...data.quote!, vatExempt: true, vatRate: '0', vatAmount: '0.00' } })

    expect(screen.getByTestId('public-quote-vat-exempt')).toHaveTextContent(
      'VAT not applicable, art. 293 B of the French tax code',
    )
    expect(screen.queryByText(/^VAT \(/)).not.toBeInTheDocument()
  })

  it('hors franchise, la ligne de TVA comme avant', () => {
    show(publicQuote())

    expect(screen.getByText('TVA (10 %)')).toBeInTheDocument()
    expect(screen.queryByTestId('public-quote-vat-exempt')).not.toBeInTheDocument()
  })

  it('la date de validité est montrée quand il y en a une', () => {
    const data = publicQuote()
    show({ ...data, quote: { ...data.quote!, validUntil: '2026-12-15T00:00:00.000Z' } })

    expect(screen.getByText('Valable jusqu\'au 15 déc. 2026')).toBeInTheDocument()
  })

  it('les coordonnées de l\'entreprise sont des liens à toucher', () => {
    show(publicQuote())

    expect(screen.getByRole('link', { name: '01 02 03 04 05' })).toHaveAttribute('href', 'tel:01 02 03 04 05')
    expect(screen.getByRole('link', { name: 'contact@paysages.test' })).toHaveAttribute('href', 'mailto:contact@paysages.test')
  })
})

describe('PublicQuotePage — accepter', () => {
  const submit = () => screen.getByRole('button', { name: 'Accepter le devis' })

  it('le bouton reste inactif sans nom d\'au moins deux lettres et sans la case « Bon pour accord »', async () => {
    show(publicQuote())
    expect(submit()).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Votre nom et prénom'), 'L')
    await userEvent.click(screen.getByRole('checkbox'))
    expect(submit()).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Votre nom et prénom'), 'éa')
    expect(submit()).toBeEnabled()

    await userEvent.click(screen.getByRole('checkbox'))
    expect(submit()).toBeDisabled()
  })

  it('la case rappelle le montant accepté', () => {
    show(publicQuote())

    expect(plain(screen.getByRole('checkbox').closest('label')?.textContent ?? '')).toContain('137,50 € TTC')
  })

  it('envoie le nom tapé et le message, nettoyés des espaces', async () => {
    show(publicQuote())

    await userEvent.type(screen.getByLabelText('Votre nom et prénom'), '  Léa Martin ')
    await userEvent.type(screen.getByLabelText(/Un message pour l'entreprise/), ' Pour mars ')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(submit())

    expect(accept).toHaveBeenCalledWith({ signerName: 'Léa Martin', comment: 'Pour mars' })
    expect(reject).not.toHaveBeenCalled()
  })

  it('sans message, rien n\'est envoyé en plus', async () => {
    show(publicQuote())

    await userEvent.type(screen.getByLabelText('Votre nom et prénom'), 'Léa Martin')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(submit())

    expect(accept).toHaveBeenCalledWith({ signerName: 'Léa Martin', comment: undefined })
  })

  it('un lien déjà utilisé entre-temps est dit avec sa traduction', async () => {
    accept.mockRejectedValue(new ApiError(409, 'x', 'QUOTE_LINK_CLOSED'))
    show(publicQuote())

    await userEvent.type(screen.getByLabelText('Votre nom et prénom'), 'Léa Martin')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(submit())

    expect(toast.error).toHaveBeenCalledWith("Ce devis ne reçoit plus de réponse : il a déjà été traité ou n'est plus valable.")
  })

  it('une erreur inconnue donne le message de repli, jamais le texte du serveur', async () => {
    accept.mockRejectedValue(new ApiError(500, 'Internal detail', 'WHATEVER'))
    show(publicQuote())

    await userEvent.type(screen.getByLabelText('Votre nom et prénom'), 'Léa Martin')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(submit())

    expect(toast.error).toHaveBeenCalledWith("Impossible d'enregistrer votre réponse. Réessayez.")
  })
})

describe('PublicQuotePage — refuser', () => {
  it('« Refuser ce devis » ouvre un motif facultatif ; confirmer l\'envoie, revenir en arrière ne fait rien', async () => {
    show(publicQuote())

    await userEvent.click(screen.getByRole('button', { name: 'Refuser ce devis' }))
    expect(screen.queryByRole('button', { name: 'Accepter le devis' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Revenir en arrière' }))
    expect(screen.getByRole('button', { name: 'Accepter le devis' })).toBeInTheDocument()
    expect(reject).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Refuser ce devis' }))
    await userEvent.type(screen.getByLabelText('Motif (facultatif)'), ' Trop cher ')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer le refus' }))

    expect(reject).toHaveBeenCalledWith('Trop cher')
  })

  it('un refus sans motif est permis', async () => {
    show(publicQuote())

    await userEvent.click(screen.getByRole('button', { name: 'Refuser ce devis' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer le refus' }))

    expect(reject).toHaveBeenCalledWith('')
  })
})

describe('PublicQuotePage — une réponse déjà donnée', () => {
  it('accepté : le nom, la date et l\'entreprise prévenue ; plus de formulaire, le devis reste lisible', () => {
    show(publicQuote({
      state: 'ACCEPTED',
      answer: { respondedAt: '2026-11-04T10:00:00.000Z', signerName: 'Léa Martin', comment: 'Pour mars' },
    }))

    expect(screen.getByRole('status')).toHaveTextContent('Devis accepté')
    expect(screen.getByRole('status')).toHaveTextContent('Accepté par Léa Martin le 4 nov. 2026. Paysages Pierre en est informé.')
    expect(screen.getByRole('status')).toHaveTextContent('« Pour mars »')
    expect(screen.queryByRole('button', { name: 'Accepter le devis' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refuser ce devis' })).not.toBeInTheDocument()
    expect(screen.getByText('Taille de haie')).toBeInTheDocument()
  })

  it('refusé : dit, sans formulaire', () => {
    show(publicQuote({ state: 'REJECTED', answer: { respondedAt: '2026-11-04T10:00:00.000Z', signerName: null, comment: null } }))

    expect(screen.getByRole('status')).toHaveTextContent('Devis refusé')
    expect(screen.queryByRole('button', { name: 'Accepter le devis' })).not.toBeInTheDocument()
  })
})

describe('PublicQuotePage — un lien qui ne sert plus', () => {
  it('périmé : le dit, donne le contact de l\'entreprise, ne montre aucun prix', () => {
    show(publicQuote({ state: 'EXPIRED', quote: null }))

    expect(screen.getByRole('heading', { name: 'Ce devis n\'est plus valable' })).toBeInTheDocument()
    expect(screen.getByText(/Contactez Paysages Pierre pour en obtenir un nouveau/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'contact@paysages.test' })).toBeInTheDocument()
    expect(screen.queryByText('Taille de haie')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accepter le devis' })).not.toBeInTheDocument()
  })

  it('repris par l\'équipe : le dit, sans prix', () => {
    show(publicQuote({ state: 'WITHDRAWN', quote: null }))

    expect(screen.getByRole('heading', { name: 'Ce lien n\'est plus valable' })).toBeInTheDocument()
    expect(screen.queryByText('Taille de haie')).not.toBeInTheDocument()
  })

  it('un lien inconnu ou une panne : « Lien introuvable » dans la langue du navigateur (l\'entreprise est inconnue), sans détail', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR')
    show(undefined)

    expect(screen.getByRole('heading', { name: 'Lien introuvable' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('un navigateur dans une langue non prise en charge : le français', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('ja-JP')
    show(undefined)

    expect(screen.getByRole('heading', { name: 'Lien introuvable' })).toBeInTheDocument()
  })

  it('un navigateur en anglais : la page d\'erreur en anglais', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB')
    show(undefined)

    expect(screen.getByRole('heading', { name: 'Link not found' })).toBeInTheDocument()
  })

  it('chargement : des squelettes, ni formulaire ni message d\'erreur', () => {
    vi.mocked(usePublicQuote).mockReturnValue({ data: undefined, isLoading: true, error: null } as never)
    render(
      <MemoryRouter initialEntries={['/quote/tok-123']}>
        <Routes>
          <Route path="/quote/:token" element={<PublicQuotePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
