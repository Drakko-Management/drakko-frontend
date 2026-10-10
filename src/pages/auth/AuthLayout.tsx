import type { ReactNode } from 'react'

// Page publique centrée avec le logo, comme l'écran de connexion
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <img src="/drakko/logo_light.png" alt="Drakko" className="h-40 w-auto dark:hidden" />
          <img src="/drakko/logo_dark.png" alt="Drakko" className="hidden h-40 w-auto dark:block" />
        </div>
        {children}
      </div>
    </div>
  )
}
