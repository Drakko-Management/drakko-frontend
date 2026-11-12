import type { Invoice, InvoiceLine } from '@/types/api'

export function invoiceLine(over: Partial<InvoiceLine> = {}): InvoiceLine {
  return {
    id: 'il1',
    invoiceId: 'i1',
    serviceId: null,
    snapshotTitle: 'Taille de haie',
    snapshotDescription: 'Haie vive',
    snapshotUnit: 'ml',
    quantity: '10',
    unitPrice: '12.5',
    discountRate: '0',
    order: 0,
    depositInvoiceId: null,
    total: '125.00',
    ...over,
  }
}

/** Un brouillon de facture : sans numéro, sans date. */
export function invoice(over: Partial<Invoice> = {}): Invoice {
  return {
    id: 'i1',
    organizationId: 'org-1',
    clientId: 'c1',
    kind: 'INVOICE',
    status: 'DRAFT',
    reference: null,
    title: 'Haie du fond',
    comment: null,
    vatRate: '10',
    vatExempt: false,
    issueDate: null,
    dueDate: null,
    serviceDate: null,
    paidAt: null,
    paymentMethod: null,
    quoteId: null,
    creditedInvoiceId: null,
    deposit: false,
    deductedBy: null,
    emailedAt: null,
    emailedTo: null,
    createdAt: '2026-11-04T10:00:00.000Z',
    updatedAt: '2026-11-04T10:00:00.000Z',
    client: { id: 'c1', firstName: 'Léa', lastName: 'Martin', email: 'lea@martin.test', phone: null, address: '1 rue des Lilas', kind: 'INDIVIDUAL', companyName: null },
    lines: [invoiceLine()],
    subtotal: '125.00',
    vatAmount: '12.50',
    total: '137.50',
    overdue: false,
    quote: null,
    creditedInvoice: null,
    creditNote: null,
    ...over,
  }
}

/** Une facture émise : numérotée, datée, avec son échéance. */
export function issuedInvoice(over: Partial<Invoice> = {}): Invoice {
  return invoice({
    status: 'ISSUED',
    reference: 'FAC-2026-0001',
    issueDate: '2026-11-04T00:00:00.000Z',
    dueDate: '2026-12-04T00:00:00.000Z',
    ...over,
  })
}

/** L'avoir qui annule `FAC-2026-0001` : mêmes lignes, quantités négatives. */
export function creditNote(over: Partial<Invoice> = {}): Invoice {
  return invoice({
    id: 'cn1',
    kind: 'CREDIT_NOTE',
    status: 'ISSUED',
    reference: 'AV-2026-0001',
    issueDate: '2026-11-05T00:00:00.000Z',
    lines: [invoiceLine({ id: 'cl1', invoiceId: 'cn1', quantity: '-10', total: '-125.00' })],
    subtotal: '-125.00',
    vatAmount: '-12.50',
    total: '-137.50',
    creditedInvoice: { id: 'i1', reference: 'FAC-2026-0001' },
    ...over,
  })
}
