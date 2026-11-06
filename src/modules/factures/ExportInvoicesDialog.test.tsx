import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportInvoicesDialog } from './ExportInvoicesDialog'
import { todayInput } from './format'

// La période du fichier du comptable : l'année en cours par défaut, deux raccourcis, jamais une période à l'envers.

const onConfirm = vi.fn()
const onOpenChange = vi.fn()

function show(props: { open?: boolean; pending?: boolean } = {}) {
  return render(<ExportInvoicesDialog open={props.open ?? true} onOpenChange={onOpenChange} pending={props.pending} onConfirm={onConfirm} />)
}

const from = () => screen.getByLabelText('Du')
const to = () => screen.getByLabelText('Au')
const confirm = () => screen.getByRole('button', { name: 'Télécharger' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ExportInvoicesDialog', () => {
  it('explique ce que contient le fichier', () => {
    show()

    expect(screen.getByRole('heading', { name: 'Exporter pour le comptable' })).toBeInTheDocument()
    expect(screen.getByText(/factures, les acomptes et les avoirs émis sur la période/)).toBeInTheDocument()
    expect(screen.getByText(/Les brouillons n'y sont pas/)).toBeInTheDocument()
  })

  it('s\'ouvre sur l\'année en cours : du 1er janvier à aujourd\'hui', () => {
    show()

    const today = todayInput()
    expect(from()).toHaveValue(`${today.slice(0, 4)}-01-01`)
    expect(to()).toHaveValue(today)
  })

  it('« Télécharger » envoie la période choisie', async () => {
    show()
    fireEvent.change(from(), { target: { value: '2026-03-01' } })
    fireEvent.change(to(), { target: { value: '2026-03-31' } })

    await userEvent.click(confirm())

    expect(onConfirm).toHaveBeenCalledWith({ from: '2026-03-01', to: '2026-03-31' })
  })

  it('« L\'année dernière » donne du 1er janvier au 31 décembre de l\'année précédente', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'L\'année dernière' }))

    const last = Number(todayInput().slice(0, 4)) - 1
    expect(from()).toHaveValue(`${last}-01-01`)
    expect(to()).toHaveValue(`${last}-12-31`)
  })

  it('« Cette année » revient du 1er janvier à aujourd\'hui, pas à la fin de l\'année', async () => {
    show()
    await userEvent.click(screen.getByRole('button', { name: 'L\'année dernière' }))

    await userEvent.click(screen.getByRole('button', { name: 'Cette année' }))

    const today = todayInput()
    expect(from()).toHaveValue(`${today.slice(0, 4)}-01-01`)
    expect(to()).toHaveValue(today)
  })

  it('une période à l\'envers ne se télécharge pas', () => {
    show()
    fireEvent.change(from(), { target: { value: '2026-12-31' } })
    fireEvent.change(to(), { target: { value: '2026-01-01' } })

    expect(confirm()).toBeDisabled()
  })

  it('un champ vidé ne se télécharge pas non plus', () => {
    show()
    fireEvent.change(to(), { target: { value: '' } })

    expect(confirm()).toBeDisabled()
  })

  it('chaque champ de la paire garde un min et un max (sinon l\'icône du calendrier glisse sous Chrome)', () => {
    show()
    fireEvent.change(from(), { target: { value: '2026-03-01' } })
    fireEvent.change(to(), { target: { value: '2026-03-31' } })

    expect(from()).toHaveAttribute('min')
    expect(from()).toHaveAttribute('max', '2026-03-31')
    expect(to()).toHaveAttribute('min', '2026-03-01')
    expect(to()).toHaveAttribute('max')
  })

  it('pendant la préparation du fichier, rien ne se relance et la fenêtre ne se ferme pas', async () => {
    show({ pending: true })

    expect(confirm()).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('« Annuler » ferme la fenêtre', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('chaque ouverture repart de l\'année en cours', () => {
    const { rerender } = show()
    fireEvent.change(from(), { target: { value: '2025-06-01' } })
    rerender(<ExportInvoicesDialog open={false} onOpenChange={onOpenChange} onConfirm={onConfirm} />)

    rerender(<ExportInvoicesDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />)

    expect(from()).toHaveValue(`${todayInput().slice(0, 4)}-01-01`)
  })
})
