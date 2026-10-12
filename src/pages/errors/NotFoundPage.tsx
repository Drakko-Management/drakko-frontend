import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Adresse qui ne correspond à aucun écran (lien périmé, faute de frappe) : à la place de l'écran d'erreur par
// défaut du routeur, en anglais et destiné aux développeurs
export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Compass className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <p className="mt-4 font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-1 text-xl font-semibold">{t('not_found.title')}</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">{t('not_found.message')}</p>
      <Button asChild className="mt-6 min-h-[44px]">
        <Link to="/">{t('not_found.home')}</Link>
      </Button>
    </div>
  )
}
