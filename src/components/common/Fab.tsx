import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FabProps {
  onClick: () => void;
  className?: string;
  tutorial?: string;
}

export function Fab({ onClick, className, tutorial }: FabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-fab right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform active:scale-95 md:hidden",
        className,
      )}
      aria-label="Nouveau"
      data-tutorial={tutorial}
    >
      <Plus className="h-6 w-6 text-primary-foreground" />
    </button>
  );
}
