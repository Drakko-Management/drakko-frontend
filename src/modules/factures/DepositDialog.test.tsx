import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DepositDialog } from './DepositDialog'
import { plain } from '@/test/quote-fixtures'

// Un devis de 230,00 € HT à 20 %
function open(props: Partial<React.ComponentProps<typeof DepositDialog>> = {}) {
  const onConfirm = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <DepositDialog
      open
      onOpenChange={onOpenChange}
      quoteReference="DEV-2026-0001"
      quoteSubtotal={23000n}
      vatRate="20"
      vatExempt={false}
      onConfirm={onConfirm}
      {...props}
    />,
  )
  return { onConfirm, onOpenChange }
}

const create = () => screen.getByRole('button', { name: 'Créer l\'acompte' })
const preview = () => plain(screen.getByTestId('deposit-preview').textContent)

describe('DepositDialog', () => {
  it('propose 30 % du devis et en montre le montant hors taxe et toutes taxes', () => {
    open()

    expect(screen.getByRole('heading', { name: 'Facture d\'acompte' })).toBeInTheDocument()
    expect(screen.getByText(/DEV-2026-0001/)).toBeInTheDocument()
    expect(screen.getByLabelText('Pourcentage (%)')).toHaveValue('30')
    // 30 % de 230,00 = 69,00 HT ; TVA 20 % = 13,80
    expect(preview()).toBe('69,00 € HT, soit 82,80 € TTC')
    expect(create()).toBeEnabled()
  })

  it('crée l\'acompte au pourcentage choisi, virgule comprise', async () => {
    const { onConfirm } = open()

    await userEvent.clear(screen.getByLabelText('Pourcentage (%)'))
    await userEvent.type(screen.getByLabelText('Pourcentage (%)'), '12,5')

    // 12,5 % de 230,00 = 28,75
    expect(preview()).toBe('28,75 € HT, soit 34,50 € TTC')
    await userEvent.click(create())
    expect(onConfirm).toHaveBeenCalledWith({ percent: 12.5 })
  })

  it('en montant hors taxe : le champ est vide, l\'aperçu suit la saisie', async () => {
    const { onConfirm } = open()

    await userEvent.click(screen.getByRole('button', { name: 'En montant hors taxe' }))

    expect(screen.getByLabelText('Montant hors taxe (€)')).toHaveValue('')
    expect(create()).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Montant hors taxe (€)'), '50')
    expect(preview()).toBe('50,00 € HT, soit 60,00 € TTC')
    await userEvent.click(create())
    expect(onConfirm).toHaveBeenCalledWith({ amount: 50 })
  })

  it('revenir au pourcentage remet 30 %', async () => {
    open()

    await userEvent.click(screen.getByRole('button', { name: 'En montant hors taxe' }))
    await userEvent.click(screen.getByRole('button', { name: 'En pourcentage du devis' }))

    expect(screen.getByLabelText('Pourcentage (%)')).toHaveValue('30')
  })

  it.each(['', '0', '100', '150', '12,345', 'abc', '-5'])('refuse le pourcentage « %s »', async (text) => {
    open()

    await userEvent.clear(screen.getByLabelText('Pourcentage (%)'))
    if (text) await userEvent.type(screen.getByLabelText('Pourcentage (%)'), text)

    expect(create()).toBeDisabled()
    expect(preview()).toBe('')
  })

  it('refuse un pourcentage qui s\'arrondit à zéro', async () => {
    open({ quoteSubtotal: 1000n })

    await userEvent.clear(screen.getByLabelText('Pourcentage (%)'))
    await userEvent.type(screen.getByLabelText('Pourcentage (%)'), '0,01')

    expect(create()).toBeDisabled()
  })

  it.each(['0', '1,234', 'abc'])('refuse le montant « %s »', async (text) => {
    open()

    await userEvent.click(screen.getByRole('button', { name: 'En montant hors taxe' }))
    await userEvent.type(screen.getByLabelText('Montant hors taxe (€)'), text)

    expect(create()).toBeDisabled()
  })

  it('sous franchise de TVA, pas de TTC : la mention le dit', () => {
    open({ vatExempt: true, vatRate: '0' })

    expect(preview()).toBe('69,00 € (TVA non applicable)')
  })

  it('la touche Entrée crée l\'acompte', async () => {
    const { onConfirm } = open()

    await userEvent.type(screen.getByLabelText('Pourcentage (%)'), '{Enter}')

    expect(onConfirm).toHaveBeenCalledWith({ percent: 30 })
  })

  it('Entrée ne crée rien tant que la saisie est invalide', async () => {
    const { onConfirm } = open()

    await userEvent.clear(screen.getByLabelText('Pourcentage (%)'))
    await userEvent.type(screen.getByLabelText('Pourcentage (%)'), '{Enter}')

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('pendant la création, le bouton est bloqué', () => {
    open({ pending: true })

    expect(create()).toBeDisabled()
  })

  it('annuler ferme sans rien créer', async () => {
    const { onConfirm, onOpenChange } = open()

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
