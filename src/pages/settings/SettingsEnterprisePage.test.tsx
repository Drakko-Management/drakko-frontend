import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { useDeleteLogo, useOrganization, useUpdateOrganization, useUploadLogo } from '@/hooks/use-organization'
import { useAuthStore } from '@/store/auth.store'
import { SettingsEnterprisePage } from './SettingsEnterprisePage'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-organization', () => ({
  useOrganization: vi.fn(),
  useUpdateOrganization: vi.fn(),
  useUploadLogo: vi.fn(),
  useDeleteLogo: vi.fn(),
}))

const mutate = vi.fn()
const mutateAsync = vi.fn()

function renderPage(org: object = {}) {
  vi.mocked(useOrganization).mockReturnValue({ data: { name: 'Jardins du Sud', defaultVatRate: 10, ...org }, isLoading: false } as never)
  render(
    <MemoryRouter>
      <SettingsEnterprisePage />
    </MemoryRouter>,
  )
}

const vatSwitch = () => screen.queryByRole('switch', { name: 'Franchise en base de TVA' })
const lastPayload = () => mutateAsync.mock.calls[mutateAsync.mock.calls.length - 1][0]
// Le taux par défaut est une liste dont l'option choisie est « 10 % » (ou « 0 % » sous franchise)
const vatRate = (shown: string) => screen.getByDisplayValue(shown)

beforeEach(() => {
  vi.clearAllMocks()
  mutateAsync.mockResolvedValue({})
  vi.mocked(useUpdateOrganization).mockReturnValue({ mutate, mutateAsync, isPending: false } as never)
  vi.mocked(useUploadLogo).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
  vi.mocked(useDeleteLogo).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
  useAuthStore.setState({ role: 'ADMIN', permissions: null, modules: null })
})

describe('SettingsEnterprisePage — documents (ADR-033)', () => {
  it('la franchise de TVA est un interrupteur, éteint par défaut, avec la mention légale expliquée', () => {
    renderPage()

    expect(vatSwitch()).toBeInTheDocument()
    expect(vatSwitch()).not.toBeChecked()
    expect(screen.getByText(/TVA non applicable, art\. 293 B du CGI/)).toBeInTheDocument()
  })

  it('allumée, elle fige le taux par défaut à 0 % et s\'enregistre', async () => {
    renderPage()
    expect(vatRate('10 %')).toBeEnabled()

    await userEvent.click(vatSwitch()!)

    expect(vatSwitch()).toBeChecked()
    expect(vatRate('0 %')).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(lastPayload()).toMatchObject({ vatExempt: true })
  })

  it('une organisation déjà en franchise arrive avec l\'interrupteur allumé', () => {
    renderPage({ vatExempt: true })

    expect(vatSwitch()).toBeChecked()
    expect(vatRate('0 %')).toBeDisabled()
  })

  it('éteinte, elle s\'enregistre aussi (on peut sortir de la franchise)', async () => {
    renderPage({ vatExempt: true })

    await userEvent.click(vatSwitch()!)
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(lastPayload()).toMatchObject({ vatExempt: false })
  })

  it('la phrase sous « Conditions de paiement » dit qu\'elles font l\'échéance des factures', () => {
    renderPage()

    expect(screen.getByText(/Sert aussi à calculer l'échéance de vos factures/)).toBeInTheDocument()
  })

  it('le préfixe de facture n\'apparaît qu\'avec le module Facturation', () => {
    useAuthStore.setState({ role: 'ADMIN', modules: ['chantiers'] })
    renderPage()

    expect(screen.queryByText('Préfixe facture')).not.toBeInTheDocument()
    expect(screen.queryByText(/Sert aussi à calculer l'échéance/)).not.toBeInTheDocument()
  })

  it('avec la Facturation, la section bancaire dit que l\'IBAN s\'imprime sur les factures à régler', () => {
    useAuthStore.setState({ role: 'ADMIN', modules: ['devis', 'factures'] })
    renderPage()

    expect(screen.getByText(/Imprimés sur vos factures à régler/)).toBeInTheDocument()
  })

  it('sans la Facturation, rien ne dit que l\'IBAN est imprimé (il ne l\'est pas)', () => {
    useAuthStore.setState({ role: 'ADMIN', modules: ['devis'] })
    renderPage()

    expect(screen.queryByText(/Imprimés sur vos factures à régler/)).not.toBeInTheDocument()
  })

  it('« Chantiers » seul : pas d\'interrupteur de franchise, aucun devis ni facture n\'en parle', () => {
    useAuthStore.setState({ role: 'ADMIN', modules: ['chantiers'] })
    renderPage()

    expect(vatSwitch()).not.toBeInTheDocument()
  })

  it('« Devis seul » : la franchise concerne ses devis, le préfixe de facture non', () => {
    useAuthStore.setState({ role: 'ADMIN', modules: ['devis'] })
    renderPage()

    expect(vatSwitch()).toBeInTheDocument()
    expect(screen.queryByText('Préfixe facture')).not.toBeInTheDocument()
    expect(screen.getByText('Préfixe devis')).toBeInTheDocument()
  })
})

describe('SettingsEnterprisePage — identifiants contrôlés et champs effaçables', () => {
  const field = (label: string) => screen.getByLabelText(label)
  const save = () => userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

  it.each([
    ['SIRET', '73282932000075', /SIRET n'est pas valide/],
    ['N° TVA', 'FR12345678901', /numéro de TVA n'est pas valide/],
    ['IBAN', 'FR7630006000011234567890188', /IBAN n'est pas valide/],
    ['BIC', 'AGRI', /BIC n'est pas valide/],
    ['Email professionnel', 'contact.jardins.test', /adresse email n'est pas valide/],
  ])('%s faux : l\'erreur s\'affiche en quittant le champ, et rien n\'est enregistré', async (label, value, message) => {
    renderPage()

    await userEvent.type(field(label), value)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.tab()

    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(field(label)).toHaveAttribute('aria-invalid', 'true')
    await save()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('enregistrer avec une erreur ne laisse pas partir la requête, et dit pourquoi', async () => {
    renderPage()
    await userEvent.type(field('IBAN'), 'FR7630006000011234567890188')

    await save()

    expect(mutateAsync).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Corrigez les champs en erreur avant d\'enregistrer.')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('pas d\'erreur pendant la frappe : un IBAN à moitié saisi n\'est pas encore fautif', async () => {
    renderPage()

    await userEvent.type(field('IBAN'), 'FR76 3000')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('des valeurs justes s\'enregistrent remises en forme : espaces retirés, majuscules', async () => {
    renderPage()

    await userEvent.type(field('SIRET'), '732 829 320 00074')
    await userEvent.type(field('N° TVA'), 'fr 40.303 265 045')
    await userEvent.type(field('IBAN'), 'fr76 3000 6000 0112 3456 7890 189')
    await userEvent.type(field('BIC'), 'agri frpp')
    await userEvent.type(field('Email professionnel'), 'contact@jardins.test')
    await save()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(lastPayload()).toMatchObject({
      siret: '73282932000074',
      vatNumber: 'FR40303265045',
      iban: 'FR7630006000011234567890189',
      bic: 'AGRIFRPP',
      email: 'contact@jardins.test',
    })
  })

  it('un champ vide n\'est pas une erreur', async () => {
    renderPage()

    await save()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(mutateAsync).toHaveBeenCalled()
  })

  it('vider un champ le fait effacer : l\'IBAN, le SIRET et les textes facultatifs partent en null', async () => {
    renderPage({
      siret: '73282932000074',
      iban: 'FR7630006000011234567890189',
      bic: 'AGRIFRPP',
      vatNumber: 'FR40303265045',
      email: 'contact@jardins.test',
      phone: '0400000000',
      latePaymentPenalties: 'Pénalités : 3 fois le taux légal.',
    })

    await userEvent.clear(field('IBAN'))
    await userEvent.clear(field('SIRET'))
    await userEvent.clear(field('BIC'))
    await userEvent.clear(field('N° TVA'))
    await userEvent.clear(field('Email professionnel'))
    await save()

    expect(lastPayload()).toMatchObject({ iban: null, siret: null, bic: null, vatNumber: null, email: null })
  })

  it('un champ texte laissé vide s\'envoie en null, pas « rien à changer »', async () => {
    renderPage({ phone: '0400000000' })

    await userEvent.clear(screen.getByDisplayValue('0400000000'))
    await save()

    expect(lastPayload()).toMatchObject({ phone: null, tradeName: null, address: null })
  })

  it('une valeur déjà enregistrée et fausse se corrige avant tout enregistrement', async () => {
    renderPage({ siret: '12345678900012' })

    await save()

    expect(mutateAsync).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/SIRET n'est pas valide/)
  })
})

