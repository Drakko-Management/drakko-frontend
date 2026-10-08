import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface FabProps {
  onClick: () => void;
  className?: string;
  tutorial?: string;
  /** Bouton secondaire (ex. action rapide), empilé sous le « + » dans le même coin */
  secondary?: ReactNode;
}

export function Fab({ onClick, className, tutorial, secondary }: FabProps) {
  const { t } = useTranslation();
  // Un seul conteneur fixe : le mode gaucher (.bottom-fab) déplace tout le groupe d'un coup
  return (
    <div
      className={cn(
        "fixed bottom-fab right-4 z-40 flex flex-col items-center gap-3 md:hidden",
        className,
      )}
    >
      <button
        onClick={onClick}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform active:scale-95"
        aria-label={t("common.new")}
        data-tutorial={tutorial}
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </button>
      {secondary}
    </div>
  );
}
