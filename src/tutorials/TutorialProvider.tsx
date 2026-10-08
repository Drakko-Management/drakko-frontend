import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { toast } from 'sonner'
import { Joyride, EVENTS, ACTIONS } from 'react-joyride'
import type { EventHandler, Step } from 'react-joyride'
import { TutorialTooltip } from './TutorialTooltip'
import type { TutorialStepData } from './TutorialTooltip'
import { getSteps, getTutorial } from './definitions'
import { findVisible } from './dom'
import type { TutorialId, TutorialStepDef, TutorialVariant } from './definitions'
import { apiRequest } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth.store'
import type { Paginated, Project } from '@/types/api'

// Une clé par utilisateur : sur un appareil partagé, chacun garde sa propre progression
const storageKey = (userId: string | null) => `drakko-tutorials-done:${userId ?? 'anonymous'}`

function readCompleted(userId: string | null): TutorialId[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? (JSON.parse(raw) as TutorialId[]) : []
  } catch {
    return []
  }
}

function writeCompleted(userId: string | null, ids: TutorialId[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(ids))
  } catch {
    // stockage indisponible : la progression n'est simplement pas mémorisée
  }
}

async function findAwaitingSignatureProjectId(): Promise<string | null> {
  const res = await apiRequest<Paginated<Project>>('/projects?status=AWAITING_SIGNATURE&page=1&limit=1')
  return res.data[0]?.id ?? null
}

/** Couleur d'accent courante (variable CSS `--primary`, ex. « 24 63% 47% ») au format utilisable dans un SVG */
function primaryColor(): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
  return raw ? `hsl(${raw})` : '#277a3f'
}

interface TutorialContextValue {
  /** `t` dans la langue du tutoriel (celle de la page si `lang` est fourni, sinon celle de l'appli) */
  t: TFunction
  start: (id: TutorialId) => void
  stop: () => void
  activeId: TutorialId | null
  completed: TutorialId[]
}

const TutorialContext = createContext<TutorialContextValue>({
  t: ((key: string) => key) as unknown as TFunction,
  start: () => {},
  stop: () => {},
  activeId: null,
  completed: [],
})

// eslint-disable-next-line react-refresh/only-export-components
export function useTutorial() {
  return useContext(TutorialContext)
}

interface TutorialProviderProps {
  children: React.ReactNode
  /** Langue forcée (pages publiques qui choisissent leur langue d'après le navigateur) */
  lang?: string
  /** Suffixe de texte spécifique (ex. `onsite`) : `<clé>_onsite` est utilisé s'il existe */
  textVariant?: string
}

export function TutorialProvider({ children, lang, textVariant }: TutorialProviderProps) {
  const { t: globalT, i18n } = useTranslation()
  const t = useMemo(() => (lang ? i18n.getFixedT(lang) : globalT), [lang, i18n, globalT])
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const userId = useAuthStore((s) => s.userId)
  const [activeId, setActiveId] = useState<TutorialId | null>(null)
  const [index, setIndex] = useState(0)
  const [variant, setVariant] = useState<TutorialVariant>('main')
  // Étapes réellement jouées : sur une page déjà affichée, celles dont l'élément n'existe pas sont retirées au démarrage
  const [stepsOverride, setStepsOverride] = useState<TutorialStepDef[] | null>(null)
  const [completed, setCompleted] = useState<TutorialId[]>(() => readCompleted(userId))

  const stop = useCallback(() => {
    setActiveId(null)
    setIndex(0)
    setStepsOverride(null)
  }, [])

  const start = useCallback(
    (id: TutorialId) => {
      void (async () => {
        const def = getTutorial(id)
        let route: string | null = def.startRoute
        let nextVariant: TutorialVariant = 'main'
        if (def.needs === 'awaiting_signature_project') {
          try {
            const projectId = await findAwaitingSignatureProjectId()
            if (projectId) route = `/chantiers/${projectId}`
            else nextVariant = 'fallback'
          } catch {
            nextVariant = 'fallback'
          }
        }
        // Page déjà affichée (tutoriel public) : on retire tout de suite les étapes facultatives
        // dont l'élément est absent, plutôt que d'attendre le délai de la cible puis de les sauter
        // (retard au lancement + numérotation qui commence à « étape 2 »).
        let playable: TutorialStepDef[] | null = null
        if (route === null) {
          playable = getSteps(def, nextVariant).filter(
            (s) => !s.optional || s.target === 'center' || findVisible(s.target) !== null,
          )
          if (playable.length === 0) return
        }
        setStepsOverride(playable)
        setVariant(nextVariant)
        setIndex(0)
        setActiveId(id)
        if (route) void navigate(route)
      })()
    },
    [navigate],
  )

  const complete = useCallback(
    (id: TutorialId) => {
      // La version explicative (donnée requise absente) ne compte pas comme « terminé »
      if (variant === 'main') {
        setCompleted((prev) => {
          if (prev.includes(id)) return prev
          const next = [...prev, id]
          writeCompleted(userId, next)
          return next
        })
      }
      stop()
    },
    [stop, variant, userId],
  )

  const activeSteps = useMemo<TutorialStepDef[]>(
    () => (activeId ? (stepsOverride ?? getSteps(getTutorial(activeId), variant)) : []),
    [activeId, stepsOverride, variant],
  )

  // Suit les changements de page : saute à l'étape correspondant à la route,
  // ou arrête le tutoriel si l'utilisateur est parti ailleurs.
  useEffect(() => {
    if (!activeId) return
    const steps = activeSteps
    if (steps[index]?.route.test(pathname)) return
    const next = steps.findIndex((s, i) => i > index && s.route.test(pathname))
    if (next >= 0) setIndex(next)
    else stop()
  }, [activeId, index, pathname, stop, activeSteps])

  // Étapes « click » : l'utilisateur appuie sur l'élément sans changer de page (ex. un onglet)
  useEffect(() => {
    if (!activeId) return
    const step = activeSteps[index]
    if (!step || step.advance !== 'click') return
    const onClick = (e: MouseEvent) => {
      const el = findVisible(step.target)
      if (el && e.target instanceof Node && el.contains(e.target)) setIndex(index + 1)
    }
    document.addEventListener('click', onClick, true)
    return () => { document.removeEventListener('click', onClick, true) }
  }, [activeId, index, activeSteps])

  const steps = useMemo<Step[]>(() => {
    if (!activeId) return []
    const defSteps = activeSteps
    const uiLang = lang ?? i18n.language
    const imageLang = ['fr', 'en', 'es', 'it', 'de'].includes(uiLang) ? uiLang : 'fr'
    // Texte spécifique à un mode (ex. face à face) s'il existe, sinon texte commun
    const text = (key: string) => {
      const variantKey = textVariant ? `${key}_${textVariant}` : null
      return variantKey && i18n.exists(variantKey, { lng: uiLang }) ? t(variantKey) : t(key)
    }
    return defSteps.map((s, i) => {
      const data: TutorialStepData = {
        advance: s.advance,
        interactive: s.interactive,
        gate: s.gate,
        targetName: s.target,
        // « Précédent » seulement si l'étape d'avant est sur la même page
        canGoBack: i > 0 && defSteps[i - 1]!.route.source === s.route.source,
      }
      return {
        id: s.id,
        target: s.target === 'center' ? 'body' : () => findVisible(s.target),
        placement: s.target === 'center' ? 'center' : s.placement ?? 'bottom',
        title: t(`tutorials.${activeId}.${s.id}_title`),
        content: s.image ? (
          <>
            <p>{text(`tutorials.${activeId}.${s.id}_body`)}</p>
            <img
              src={`/tutorials/${s.image}-${imageLang}.png`}
              alt={t(`tutorials.${activeId}.${s.id}_title`)}
              className="mt-3 w-full rounded-lg border"
            />
          </>
        ) : (
          text(`tutorials.${activeId}.${s.id}_body`)
        ),
        data,
        ...(s.spotlightPadding && { spotlightPadding: s.spotlightPadding }),
        ...(s.blockInteraction && { blockTargetInteraction: true }),
        // Zone d'action : contour dans la couleur de l'entreprise pour la distinguer d'une simple explication
        ...(s.interactive && { styles: { spotlight: { stroke: primaryColor(), strokeWidth: 3 } } }),
        // Élément facultatif déjà présent sur la page (ou non) : pas besoin d'attendre longtemps
        ...(s.optional && { targetWaitTimeout: 400 }),
      }
    })
  }, [activeId, activeSteps, t, i18n, lang, textVariant])

  const onEvent = useCallback<EventHandler>(
    (data) => {
      if (!activeId) return
      if (data.type === EVENTS.TARGET_NOT_FOUND) {
        const stepDef = activeSteps[data.index]
        if (stepDef?.optional) {
          // Élément absent dans l'état actuel de la page : on passe à l'étape suivante
          if (data.index + 1 < data.size) setIndex(data.index + 1)
          else stop()
          return
        }
        toast.error(t('tutorials.target_missing'))
        stop()
        return
      }
      if (data.type !== EVENTS.STEP_AFTER) return
      if (data.action === ACTIONS.NEXT) {
        if (data.index + 1 >= data.size) complete(activeId)
        else setIndex(data.index + 1)
      } else if (data.action === ACTIONS.PREV) {
        setIndex(Math.max(0, data.index - 1))
      } else if (data.action === ACTIONS.SKIP || data.action === ACTIONS.CLOSE) {
        stop()
      }
    },
    [activeId, complete, stop, t, activeSteps],
  )

  const value = useMemo(() => ({ t, start, stop, activeId, completed }), [t, start, stop, activeId, completed])

  return (
    <TutorialContext.Provider value={value}>
      {children}
      <Joyride
        run={activeId !== null}
        stepIndex={index}
        steps={steps}
        continuous
        onEvent={onEvent}
        tooltipComponent={TutorialTooltip}
        options={{
          skipBeacon: true,
          overlayColor: 'rgba(0, 0, 0, 0.75)',
          overlayClickAction: false,
          dismissKeyAction: false,
          spotlightRadius: 12,
          spotlightPadding: 8,
          scrollOffset: 96,
          targetWaitTimeout: 3000,
          zIndex: 1000,
        }}
        locale={{
          back: t('tutorials.back'),
          close: t('tutorials.quit'),
          last: t('tutorials.finish'),
          next: t('tutorials.next'),
          skip: t('tutorials.quit'),
        }}
      />
    </TutorialContext.Provider>
  )
}
