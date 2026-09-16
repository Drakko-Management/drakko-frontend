import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

interface Suggestion {
  label: string
  street: string
  postalCode: string
  city: string
}

interface BanFeature {
  properties: {
    label: string
    name: string
    postcode: string
    city: string
  }
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (s: Suggestion) => void
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder, className, required, disabled }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const keyPressedRef = useRef(false)

  useEffect(() => {
    // Ne recherche que si le champ est focus et la query vient du clavier
    if (!isFocused || searchQuery.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=5&autocomplete=1`,
          )
          const data = (await res.json()) as { features: BanFeature[] }
          const results = data.features.map((f) => ({
            label: f.properties.label,
            street: f.properties.name,
            postalCode: f.properties.postcode,
            city: f.properties.city,
          }))
          setSuggestions(results)
          setOpen(isFocused && results.length > 0)
        } catch {
          // ignore autocomplete errors silently
        }
      })()
    }, 300)
  }, [searchQuery, isFocused])

  // Reset searchQuery si la valeur est effacée de l'extérieur
  useEffect(() => {
    if (!value) setSearchQuery('')
  }, [value])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          // Délai pour laisser le clic sur une suggestion s'exécuter
          setTimeout(() => { setIsFocused(false); setOpen(false) }, 150)
        }}
        onKeyDown={() => { keyPressedRef.current = true }}
        onChange={(e) => {
          onChange(e.target.value)
          // Ne met à jour la recherche que si la frappe vient du clavier
          if (keyPressedRef.current) {
            setSearchQuery(e.target.value)
            keyPressedRef.current = false
          }
        }}
        placeholder={placeholder}
        className={className}
        required={required}
        disabled={disabled}
        autoComplete="address-line1"
      />
      {open && isFocused && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          {suggestions.map((s, i) => (
            <li key={i} className="border-b last:border-0">
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted active:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelect(s)
                  setSearchQuery('')
                  setOpen(false)
                  setIsFocused(false)
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
