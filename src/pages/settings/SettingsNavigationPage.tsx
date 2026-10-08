import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Minus, RotateCcw, LayoutDashboard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/auth.store'
import { usePermissions } from '@/hooks/use-permissions'
import { useOrganization, useUpdateOrganization } from '@/hooks/use-organization'
import { useUpdateMe } from '@/hooks/use-update-me'
import {
  NAV_SLOT_REGISTRY,
  SLOT_TO_PERM_MODULE,
  DEFAULT_NAV_SLOTS,
  ALL_SLOT_KEYS,
  type NavSlotKey,
} from '@/lib/nav-slots'
import { SettingsSubHeader } from './SettingsSubHeader'

export function SettingsNavigationPage() {
  const { t } = useTranslation()
  const role = useAuthStore((s) => s.role)
  const storeNavSlots = useAuthStore((s) => s.navSlots)
  const setNavSlots = useAuthStore((s) => s.setNavSlots)
  const { can, isAdmin } = usePermissions()
  const { data: org, isLoading: orgLoading } = useOrganization()
  const updateOrg = useUpdateOrganization()
  const updateMe = useUpdateMe()

  // ── Admin : nav org ──────────────────────────────────────────────
  const [navSlotsOrg, setNavSlotsOrg] = useState<NavSlotKey[]>(DEFAULT_NAV_SLOTS)

  useEffect(() => {
    if (org) setNavSlotsOrg((org.navSlots as NavSlotKey[]) ?? DEFAULT_NAV_SLOTS)
  }, [org])

  function handleOrgSlotChange(index: number, value: NavSlotKey) {
    setNavSlotsOrg((prev) => prev.map((s, i) => (i === index ? value : s)))
  }
  function handleAddOrgSlot() {
    const available = ALL_SLOT_KEYS.filter((k) => !navSlotsOrg.includes(k))
    if (available.length > 0 && navSlotsOrg.length < 4)
      setNavSlotsOrg((prev) => [...prev, available[0]])
  }
  function handleRemoveOrgSlot(index: number) {
    if (navSlotsOrg.length > 1)
      setNavSlotsOrg((prev) => prev.filter((_, i) => i !== index))
  }
  function handleSaveOrgNav(e: React.FormEvent) {
    e.preventDefault()
    void updateOrg.mutateAsync({ navSlots: navSlotsOrg })
  }

  // ── Member : nav perso ───────────────────────────────────────────
  const accessibleSlots = ALL_SLOT_KEYS.filter((key) =>
    can(SLOT_TO_PERM_MODULE[key], 'read'),
  )
  const [userNav, setUserNav] = useState<NavSlotKey[]>([])
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [navSaving, setNavSaving] = useState(false)

  useEffect(() => {
    setUserNav(storeNavSlots as NavSlotKey[])
  }, [storeNavSlots])

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
      toast.error(t('settings.save'))
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
      toast.error(t('settings.save'))
    } finally {
      setNavSaving(false)
    }
  }

  const title = isAdmin ? t('settings.hub_nav_org') : t('settings.hub_navigation')

  return (
    <div className="space-y-4 pb-4">
      <SettingsSubHeader title={title} />

      {/* ── Admin view ── */}
      {isAdmin && (
        <Card className="p-4">
          {orgLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSaveOrgNav} className="space-y-4">
              <Label className="mb-3 block">{t('settings.nav_section')}</Label>
              {/* Mobile */}
              <div className="lg:hidden space-y-3">
                {navSlotsOrg.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute -top-2 left-3 z-10 bg-card px-1 text-[10px] text-muted-foreground leading-none">
                        {t('settings.nav_slot', { n: i + 1 })}
                      </span>
                      <select
                        value={slot}
                        onChange={(e) => handleOrgSlotChange(i, e.target.value as NavSlotKey)}
                        className="h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      >
                        {ALL_SLOT_KEYS.filter(
                          (key) => key === slot || !navSlotsOrg.includes(key),
                        ).map((key) => (
                          <option key={key} value={key}>
                            {t(NAV_SLOT_REGISTRY[key].nameKey)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {navSlotsOrg.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOrgSlot(i)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {navSlotsOrg.length < 4 &&
                  ALL_SLOT_KEYS.filter((k) => !navSlotsOrg.includes(k)).length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddOrgSlot}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <Plus className="h-4 w-4" />
                      {t('settings.nav_add_slot')}
                    </button>
                  )}
              </div>
              {/* Desktop */}
              <div className="hidden lg:block rounded-xl border overflow-hidden">
                <div
                  className="bg-background border-b"
                  style={{ display: 'grid', gridTemplateColumns: `repeat(${navSlotsOrg.length + 1}, 1fr)` }}
                >
                  <div className="flex flex-col items-center gap-0.5 py-2 opacity-35">
                    <LayoutDashboard className="h-5 w-5" />
                    <span className="text-[10px]">{t('nav.dashboard_short')}</span>
                  </div>
                  {navSlotsOrg.map((slot, i) => {
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
                  style={{ display: 'grid', gridTemplateColumns: `repeat(${navSlotsOrg.length + 1}, 1fr)` }}
                >
                  <div className="flex items-center justify-center">
                    {navSlotsOrg.length < 4 &&
                      ALL_SLOT_KEYS.filter((k) => !navSlotsOrg.includes(k)).length > 0 && (
                        <button
                          type="button"
                          onClick={handleAddOrgSlot}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                  </div>
                  {navSlotsOrg.map((slot, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <select
                        value={slot}
                        onChange={(e) => handleOrgSlotChange(i, e.target.value as NavSlotKey)}
                        className="h-7 w-auto min-w-[120px] max-w-full mx-auto block rounded-md border bg-background px-1 text-[10px] outline-none focus:ring-1 focus:ring-ring"
                      >
                        {ALL_SLOT_KEYS.filter(
                          (key) => key === slot || !navSlotsOrg.includes(key),
                        ).map((key) => (
                          <option key={key} value={key}>
                            {t(NAV_SLOT_REGISTRY[key].nameKey)}
                          </option>
                        ))}
                      </select>
                      {navSlotsOrg.length > 1 && (
                        <button
                          type="button"
                          aria-label={t('settings.nav_remove_slot')}
                          onClick={() => handleRemoveOrgSlot(i)}
                          className="text-[10px] text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Button
                type="submit"
                className="w-full min-h-[44px]"
                disabled={
                  updateOrg.isPending ||
                  JSON.stringify(navSlotsOrg) ===
                    JSON.stringify(org?.navSlots ?? DEFAULT_NAV_SLOTS)
                }
              >
                {updateOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.save')}
              </Button>
            </form>
          )}
        </Card>
      )}

      {/* ── Member view ── */}
      {role === 'MEMBER' && (
        <Card className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">{t('settings.nav_description')}</p>

          {accessibleSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('settings.nav_no_module')}</p>
          ) : (
            <>
              {/* Mobile */}
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
                            <option key={key} value={key}>
                              {t(NAV_SLOT_REGISTRY[key].nameKey)}
                            </option>
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

              {/* Desktop */}
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
                            <option key={key} value={key}>
                              {t(NAV_SLOT_REGISTRY[key].nameKey)}
                            </option>
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
                  {navSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t('settings.save')
                  )}
                </Button>
              </div>

              {showResetConfirm && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2 dark:border-orange-900 dark:bg-orange-950/30">
                  <p className="text-sm font-medium">{t('settings.nav_reset_title')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.nav_reset_body')}</p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1"
                      onClick={() => void handleResetUserNav()}
                      disabled={navSaving}
                    >
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
