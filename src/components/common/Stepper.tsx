import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/api";

const BASE_STEPS: { status: ProjectStatus; label: string; short: string }[] = [
  { status: "DRAFT", label: "Brouillon", short: "Brouillon" },
  { status: "PLANNED", label: "Planifié", short: "Planifié" },
  { status: "IN_PROGRESS", label: "En cours", short: "En cours" },
  { status: "AWAITING_SIGNATURE", label: "Signature", short: "Signature" },
  { status: "AWAITING_RESERVE_LIFT", label: "Levée des réserves", short: "Levée" },
  { status: "COMPLETED", label: "Terminé", short: "Terminé" },
];

const BASE_ORDER: Record<ProjectStatus, number> = {
  DRAFT: 0,
  PLANNED: 1,
  IN_PROGRESS: 2,
  AWAITING_SIGNATURE: 3,
  AWAITING_RESERVE_LIFT: 4,
  COMPLETED: 5,
  DISPUTED: 3,
};

const NO_LIFT_STEPS = BASE_STEPS.filter((s) => s.status !== "AWAITING_RESERVE_LIFT");
const NO_LIFT_ORDER: Record<ProjectStatus, number> = {
  ...BASE_ORDER,
  COMPLETED: 4,
};

interface StepperProps {
  status: ProjectStatus;
  hasReserveLift?: boolean;
  className?: string;
}

export function Stepper({ status, hasReserveLift = false, className }: StepperProps) {
  const showLift = hasReserveLift || status === "AWAITING_RESERVE_LIFT";
  const STEPS = showLift ? BASE_STEPS : NO_LIFT_STEPS;
  const ORDER = showLift ? BASE_ORDER : NO_LIFT_ORDER;
  const currentIndex = ORDER[status];

  return (
    <div className={cn("flex items-center gap-0", className)}>
      {STEPS.map((step, i) => {
        const isDone = currentIndex > i;
        const isCurrent = currentIndex === i;
        const isLast = i === STEPS.length - 1;

        return (
          <div key={step.status} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  isDone && "bg-primary text-primary-foreground",
                  isCurrent &&
                    "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !isDone && !isCurrent && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] leading-tight sm:block",
                  isCurrent
                    ? "font-semibold text-primary"
                    : "text-muted-foreground",
                )}
              >
                {step.short}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "mx-1 h-0.5 w-6 flex-shrink-0 sm:w-10",
                  isDone ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
