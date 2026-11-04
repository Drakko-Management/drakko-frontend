import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'

describe('InvoiceStatusBadge', () => {
  it('une facture ordinaire n\'a que son état', () => {
    render(<InvoiceStatusBadge invoice={{ kind: 'INVOICE', status: 'ISSUED', overdue: false }} />)

    expect(screen.getByText('Émise')).toBeInTheDocument()
    expect(screen.queryByTestId('deposit-chip')).not.toBeInTheDocument()
  })

  it('une facture d\'acompte porte la pastille « Acompte » avec son état', () => {
    render(<InvoiceStatusBadge invoice={{ kind: 'INVOICE', status: 'PAID', overdue: false, deposit: true }} />)

    expect(screen.getByTestId('deposit-chip')).toHaveTextContent('Acompte')
    expect(screen.getByText('Payée')).toBeInTheDocument()
  })

  it('l\'acompte en retard reste « En retard »', () => {
    render(<InvoiceStatusBadge invoice={{ kind: 'INVOICE', status: 'ISSUED', overdue: true, deposit: true }} />)

    expect(screen.getByText('En retard')).toBeInTheDocument()
    expect(screen.getByTestId('deposit-chip')).toBeInTheDocument()
  })

  it('la classe demandée s\'applique à l\'ensemble', () => {
    const { container } = render(
      <InvoiceStatusBadge invoice={{ kind: 'INVOICE', status: 'DRAFT', overdue: false, deposit: true }} className="ml-auto" />,
    )

    expect(container.firstElementChild).toHaveClass('ml-auto')
  })
})
