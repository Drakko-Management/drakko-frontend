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

  describe('acomptes déjà demandés', () => {
    // Devis de 230,00 HT dont 100,00 HT sont déjà demandés : il reste 130,00, moins un centime pour garder un solde
    const ALREADY = 10000n

    it('sans acompte déjà demandé, aucune phrase', () => {
      open()

      expect(screen.queryByTestId('deposit-already')).not.toBeInTheDocument()
    })

    it('dit ce qui est déjà demandé et ce qu\'on peut encore demander', () => {
      open({ alreadyBilled: ALREADY })

      expect(plain(screen.getByTestId('deposit-already').textContent)).toBe(
        'Déjà demandé en acompte : 100,00 € HT. Vous pouvez encore demander 129,99 € HT au plus : il faut garder un solde à facturer.',
      )
    })

    it('un acompte qui ne laisse pas de solde est refusé avant l\'API, avec le maximum possible', async () => {
      const { onConfirm } = open({ alreadyBilled: ALREADY })

      await userEvent.click(screen.getByRole('button', { name: 'En montant hors taxe' }))
      await userEvent.type(screen.getByLabelText('Montant hors taxe (€)'), '130')

      expect(plain(screen.getByTestId('deposit-too-high').textContent)).toBe(
        'Cet acompte est trop élevé : 129,99 € HT au plus, pour garder un solde à facturer.',
      )
      expect(create()).toBeDisabled()
      await userEvent.type(screen.getByLabelText('Montant hors taxe (€)'), '{Enter}')
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('le plus haut acompte possible passe, au centime près', async () => {
      const { onConfirm } = open({ alreadyBilled: ALREADY })

      await userEvent.click(screen.getByRole('button', { name: 'En montant hors taxe' }))
      await userEvent.type(screen.getByLabelText('Montant hors taxe (€)'), '129,99')

      expect(screen.queryByTestId('deposit-too-high')).not.toBeInTheDocument()
      await userEvent.click(create())
      expect(onConfirm).toHaveBeenCalledWith({ amount: 129.99 })
    })

    it('en pourcentage aussi : 60 % de 230,00 dépassent ce qui reste, 50 % passent', async () => {
      open({ alreadyBilled: ALREADY })

      await userEvent.clear(screen.getByLabelText('Pourcentage (%)'))
      await userEvent.type(screen.getByLabelText('Pourcentage (%)'), '60')
      expect(screen.getByTestId('deposit-too-high')).toBeInTheDocument()
      expect(create()).toBeDisabled()

      await userEvent.clear(screen.getByLabelText('Pourcentage (%)'))
      await userEvent.type(screen.getByLabelText('Pourcentage (%)'), '50')
      expect(screen.queryByTestId('deposit-too-high')).not.toBeInTheDocument()
      expect(create()).toBeEnabled()
    })

    it('plus rien à demander : le dit, et aucun acompte n\'est possible', () => {
      open({ alreadyBilled: 22999n })

      expect(screen.getByTestId('deposit-already')).toHaveTextContent('Plus aucun acompte n\'est possible')
      expect(screen.getByTestId('deposit-too-high')).toHaveTextContent('Plus aucun acompte n\'est possible')
      expect(create()).toBeDisabled()
    })

    it('même sans acompte déjà demandé, un montant qui couvre tout le devis est refusé', async () => {
      open()

      await userEvent.click(screen.getByRole('button', { name: 'En montant hors taxe' }))
      await userEvent.type(screen.getByLabelText('Montant hors taxe (€)'), '230')

      expect(plain(screen.getByTestId('deposit-too-high').textContent)).toBe(
        'Cet acompte est trop élevé : 229,99 € HT au plus, pour garder un solde à facturer.',
      )
      expect(create()).toBeDisabled()
    })
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

describe('DepositDialog — les sept jours d\'un particulier (ADR-036)', () => {
  it('un jour d\'attente est dit, avec la date, et n\'empêche pas de créer l\'acompte', async () => {
    const { onConfirm } = open({ waitUntil: '2026-11-12' })

    const notice = screen.getByTestId('deposit-wait')
    expect(notice).toHaveTextContent(/avant le 12 nov\. 2026/)
    expect(notice).toHaveTextContent(/dépannage ou une réparation urgents/)
    expect(create()).toBeEnabled()
    await userEvent.click(create())
    expect(onConfirm).toHaveBeenCalledWith({ percent: 30 })
  })

  it.each([[undefined], [null]])('sans attente (%s), aucun avertissement', (waitUntil) => {
    open({ waitUntil })

    expect(screen.queryByTestId('deposit-wait')).not.toBeInTheDocument()
  })
})
