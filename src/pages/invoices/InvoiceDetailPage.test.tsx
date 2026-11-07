import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { toast } from 'sonner'
import {
  openInvoicePdf,
  useCreditNote,
  useDeleteInvoice,
  useEmailInvoice,
  useInvoice,
  useIssueInvoice,
  usePayInvoice,
  useUnpayInvoice,
} from '@/hooks/use-invoices'
import { useOrganization } from '@/hooks/use-organization'
import { useAuthStore } from '@/store/auth.store'
import { makePermissions } from '@/lib/permissions'
import { ApiError } from '@/lib/api-client'
import { todayInput } from '@/modules/factures/format'
import { InvoiceDetailPage } from './InvoiceDetailPage'
import { creditNote, invoice, invoiceLine, issuedInvoice } from '@/test/invoice-fixtures'
import { plain } from '@/test/quote-fixtures'
import type { Invoice } from '@/types/api'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-invoices', () => ({
  useInvoice: vi.fn(),
  useIssueInvoice: vi.fn(),
  usePayInvoice: vi.fn(),
  useUnpayInvoice: vi.fn(),
  useCreditNote: vi.fn(),
  useDeleteInvoice: vi.fn(),
  useEmailInvoice: vi.fn(),
  openInvoicePdf: vi.fn(),
}))
vi.mock('@/hooks/use-organization', () => ({ useOrganization: vi.fn() }))

const issue = vi.fn()
const pay = vi.fn()
const unpay = vi.fn()
const credit = vi.fn()
const remove = vi.fn()
const email = vi.fn()

// L'identité de l'entreprise est complète : on peut émettre
const COMPLETE_ORG = {
  address: '3 chemin des Oliviers',
  postalCode: '13000',
  city: 'Marseille',
  siret: '12345678900012',
  vatNumber: 'FR12345678901',
  defaultPaymentTerms: '30',
}

function show(data: Invoice | undefined, extra: object = {}) {
  vi.mocked(useInvoice).mockReturnValue({ data, isLoading: false, isError: !data, ...extra } as never)
  render(
    <MemoryRouter initialEntries={['/factures/i1']}>
      <Routes>
        <Route path="/factures/:id" element={<InvoiceDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const PDF = 'Télécharger le PDF'
const button = (name: string | RegExp) => screen.queryByRole('button', { name })

beforeEach(() => {
  vi.clearAllMocks()
  issue.mockResolvedValue(issuedInvoice())
  pay.mockResolvedValue(issuedInvoice({ status: 'PAID' }))
  unpay.mockResolvedValue(issuedInvoice())
  credit.mockResolvedValue(creditNote())
  remove.mockResolvedValue(undefined)
  email.mockResolvedValue(issuedInvoice())
  vi.mocked(useIssueInvoice).mockReturnValue({ mutateAsync: issue, isPending: false } as never)
  vi.mocked(usePayInvoice).mockReturnValue({ mutateAsync: pay, isPending: false } as never)
  vi.mocked(useUnpayInvoice).mockReturnValue({ mutateAsync: unpay, isPending: false } as never)
  vi.mocked(useCreditNote).mockReturnValue({ mutateAsync: credit, isPending: false } as never)
  vi.mocked(useDeleteInvoice).mockReturnValue({ mutateAsync: remove, isPending: false } as never)
  vi.mocked(useEmailInvoice).mockReturnValue({ mutateAsync: email, isPending: false } as never)
  vi.mocked(openInvoicePdf).mockResolvedValue(undefined)
  vi.mocked(useOrganization).mockReturnValue({ data: COMPLETE_ORG } as never)
  useAuthStore.setState({ role: 'ADMIN', permissions: null, modules: null })
})

describe('InvoiceDetailPage — contenu', () => {
  it('une remise (prix négatif) se lit en négatif', () => {
    show(
      invoice({
        lines: [
          invoiceLine(),
          invoiceLine({ id: 'il2', snapshotTitle: 'Remise fidélité', snapshotDescription: null, snapshotUnit: null, quantity: '1', unitPrice: '-25', total: '-25.00' }),
        ],
      }),
    )

    const discount = screen.getAllByTestId('invoice-line')[1]
    expect(plain(discount.textContent)).toContain('1 × -25,00 €')
    expect(plain(discount.textContent)).toContain('-25,00 €')
  })

  it('l\'avoir d\'une facture remisée montre la remise à l\'envers : un montant positif', () => {
    show(
      creditNote({
        lines: [
          invoiceLine({ id: 'il1', quantity: '-10', total: '-125.00' }),
          invoiceLine({ id: 'il2', snapshotTitle: 'Remise fidélité', snapshotDescription: null, snapshotUnit: null, quantity: '-1', unitPrice: '-25', total: '25.00' }),
        ],
      }),
    )

    const discount = screen.getAllByTestId('invoice-line')[1]
    expect(discount).toHaveTextContent('Remise fidélité')
    // Le total de la ligne (à droite) est positif : quantité négative × prix négatif
    expect(plain(discount.querySelector('p.font-semibold')?.textContent ?? null)).toBe('25,00 €')
  })

  it('un brouillon : sans numéro, l\'objet, le client, les lignes et les montants calculés par l\'API', () => {
    show(invoice())

    expect(screen.getByRole('heading', { name: 'Brouillon' })).toBeInTheDocument()
    expect(screen.getByText('Haie du fond')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Léa Martin' })).toHaveAttribute('href', '/clients/c1')
    expect(screen.getAllByTestId('invoice-line')).toHaveLength(1)
    expect(plain(screen.getByTestId('invoice-total').textContent)).toBe('137,50 €')
    expect(screen.getByText('TVA (10 %)')).toBeInTheDocument()
  })

  it('une facture émise : son numéro, sa date d\'émission, son échéance', () => {
    show(issuedInvoice())

    expect(screen.getByRole('heading', { name: 'FAC-2026-0001' })).toBeInTheDocument()
    expect(screen.getByText('Émise le 4 nov. 2026')).toBeInTheDocument()
    expect(screen.getByTestId('invoice-due')).toHaveTextContent('Échéance le 4 déc. 2026')
  })

  describe('le jour de la prestation', () => {
    it('une facture qui le porte le dit', () => {
      show(issuedInvoice({ serviceDate: '2026-10-28T00:00:00.000Z' }))

      expect(screen.getByTestId('invoice-service-date')).toHaveTextContent('Prestation réalisée le 28 oct. 2026')
    })

    it('un brouillon aussi : on vérifie avant d\'émettre', () => {
      show(invoice({ serviceDate: '2026-10-28T00:00:00.000Z' }))

      expect(screen.getByTestId('invoice-service-date')).toBeInTheDocument()
    })

    it.each([
      ['sans jour saisi', issuedInvoice()],
      ['un avoir', creditNote({ serviceDate: '2026-10-28T00:00:00.000Z' })],
      ['un acompte', issuedInvoice({ deposit: true, serviceDate: '2026-10-28T00:00:00.000Z' })],
    ])('%s : aucune ligne', (_name, shown) => {
      show(shown)

      expect(screen.queryByTestId('invoice-service-date')).not.toBeInTheDocument()
    })
  })

  it('en retard : l\'échéance le dit', () => {
    show(issuedInvoice({ overdue: true, dueDate: '2026-11-01T00:00:00.000Z' }))

    expect(screen.getByTestId('invoice-due')).toHaveTextContent('En retard : échéance le 1 nov. 2026')
  })

  it('payée : la date et le mode de paiement', () => {
    show(issuedInvoice({ status: 'PAID', paidAt: '2026-11-10T00:00:00.000Z', paymentMethod: 'TRANSFER' }))

    expect(screen.getByTestId('invoice-paid')).toHaveTextContent('Payée le 10 nov. 2026 (Virement)')
  })

  it('payée sans mode précisé : seulement la date', () => {
    show(issuedInvoice({ status: 'PAID', paidAt: '2026-11-10T00:00:00.000Z' }))

    expect(screen.getByTestId('invoice-paid')).toHaveTextContent(/^Payée le 10 nov\. 2026$/)
  })

  it('sous franchise de TVA : la mention légale remplace la ligne de TVA', () => {
    show(invoice({ vatExempt: true, vatRate: '0', vatAmount: '0.00', total: '125.00' }))

    expect(screen.getByTestId('invoice-vat-exempt')).toHaveTextContent('TVA non applicable, art. 293 B du CGI')
    expect(screen.queryByText(/^TVA \(/)).not.toBeInTheDocument()
  })

  it('tirée d\'un devis : un lien vers lui', () => {
    show(issuedInvoice({ quote: { id: 'q1', reference: 'DEV-2026-0001', status: 'ACCEPTED', decidedAt: '2026-10-01T10:00:00.000Z' } }))

    expect(screen.getByRole('link', { name: 'DEV-2026-0001' })).toHaveAttribute('href', '/devis/q1')
  })

  it('sans le droit de lire les devis, le devis n\'est pas un lien', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ factures: ['read'] }) })
    show(issuedInvoice({ quote: { id: 'q1', reference: 'DEV-2026-0001', status: 'ACCEPTED', decidedAt: '2026-10-01T10:00:00.000Z' } }))

    expect(screen.queryByTestId('invoice-quote')).not.toBeInTheDocument()
  })

  it('« Devis absent » (module Devis coupé) : le devis d\'origine ne se montre pas, même pour l\'administrateur', () => {
    useAuthStore.setState({ role: 'ADMIN', modules: ['factures'] })
    show(issuedInvoice({ quote: { id: 'q1', reference: 'DEV-2026-0001', status: 'ACCEPTED', decidedAt: '2026-10-01T10:00:00.000Z' } }))

    expect(screen.queryByTestId('invoice-quote')).not.toBeInTheDocument()
  })

  it('une facture annulée renvoie à son avoir', () => {
    show(issuedInvoice({ status: 'CANCELLED', creditNote: { id: 'cn1', reference: 'AV-2026-0001' } }))

    expect(screen.getByRole('link', { name: 'AV-2026-0001' })).toHaveAttribute('href', '/factures/cn1')
    expect(screen.getByText('Annulée')).toBeInTheDocument()
  })

  it('un avoir renvoie à la facture qu\'il annule, et n\'a pas d\'échéance', () => {
    show(creditNote())

    expect(screen.getByRole('link', { name: 'FAC-2026-0001' })).toHaveAttribute('href', '/factures/i1')
    expect(screen.getByRole('heading', { name: 'AV-2026-0001' })).toBeInTheDocument()
    expect(screen.queryByTestId('invoice-due')).not.toBeInTheDocument()
    expect(plain(screen.getByTestId('invoice-total').textContent)).toBe('-137,50 €')
  })

  it('une facture introuvable le dit et renvoie à la liste', () => {
    show(undefined)

    expect(screen.getByText('Facture introuvable')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retour aux factures' })).toHaveAttribute('href', '/factures')
  })

  it('sans droit sur les clients, le nom du client n\'est pas un lien', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ factures: ['read'] }) })
    show(invoice())

    expect(screen.queryByRole('link', { name: 'Léa Martin' })).not.toBeInTheDocument()
    expect(screen.getByText('Léa Martin')).toBeInTheDocument()
  })
})

describe('InvoiceDetailPage — gestes selon l\'état', () => {
  it('brouillon : PDF, modifier, émettre, supprimer ; ni payer ni annuler', () => {
    show(invoice())

    for (const name of [PDF, 'Modifier', 'Émettre la facture', 'Supprimer le brouillon']) {
      expect(button(name)).toBeInTheDocument()
    }
    for (const name of ['Marquer payée', 'Annuler par un avoir', 'Annuler le paiement', 'Envoyer par email']) {
      expect(button(name)).not.toBeInTheDocument()
    }
  })

  it('émise : PDF, envoyer par email, marquer payée, annuler par un avoir ; ni modifier, ni émettre, ni supprimer', () => {
    show(issuedInvoice())

    for (const name of [PDF, 'Envoyer par email', 'Marquer payée', 'Annuler par un avoir']) {
      expect(button(name)).toBeInTheDocument()
    }
    for (const name of ['Modifier', 'Émettre la facture', 'Supprimer le brouillon', 'Annuler le paiement']) {
      expect(button(name)).not.toBeInTheDocument()
    }
  })

  it('payée : le PDF, l\'envoi par email et « Annuler le paiement » (une facture payée ne s\'annule pas par un avoir)', () => {
    show(issuedInvoice({ status: 'PAID', paidAt: '2026-11-10T00:00:00.000Z' }))

    expect(button(PDF)).toBeInTheDocument()
    expect(button('Envoyer par email')).toBeInTheDocument()
    expect(button('Annuler le paiement')).toBeInTheDocument()
    expect(button('Annuler par un avoir')).not.toBeInTheDocument()
    expect(button('Marquer payée')).not.toBeInTheDocument()
  })

  it('annulée : le PDF et « Dupliquer » (pour refaire la facture corrigée), sans envoi par email', () => {
    show(issuedInvoice({ status: 'CANCELLED' }))

    expect(button(PDF)).toBeInTheDocument()
    expect(button('Dupliquer')).toBeInTheDocument()
    expect(button('Envoyer par email')).not.toBeInTheDocument() // son avoir la remplace
    expect(screen.getAllByRole('button')).toHaveLength(3) // PDF + Dupliquer + retour
  })

  it('un avoir : le PDF et l\'envoi par email, ni payer ni modifier', () => {
    show(creditNote())

    expect(button(PDF)).toBeInTheDocument()
    expect(button('Envoyer par email')).toBeInTheDocument()
    for (const name of ['Marquer payée', 'Annuler par un avoir', 'Modifier']) {
      expect(button(name)).not.toBeInTheDocument()
    }
  })

  it('lecture seule : le PDF, aucun geste qui écrit (pas d\'envoi par email)', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ factures: ['read'], clients: ['read'] }) })
    show(issuedInvoice())

    expect(button(PDF)).toBeInTheDocument()
    expect(button('Envoyer par email')).not.toBeInTheDocument()
    for (const name of ['Modifier', 'Émettre la facture', 'Supprimer le brouillon']) {
      expect(button(name)).not.toBeInTheDocument()
    }
  })

  it('sans « créer », on ne peut pas annuler par un avoir ; sans « supprimer », pas de suppression', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ factures: ['read', 'update'] }) })
    show(issuedInvoice())

    expect(button('Marquer payée')).toBeInTheDocument()
    expect(button('Annuler par un avoir')).not.toBeInTheDocument()
  })

  it('« Modifier » ouvre la page de modification', async () => {
    show(invoice())

    await userEvent.click(button('Modifier')!)

    expect(mockNavigate).toHaveBeenCalledWith('/factures/i1/modifier')
  })

  it('« PDF » ouvre le PDF de la facture', async () => {
    show(issuedInvoice())

    await userEvent.click(button(PDF)!)

    expect(openInvoicePdf).toHaveBeenCalledWith('i1')
  })

  it('un PDF qui ne s\'ouvre pas est dit avec sa traduction', async () => {
    vi.mocked(openInvoicePdf).mockRejectedValue(new Error('x'))
    show(issuedInvoice())

    await userEvent.click(button(PDF)!)

    expect(toast.error).toHaveBeenCalledWith('Impossible d\'ouvrir le PDF')
  })
})

describe('InvoiceDetailPage — dupliquer', () => {
  it.each([
    ['un brouillon', invoice()],
    ['une facture émise', issuedInvoice()],
    ['une facture en retard', issuedInvoice({ overdue: true })],
    ['une facture payée', issuedInvoice({ status: 'PAID', paidAt: '2026-11-10T00:00:00.000Z', paymentMethod: 'TRANSFER' })],
    ['une facture annulée par un avoir', issuedInvoice({ status: 'CANCELLED' })],
  ])('%s se duplique : le formulaire de création s\'ouvre rempli d\'après elle', async (_label, data) => {
    show(data)

    await userEvent.click(screen.getByRole('button', { name: 'Dupliquer' }))

    expect(mockNavigate).toHaveBeenCalledWith('/factures/nouveau?duplicate=i1')
  })

  it('un avoir ne se duplique pas : on l\'annule, on ne le refait pas', () => {
    show(creditNote())

    expect(button('Dupliquer')).not.toBeInTheDocument()
  })

  it('une facture d\'acompte ne se duplique pas : elle vient d\'un devis et ne se refait pas seule', () => {
    show(issuedInvoice({ deposit: true, quoteId: 'q1' }))

    expect(button('Dupliquer')).not.toBeInTheDocument()
  })

  it('une facture de solde ne se duplique pas : la copie perdrait les acomptes déduits et en demanderait trop', () => {
    show(
      issuedInvoice({
        quoteId: 'q1',
        lines: [invoiceLine(), invoiceLine({ id: 'il2', depositInvoiceId: 'd1', snapshotTitle: 'FAC-2026-0006', quantity: '-1', unitPrice: '50', total: '-50.00' })],
      }),
    )

    expect(button('Dupliquer')).not.toBeInTheDocument()
  })

  it('sans le droit de créer une facture, « Dupliquer » n\'est pas proposé', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ factures: ['read', 'update'], clients: ['read'] }) })
    show(issuedInvoice())

    expect(button(PDF)).toBeInTheDocument()
    expect(button('Dupliquer')).not.toBeInTheDocument()
  })
})

describe('InvoiceDetailPage — émettre', () => {
  it('demande confirmation en disant ce qui va se passer, puis émet', async () => {
    show(invoice())

    await userEvent.click(button('Émettre la facture')!)

    expect(screen.getByText('Émettre cette facture ?')).toBeInTheDocument()
    expect(screen.getByText(/fixée à 30 jours après l'émission/)).toBeInTheDocument()
    expect(issue).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Émettre' }))

    expect(issue).toHaveBeenCalledWith('i1')
    expect(toast.success).toHaveBeenCalledWith('Facture émise')
  })

  // Le texte par défaut des pénalités s'imprime quand les réglages n'en ont pas (ADR-035) : plus rien à signaler avant
  // d'émettre, même sans pénalité saisie
  it.each([[undefined], [''], [' ']])('sans pénalité dans les réglages (%j), la confirmation n\'avertit de rien', async (latePaymentPenalties) => {
    vi.mocked(useOrganization).mockReturnValue({ data: { ...COMPLETE_ORG, latePaymentPenalties } } as never)
    show(invoice())

    await userEvent.click(button('Émettre la facture')!)

    expect(screen.getByText('Émettre cette facture ?')).toBeInTheDocument()
    expect(screen.queryByText(/pénalité/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Émettre' }))
    expect(issue).toHaveBeenCalledWith('i1')
  })

  it('annuler la confirmation n\'émet rien', async () => {
    show(invoice())
    await userEvent.click(button('Émettre la facture')!)

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(issue).not.toHaveBeenCalled()
  })

  it.each([
    ['immediate', /fixée à 0 jours/],
    ['45', /fixée à 45 jours/],
    [undefined, /fixée à 30 jours/],
  ])('le délai dit dans la confirmation suit les conditions de paiement (%s)', async (terms, text) => {
    vi.mocked(useOrganization).mockReturnValue({ data: { ...COMPLETE_ORG, defaultPaymentTerms: terms } } as never)
    show(invoice())

    await userEvent.click(button('Émettre la facture')!)

    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('identité de l\'entreprise incomplète : on le dit avant, avec ce qui manque, et on envoie aux réglages', async () => {
    vi.mocked(useOrganization).mockReturnValue({ data: { ...COMPLETE_ORG, siret: '', city: undefined } } as never)
    show(invoice())

    await userEvent.click(button('Émettre la facture')!)

    expect(screen.getByText('Complétez d\'abord votre entreprise')).toBeInTheDocument()
    expect(screen.getByText(/Il manque : Ville, SIRET\./)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir les réglages' }))
    expect(mockNavigate).toHaveBeenCalledWith('/parametres/entreprise')
    expect(issue).not.toHaveBeenCalled()
  })

  it('sous franchise de TVA, le numéro de TVA n\'est pas exigé', async () => {
    vi.mocked(useOrganization).mockReturnValue({ data: { ...COMPLETE_ORG, vatNumber: '' } } as never)
    show(invoice({ vatExempt: true, vatRate: '0' }))

    await userEvent.click(button('Émettre la facture')!)

    expect(screen.getByText('Émettre cette facture ?')).toBeInTheDocument()
  })

  it('un refus de l\'API est dit avec sa traduction', async () => {
    issue.mockRejectedValue(new ApiError(400, 'x', 'INVOICE_EMPTY'))
    show(invoice())
    await userEvent.click(button('Émettre la facture')!)

    await userEvent.click(screen.getByRole('button', { name: 'Émettre' }))

    expect(toast.error).toHaveBeenCalledWith('Ajoutez au moins une ligne avant d\'émettre')
  })

  it('une échéance passée est dite avec sa traduction', async () => {
    issue.mockRejectedValue(new ApiError(409, 'x', 'INVOICE_DUE_DATE_PAST'))
    show(invoice())
    await userEvent.click(button('Émettre la facture')!)

    await userEvent.click(screen.getByRole('button', { name: 'Émettre' }))

    expect(toast.error).toHaveBeenCalledWith('L\'échéance est déjà passée : choisissez une date à venir')
  })
})

describe('InvoiceDetailPage — les sept jours d\'un acompte de particulier (ADR-036)', () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
  const depositOf = (decidedAt: string, client: Partial<Invoice['client']> = {}) => ({
    deposit: true as const,
    quoteId: 'q1',
    quote: { id: 'q1', reference: 'DEV-2026-0001', status: 'ACCEPTED' as const, decidedAt },
    client: { ...invoice().client, ...client },
  })

  it('émettre l\'acompte d\'un devis accepté il y a deux jours : la confirmation le dit, sans empêcher d\'émettre', async () => {
    show(invoice(depositOf(daysAgo(2))))

    await userEvent.click(button('Émettre la facture')!)

    expect(screen.getByText(/aucun paiement ne peut être demandé avant le/)).toBeInTheDocument()
    expect(screen.getByText(/N'envoyez pas la facture avant/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Émettre' }))
    expect(issue).toHaveBeenCalledWith('i1')
  })

  it('envoyer l\'acompte par email : la confirmation le dit aussi', async () => {
    show(issuedInvoice(depositOf(daysAgo(2))))

    await userEvent.click(button('Envoyer par email')!)

    expect(screen.getByText(/on ne peut pas inviter un particulier à payer avant le/)).toBeInTheDocument()
  })

  it('devis accepté il y a dix jours : rien à signaler', async () => {
    show(invoice(depositOf(daysAgo(10))))

    await userEvent.click(button('Émettre la facture')!)

    expect(screen.queryByText(/aucun paiement ne peut être demandé/)).not.toBeInTheDocument()
  })

  it('un client professionnel : rien, même accepté hier', async () => {
    show(invoice(depositOf(daysAgo(1), { kind: 'PROFESSIONAL', companyName: 'Martin Paysage SARL' })))

    await userEvent.click(button('Émettre la facture')!)

    expect(screen.queryByText(/aucun paiement ne peut être demandé/)).not.toBeInTheDocument()
  })

  it('une facture ordinaire tirée d\'un devis récent : rien (seul un acompte est un paiement avant les travaux)', async () => {
    show(invoice({ quoteId: 'q1', quote: { id: 'q1', reference: 'DEV-2026-0001', status: 'ACCEPTED', decidedAt: daysAgo(1) } }))

    await userEvent.click(button('Émettre la facture')!)

    expect(screen.queryByText(/aucun paiement ne peut être demandé/)).not.toBeInTheDocument()
  })
})

describe('InvoiceDetailPage — l\'enregistrement des paiements fermé hors franchise de TVA (ADR-038)', () => {
  const closed = () => vi.mocked(useOrganization).mockReturnValue({ data: { ...COMPLETE_ORG, paymentRecordingEnabled: false } } as never)

  it('fermé : plus de « Marquer payée » sur une facture émise, et un mot dit pourquoi', () => {
    closed()
    show(issuedInvoice())

    expect(button('Marquer payée')).not.toBeInTheDocument()
    expect(screen.getByTestId('payments-closed')).toHaveTextContent(/enregistrement des paiements est suspendu/)
    expect(screen.getByTestId('payments-closed')).toHaveTextContent(/soumise à la TVA/)
    // Tout le reste reste permis
    expect(button(PDF)).toBeInTheDocument()
    expect(button('Envoyer par email')).toBeInTheDocument()
    expect(button('Annuler par un avoir')).toBeInTheDocument()
  })

  it('fermé : plus de « Annuler le paiement » sur une facture déjà payée', () => {
    closed()
    show(issuedInvoice({ status: 'PAID', paidAt: '2026-11-10T00:00:00.000Z' }))

    expect(button('Annuler le paiement')).not.toBeInTheDocument()
    expect(screen.getByTestId('payments-closed')).toBeInTheDocument()
  })

  it('un avoir, un brouillon et une facture annulée n\'attendent aucun paiement : pas de mot', () => {
    closed()
    show(creditNote())
    expect(screen.queryByTestId('payments-closed')).not.toBeInTheDocument()
  })

  it('un brouillon : pas de mot non plus', () => {
    closed()
    show(invoice())

    expect(screen.queryByTestId('payments-closed')).not.toBeInTheDocument()
  })

  it.each([
    ['ouvert', { paymentRecordingEnabled: true }],
    ['absent de la réponse (ancienne version de l\'API)', {}],
  ])('%s : « Marquer payée » reste proposé, sans mot', (_name, extra) => {
    vi.mocked(useOrganization).mockReturnValue({ data: { ...COMPLETE_ORG, ...extra } } as never)
    show(issuedInvoice())

    expect(button('Marquer payée')).toBeInTheDocument()
    expect(screen.queryByTestId('payments-closed')).not.toBeInTheDocument()
  })

  it('réglages pas encore chargés : on ne cache rien', () => {
    vi.mocked(useOrganization).mockReturnValue({ data: undefined } as never)
    show(issuedInvoice())

    expect(button('Marquer payée')).toBeInTheDocument()
  })
})

describe('InvoiceDetailPage — envoyer par email', () => {
  it('demande confirmation en disant à qui part le PDF, puis envoie', async () => {
    show(issuedInvoice())

    await userEvent.click(button('Envoyer par email')!)

    expect(screen.getByText('Envoyer par email ?')).toBeInTheDocument()
    expect(screen.getByText(/FAC-2026-0001 part à lea@martin\.test, avec son PDF en pièce jointe/)).toBeInTheDocument()
    expect(email).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(email).toHaveBeenCalledWith('i1')
    expect(toast.success).toHaveBeenCalledWith('Envoyé à lea@martin.test')
    expect(screen.queryByText('Envoyer par email ?')).not.toBeInTheDocument()
  })

  it('annuler la confirmation n\'envoie rien', async () => {
    show(issuedInvoice())
    await userEvent.click(button('Envoyer par email')!)

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(email).not.toHaveBeenCalled()
  })

  it('jamais envoyée : aucune ligne « dernier envoi »', () => {
    show(issuedInvoice())

    expect(screen.queryByTestId('invoice-emailed')).not.toBeInTheDocument()
  })

  it('déjà envoyée : le dernier envoi est écrit, et le geste devient « Renvoyer »', async () => {
    show(issuedInvoice({ emailedAt: '2026-11-05T09:30:00.000Z', emailedTo: 'lea@martin.test' }))

    expect(screen.getByTestId('invoice-emailed')).toHaveTextContent('Dernier envoi par email à lea@martin.test le 5 nov. 2026')
    expect(button('Envoyer par email')).not.toBeInTheDocument()

    await userEvent.click(button('Renvoyer par email')!)

    expect(screen.getByText('Renvoyer par email ?')).toBeInTheDocument()
    expect(screen.getByText(/FAC-2026-0001 repart à lea@martin\.test/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    expect(email).toHaveBeenCalledWith('i1')
  })

  it('un avoir part avec son numéro', async () => {
    show(creditNote())

    await userEvent.click(button('Envoyer par email')!)

    expect(screen.getByText(/AV-2026-0001 part à lea@martin\.test/)).toBeInTheDocument()
  })

  it('un email qui ne part pas est dit avec sa traduction', async () => {
    email.mockRejectedValue(new ApiError(502, 'x', 'INVOICE_EMAIL_FAILED'))
    show(issuedInvoice())
    await userEvent.click(button('Envoyer par email')!)

    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(toast.error).toHaveBeenCalledWith('L\'email n\'est pas parti. Réessayez dans un instant.')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('une erreur inconnue retombe sur le message général, jamais sur le texte du serveur', async () => {
    email.mockRejectedValue(new ApiError(500, 'boom interne', 'AUTRE'))
    show(issuedInvoice())
    await userEvent.click(button('Envoyer par email')!)

    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(toast.error).toHaveBeenCalledWith('Impossible d\'envoyer l\'email')
  })

  it('pendant l\'envoi, les autres gestes sont bloqués', () => {
    vi.mocked(useEmailInvoice).mockReturnValue({ mutateAsync: email, isPending: true } as never)
    show(issuedInvoice())

    expect(button('Marquer payée')).toBeDisabled()
    expect(button('Envoyer par email')).toBeDisabled()
  })

  it('avec le droit de modifier mais pas de créer, l\'envoi reste possible', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ factures: ['read', 'update'] }) })
    show(issuedInvoice())

    expect(button('Envoyer par email')).toBeInTheDocument()
  })
})

describe('InvoiceDetailPage — encaisser', () => {
  it('« Marquer payée » demande le jour (aujourd\'hui) et le mode', async () => {
    show(issuedInvoice())

    await userEvent.click(button('Marquer payée')!)

    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByLabelText('Date du paiement')).toHaveValue(todayInput())
    expect(within(dialog).getByLabelText('Date du paiement')).toHaveAttribute('max', todayInput())
    expect(within(dialog).getByLabelText('Date du paiement')).toHaveAttribute('min', '2026-11-04')
    expect(within(dialog).getByLabelText('Mode de paiement')).toHaveValue('')
  })

  it('envoie le jour et le mode choisis', async () => {
    show(issuedInvoice())
    await userEvent.click(button('Marquer payée')!)
    const dialog = screen.getByRole('alertdialog')

    await userEvent.selectOptions(within(dialog).getByLabelText('Mode de paiement'), 'CHECK')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Marquer payée' }))

    expect(pay).toHaveBeenCalledWith({ id: 'i1', paidAt: todayInput(), method: 'CHECK' })
    expect(toast.success).toHaveBeenCalledWith('Facture marquée payée')
  })

  it('sans mode choisi, aucun mode n\'est envoyé', async () => {
    show(issuedInvoice())
    await userEvent.click(button('Marquer payée')!)

    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Marquer payée' }))

    expect(pay).toHaveBeenCalledWith({ id: 'i1', paidAt: todayInput() })
  })

  it('un jour hors limites (avant l\'émission) bloque l\'envoi', async () => {
    show(issuedInvoice())
    await userEvent.click(button('Marquer payée')!)
    const dialog = screen.getByRole('alertdialog')

    const day = within(dialog).getByLabelText('Date du paiement')
    await userEvent.clear(day)
    await userEvent.type(day, '2026-10-01')

    expect(within(dialog).getByRole('button', { name: 'Marquer payée' })).toBeDisabled()
  })

  it('« Annuler le paiement » demande confirmation, puis défait', async () => {
    show(issuedInvoice({ status: 'PAID', paidAt: '2026-11-10T00:00:00.000Z' }))

    await userEvent.click(button('Annuler le paiement')!)
    expect(screen.getByText('Annuler le paiement ?')).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Annuler le paiement' }))

    expect(unpay).toHaveBeenCalledWith('i1')
    expect(toast.success).toHaveBeenCalledWith('Paiement annulé')
  })
})

describe('InvoiceDetailPage — annuler par un avoir', () => {
  it('prévient que c\'est définitif, puis émet l\'avoir et l\'ouvre', async () => {
    show(issuedInvoice())

    await userEvent.click(button('Annuler par un avoir')!)
    expect(screen.getByText('Annuler la facture par un avoir ?')).toBeInTheDocument()
    expect(screen.getByText(/Cela ne se défait pas/)).toBeInTheDocument()
    expect(credit).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Émettre l\'avoir' }))

    expect(credit).toHaveBeenCalledWith('i1')
    expect(toast.success).toHaveBeenCalledWith('Avoir AV-2026-0001 émis')
    expect(mockNavigate).toHaveBeenCalledWith('/factures/cn1')
  })

  it('annuler la confirmation n\'émet rien', async () => {
    show(issuedInvoice())
    await userEvent.click(button('Annuler par un avoir')!)

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(credit).not.toHaveBeenCalled()
  })

  it('un refus de l\'API est dit avec sa traduction, sans quitter la page', async () => {
    credit.mockRejectedValue(new ApiError(409, 'x', 'INVOICE_INVALID_STATUS'))
    show(issuedInvoice())
    await userEvent.click(button('Annuler par un avoir')!)

    await userEvent.click(screen.getByRole('button', { name: 'Émettre l\'avoir' }))

    expect(toast.error).toHaveBeenCalledWith('Cette action n\'est pas possible dans l\'état actuel de la facture')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

describe('InvoiceDetailPage — supprimer un brouillon', () => {
  it('demande confirmation, puis supprime et revient à la liste', async () => {
    show(invoice())

    await userEvent.click(button('Supprimer le brouillon')!)
    expect(screen.getByText('Supprimer ce brouillon ?')).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer le brouillon' }))

    expect(remove).toHaveBeenCalledWith('i1')
    expect(mockNavigate).toHaveBeenCalledWith('/factures', { replace: true })
  })

  it('sans le droit de supprimer, pas de bouton', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ factures: ['read', 'update'] }) })
    show(invoice())

    expect(button('Supprimer le brouillon')).not.toBeInTheDocument()
  })

  it('un refus est dit avec sa traduction', async () => {
    remove.mockRejectedValue(new ApiError(409, 'x', 'INVOICE_LOCKED'))
    show(invoice())
    await userEvent.click(button('Supprimer le brouillon')!)

    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer le brouillon' }))

    expect(toast.error).toHaveBeenCalledWith('Une facture émise ne se modifie plus')
  })
})

describe('InvoiceDetailPage — acompte et facture de solde (ADR-033)', () => {
  const depositLine = invoiceLine({ snapshotTitle: 'Acompte de 30 % sur le devis DEV-2026-0001', quantity: '1', unitPrice: '69', total: '69.00' })
  const deposit = (over: Partial<Invoice> = {}) =>
    invoice({
      deposit: true,
      quoteId: 'q1',
      quote: { id: 'q1', reference: 'DEV-2026-0001', status: 'ACCEPTED', decidedAt: '2026-10-01T10:00:00.000Z' },
      lines: [depositLine],
      subtotal: '69.00',
      vatAmount: '13.80',
      total: '82.80',
      vatRate: '20',
      ...over,
    })
  const deduction = invoiceLine({
    id: 'il9',
    snapshotTitle: 'FAC-2026-0001',
    quantity: '-1',
    unitPrice: '69',
    total: '-69.00',
    depositInvoiceId: 'd1',
    order: 5,
  })
  // 230,00 de travaux, 69,00 d'acompte : 161,00 HT, TVA 20 % 32,20, 193,20 à payer
  const balance = (over: Partial<Invoice> = {}) =>
    invoice({
      vatRate: '20',
      lines: [invoiceLine({ quantity: '10', unitPrice: '23', total: '230.00' }), deduction],
      subtotal: '161.00',
      vatAmount: '32.20',
      total: '193.20',
      ...over,
    })

  it('un acompte se présente comme tel : titre, pastille, ligne unique', () => {
    show(deposit())

    expect(screen.getByText(/Facture d'acompte/)).toBeInTheDocument()
    expect(screen.getByTestId('deposit-chip')).toHaveTextContent('Acompte')
    expect(screen.getAllByTestId('invoice-line')).toHaveLength(1)
    expect(plain(screen.getByTestId('invoice-total').textContent)).toBe('82,80 €')
  })

  it('un brouillon d\'acompte ne se modifie pas : pas de « Modifier », la raison est dite, il s\'émet et se supprime', () => {
    show(deposit())

    expect(button('Modifier')).not.toBeInTheDocument()
    expect(screen.getByText(/Un acompte ne se modifie pas/)).toBeInTheDocument()
    expect(button('Émettre la facture')).toBeInTheDocument()
    expect(button('Supprimer le brouillon')).toBeInTheDocument()
  })

  it('un acompte émis se paie, s\'envoie et s\'annule comme une facture', () => {
    show(issuedInvoice({ deposit: true }))

    expect(button('Marquer payée')).toBeInTheDocument()
    expect(button('Envoyer par email')).toBeInTheDocument()
    expect(button('Annuler par un avoir')).toBeInTheDocument()
  })

  it('un acompte déduit d\'une facture de solde ne s\'annule pas : le lien vers le solde et la raison remplacent le bouton', () => {
    show(issuedInvoice({ deposit: true, deductedBy: { id: 'i2', reference: 'FAC-2026-0002' } }))

    expect(button('Annuler par un avoir')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'FAC-2026-0002' })).toHaveAttribute('href', '/factures/i2')
    expect(screen.getByTestId('invoice-hint-issued')).toHaveTextContent('Cet acompte est déduit d\'une facture de solde')
    // les autres gestes restent
    expect(button('Marquer payée')).toBeInTheDocument()
  })

  it('un acompte déduit d\'un brouillon de solde garde son lien vers ce brouillon', () => {
    show(issuedInvoice({ deposit: true, deductedBy: { id: 'i2', reference: null } }))

    expect(screen.getByTestId('invoice-deducted-by')).toHaveTextContent('Déduit de la facture : Brouillon')
  })

  it('la facture de solde liste les travaux, puis le total de la prestation, chaque acompte et le reste à payer', () => {
    show(balance())

    // les lignes ne sont que les travaux
    expect(screen.getAllByTestId('invoice-line')).toHaveLength(1)
    expect(plain(screen.getByTestId('invoice-works-total').textContent)).toBe('230,00 €')
    const rows = screen.getAllByTestId('invoice-deduction')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Acompte FAC-2026-0001')
    expect(plain(rows[0].textContent)).toContain('-69,00 €')
    expect(within(rows[0]).getByRole('link', { name: /FAC-2026-0001/ })).toHaveAttribute('href', '/factures/d1')
    expect(screen.getByText('Reste à payer')).toBeInTheDocument()
    expect(plain(screen.getByTestId('invoice-total').textContent)).toBe('193,20 €')
  })

  it('sans acompte, les totaux gardent leur forme', () => {
    show(invoice())

    expect(screen.queryByTestId('invoice-works-total')).not.toBeInTheDocument()
    expect(screen.queryByTestId('invoice-deduction')).not.toBeInTheDocument()
    expect(screen.queryByText('Reste à payer')).not.toBeInTheDocument()
    expect(screen.getAllByText('Total TTC').length).toBeGreaterThan(0)
  })

  it('un brouillon de solde se modifie, comme une facture', () => {
    show(balance())

    expect(button('Modifier')).toBeInTheDocument()
  })

  it('un refus d\'émettre un solde négatif est dit avec sa traduction', async () => {
    issue.mockRejectedValue(new ApiError(409, 'x', 'INVOICE_TOTAL_NEGATIVE'))
    show(balance())
    await userEvent.click(button('Émettre la facture')!)

    await userEvent.click(screen.getByRole('button', { name: 'Émettre' }))

    expect(toast.error).toHaveBeenCalledWith(
      'Les acomptes déduits dépassent le montant de la facture : ajustez les lignes avant de l\'émettre.',
    )
  })
})

