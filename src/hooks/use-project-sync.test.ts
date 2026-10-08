import { afterEach, describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { hasPendingProject, refreshPendingProjects } from './use-project-sync'

const list = (...statuses: string[]) => ({
  data: statuses.map((status) => ({ status })),
  total: statuses.length,
  page: 1,
  limit: 20,
})

// ── hasPendingProject ──────────────────────────────────────────────────────

describe('hasPendingProject', () => {
  it.each(['AWAITING_SIGNATURE', 'AWAITING_RESERVE_LIFT'])('fiche en %s : vrai', (status) => {
    expect(hasPendingProject({ status })).toBe(true)
  })

  it.each(['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'])(
    'fiche en %s : faux',
    (status) => {
      expect(hasPendingProject({ status })).toBe(false)
    },
  )

  it('liste contenant un chantier en attente : vrai', () => {
    expect(hasPendingProject(list('COMPLETED', 'AWAITING_SIGNATURE'))).toBe(true)
  })

  it('liste sans chantier en attente, ou vide : faux', () => {
    expect(hasPendingProject(list('COMPLETED', 'IN_PROGRESS'))).toBe(false)
    expect(hasPendingProject(list())).toBe(false)
  })

  it.each([null, undefined, 'texte', 42, {}, { data: 'non' }, { data: [null] }])(
    'donnée inattendue %j : faux',
    (data) => {
      expect(hasPendingProject(data)).toBe(false)
    },
  )
})

// ── refreshPendingProjects ─────────────────────────────────────────────────

describe('refreshPendingProjects', () => {
  const clients: QueryClient[] = []
  const unsubscribers: Array<() => void> = []

  afterEach(() => {
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe())
    clients.splice(0).forEach((client) => client.clear())
  })

  function newClient() {
    const client = new QueryClient()
    clients.push(client)
    return client
  }

  async function watch(client: QueryClient, queryKey: unknown[], data: unknown) {
    const queryFn = vi.fn().mockResolvedValue(data)
    const observer = new QueryObserver(client, { queryKey, queryFn })
    unsubscribers.push(observer.subscribe(() => {}))
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1))
    return queryFn
  }

  it("recharge toutes les requêtes chantiers affichées tant qu'une attend une signature", async () => {
    const client = newClient()
    const detail = await watch(client, ['projects', 'p1'], { status: 'AWAITING_SIGNATURE' })
    const counter = await watch(client, ['projects', { status: 'COMPLETED', limit: 1 }], list('COMPLETED'))

    await refreshPendingProjects(client)

    expect(detail).toHaveBeenCalledTimes(2)
    expect(counter).toHaveBeenCalledTimes(2)
  })

  it("ne fait rien quand aucun chantier affiché n'attend de signature", async () => {
    const client = newClient()
    const detail = await watch(client, ['projects', 'p1'], { status: 'COMPLETED' })

    await refreshPendingProjects(client)

    expect(detail).toHaveBeenCalledTimes(1)
  })

  it('ignore les requêtes inactives et celles qui ne concernent pas les chantiers', async () => {
    const client = newClient()
    client.setQueryData(['projects', 'ancien'], { status: 'AWAITING_SIGNATURE' })
    const completed = await watch(client, ['projects', 'p2'], { status: 'COMPLETED' })
    const clientsQuery = await watch(client, ['clients'], { status: 'AWAITING_SIGNATURE' })

    await refreshPendingProjects(client)

    expect(completed).toHaveBeenCalledTimes(1)
    expect(clientsQuery).toHaveBeenCalledTimes(1)
  })
})
