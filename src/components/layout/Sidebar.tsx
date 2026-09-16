import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  HardHat,
  Users,
  UserCog,
  Settings,
  BookOpen,
  LogOut,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useOrganization } from "@/hooks/use-organization";
import { usePermissions } from "@/hooks/use-permissions";
import { apiRequest } from "@/lib/api-client";

interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
  end?: boolean;
  permModule?: string;
  permAction?: string;
}

const ADMIN_NAV: NavItem[] = [
  { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard", end: true },
  { to: "/chantiers", icon: HardHat, labelKey: "nav.projects" },
  { to: "/clients", icon: Users, labelKey: "nav.clients" },
  { to: "/utilisateurs", icon: UserCog, labelKey: "nav.team" },
  { to: "/prestations", icon: BookOpen, labelKey: "nav.services" },
];

const MEMBER_NAV: NavItem[] = [
  { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard", end: true },
  { to: "/chantiers", icon: HardHat, labelKey: "nav.projects", permModule: "chantiers", permAction: "read" },
  { to: "/clients", icon: Users, labelKey: "nav.clients", permModule: "clients", permAction: "read" },
  { to: "/utilisateurs", icon: UserCog, labelKey: "nav.team", permModule: "equipe", permAction: "read" },
  { to: "/prestations", icon: BookOpen, labelKey: "nav.services", permModule: "prestations", permAction: "read" },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const role = useAuthStore((s) => s.role);
  const firstName = useAuthStore((s) => s.firstName);
  const lastName = useAuthStore((s) => s.lastName);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { data: org } = useOrganization();
  const navigate = useNavigate();

  const rawItems = role === "ADMIN" ? ADMIN_NAV : MEMBER_NAV;
  const items = rawItems.filter((item) =>
    item.permModule && item.permAction
      ? can(item.permModule as never, item.permAction as never)
      : true,
  );

  async function handleLogout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    clearAuth()
    navigate('/login')
  }

  return (
    <aside className={cn("flex w-60 flex-col border-r bg-card", className)}>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <img src="/drakko/logo_app_light.png" alt="Drakko" className="h-7 w-7 shrink-0 rounded-lg object-cover dark:hidden" />
        <img src="/drakko/logo_app_dark.png" alt="Drakko" className="h-7 w-7 shrink-0 rounded-lg object-cover hidden dark:block" />
        <div className="min-w-0">
          <p className="font-bold tracking-tight text-foreground leading-tight">
            Drakko
          </p>
          {org && (
            <p className="text-xs text-muted-foreground leading-tight truncate">
              {org.name}
            </p>
          )}
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {items.map(({ to, icon: Icon, labelKey, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-3 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {firstName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight text-foreground">
              {firstName} {lastName}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              {role === 'ADMIN' ? t('users.role_admin') : t('users.role_member')}
            </p>
          </div>
        </div>
        <NavLink
          to="/parametres"
          className={({ isActive }) =>
            cn(
              "flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )
          }
        >
          <Settings className="h-4 w-4 shrink-0" />
          {t('nav.settings')}
        </NavLink>
        <button
          onClick={() => void handleLogout()}
          className="mt-1.5 flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t('settings.logout')}
        </button>
      </div>
    </aside>
  );
}
