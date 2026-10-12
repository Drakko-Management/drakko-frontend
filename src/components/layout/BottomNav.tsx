import { NavLink } from "react-router";
import { LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useOrganization } from "@/hooks/use-organization";
import { usePermissions } from "@/hooks/use-permissions";
import {
  NAV_SLOT_REGISTRY,
  SLOT_TO_PERM_MODULE,
  DEFAULT_NAV_SLOTS,
  type NavSlotKey,
} from "@/lib/nav-slots";

interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
  end?: boolean;
}

const FIXED_START: NavItem = {
  to: "/",
  icon: LayoutDashboard,
  labelKey: "nav.dashboard_short",
  end: true,
};

function NavItems({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  return (
    <>
      {items.map(({ to, icon: Icon, labelKey, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors min-h-[56px] justify-center",
              isActive ? "text-primary" : "text-muted-foreground",
            )
          }
        >
          <Icon className="h-5 w-5" />
          <span className="leading-none">{t(labelKey)}</span>
        </NavLink>
      ))}
    </>
  );
}

function AdminBottomNav({ className }: { className?: string }) {
  const { data: org } = useOrganization();

  const slots = (org?.navSlots ?? DEFAULT_NAV_SLOTS) as NavSlotKey[];
  const middleItems: NavItem[] = slots
    .map((key) => NAV_SLOT_REGISTRY[key])
    .filter(Boolean)
    .map(({ to, icon, labelKey }) => ({ to, icon, labelKey }));

  const items: NavItem[] = [FIXED_START, ...middleItems];

  return (
    <nav className={cn("fixed bottom-0 left-0 right-0 z-50 flex border-t bg-card safe-area-bottom", className)}>
      <NavItems items={items} />
    </nav>
  );
}

function MemberBottomNav({ className }: { className?: string }) {
  const userNavSlots = useAuthStore((s) => s.navSlots);
  const { can } = usePermissions();

  const middleItems: NavItem[] = (userNavSlots as NavSlotKey[])
    .filter((key) => NAV_SLOT_REGISTRY[key as NavSlotKey] && can(SLOT_TO_PERM_MODULE[key as NavSlotKey], "read"))
    .map((key) => {
      const { to, icon, labelKey } = NAV_SLOT_REGISTRY[key as NavSlotKey];
      return { to, icon, labelKey };
    });

  const items: NavItem[] = [FIXED_START, ...middleItems];

  return (
    <nav className={cn("fixed bottom-0 left-0 right-0 z-50 flex border-t bg-card safe-area-bottom", className)}>
      <NavItems items={items} />
    </nav>
  );
}

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const role = useAuthStore((s) => s.role);

  if (role === "ADMIN") return <AdminBottomNav className={className} />;
  return <MemberBottomNav className={className} />;
}
