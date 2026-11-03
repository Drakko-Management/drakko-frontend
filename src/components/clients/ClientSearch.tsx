import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Search, X, Check, UserPlus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useClients } from '@/hooks/use-clients'
import { fullName, cn } from '@/lib/utils'
import type { Client } from '@/types/api'

/**
 * Recherche d'un client par nom (liste déroulante). Partagée par la création d'un chantier et celle d'un devis :
 * les textes viennent de `create_project.*`.
 */
export function ClientSearch({
  value,
  onChange,
  onCreate,
  invalid,
}: {
  value: Client | null
  onChange: (client: Client | null) => void
  /** Ouvre la création d'un client ; reçoit le texte tapé */
  onCreate: (name: string) => void
  invalid: boolean
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const { data, isFetching } = useClients({
    search: debouncedSearch || undefined,
    active: true,
    limit: 8,
  })

  function select(client: Client) {
    onChange(client)
    setSearch('')
    setOpen(false)
  }

  function clear() {
    onChange(null)
    setSearch('')
  }

  if (value) {
    return (
      <div className="flex min-h-[44px] items-center gap-3 rounded-md border border-input bg-background px-3">
        <Check className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 text-sm font-medium">{fullName(value)}</span>
        <button type="button" onClick={clear} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="client-search"
          className={cn('min-h-[44px] pl-9 pr-9', invalid && 'border-destructive focus-visible:ring-destructive')}
          aria-invalid={invalid}
          aria-describedby={invalid ? 'client-error' : undefined}
          placeholder={t('create_project.search_client')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          // en erreur, le focus vient de la validation : la liste masquerait le message juste dessous,
          // elle s'ouvre au toucher (onClick) ou dès qu'on tape
          onFocus={() => { if (!invalid) setOpen(true) }}
          onClick={() => setOpen(true)}
          autoComplete="off"
        />
        {search && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { setSearch(''); setDebouncedSearch('') }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          {isFetching && (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('common.searching')}
            </li>
          )}
          {!isFetching && data?.data.length === 0 && (
            <>
              <li className="px-3 py-2.5 text-sm text-muted-foreground">{t('create_project.no_client')}</li>
              {debouncedSearch === search && (
                <li className="border-t">
                  <button
                    type="button"
                    className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-muted active:bg-muted"
                    onClick={() => { setOpen(false); onCreate(search.trim()) }}
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">
                      {search.trim() ? t('create_project.create_client', { name: search.trim() }) : t('create_client.title')}
                    </span>
                  </button>
                </li>
              )}
            </>
          )}
          {data?.data.map((client) => (
            <li key={client.id} className="border-b last:border-0">
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted active:bg-muted"
                onMouseDown={(e) => { e.preventDefault(); select(client) }}
              >
                <span className="font-medium">{fullName(client)}</span>
                {client.email && (
                  <span className="ml-2 text-xs text-muted-foreground">{client.email}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
