import type { InvoiceInput } from '@/hooks/use-invoices'
import type { Invoice } from '@/types/api'
import { decimal, formLinesFrom, toLineInputs, type QuoteFormValues } from '@/pages/quotes/quote-form'

// Le formulaire d'une facture est celui d'un devis (`QuoteFormValues`) ; la date y est l'échéance.

export function formFromInvoice(invoice: Invoice): QuoteFormValues {
  return {
    client: invoice.client,
    title: invoice.title ?? '',
    date: invoice.dueDate ? invoice.dueDate.slice(0, 10) : '',
    vatRate: String(parseFloat(invoice.vatRate)),
    comment: invoice.comment ?? '',
    lines: formLinesFrom(invoice.lines),
  }
}

/** Le corps envoyé à l'API. Appelé seulement quand le formulaire est valide. */
export function toInvoiceInput(values: QuoteFormValues): InvoiceInput {
  return {
    clientId: values.client!.id,
    title: values.title.trim() || null,
    comment: values.comment.trim() || null,
    // Sous franchise de TVA le formulaire ne propose pas de taux : l'API met 0
    ...(values.vatRate.trim() !== '' ? { vatRate: decimal(values.vatRate) } : {}),
    dueDate: values.date || null,
    lines: toLineInputs(values.lines),
  }
}
