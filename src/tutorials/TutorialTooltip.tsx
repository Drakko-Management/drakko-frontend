import { useEffect, useRef, useState } from 'react'
import { Hand } from 'lucide-react'
import type { TooltipRenderProps } from 'react-joyride'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'
import { useTutorial } from './TutorialProvider'
import { findVisible, isZoneFilled } from './dom'
import { TUTORIALS, isTutorialAvailable } from './definitions'
import type { StepAdvance, TutorialId } from './definitions'
import { usePermissions } from '@/hooks/use-permissions'
import { usePwaInstall } from '@/hooks/use-pwa-install'

export interface TutorialStepData {
  advance: StepAdvance
  canGoBack: boolean
  interactive?: boolean
  link?: TutorialId
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

// Estompe le bas du texte tant qu'il reste de quoi défiler : sans cela, une phrase coupée net ne dit pas qu'on peut la lire
const FADE_BOTTOM =
  '[-webkit-mask-image:linear-gradient(to_bottom,black_calc(100%_-_1.75rem),transparent)] [mask-image:linear-gradient(to_bottom,black_calc(100%_-_1.75rem),transparent)]'

/** Vrai quand la zone de texte déborde et n'est pas encore lue jusqu'en bas. Revient en haut à chaque étape. */
function useMoreBelow(ref: React.RefObject<HTMLElement | null>, step: number): boolean {
  const [more, setMore] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTop = 0
    const update = () => { setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 1) }
    update()
    el.addEventListener('scroll', update, { passive: true })
    // La hauteur change quand la bulle se positionne (voir floating.ts) ou que l'écran pivote
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  }, [ref, step])

  return more
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
  const { t, start } = useTutorial()
  const { can, isAdmin } = usePermissions()
  const { isMobile, isInstalled } = usePwaInstall()
  const { handedness } = useTheme()
  const data = step.data as TutorialStepData
  // Le lien n'est proposé que si l'utilisateur a le droit de suivre ce tutoriel
  const linkedTutorial = data.link
    ? TUTORIALS.find((tuto) => tuto.id === data.link && isTutorialAvailable(tuto, can, isAdmin, { pwaInstallable: isMobile && !isInstalled }))
    : undefined
  const filled = useZoneFilled(data.targetName, Boolean(data.gate))
  const scrollRef = useRef<HTMLDivElement>(null)
  const moreBelow = useMoreBelow(scrollRef, index)

  // Hauteur : `--tutorial-max-h` est posée par `fitTooltipHeight` (place restante du côté de la cible) ; une étape
  // centrée n'en a pas et garde tout l'écran. Le texte défile dans la zone du haut, les boutons restent toujours visibles.
  return (
    <div
      {...tooltipProps}
      className="flex max-h-[var(--tutorial-max-h,calc(100dvh_-_1.5rem))] w-[min(92vw,380px)] flex-col rounded-2xl border bg-card p-4 text-card-foreground shadow-2xl"
    >
      <div ref={scrollRef} className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', moreBelow && FADE_BOTTOM)}>
        <p className="text-xs font-medium text-muted-foreground">
          {t('tutorials.step_of', { current: index + 1, total: size })}
        </p>
        {step.title && <h2 className="mt-1 text-base font-bold">{step.title}</h2>}
        <div className="mt-2 text-sm text-muted-foreground">{step.content}</div>

        {linkedTutorial && (
          <button
            type="button"
            className="mt-2 text-left text-sm font-medium text-primary underline underline-offset-2"
            onClick={() => { start(linkedTutorial.id) }}
          >
            {t('tutorials.link_label', { title: t(`tutorials.${linkedTutorial.id}.title`) })}
          </button>
        )}

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
      </div>

      <div
        className={cn(
          'mt-4 flex shrink-0 items-center justify-between gap-2',
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
