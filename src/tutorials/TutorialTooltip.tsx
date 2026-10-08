import { useEffect, useState } from 'react'
import { Hand } from 'lucide-react'
import type { TooltipRenderProps } from 'react-joyride'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'
import { useTutorial } from './TutorialProvider'
import { findVisible, isZoneFilled } from './dom'
import type { StepAdvance } from './definitions'

export interface TutorialStepData {
  advance: StepAdvance
  canGoBack: boolean
  interactive?: boolean
  gate?: boolean
  targetName?: string
}

/** Vrai quand les champs obligatoires de la zone ciblée sont remplis (toujours vrai si l'étape n'est pas bloquante). */
function useZoneFilled(targetName: string | undefined, enabled: boolean): boolean {
  const [filled, setFilled] = useState(() => !enabled || isZoneFilled(targetName ? findVisible(targetName) : null))

  useEffect(() => {
    if (!enabled || !targetName) { setFilled(true); return }
    const update = () => { setFilled(isZoneFilled(findVisible(targetName))) }
    update()
    // Les mises à jour de React (sélection dans une liste, saisie automatique…) arrivent après l'événement :
    // on réévalue aussi à intervalle court plutôt que de dépendre de chaque cas.
    const timer = window.setInterval(update, 300)
    document.addEventListener('input', update, true)
    document.addEventListener('change', update, true)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('input', update, true)
      document.removeEventListener('change', update, true)
    }
  }, [targetName, enabled])

  return filled
}

export function TutorialTooltip({
  index,
  size,
  step,
  isLastStep,
  tooltipProps,
  primaryProps,
  backProps,
  skipProps,
}: TooltipRenderProps) {
  const { t } = useTutorial()
  const { handedness } = useTheme()
  const data = step.data as TutorialStepData
  const filled = useZoneFilled(data.targetName, Boolean(data.gate))

  return (
    <div
      {...tooltipProps}
      className="w-[min(92vw,380px)] rounded-2xl border bg-card p-4 text-card-foreground shadow-2xl"
    >
      <p className="text-xs font-medium text-muted-foreground">
        {t('tutorials.step_of', { current: index + 1, total: size })}
      </p>
      {step.title && <h2 className="mt-1 text-base font-bold">{step.title}</h2>}
      <div className="mt-2 text-sm text-muted-foreground">{step.content}</div>

      {data.interactive && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
          <Hand className="h-4 w-4 shrink-0" />
          {t('tutorials.your_turn')}
        </p>
      )}

      {data.advance !== 'next' && (
        <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          {t('tutorials.action_hint')}
        </p>
      )}

      {!filled && (
        <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-400">
          {t('tutorials.fill_required')}
        </p>
      )}

      <div
        className={cn(
          'mt-4 flex items-center justify-between gap-2',
          handedness === 'left' && 'flex-row-reverse',
        )}
      >
        <Button variant="ghost" size="sm" className="min-h-[44px]" {...skipProps}>
          {t('tutorials.quit')}
        </Button>
        <div className={cn('flex gap-2', handedness === 'left' && 'flex-row-reverse')}>
          {data.canGoBack && (
            <Button variant="outline" size="sm" className="min-h-[44px]" {...backProps}>
              {t('tutorials.back')}
            </Button>
          )}
          {data.advance === 'next' && (
            <Button size="sm" className="min-h-[44px]" {...primaryProps} disabled={!filled}>
              {isLastStep ? t('tutorials.finish') : t('tutorials.next')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
