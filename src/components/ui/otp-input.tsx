import * as React from "react"

import { cn } from "@/lib/utils"

interface OtpInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  /** Nombre de chiffres du code */
  length?: number
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
  required?: boolean
  className?: string
}

// Code à chiffres en cases séparées (3 + 3 pour 6 chiffres). Un seul vrai champ, transparent, couvre les cases :
// le collage, le remplissage automatique du code reçu (`one-time-code`), la suppression et le clavier numérique
// du mobile fonctionnent comme dans un champ ordinaire, et un lecteur d'écran ne voit qu'un champ. Pas de
// `maxLength` : une frappe de trop doit quand même appeler `onChange` (pour effacer l'alerte d'un code refusé).
export function OtpInput({
  id,
  value,
  onChange,
  length = 6,
  disabled,
  invalid,
  autoFocus,
  required,
  className,
}: OtpInputProps) {
  const [focused, setFocused] = React.useState(false)
  const ref = React.useRef<HTMLInputElement>(null)
  const active = Math.min(value.length, length - 1)
  const half = Math.ceil(length / 2)

  // Le curseur reste à la fin : on ne corrige pas un chiffre au milieu, on efface puis on retape
  function caretToEnd() {
    const el = ref.current
    if (el) el.setSelectionRange(el.value.length, el.value.length)
  }

  const cells: React.ReactNode[] = []
  for (let i = 0; i < length; i++) {
    if (i === half) {
      cells.push(
        <span key="sep" aria-hidden className="text-lg text-muted-foreground">
          -
        </span>,
      )
    }
    const isActive = focused && !disabled && i === active
    cells.push(
      <div
        key={i}
        aria-hidden
        className={cn(
          "flex h-12 w-10 items-center justify-center rounded-md border bg-background text-xl font-semibold sm:w-11",
          invalid ? "border-destructive" : "border-input",
          isActive && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          disabled && "opacity-50",
        )}
      >
        {value[i] ?? ""}
      </div>,
    )
  }

  return (
    <div className={cn("relative mx-auto flex w-fit items-center gap-1.5", className)}>
      {cells}
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        required={required}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        onFocus={() => {
          setFocused(true)
          caretToEnd()
        }}
        onBlur={() => setFocused(false)}
        onSelect={caretToEnd}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  )
}
