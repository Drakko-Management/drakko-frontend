import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Settings,
  LogOut,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useOrganization } from "@/hooks/use-organization";
import { useAppModules } from "@/modules/use-app-modules";
import { logout } from "@/lib/logout";
import { toast } from "sonner";

interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
  end?: boolean;
}

const DASHBOARD_ITEM: NavItem = { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard", end: true };

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const role = useAuthStore((s) => s.role);
  const firstName = useAuthStore((s) => s.firstName);
  const lastName = useAuthStore((s) => s.lastName);
  const { t } = useTranslation();
  const modules = useAppModules();
  const { data: org } = useOrganization();
  const navigate = useNavigate();

  const items: NavItem[] = [
    DASHBOARD_ITEM,
    ...modules.map(({ to, icon, nameKey }) => ({ to, icon, labelKey: nameKey })),
  ];

  async function handleLogout() {
    if ((await logout()) === 'failed') {
      toast.error(t('settings.logout_failed'))
      return
    }
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
