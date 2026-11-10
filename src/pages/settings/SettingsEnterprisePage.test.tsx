import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import {
  openInsuranceAttestation,
  useDeleteInsuranceAttestation,
  useDeleteLogo,
  useOrganization,
  useUpdateOrganization,
  useUploadInsuranceAttestation,
  useUploadLogo,
} from '@/hooks/use-organization'
import { ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth.store'
import { SettingsEnterprisePage } from './SettingsEnterprisePage'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/use-organization', () => ({
  useOrganization: vi.fn(),
  useUpdateOrganization: vi.fn(),
  useUploadLogo: vi.fn(),
  useDeleteLogo: vi.fn(),
  useUploadInsuranceAttestation: vi.fn(),
  useDeleteInsuranceAttestation: vi.fn(),
  openInsuranceAttestation: vi.fn(),
}))

const mutate = vi.fn()
const mutateAsync = vi.fn()
const uploadAttestation = vi.fn()
const deleteAttestation = vi.fn()

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
  uploadAttestation.mockResolvedValue({ name: 'a.pdf', uploadedAt: '2026-11-06T10:00:00.000Z' })
  deleteAttestation.mockResolvedValue(undefined)
  vi.mocked(useUploadInsuranceAttestation).mockReturnValue({ mutateAsync: uploadAttestation, isPending: false } as never)
  vi.mocked(useDeleteInsuranceAttestation).mockReturnValue({ mutateAsync: deleteAttestation, isPending: false } as never)
  vi.mocked(openInsuranceAttestation).mockResolvedValue(undefined)
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

  describe('attestation d\'assurance jointe aux documents (ADR-037)', () => {
    const block = () => screen.getByTestId('insurance-attestation')
    const input = () => document.getElementById('attestation-upload') as HTMLInputElement
    const pdfFile = (name = 'axa-2026.pdf', size = 1000) =>
      new File([new Uint8Array(size)], name, { type: 'application/pdf' })

    beforeEach(() => {
      useAuthStore.setState({ role: 'ADMIN', modules: ['devis', 'factures'] })
    })

    it('sans attestation : le dit, et propose de l\'ajouter', () => {
      renderPage()

      expect(screen.getByTestId('attestation-none')).toHaveTextContent(/partent sans/)
      expect(within(block()).getByText('Ajouter l\'attestation')).toBeInTheDocument()
      expect(within(block()).queryByRole('button', { name: 'Voir' })).not.toBeInTheDocument()
      expect(within(block()).queryByRole('button', { name: 'Retirer' })).not.toBeInTheDocument()
    })

    it('avec une attestation : son nom et le jour du dépôt, pour la remplacer, la voir ou la retirer', () => {
      renderPage({ insuranceAttestationName: 'axa-2026.pdf', insuranceAttestationAt: '2026-11-06T10:00:00.000Z' })

      expect(screen.getByTestId('attestation-current')).toHaveTextContent(/axa-2026\.pdf, ajoutée le 6 nov\. 2026/)
      expect(screen.queryByTestId('attestation-none')).not.toBeInTheDocument()
      expect(within(block()).getByText('Remplacer')).toBeInTheDocument()
      expect(within(block()).getByRole('button', { name: 'Voir' })).toBeInTheDocument()
      expect(within(block()).getByRole('button', { name: 'Retirer' })).toBeInTheDocument()
    })

    it('dit ce que fait la loi : jointe à la fin de chaque devis et de chaque facture, les factures émises gardent la leur', () => {
      renderPage()

      expect(block()).toHaveTextContent(/jointe à la fin de chaque devis et de chaque facture/)
      expect(block()).toHaveTextContent(/factures déjà émises gardent celle qui était jointe/)
      expect(block()).toHaveTextContent(/5 Mo et 10 pages/)
    })

    it('un PDF choisi part à l\'API, un message le confirme', async () => {
      renderPage()
      const file = pdfFile()

      await userEvent.upload(input(), file)

      expect(uploadAttestation).toHaveBeenCalledWith(file)
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Attestation ajoutée'))
    })

    it('un fichier qui n\'est pas un PDF n\'est pas envoyé', async () => {
      renderPage()
      const user = userEvent.setup({ applyAccept: false })

      await user.upload(input(), new File(['x'], 'photo.png', { type: 'image/png' }))

      expect(uploadAttestation).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith('Choisissez un fichier PDF.')
    })

    it('un PDF de plus de 5 Mo n\'est pas envoyé', async () => {
      renderPage()

      await userEvent.upload(input(), pdfFile('gros.pdf', 5 * 1024 * 1024 + 1))

      expect(uploadAttestation).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith('Ce fichier dépasse 5 Mo.')
    })

    it.each([
      ['INSURANCE_ATTESTATION_INVALID', 'Ce PDF est illisible ou protégé par un mot de passe. Demandez-en une copie à votre assureur.'],
      ['INSURANCE_ATTESTATION_TOO_LONG', 'Ce PDF a plus de 10 pages.'],
      ['INSURANCE_ATTESTATION_TOO_BIG', 'Ce fichier dépasse 5 Mo.'],
    ])('un refus de l\'API (%s) est dit avec sa traduction', async (code, message) => {
      uploadAttestation.mockRejectedValue(new ApiError(400, 'x', code))
      renderPage()

      await userEvent.upload(input(), pdfFile())

      await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(message))
    })

    it('une autre erreur : un message général', async () => {
      uploadAttestation.mockRejectedValue(new Error('réseau'))
      renderPage()

      await userEvent.upload(input(), pdfFile())

      await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('L\'attestation n\'a pas pu être envoyée.'))
    })

    it('« Voir » ouvre le fichier stocké', async () => {
      renderPage({ insuranceAttestationName: 'axa-2026.pdf', insuranceAttestationAt: '2026-11-06T10:00:00.000Z' })

      await userEvent.click(within(block()).getByRole('button', { name: 'Voir' }))

      expect(openInsuranceAttestation).toHaveBeenCalled()
    })

    it('retirer demande confirmation, et rien ne part avant', async () => {
      renderPage({ insuranceAttestationName: 'axa-2026.pdf', insuranceAttestationAt: '2026-11-06T10:00:00.000Z' })

      await userEvent.click(within(block()).getByRole('button', { name: 'Retirer' }))

      expect(screen.getByRole('alert')).toHaveTextContent(/partiront sans attestation/)
      expect(deleteAttestation).not.toHaveBeenCalled()
      await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(deleteAttestation).not.toHaveBeenCalled()
    })

    it('la confirmation retire l\'attestation', async () => {
      renderPage({ insuranceAttestationName: 'axa-2026.pdf', insuranceAttestationAt: '2026-11-06T10:00:00.000Z' })
      await userEvent.click(within(block()).getByRole('button', { name: 'Retirer' }))

      await userEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Retirer' }))

      expect(deleteAttestation).toHaveBeenCalled()
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Attestation retirée'))
    })

    it('« Chantiers » seul : aucun devis ni facture ne la joint, le bloc n\'apparaît pas', () => {
      useAuthStore.setState({ role: 'ADMIN', modules: ['chantiers'] })
      renderPage()

      expect(screen.queryByTestId('insurance-attestation')).not.toBeInTheDocument()
    })

    it('enregistrer les réglages n\'envoie jamais l\'attestation : elle a ses propres routes', async () => {
      renderPage({ insuranceAttestationName: 'axa-2026.pdf', insuranceAttestationAt: '2026-11-06T10:00:00.000Z' })

      await userEvent.type(screen.getByLabelText('Email professionnel'), 'contact@jardins.test')
      await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

      expect(lastPayload()).not.toHaveProperty('insuranceAttestationName')
      expect(lastPayload()).not.toHaveProperty('insuranceAttestationAt')
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

    await userEvent.type(screen.getByDisplayValue('Jardins du Sud'), ' 2')
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


describe('SettingsEnterprisePage — « Enregistrer » ne s\'allume que pour une modification', () => {
  const saveButton = () => screen.getByRole('button', { name: 'Enregistrer' })

  it('éteint à l\'ouverture : rien n\'a changé', () => {
    renderPage({ siret: '73282932000074', phone: '0400000000' })

    expect(saveButton()).toBeDisabled()
  })

  it('s\'allume à la première modification et se rééteint quand on revient à la valeur enregistrée', async () => {
    renderPage({ phone: '0400000000' })

    await userEvent.type(screen.getByDisplayValue('0400000000'), '1')
    expect(saveButton()).toBeEnabled()

    await userEvent.type(screen.getByDisplayValue('04000000001'), '{Backspace}')
    expect(saveButton()).toBeDisabled()
  })

  it('un interrupteur compte comme une modification', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('switch', { name: 'Franchise en base de TVA' }))

    expect(saveButton()).toBeEnabled()
  })

  it('une valeur déjà enregistrée et fausse le garde allumé : c\'est en l\'essayant qu\'on sait quoi corriger', () => {
    renderPage({ siret: '12345678900012' })

    expect(saveButton()).toBeEnabled()
  })

  it('après un enregistrement, la saisie reprend ce que le serveur a gardé et le bouton s\'éteint', async () => {
    // Une nouvelle instance à chaque appel : React ne rend pas deux fois le même élément
    const page = () => (
      <MemoryRouter>
        <SettingsEnterprisePage />
      </MemoryRouter>
    )
    vi.mocked(useOrganization).mockReturnValue({ data: { name: 'Jardins du Sud', defaultVatRate: 10, phone: '0400000000' }, isLoading: false } as never)
    const view = render(page())
    await userEvent.type(screen.getByDisplayValue('0400000000'), '1')
    expect(saveButton()).toBeEnabled()

    // L'API a gardé la valeur : la page, restée ouverte, reçoit l'organisation rechargée
    vi.mocked(useOrganization).mockReturnValue({ data: { name: 'Jardins du Sud', defaultVatRate: 10, phone: '04000000001' }, isLoading: false } as never)
    view.rerender(page())

    expect(screen.getByDisplayValue('04000000001')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })
})
