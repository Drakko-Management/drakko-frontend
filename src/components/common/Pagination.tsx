import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const { t } = useTranslation();
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {totalPages > 3 && (
        <button
          onClick={() => onChange(1)}
          disabled={page <= 1}
          className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card transition-colors disabled:opacity-40 active:bg-muted"
          aria-label={t("common.first_page")}
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
      )}

      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card transition-colors disabled:opacity-40 active:bg-muted"
        aria-label={t("common.previous_page")}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="min-w-[72px] text-center text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{page}</span>
        {" / "}
        {totalPages}
      </span>

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card transition-colors disabled:opacity-40 active:bg-muted"
        aria-label={t("common.next_page")}
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {totalPages > 2 && (
        <button
          onClick={() => onChange(totalPages)}
          disabled={page >= totalPages}
          className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card transition-colors disabled:opacity-40 active:bg-muted"
          aria-label={t("common.last_page")}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
