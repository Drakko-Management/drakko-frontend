import type { PublicQuote, Quote, QuoteAcceptance, QuoteLine } from '@/types/api'

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
    vatExempt: false,
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
    acceptance: null,
    project: null,
    invoice: null,
    deposits: [],
    ...over,
  }
}

export function acceptance(over: Partial<QuoteAcceptance> = {}): QuoteAcceptance {
  return {
    state: 'OPEN',
    sentTo: 'lea@martin.test',
    sentAt: '2026-11-03T11:00:00.000Z',
    expiresAt: '2026-12-03T11:00:00.000Z',
    respondedAt: null,
    signerName: null,
    comment: null,
    url: 'https://devapp.drakko.fr/quote/tok-123',
    ...over,
  }
}

export function publicQuote(over: Partial<PublicQuote> = {}): PublicQuote {
  return {
    state: 'OPEN',
    language: 'fr',
    organization: { name: 'Paysages Pierre', phone: '01 02 03 04 05', email: 'contact@paysages.test' },
    quote: {
      reference: 'DEV-2026-0001',
      title: 'Haie du fond',
      comment: null,
      validUntil: null,
      vatRate: '10',
      vatExempt: false,
      clientName: 'Léa Martin',
      lines: [
        {
          title: 'Taille de haie',
          description: 'Haie vive',
          unit: 'ml',
          quantity: '10',
          unitPrice: '12.5',
          total: '125.00',
        },
      ],
      subtotal: '125.00',
      vatAmount: '12.50',
      total: '137.50',
    },
    answer: null,
    ...over,
  }
}

/** Les espaces insécables (fines ou non) que `Intl` met dans les montants */
export const plain = (text: string | null) => (text ?? '').replace(new RegExp(`[${String.fromCharCode(0xa0)}${String.fromCharCode(0x202f)}]`, 'g'), ' ')
