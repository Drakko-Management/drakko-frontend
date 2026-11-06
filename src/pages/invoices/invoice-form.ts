import type { InvoiceInput } from '@/hooks/use-invoices'
import type { Invoice } from '@/types/api'
import { centsOf } from '@/modules/devis/totals'
import { decimal, formLinesFrom, toLineInputs, type QuoteFormValues } from '@/pages/quotes/quote-form'

// Le formulaire d'une facture est celui d'un devis (`QuoteFormValues`) ; la date y est l'échéance.

export function formFromInvoice(invoice: Invoice): QuoteFormValues {
  return {
    client: invoice.client,
    title: invoice.title ?? '',
    date: invoice.dueDate ? invoice.dueDate.slice(0, 10) : '',
    serviceDate: invoice.serviceDate ? invoice.serviceDate.slice(0, 10) : '',
    vatRate: String(parseFloat(invoice.vatRate)),
    comment: invoice.comment ?? '',
    // Les lignes qui déduisent un acompte ne s'éditent pas : l'API les garde, le formulaire les montre à part
    lines: formLinesFrom(invoice.lines.filter((line) => !line.depositInvoiceId)),
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
    serviceDate: values.serviceDate || null,
    lines: toLineInputs(values.lines),
  }
}

/** Les acomptes déduits d'une facture de solde : leur numéro et leur montant hors taxe (négatif), pour les totaux du formulaire. */
export function deductionsOf(invoice: Invoice): { reference: string; cents: bigint }[] {
  return invoice.lines
    .filter((line) => line.depositInvoiceId)
    .map((line) => ({ reference: line.snapshotTitle, cents: -centsOf(line.total) }))
}
