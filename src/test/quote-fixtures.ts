import type { Quote, QuoteLine } from '@/types/api'

export function quoteLine(over: Partial<QuoteLine> = {}): QuoteLine {
  return {
    id: 'l1',
    quoteId: 'q1',
    serviceId: null,
    snapshotTitle: 'Taille de haie',
    snapshotDescription: 'Haie vive',
    snapshotUnit: 'ml',
    quantity: '10',
    unitPrice: '12.5',
    order: 0,
    total: '125.00',
    ...over,
  }
}

export function quote(over: Partial<Quote> = {}): Quote {
  return {
    id: 'q1',
    organizationId: 'org-1',
    clientId: 'c1',
    reference: 'DEV-2026-0001',
    status: 'DRAFT',
    title: 'Haie du fond',
    comment: null,
    vatRate: '10',
    validUntil: null,
    sentAt: null,
    decidedAt: null,
    createdAt: '2026-11-03T10:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    client: { id: 'c1', firstName: 'Léa', lastName: 'Martin', email: 'lea@martin.test', phone: null, address: '1 rue des Lilas' },
    lines: [quoteLine()],
    subtotal: '125.00',
    vatAmount: '12.50',
    total: '137.50',
    ...over,
  }
}

/** Les espaces insécables (fines ou non) que `Intl` met dans les montants */
export const plain = (text: string | null) => (text ?? '').replace(new RegExp(`[${String.fromCharCode(0xa0)}${String.fromCharCode(0x202f)}]`, 'g'), ' ')
