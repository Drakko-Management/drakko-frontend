import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
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
