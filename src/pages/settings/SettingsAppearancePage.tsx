import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Monitor, Sun, Moon, Hand, Plus, Minus, RotateCcw, LayoutDashboard, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme, COLORS } from '@/providers/ThemeProvider'
import type { ColorKey, Handedness } from '@/providers/ThemeProvider'
import { patchMe } from '@/lib/patch-me'
import { useAuthStore } from '@/store/auth.store'
import { usePermissions } from '@/hooks/use-permissions'
import { useOrganization } from '@/hooks/use-organization'
import { useUpdateMe } from '@/hooks/use-update-me'
import {
  NAV_SLOT_REGISTRY,
  SLOT_TO_PERM_MODULE,
  DEFAULT_NAV_SLOTS,
  ALL_SLOT_KEYS,
  type NavSlotKey,
} from '@/lib/nav-slots'
import { SettingsSubHeader } from './SettingsSubHeader'

export function SettingsAppearancePage() {
  const { t } = useTranslation()
  const { theme, setTheme, color, setColor, handedness, setHandedness } = useTheme()
  const role = useAuthStore((s) => s.role)
  const storeNavSlots = useAuthStore((s) => s.navSlots)
  const setNavSlots = useAuthStore((s) => s.setNavSlots)
  const { can } = usePermissions()
  const { data: org } = useOrganization()
  const updateMe = useUpdateMe()

  const accessibleSlots = ALL_SLOT_KEYS.filter((key) => can(SLOT_TO_PERM_MODULE[key], 'read'))
  const [userNav, setUserNav] = useState<NavSlotKey[]>([])
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [navSaving, setNavSaving] = useState(false)

  useEffect(() => {
    setUserNav(storeNavSlots as NavSlotKey[])
  }, [storeNavSlots])

  function handleThemeChange(newTheme: 'system' | 'light' | 'dark') {
    setTheme(newTheme)
    patchMe({ theme: newTheme })
  }

  function handleColorChange(newColor: ColorKey) {
    setColor(newColor)
    patchMe({ accentColor: newColor })
  }

  function handleHandednessChange(h: Handedness) {
    setHandedness(h)
    patchMe({ handedness: h })
  }

  function handleUserSlotChange(index: number, value: NavSlotKey) {
    setUserNav((prev) => prev.map((s, i) => (i === index ? value : s)))
  }
  function handleAddSlot() {
    const available = accessibleSlots.filter((k) => !userNav.includes(k))
    if (available.length > 0 && userNav.length < 4)
      setUserNav((prev) => [...prev, available[0]])
  }
  function handleRemoveSlot(index: number) {
    setUserNav((prev) => prev.filter((_, i) => i !== index))
  }
  async function handleSaveUserNav() {
    setNavSaving(true)
    try {
      await updateMe.mutateAsync({ navSlots: userNav })
      setNavSlots(userNav)
      toast.success(t('settings.nav_updated'))
    } catch {
      toast.error(t('settings.save_error'))
    } finally {
      setNavSaving(false)
    }
  }
  async function handleResetUserNav() {
    const orgDefaults = (org?.navSlots as NavSlotKey[]) ?? DEFAULT_NAV_SLOTS
    const reset = orgDefaults.filter((k) => accessibleSlots.includes(k))
    setShowResetConfirm(false)
    setNavSaving(true)
    try {
      await updateMe.mutateAsync({ navSlots: reset })
      setUserNav(reset)
      setNavSlots(reset)
      toast.success(t('settings.nav_updated'))
    } catch {
      toast.error(t('settings.save_error'))
    } finally {
      setNavSaving(false)
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <SettingsSubHeader title={t('settings.hub_appearance')} />

      <Card className="divide-y">
        {/* Thème */}
        <div className="p-3">
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { value: 'system', labelKey: 'settings.theme_system', icon: Monitor },
                { value: 'light',  labelKey: 'settings.theme_light',  icon: Sun },
                { value: 'dark',   labelKey: 'settings.theme_dark',   icon: Moon },
              ] as const
            ).map(({ value, labelKey, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleThemeChange(value)}
                className={[
                  'flex flex-col items-center gap-1.5 rounded-md px-2 py-3 text-xs font-medium transition-colors',
                  theme === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Main dominante */}
        <div className="p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {t('settings.handedness_section')}
          </p>
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                { value: 'right', labelKey: 'settings.handedness_right', flip: false },
                { value: 'left',  labelKey: 'settings.handedness_left',  flip: true },
              ] as { value: Handedness; labelKey: string; flip: boolean }[]
            ).map(({ value, labelKey, flip }) => (
              <button
                key={value}
                onClick={() => handleHandednessChange(value)}
                className={[
                  'flex flex-col items-center gap-1.5 rounded-md px-2 py-3 text-xs font-medium transition-colors',
                  handedness === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                ].join(' ')}
              >
                <Hand className={['h-4 w-4', flip ? 'scale-x-[-1]' : ''].join(' ')} />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Couleur */}
        <div className="p-3">
          <div className="grid grid-cols-4 gap-3">
            {(Object.entries(COLORS) as [ColorKey, (typeof COLORS)[ColorKey]][]).map(
              ([key, { hex }]) => (
                <button
                  key={key}
                  title={t(`settings.color_${key}`)}
                  onClick={() => handleColorChange(key)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full ring-offset-background transition-all"
                    style={{
                      backgroundColor: hex,
                      boxShadow:
                        color === key
                          ? `0 0 0 2px white, 0 0 0 4px ${hex}`
                          : undefined,
                    }}
                  >
                    {color === key && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3 fill-white">
                        <path
                          d="M1.5 6.5l3 3 6-6"
                          stroke="white"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {t(`settings.color_${key}`)}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>
      </Card>

      {/* Navigation perso (membres) */}
      {role === 'MEMBER' && (
        <Card className="p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('settings.nav_section')}
          </p>
          <p className="text-xs text-muted-foreground">{t('settings.nav_description')}</p>

          {accessibleSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('settings.nav_no_module')}</p>
          ) : (
            <>
              <div className="lg:hidden space-y-3">
                {userNav.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute -top-2 left-3 z-10 bg-card px-1 text-[10px] text-muted-foreground leading-none">
                        {t('settings.nav_slot', { n: i + 1 })}
                      </span>
                      <select
                        value={slot}
                        onChange={(e) => handleUserSlotChange(i, e.target.value as NavSlotKey)}
                        className="h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      >
                        {accessibleSlots
                          .filter((key) => key === slot || !userNav.includes(key))
                          .map((key) => (
                            <option key={key} value={key}>{t(NAV_SLOT_REGISTRY[key].nameKey)}</option>
                          ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(i)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t('settings.nav_remove_slot')}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {userNav.length < 4 &&
                  accessibleSlots.filter((k) => !userNav.includes(k)).length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddSlot}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <Plus className="h-4 w-4" />
                      {t('settings.nav_add_slot')}
                    </button>
                  )}
              </div>

              <div className="hidden lg:block rounded-xl border overflow-hidden">
                <div
                  className="bg-background border-b"
                  style={{ display: 'grid', gridTemplateColumns: `repeat(${userNav.length + 1}, 1fr)` }}
                >
                  <div className="flex flex-col items-center gap-0.5 py-2 opacity-35">
                    <LayoutDashboard className="h-5 w-5" />
                    <span className="text-[10px]">{t('nav.dashboard_short')}</span>
                  </div>
                  {userNav.map((slot, i) => {
                    const Icon = NAV_SLOT_REGISTRY[slot].icon
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5 py-2 text-primary">
                        <Icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium">{t(NAV_SLOT_REGISTRY[slot].labelKey)}</span>
                      </div>
                    )
                  })}
                </div>
                <div
                  className="gap-1.5 p-2 bg-muted/40"
                  style={{ display: 'grid', gridTemplateColumns: `repeat(${userNav.length + 1}, 1fr)` }}
                >
                  <div className="flex items-center justify-center">
                    {userNav.length < 4 &&
                      accessibleSlots.filter((k) => !userNav.includes(k)).length > 0 && (
                        <button
                          type="button"
                          onClick={handleAddSlot}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                  </div>
                  {userNav.map((slot, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <select
                        value={slot}
                        onChange={(e) => handleUserSlotChange(i, e.target.value as NavSlotKey)}
                        className="h-7 w-auto min-w-[120px] max-w-full mx-auto block rounded-md border bg-background px-1 text-[10px] outline-none focus:ring-1 focus:ring-ring"
                      >
                        {accessibleSlots
                          .filter((key) => key === slot || !userNav.includes(key))
                          .map((key) => (
                            <option key={key} value={key}>{t(NAV_SLOT_REGISTRY[key].nameKey)}</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        aria-label={t('settings.nav_remove_slot')}
                        onClick={() => handleRemoveSlot(i)}
                        className="text-[10px] text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 min-h-[44px] gap-1.5"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={navSaving}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('settings.nav_reset_btn')}
                </Button>
                <Button
                  type="button"
                  className="flex-1 min-h-[44px]"
                  onClick={() => void handleSaveUserNav()}
                  disabled={navSaving || JSON.stringify(userNav) === JSON.stringify(storeNavSlots)}
                >
                  {navSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.save')}
                </Button>
              </div>

              {showResetConfirm && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2 dark:border-orange-900 dark:bg-orange-950/30">
                  <p className="text-sm font-medium">{t('settings.nav_reset_title')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.nav_reset_body')}</p>
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowResetConfirm(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="button" size="sm" className="flex-1" onClick={() => void handleResetUserNav()} disabled={navSaving}>
                      {t('settings.nav_reset_confirm')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  )
}
