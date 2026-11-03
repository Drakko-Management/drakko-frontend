import { toCents, toMilli } from '@/modules/devis/totals'
import type { Client, Quote, Service } from '@/types/api'
import type { QuoteInput, QuoteLineInput } from '@/hooks/use-quotes'

/** Une ligne en cours de saisie : tout est du texte, converti à l'envoi. */
export interface FormLine {
  /** Clé de liste React, jamais envoyée */
  key: string
  /** La prestation d'origine : la ligne la recopie, ce qui est saisi ici la remplace */
  serviceId?: string
  title: string
  description: string
  unit: string
  quantity: string
  unitPrice: string
}

export interface QuoteFormValues {
  client: Pick<Client, 'id' | 'firstName' | 'lastName' | 'email'> | null
  title: string
  validUntil: string
  /** Vide : le taux par défaut de l'organisation */
  vatRate: string
  comment: string
  lines: FormLine[]
}

export const EMPTY_QUOTE_FORM: QuoteFormValues = {
  client: null,
  title: '',
  validUntil: '',
  vatRate: '',
  comment: '',
  lines: [],
}

let lineCounter = 0
export const newKey = () => `line-${++lineCounter}`

export const FREE_LINE: Omit<FormLine, 'key'> = { title: '', description: '', unit: '', quantity: '1', unitPrice: '' }

export function lineFromService(service: Service): FormLine {
  return {
    key: newKey(),
    serviceId: service.id,
    title: service.title,
    description: service.description ?? '',
    unit: service.unit ?? '',
    quantity: '1',
    // Le prix par défaut de la prestation, s'il en a un
    unitPrice: service.defaultPrice === null || service.defaultPrice === undefined ? '' : String(service.defaultPrice),
  }
}

export function formFromQuote(quote: Quote): QuoteFormValues {
  return {
    client: quote.client,
    title: quote.title ?? '',
    validUntil: quote.validUntil ? quote.validUntil.slice(0, 10) : '',
    vatRate: String(parseFloat(quote.vatRate)),
    comment: quote.comment ?? '',
    lines: quote.lines.map((line) => ({
      key: newKey(),
      serviceId: line.serviceId ?? undefined,
      title: line.snapshotTitle,
      description: line.snapshotDescription ?? '',
      unit: line.snapshotUnit ?? '',
      quantity: String(parseFloat(line.quantity)),
      unitPrice: String(parseFloat(line.unitPrice)),
    })),
  }
}

/** Une ligne est envoyable quand elle a un titre, une quantité positive et un prix. */
export function isLineValid(line: FormLine): boolean {
  const quantity = toMilli(line.quantity)
  return line.title.trim() !== '' && quantity !== null && quantity > 0n && toCents(line.unitPrice) !== null
}

export const decimal = (value: string) => parseFloat(value.trim().replace(',', '.'))

/** Le corps envoyé à l'API. Appelé seulement quand le formulaire est valide. */
export function toQuoteInput(values: QuoteFormValues): QuoteInput {
  const lines: QuoteLineInput[] = values.lines.map((line) => ({
    ...(line.serviceId ? { serviceId: line.serviceId } : {}),
    title: line.title.trim(),
    description: line.description.trim() || undefined,
    unit: line.unit.trim() || undefined,
    quantity: decimal(line.quantity),
    unitPrice: decimal(line.unitPrice),
  }))
  return {
    clientId: values.client!.id,
    title: values.title.trim() || null,
    comment: values.comment.trim() || null,
    ...(values.vatRate.trim() !== '' ? { vatRate: decimal(values.vatRate) } : {}),
    validUntil: values.validUntil || null,
    lines,
  }
}
