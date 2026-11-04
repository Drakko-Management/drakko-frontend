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
import { creditNote, invoice, issuedInvoice } from '@/test/invoice-fixtures'
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
    show(issuedInvoice({ quote: { id: 'q1', reference: 'DEV-2026-0001' } }))

    expect(screen.getByRole('link', { name: 'DEV-2026-0001' })).toHaveAttribute('href', '/devis/q1')
  })

  it('sans le droit de lire les devis, le devis n\'est pas un lien', () => {
    useAuthStore.setState({ role: 'MEMBER', permissions: makePermissions({ factures: ['read'] }) })
    show(issuedInvoice({ quote: { id: 'q1', reference: 'DEV-2026-0001' } }))

    expect(screen.queryByTestId('invoice-quote')).not.toBeInTheDocument()
  })

  it('« Devis absent » (module Devis coupé) : le devis d\'origine ne se montre pas, même pour l\'administrateur', () => {
    useAuthStore.setState({ role: 'ADMIN', modules: ['factures'] })
    show(issuedInvoice({ quote: { id: 'q1', reference: 'DEV-2026-0001' } }))

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

  it('annulée : seulement le PDF, sans envoi par email', () => {
    show(issuedInvoice({ status: 'CANCELLED' }))

    expect(button(PDF)).toBeInTheDocument()
    expect(button('Envoyer par email')).not.toBeInTheDocument() // son avoir la remplace
    expect(screen.getAllByRole('button')).toHaveLength(2) // PDF + retour
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
