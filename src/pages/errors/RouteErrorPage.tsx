import { useEffect } from 'react'
import { useRouteError } from 'react-router'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RouteErrorPageProps {
  // Vrai : l'erreur est hors de la coque de l'application (connexion, signature, coque elle-même), la page prend tout l'écran
  screen?: boolean
}

// Erreur d'affichage qu'aucun écran n'a gérée : à la place de l'écran d'erreur par défaut du routeur (en anglais,
// « Hey developer », avec le texte technique). Le détail reste dans la console, jamais à l'écran.
export function RouteErrorPage({ screen = false }: RouteErrorPageProps) {
  const { t } = useTranslation()
  const error = useRouteError()

  useEffect(() => {
    console.error('Route error:', error)
  }, [error])

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center',
        screen ? 'min-h-dvh bg-background text-foreground' : 'flex-1 overflow-y-auto',
      )}
    >
      <TriangleAlert className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-semibold">{t('route_error.title')}</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">{t('route_error.message')}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button className="min-h-[44px]" onClick={() => window.location.reload()}>
          {t('route_error.reload')}
        </Button>
        {/* Lien ordinaire (et non <Link>) : recharge l'application, ce qu'une navigation interne ne ferait pas si l'erreur vient de la coque */}
        <Button asChild variant="outline" className="min-h-[44px]">
          <a href="/">{t('route_error.home')}</a>
        </Button>
      </div>
    </div>
  )
}
