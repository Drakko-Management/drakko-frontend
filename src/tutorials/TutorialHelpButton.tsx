import { useState } from 'react'
import { CheckCircle2, GraduationCap, HelpCircle, PlayCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { TUTORIALS, isTutorialAvailable } from './definitions'
import type { TutorialScope } from './definitions'
import { useTutorial } from './TutorialProvider'

interface Props {
  scope: TutorialScope
  className?: string
}

/** Bouton « ? » d'une page : ouvre la liste des tutoriels liés à cette page. */
export function TutorialHelpButton({ scope, className }: Props) {
  const { can, isAdmin } = usePermissions()
  const { t, start, completed } = useTutorial()
  const [open, setOpen] = useState(false)

  const available = TUTORIALS.filter(
    (tuto) => tuto.scope === scope && isTutorialAvailable(tuto, can, isAdmin),
  )
  if (available.length === 0) return null

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className={className ?? 'h-11 w-11'}
        aria-label={t('tutorials.help_btn')}
        onClick={() => { setOpen(true) }}
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-[max(1rem,env(safe-area-inset-top))]"
          role="dialog"
          aria-modal="true"
          aria-label={t('tutorials.help_title')}
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => { setOpen(false) }} />
          {/* Centrée ; le titre reste visible et seule la liste défile quand elle dépasse l'écran.
              z-[60] : au-dessus de la barre du bas (z-50, placée après dans le DOM), comme AppDrawer */}
          <div className="relative flex max-h-full w-full max-w-sm flex-col rounded-2xl bg-card shadow-xl">
            <div className="shrink-0 px-5 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">{t('tutorials.help_title')}</h2>
                </div>
                <button
                  onClick={() => { setOpen(false) }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                  aria-label={t('common.cancel')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">{t('tutorials.help_intro')}</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
              <div className="divide-y rounded-xl border">
                {available.map((tuto) => {
                  const done = completed.includes(tuto.id)
                  return (
                    <div key={tuto.id} className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          {t(`tutorials.${tuto.id}.title`)}
                          {done && <CheckCircle2 className="h-4 w-4 text-green-600" aria-label={t('tutorials.done_badge')} />}
                        </p>
                        <p className="text-xs text-muted-foreground">{t(`tutorials.${tuto.id}.desc`)}</p>
                      </div>
                      <Button
                        variant={done ? 'outline' : 'default'}
                        size="sm"
                        className="min-h-[44px] gap-1.5"
                        onClick={() => {
                          setOpen(false)
                          start(tuto.id)
                        }}
                      >
                        <PlayCircle className="h-4 w-4" />
                        {done ? t('tutorials.replay') : t('tutorials.start')}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
