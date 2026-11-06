import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

  describe('pénalités de retard', () => {
    const hint = /L'indemnité de 40 € s'ajoute seule sur les factures des clients professionnels/
    const warning = /Ce texte parle de l'indemnité de 40 €/
    const penalties = () => screen.getByLabelText('Pénalités de retard')

    it('avec la Facturation, le champ dit que le taux est obligatoire et que les 40 € viennent seuls', () => {
      useAuthStore.setState({ role: 'ADMIN', modules: ['devis', 'factures'] })
      renderPage()

      expect(screen.getByText(hint)).toBeInTheDocument()
      expect(screen.getByText(/Laissez vide pour imprimer/)).toBeInTheDocument()
    })

    it('sans la Facturation, aucune facture n\'est concernée : pas de rappel', () => {
      useAuthStore.setState({ role: 'ADMIN', modules: ['devis'] })
      renderPage()

      expect(screen.queryByText(hint)).not.toBeInTheDocument()
    })

    it('rien n\'est renvoyé au comptable : le texte n\'est plus à « faire relire »', () => {
      useAuthStore.setState({ role: 'ADMIN', modules: ['devis', 'factures'] })
      renderPage()

      expect(screen.queryByText(/comptable/)).not.toBeInTheDocument()
    })

    it.each(['Pénalités : 3 fois le taux légal, plus 40 € de frais.', 'Indemnité de 40 euros', 'frais 40 EUR'])(
      'un texte qui écrit déjà l\'indemnité (« %s ») est signalé',
      async (text) => {
        useAuthStore.setState({ role: 'ADMIN', modules: ['devis', 'factures'] })
        renderPage({ latePaymentPenalties: text })

        expect(screen.getByRole('alert')).toHaveTextContent(warning)
      },
    )

    it('l\'avertissement suit la saisie et disparaît quand l\'indemnité est retirée', async () => {
      useAuthStore.setState({ role: 'ADMIN', modules: ['devis', 'factures'] })
      renderPage()
      expect(screen.queryByText(warning)).not.toBeInTheDocument()

      await userEvent.type(penalties(), 'plus 40 € de frais')
      expect(screen.getByText(warning)).toBeInTheDocument()

      await userEvent.clear(penalties())
      await userEvent.type(penalties(), '3 fois le taux légal')
      expect(screen.queryByText(warning)).not.toBeInTheDocument()
    })

    it('un nombre qui n\'est pas l\'indemnité (140 €, 400 €) ne déclenche rien', () => {
      useAuthStore.setState({ role: 'ADMIN', modules: ['devis', 'factures'] })
      renderPage({ latePaymentPenalties: 'minimum 140 € ou 400 €' })

      expect(screen.queryByText(warning)).not.toBeInTheDocument()
    })
  })

  describe('mentions de facture : nature des opérations et TVA sur les débits (ADR-035)', () => {
    const nature = () => screen.getByLabelText('Nature de vos opérations') as HTMLSelectElement
    const debits = () => screen.queryByRole('switch', { name: "Option TVA d'après les débits" })

    beforeEach(() => {
      useAuthStore.setState({ role: 'ADMIN', modules: ['devis', 'factures'] })
    })

    it('par défaut : des prestations de services, sans option sur les débits', () => {
      renderPage()

      expect(nature().value).toBe('SERVICES')
      expect(debits()).not.toBeChecked()
    })

    it('les réglages de l\'organisation sont repris', () => {
      renderPage({ operationNature: 'BOTH', vatOnDebits: true })

      expect(nature().value).toBe('BOTH')
      expect(debits()).toBeChecked()
    })

    it('les deux choix s\'enregistrent', async () => {
      renderPage()

      await userEvent.selectOptions(nature(), 'GOODS')
      await userEvent.click(debits()!)
      await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

      expect(lastPayload()).toMatchObject({ operationNature: 'GOODS', vatOnDebits: true })
    })

    it('la nature se choisit parmi trois', () => {
      renderPage()

      expect(Array.from(nature().options).map((option) => option.value)).toEqual(['SERVICES', 'GOODS', 'BOTH'])
    })

    it('sous franchise de TVA, l\'option sur les débits n\'a pas de sens : pas d\'interrupteur', () => {
      renderPage({ vatExempt: true, vatOnDebits: true })

      expect(debits()).not.toBeInTheDocument()
    })

    it('sans la Facturation, rien de tout cela : aucune facture ne l\'imprime', () => {
      useAuthStore.setState({ role: 'ADMIN', modules: ['devis'] })
      renderPage()

      expect(screen.queryByLabelText('Nature de vos opérations')).not.toBeInTheDocument()
      expect(debits()).not.toBeInTheDocument()
    })
  })

  describe('assurance décennale', () => {
    const localDay = (offsetDays: number) => {
      const d = new Date()
      d.setDate(d.getDate() + offsetDays)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    const expiredNotice = () => screen.queryByTestId('insurance-expired')

    it('avec les Devis ou la Facturation, la section dit qu\'elle s\'imprime sur les documents', () => {
      useAuthStore.setState({ role: 'ADMIN', modules: ['devis'] })
      renderPage()

      expect(screen.getByText(/Imprimée sur vos documents \(devis, factures\)/)).toBeInTheDocument()
    })

    it('« Chantiers » seul : aucun document ne l\'imprime, la section ne le dit pas', () => {
      useAuthStore.setState({ role: 'ADMIN', modules: ['chantiers'] })
      renderPage({ insurerExpiry: '2020-01-01' })

      expect(screen.queryByText(/Imprimée sur vos documents/)).not.toBeInTheDocument()
      expect(expiredNotice()).not.toBeInTheDocument()
    })

    it('une assurance expirée est signalée : sa date s\'imprime quand même', () => {
      renderPage({ insurerExpiry: '2020-01-01' })

      expect(expiredNotice()).toHaveTextContent(/a expiré/)
    })

    it.each([
      ['qui expire demain', localDay(1)],
      ['qui expire aujourd\'hui (le jour même elle couvre encore)', localDay(0)],
      ['sans date', ''],
    ])('une assurance %s n\'est pas signalée', (_name, insurerExpiry) => {
      renderPage({ insurerExpiry })

      expect(expiredNotice()).not.toBeInTheDocument()
    })

    it('l\'avertissement suit la saisie', async () => {
      renderPage({ insurerExpiry: '2099-12-31' })
      expect(expiredNotice()).not.toBeInTheDocument()

      fireEvent.change(screen.getByLabelText("Date d'expiration"), { target: { value: '2020-06-30' } })

      expect(expiredNotice()).toBeInTheDocument()
    })
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

