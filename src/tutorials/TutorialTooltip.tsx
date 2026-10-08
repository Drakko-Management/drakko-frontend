import { Hand } from 'lucide-react'
import type { TooltipRenderProps } from 'react-joyride'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'
import { useTutorial } from './TutorialProvider'
import type { StepAdvance } from './definitions'

export interface TutorialStepData {
  advance: StepAdvance
  canGoBack: boolean
  interactive?: boolean
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
            <Button size="sm" className="min-h-[44px]" {...primaryProps}>
              {isLastStep ? t('tutorials.finish') : t('tutorials.next')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
