import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, EyeOff, Eye, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/common/Pagination";
import { Fab } from "@/components/common/Fab";
import {
  useServices,
  useUpdateService,
  useDeleteService,
  useDeactivateService,
  useActivateService,
  useSeedServices,
} from "@/hooks/use-services";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/store/auth.store";
import type { Service } from "@/types/api";
import { TutorialHelpButton } from "@/tutorials/TutorialHelpButton";

interface ServiceFormData {
  title: string;
  description: string;
  unit: string;
}

function ServiceForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: ServiceFormData;
  onSubmit: (data: ServiceFormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ServiceFormData>(
    initial ?? { title: "", description: "", unit: "" },
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="svc-title">{t("services.form_title_label")}</Label>
        <Input
          id="svc-title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder={t("services.form_title_placeholder")}
          autoFocus
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="svc-unit">{t("services.form_unit_label")}</Label>
        <Input
          id="svc-unit"
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          placeholder={t("services.form_unit_placeholder")}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="svc-desc">{t("services.form_description_label")}</Label>
        <Input
          id="svc-desc"
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          placeholder={t("services.form_description_placeholder")}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          className="flex-1 min-h-[44px]"
          onClick={onCancel}
          disabled={isPending}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          className="flex-1 min-h-[44px]"
          disabled={isPending || !form.title.trim()}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("common.save")
          )}
        </Button>
      </div>
    </form>
  );
}

function ServiceCard({
  service,
  canUpdate,
  canDelete,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
}: {
  service: Service;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (s: Service) => void;
  onDeactivate: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`rounded-xl border bg-card p-3 space-y-1 ${!service.active ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm leading-snug truncate">
            {service.title}
          </p>
          {service.unit && (
            <p className="text-xs text-muted-foreground">{service.unit}</p>
          )}
          {service.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {service.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canUpdate && (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted"
              onClick={() => onEdit(service)}
              aria-label={t("services.edit")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {canUpdate && (service.active ? (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted"
              onClick={() => onDeactivate(service.id)}
              aria-label={t("services.deactivate")}
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted"
              onClick={() => onActivate(service.id)}
              aria-label={t("services.activate")}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          ))}
          {canDelete && (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive/70 hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10"
              onClick={() => onDelete(service.id)}
              aria-label={t("services.delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ServicesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { can } = usePermissions();
  const isAdmin = useAuthStore((s) => s.role === 'ADMIN');
  const { data: services, isLoading } = useServices();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const deactivateService = useDeactivateService();
  const activateService = useActivateService();
  const seedServices = useSeedServices();

  const [modalState, setModalState] = useState<
    { mode: "edit"; service: Service } | null
  >(null);
  const [view, setView] = useState<"active" | "inactive">("active");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"az" | "za" | "recent">("az");

  const PER_PAGE = 15;

  const activeServices = services?.filter((s) => s.active) ?? [];
  const inactiveServices = services?.filter((s) => !s.active) ?? [];
  const visibleServices = view === "active" ? activeServices : inactiveServices;

  const filteredServices = visibleServices
    .filter((s) =>
      s.title.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      if (sort === "za") return b.title.localeCompare(a.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const pageServices = filteredServices.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  );

  function switchView(next: "active" | "inactive") {
    setView(next);
    setPage(1);
    setSearch("");
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleSort(value: "az" | "za" | "recent") {
    setSort(value);
    setPage(1);
  }

  function closeModal() {
    setModalState(null);
  }

  async function handleSubmit(data: ServiceFormData) {
    if (!modalState) return
    try {
      await updateService.mutateAsync({
        id: modalState.service.id,
        title: data.title,
        description: data.description || undefined,
        unit: data.unit || undefined,
      });
      toast.success(t("services.updated"));
      closeModal();
    } catch {
      toast.error(t("services.update_error"));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("services.confirm_delete"))) return;
    try {
      await deleteService.mutateAsync(id);
      toast.success(t("services.deleted"));
    } catch {
      toast.error(t("services.delete_error"));
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateService.mutateAsync(id);
      toast.success(t("services.deactivated"));
    } catch {
      toast.error(t("services.update_error"));
    }
  }

  async function handleActivate(id: string) {
    try {
      await activateService.mutateAsync(id);
      toast.success(t("services.activated"));
    } catch {
      toast.error(t("services.update_error"));
    }
  }

  async function handleSeed() {
    try {
      await seedServices.mutateAsync();
      toast.success(t("services.seed_success"));
    } catch {
      toast.error(t("services.seed_error"));
    }
  }

  const isPending = updateService.isPending;

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Sticky header — deux lignes comme ClientsPage */}
      <div className="shrink-0 space-y-3 px-4 pt-4 pb-3 bg-background">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">
            <span className="lg:hidden">{t("services.title_short")}</span>
            <span className="hidden lg:inline">{t("services.title")}</span>
          </h1>
          <div className="flex items-center gap-2">
            <TutorialHelpButton scope="services" />
            {view === "active" && can('prestations', 'create') ? (
              <Button
                size="sm"
                className="min-h-[44px] gap-1.5 hidden md:flex"
                data-tutorial="services-new"
                onClick={() => void navigate('/prestations/nouveau')}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("services.add")}
              </Button>
            ) : view === "inactive" ? (
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px]"
                onClick={() => switchView("active")}
              >
                {t("services.view_active", { count: activeServices.length })}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="min-h-[44px] pl-9"
              placeholder={t("services.search_placeholder")}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => handleSort(e.target.value as "az" | "za" | "recent")}
            className="h-11 rounded-xl border bg-card px-3 text-sm text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="az">{t("services.sort_az")}</option>
            <option value="za">{t("services.sort_za")}</option>
            <option value="recent">{t("services.sort_recent")}</option>
          </select>
        </div>
        {view === "active" && inactiveServices.length > 0 && !isLoading && (
          <button
            className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
            onClick={() => switchView("inactive")}
          >
            {t("services.view_inactive", { count: inactiveServices.length })}
          </button>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : services?.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("services.empty_desc")}
            </p>
            {isAdmin && (
              <Button
                variant="outline"
                className="min-h-[44px] w-full"
                onClick={() => void handleSeed()}
                disabled={seedServices.isPending}
              >
                {seedServices.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t("services.seed_btn")}
              </Button>
            )}
          </div>
        ) : visibleServices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {t("services.no_services")}
          </p>
        ) : filteredServices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {t("services.no_results")}
          </p>
        ) : (
          <div className="space-y-2">
            {pageServices.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                canUpdate={can('prestations', 'update')}
                canDelete={can('prestations', 'delete')}
                onEdit={(svc) => setModalState({ mode: "edit", service: svc })}
                onDeactivate={(id) => void handleDeactivate(id)}
                onActivate={(id) => void handleActivate(id)}
                onDelete={(id) => void handleDelete(id)}
              />
            ))}
          </div>
        )}

      </div>

      {/* Pagination fixe en bas */}
      <div className="shrink-0 px-4 pb-nav lg:pb-2 pt-1 bg-background">
        <Pagination
          page={page}
          total={filteredServices.length}
          limit={PER_PAGE}
          onChange={setPage}
        />
      </div>

      {/* Form modal */}
      {modalState && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-card p-5 shadow-xl space-y-4">
            <h2 className="font-semibold">{t("services.form_edit_title")}</h2>
            <ServiceForm
              initial={{
                title: modalState.service.title,
                description: modalState.service.description ?? "",
                unit: modalState.service.unit ?? "",
              }}
              onSubmit={(data) => void handleSubmit(data)}
              onCancel={closeModal}
              isPending={isPending}
            />
          </div>
        </div>
      )}

      {view === "active" && can('prestations', 'create') && (
        <Fab tutorial="services-new" onClick={() => void navigate('/prestations/nouveau')} />
      )}
    </div>
  );
}
