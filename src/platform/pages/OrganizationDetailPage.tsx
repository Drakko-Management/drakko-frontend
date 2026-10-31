import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/lib/api-error'
import { enterSupportSession } from '@/lib/support-session'
import { useOrganization, useOrganizationAction } from '../hooks'
import { ReasonDialog } from '../ReasonDialog'
import { ActiveBadge } from './OrganizationsPage'
import { AuditLine } from './AuditPage'
import type { OrganizationUser } from '../types'

type Dialog = 'suspend' | 'reactivate' | 'resetLink' | 'resetTwoFactor' | 'support' | null

// Un libellé long (« Réinitialiser le mot de passe du propriétaire ») passe à la ligne au lieu de déborder d'un petit écran
const ACTION_BUTTON = 'h-auto min-h-10 whitespace-normal py-2'

// Un bouton grisé ne reçoit plus la souris (pointer-events-none) : l'infobulle est portée par son enveloppe, qui dit
// aussi pourquoi il est grisé
function ActionButton({ title, children, ...props }: React.ComponentProps<typeof Button> & { title: string }) {
  return (
    <span title={title} className="inline-flex">
      <Button className={ACTION_BUTTON} {...props}>
        {children}
      </Button>
    </span>
  )
}

// La fiche d'une organisation : l'équipe, les gestes de dépannage et les dernières actions (ADR-028). Aucune donnée
// métier du client ici : pour la voir, le mode dépannage (lecture seule, motivé, journalisé).
export function OrganizationDetailPage() {
  const { t, i18n } = useTranslation()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: org, isLoading, error } = useOrganization(id)
  const actions = useOrganizationAction(id)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [viewAs, setViewAs] = useState<OrganizationUser | null>(null)
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  if (isLoading) return <p className="text-sm text-muted-foreground">{t('common.searching')}</p>
  if (error || !org) {
    return <p role="alert" className="text-sm text-destructive">{apiErrorMessage(error, t, 'platform.load_error')}</p>
  }

  const owner = org.users.find((u) => u.isOwner)
  const close = () => {
    setDialog(null)
    setViewAs(null)
    setEmail('')
  }
  const done = (message: string) => () => {
    close()
    setNotice(message)
  }
  const open = (next: Dialog, user: OrganizationUser | null = null) => {
    setNotice(null)
    setViewAs(user)
    setDialog(next)
  }
  const pendingError = (mutation: { error: unknown }) =>
    mutation.error ? apiErrorMessage(mutation.error, t, 'platform.action_error') : null

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/plateforme" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          {t('common.back')}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{org.name}</h1>
          <ActiveBadge active={org.active} />
        </div>
        <p className="text-sm text-muted-foreground">
          {org.slug} · {t(`platform.trade_${org.trade}`)} · {t(`platform.language_${org.language}`)} ·{' '}
          {t('platform.created_on', { date: new Date(org.createdAt).toLocaleDateString(i18n.language) })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('platform.counts_full', { users: org.usersCount, clients: org.clientsCount, projects: org.projectsCount })}
        </p>
      </div>

      {notice && <p role="status" className="rounded-md border border-green-600/40 bg-green-50 px-3 py-2 text-sm text-green-900 dark:bg-green-950/40 dark:text-green-200">{notice}</p>}

      <section className="space-y-2">
        <h2 className="font-medium">{t('platform.actions_title')}</h2>
        {/* La phrase qui dit ce que fait chaque bouton (ou pourquoi il est grisé) s'affiche au survol */}
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => open('support')}
            disabled={!org.active}
            title={t(org.active ? 'platform.action_support_hint' : 'platform.action_support_disabled')}
          >
            {t('platform.action_support')}
          </ActionButton>
          <ActionButton
            variant="outline"
            onClick={() => open('resetLink')}
            disabled={!owner}
            title={t(owner ? 'platform.action_reset_password_hint' : 'platform.err_owner_not_found')}
          >
            {t('platform.action_reset_password')}
          </ActionButton>
          <ActionButton
            variant="outline"
            onClick={() => open('resetTwoFactor')}
            disabled={!owner?.twoFactorEnabled}
            title={t(
              !owner
                ? 'platform.err_owner_not_found'
                : owner.twoFactorEnabled
                  ? 'platform.action_reset_two_factor_hint'
                  : 'platform.action_reset_two_factor_disabled',
            )}
          >
            {t('platform.action_reset_two_factor')}
          </ActionButton>
          {org.active ? (
            <ActionButton variant="destructive" onClick={() => open('suspend')} title={t('platform.action_suspend_hint')}>
              {t('platform.action_suspend')}
            </ActionButton>
          ) : (
            <ActionButton variant="outline" onClick={() => open('reactivate')} title={t('platform.action_reactivate_hint')}>
              {t('platform.action_reactivate')}
            </ActionButton>
          )}
        </div>
        {!org.active && <p className="text-xs text-muted-foreground">{t('platform.suspended_hint')}</p>}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">{t('platform.team_title')}</h2>
        <ul className="divide-y rounded-lg border bg-card">
          {org.users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {user.firstName} {user.lastName}
                  {user.isOwner && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t('platform.owner_badge')}</span>}
                  {!user.active && <span className="ml-2 text-xs text-muted-foreground">{t('common.inactive')}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.username} · {t(`platform.role_${user.role}`)} · {user.email ?? t('platform.no_email')} ·{' '}
                  {t(user.twoFactorEnabled ? 'platform.two_factor_on' : 'platform.two_factor_off')}
                </p>
              </div>
              {org.active && user.active && (
                <Button size="sm" variant="outline" onClick={() => open('support', user)}>
                  {t('platform.view_as')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">{t('platform.recent_title')}</h2>
        {org.recentActions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('platform.audit_empty')}</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {org.recentActions.map((entry) => (
              <AuditLine key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </section>

      <ReasonDialog
        open={dialog === 'suspend'}
        onOpenChange={(next) => !next && close()}
        title={t('platform.suspend_title', { name: org.name })}
        description={t('platform.suspend_description')}
        confirmLabel={t('platform.action_suspend')}
        destructive
        pending={actions.suspend.isPending}
        error={pendingError(actions.suspend)}
        onConfirm={(reason) => actions.suspend.mutate(reason, { onSuccess: done(t('platform.suspend_done')) })}
      />
      <ReasonDialog
        open={dialog === 'reactivate'}
        onOpenChange={(next) => !next && close()}
        title={t('platform.reactivate_title', { name: org.name })}
        description={t('platform.reactivate_description')}
        confirmLabel={t('platform.action_reactivate')}
        pending={actions.reactivate.isPending}
        error={pendingError(actions.reactivate)}
        onConfirm={(reason) => actions.reactivate.mutate(reason, { onSuccess: done(t('platform.reactivate_done')) })}
      />
      <ReasonDialog
        open={dialog === 'resetLink'}
        onOpenChange={(next) => !next && close()}
        title={t('platform.reset_link_title')}
        description={t(owner?.email ? 'platform.reset_link_description' : 'platform.reset_link_description_no_email')}
        confirmLabel={t('platform.reset_link_confirm')}
        pending={actions.sendResetLink.isPending}
        error={pendingError(actions.sendResetLink)}
        extraValid={Boolean(owner?.email) || email.trim().includes('@')}
        onConfirm={(reason) =>
          actions.sendResetLink.mutate(
            { reason, email: owner?.email ? undefined : email.trim() },
            { onSuccess: (res) => done(t('platform.reset_link_done', { email: res.emailMasked }))() },
          )
        }
      >
        {owner && !owner.email && (
          <div className="space-y-2">
            <Label htmlFor="owner-email-support">{t('common.email')}</Label>
            <Input id="owner-email-support" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}
      </ReasonDialog>
      <ReasonDialog
        open={dialog === 'resetTwoFactor'}
        onOpenChange={(next) => !next && close()}
        title={t('platform.reset_two_factor_title')}
        description={t('platform.reset_two_factor_description')}
        confirmLabel={t('platform.reset_two_factor_confirm')}
        destructive
        pending={actions.resetTwoFactor.isPending}
        error={pendingError(actions.resetTwoFactor)}
        onConfirm={(reason) => actions.resetTwoFactor.mutate(reason, { onSuccess: done(t('platform.reset_two_factor_done')) })}
      />
      <ReasonDialog
        open={dialog === 'support'}
        onOpenChange={(next) => !next && close()}
        title={t('platform.support_title', { name: org.name })}
        description={t('platform.support_description', {
          user: viewAs ? `${viewAs.firstName} ${viewAs.lastName}` : owner ? `${owner.firstName} ${owner.lastName}` : '',
        })}
        confirmLabel={t('platform.support_confirm')}
        pending={actions.startSupport.isPending}
        error={pendingError(actions.startSupport)}
        onConfirm={(reason) =>
          actions.startSupport.mutate(
            { reason, viewAs: viewAs?.id },
            {
              // Le jeton de dépannage reste en mémoire : la navigation se fait dans la page (un rechargement l'effacerait),
              // vers l'application ordinaire, bandeau permanent
              onSuccess: async (grant) => {
                await enterSupportSession(grant)
                void navigate('/')
              },
            },
          )
        }
      />
    </div>
  )
}
