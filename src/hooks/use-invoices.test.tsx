import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { apiBlob, apiRequest } from '@/lib/api-client'
import { downloadFile } from '@/lib/download-file'
import { queryClient } from '@/lib/query-client'
import {
  downloadInvoicesExport,
  openInvoicePdf,
  useCreateInvoice,
  useCreditNote,
  useDeleteInvoice,
  useEmailInvoice,
  useInvoices,
  useInvoicesSummary,
  useIssueInvoice,
  usePayInvoice,
  useUnpayInvoice,
  useUpdateInvoice,
} from './use-invoices'

// La facture (ADR-033) : les adresses appelées, et ce qui se rafraîchit (une facture touche aussi son devis).

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>()
  return { ...actual, apiRequest: vi.fn(), apiBlob: vi.fn() }
})

vi.mock('@/lib/download-file', () => ({ downloadFile: vi.fn().mockResolvedValue(undefined) }))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
  queryClient.clear()
  vi.mocked(apiRequest).mockResolvedValue([])
})

const lastCall = () => {
  const calls = vi.mocked(apiRequest).mock.calls
  const [path, init] = calls[calls.length - 1] as [string, RequestInit | undefined]
  return { path, method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined }
}

describe('useInvoices', () => {
  it('sans filtre, la liste entière', async () => {
    renderHook(() => useInvoices(), { wrapper })

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1))
    expect(lastCall().path).toBe('/invoices')
  })

  it('envoie chaque filtre, et le retard sous la forme « overdue=true »', async () => {
    renderHook(() => useInvoices({ status: 'ISSUED', kind: 'INVOICE', overdue: true, clientId: 'c1', q: 'haie' }), { wrapper })

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1))
    const url = new URL(lastCall().path, 'http://api.test')
    expect(url.pathname).toBe('/invoices')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      status: 'ISSUED',
      kind: 'INVOICE',
      overdue: 'true',
      clientId: 'c1',
      q: 'haie',
    })
  })

  it('envoie le nombre demandé sous « limit »', async () => {
    renderHook(() => useInvoices({ limit: 100 }), { wrapper })

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1))
    expect(lastCall().path).toBe('/invoices?limit=100')
  })

  it('ne demande rien quand il est désactivé', () => {
    renderHook(() => useInvoices({}, false), { wrapper })

    expect(apiRequest).not.toHaveBeenCalled()
  })
})

describe('useInvoicesSummary', () => {
  it('lit les comptes du tableau de bord à /invoices/summary', async () => {
    const summary = { drafts: 1, overdue: 2, toCollect: 3, toCollectTotal: '10.00', recent: [] }
    vi.mocked(apiRequest).mockResolvedValue(summary)

    const { result } = renderHook(() => useInvoicesSummary(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(summary))
    expect(lastCall().path).toBe('/invoices/summary')
  })

  it('se relit quand une facture change (la clé commence par « invoices »)', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ drafts: 0, overdue: 0, toCollect: 0, toCollectTotal: '0.00', recent: [] })
    const { result } = renderHook(() => useInvoicesSummary(), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    const issue = renderHook(() => useIssueInvoice(), { wrapper })
    vi.mocked(apiRequest).mockClear()

    await issue.result.current.mutateAsync('i1')

    await waitFor(() => expect(vi.mocked(apiRequest).mock.calls.some(([path]) => path === '/invoices/summary')).toBe(true))
  })
})

describe('les gestes sur une facture', () => {
  it('créer à partir d\'un devis ne envoie que le devis', async () => {
    const { result } = renderHook(() => useCreateInvoice(), { wrapper })

    await result.current.mutateAsync({ quoteId: 'q1' })

    expect(lastCall()).toEqual({ path: '/invoices', method: 'POST', body: { quoteId: 'q1' } })
  })

  it('créer l\'acompte d\'un devis envoie le devis et la part demandée', async () => {
    const { result } = renderHook(() => useCreateInvoice(), { wrapper })

    await result.current.mutateAsync({ quoteId: 'q1', deposit: { percent: 30 } })
    expect(lastCall()).toEqual({ path: '/invoices', method: 'POST', body: { quoteId: 'q1', deposit: { percent: 30 } } })

    await result.current.mutateAsync({ quoteId: 'q1', deposit: { amount: 250 } })
    expect(lastCall()).toEqual({ path: '/invoices', method: 'POST', body: { quoteId: 'q1', deposit: { amount: 250 } } })
  })

  it('modifier, émettre, envoyer, payer, défaire, annuler par un avoir, supprimer : la bonne adresse et le bon verbe', async () => {
    const update = renderHook(() => useUpdateInvoice(), { wrapper })
    await update.result.current.mutateAsync({ id: 'i1', title: 'x', dueDate: null })
    expect(lastCall()).toEqual({ path: '/invoices/i1', method: 'PATCH', body: { title: 'x', dueDate: null } })

    const issue = renderHook(() => useIssueInvoice(), { wrapper })
    await issue.result.current.mutateAsync('i1')
    expect(lastCall()).toMatchObject({ path: '/invoices/i1/issue', method: 'POST' })

    const pay = renderHook(() => usePayInvoice(), { wrapper })
    await pay.result.current.mutateAsync({ id: 'i1', paidAt: '2026-11-04', method: 'CHECK' })
    expect(lastCall()).toEqual({ path: '/invoices/i1/pay', method: 'POST', body: { paidAt: '2026-11-04', method: 'CHECK' } })

    const unpay = renderHook(() => useUnpayInvoice(), { wrapper })
    await unpay.result.current.mutateAsync('i1')
    expect(lastCall()).toMatchObject({ path: '/invoices/i1/unpay', method: 'POST' })

    const email = renderHook(() => useEmailInvoice(), { wrapper })
    await email.result.current.mutateAsync('i1')
    expect(lastCall()).toEqual({ path: '/invoices/i1/email', method: 'POST', body: undefined })

    const credit = renderHook(() => useCreditNote(), { wrapper })
    await credit.result.current.mutateAsync('i1')
    expect(lastCall()).toMatchObject({ path: '/invoices/i1/credit-note', method: 'POST' })

    const remove = renderHook(() => useDeleteInvoice(), { wrapper })
    await remove.result.current.mutateAsync('i1')
    expect(lastCall()).toMatchObject({ path: '/invoices/i1', method: 'DELETE' })
  })

  it.each([
    ['créer', () => useCreateInvoice(), (r: ReturnType<typeof useCreateInvoice>) => r.mutateAsync({ quoteId: 'q1' })],
    ['émettre', () => useIssueInvoice(), (r: ReturnType<typeof useIssueInvoice>) => r.mutateAsync('i1')],
    ['envoyer par email', () => useEmailInvoice(), (r: ReturnType<typeof useEmailInvoice>) => r.mutateAsync('i1')],
    ['payer', () => usePayInvoice(), (r: ReturnType<typeof usePayInvoice>) => r.mutateAsync({ id: 'i1' })],
    ['défaire un paiement', () => useUnpayInvoice(), (r: ReturnType<typeof useUnpayInvoice>) => r.mutateAsync('i1')],
    ['annuler par un avoir', () => useCreditNote(), (r: ReturnType<typeof useCreditNote>) => r.mutateAsync('i1')],
    ['supprimer', () => useDeleteInvoice(), (r: ReturnType<typeof useDeleteInvoice>) => r.mutateAsync('i1')],
  ])('%s relit les factures et les devis (le lien « facturé » d\'un devis change)', async (_name, hook, run) => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(hook as () => never, { wrapper })

    await run(result.current as never)

    expect(spy).toHaveBeenCalledWith({ queryKey: ['invoices'] })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['quotes'] })
  })
})

describe('openInvoicePdf', () => {
  it('ouvre le PDF de la facture dans un nouvel onglet, ouvert avant la requête', async () => {
    const tab = { location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as never)
    vi.mocked(apiBlob).mockResolvedValue(new Blob(['%PDF-'], { type: 'application/pdf' }))
    URL.createObjectURL = vi.fn().mockReturnValue('blob:pdf')

    await openInvoicePdf('i1')

    expect(open).toHaveBeenCalledWith('', '_blank')
    expect(apiBlob).toHaveBeenCalledWith('/invoices/i1/pdf')
    expect(tab.location.href).toBe('blob:pdf')
    open.mockRestore()
  })

  it('un échec referme l\'onglet ouvert pour rien', async () => {
    const tab = { location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as never)
    vi.mocked(apiBlob).mockRejectedValue(new Error('x'))

    await expect(openInvoicePdf('i1')).rejects.toThrow('x')

    expect(tab.close).toHaveBeenCalled()
    open.mockRestore()
  })
})

describe('downloadInvoicesExport', () => {
  it('demande le journal de la période à l\'API et nomme le fichier d\'après elle', async () => {
    await downloadInvoicesExport('2026-01-01', '2026-03-31')

    expect(downloadFile).toHaveBeenCalledWith(
      '/invoices/export?from=2026-01-01&to=2026-03-31',
      'factures-2026-01-01_2026-03-31.csv',
    )
  })
})
