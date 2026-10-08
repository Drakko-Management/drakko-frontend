import { useTranslation } from 'react-i18next'
import { CheckCircle2, PlayCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { SettingsSubHeader } from './SettingsSubHeader'
import { TUTORIALS, isTutorialAvailable } from '@/tutorials/definitions'
import { useTutorial } from '@/tutorials/TutorialProvider'

export function SettingsTutorialsPage() {
  const { t } = useTranslation()
  const { can, isAdmin } = usePermissions()
  const { start, completed } = useTutorial()

  const available = TUTORIALS.filter((tuto) => tuto.audience !== 'public' && isTutorialAvailable(tuto, can, isAdmin))

  return (
    <div className="space-y-4 pb-4">
      <SettingsSubHeader title={t('tutorials.title')} />
      <p className="text-sm text-muted-foreground">{t('tutorials.intro')}</p>

      <Card className="divide-y overflow-hidden p-0">
        {available.map((tuto) => {
          const done = completed.includes(tuto.id)
          return (
            <div key={tuto.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {t(`tutorials.${tuto.id}.title`)}
                  {done && (
                    <CheckCircle2
                      className="h-4 w-4 text-green-600"
                      aria-label={t('tutorials.done_badge')}
                    />
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{t(`tutorials.${tuto.id}.desc`)}</p>
              </div>
              <Button
                variant={done ? 'outline' : 'default'}
                size="sm"
                className="min-h-[44px] gap-1.5"
                onClick={() => {
                  start(tuto.id)
                }}
              >
                <PlayCircle className="h-4 w-4" />
                {done ? t('tutorials.replay') : t('tutorials.start')}
              </Button>
            </div>
          )
        })}
      </Card>
      {available.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('tutorials.none')}</p>
      )}
    </div>
  )
}
