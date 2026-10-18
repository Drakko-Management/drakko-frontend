import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, EyeOff, Eye, Loader2, Search, ListChecks } from "lucide-react";
import { ConfirmDestructiveDialog } from "@/components/common/ConfirmDestructiveDialog";
import { apiErrorMessage } from "@/lib/api-error";
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
  useDeleteServices,
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
  selecting,
  selected,
  onToggle,
}: {
  service: Service;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (s: Service) => void;
  onDeactivate: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  selecting: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      {selecting && (
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-primary"
          checked={selected}
          onChange={() => onToggle(service.id)}
          aria-label={t("services.select_one", { title: service.title })}
        />
      )}
    <div
      className={`min-w-0 flex-1 rounded-xl border bg-card p-3 space-y-1 ${!service.active ? "opacity-60" : ""} ${selected ? "border-primary ring-1 ring-primary" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`min-w-0 flex-1 ${selecting ? "cursor-pointer" : ""}`}
          onClick={selecting ? () => onToggle(service.id) : undefined}
        >
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
        {!selecting && (
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
  const deleteServices = useDeleteServices();
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

  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);

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

  // La sélection porte sur toute la liste filtrée (toutes les pages), jamais sur ce qui n'est plus affiché
  const selectedIds = filteredServices.filter((s) => selection.has(s.id)).map((s) => s.id);
  const allSelected = filteredServices.length > 0 && selectedIds.length === filteredServices.length;

  function toggleOne(id: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelection(allSelected ? new Set() : new Set(filteredServices.map((s) => s.id)));
  }

  function stopSelecting() {
    setSelecting(false);
    setSelection(new Set());
  }

  async function handleBulkDelete() {
    try {
      const { deleted, deactivated } = await deleteServices.mutateAsync(selectedIds);
      toast.success(t("services.bulk_done", { deleted, deactivated }));
      setConfirmBulk(false);
      stopSelecting();
    } catch (err) {
      toast.error(apiErrorMessage(err, t, "services.delete_error"));
    }
  }

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
            {!selecting && can('prestations', 'delete') && filteredServices.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px] gap-1.5"
                onClick={() => setSelecting(true)}
              >
                <ListChecks className="h-4 w-4" />
                {t("services.select")}
              </Button>
            )}
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
        {selecting ? (
          <div className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5 accent-primary"
                checked={allSelected}
                onChange={toggleAll}
                disabled={filteredServices.length === 0}
              />
              {t("services.select_all", { count: filteredServices.length })}
            </label>
            <Button
              size="sm"
              variant="destructive"
              className="min-h-[44px] gap-1.5"
              disabled={selectedIds.length === 0}
              onClick={() => setConfirmBulk(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("services.delete_selected", { count: selectedIds.length })}
            </Button>
            <Button size="sm" variant="outline" className="min-h-[44px]" onClick={stopSelecting}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : null}
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
                selecting={selecting}
                selected={selection.has(s.id)}
                onToggle={toggleOne}
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

      <ConfirmDestructiveDialog
        open={confirmBulk}
        onOpenChange={setConfirmBulk}
        title={t("services.bulk_confirm_title", { count: selectedIds.length })}
        description={t("services.bulk_confirm_message")}
        confirmLabel={t("services.bulk_confirm_btn", { count: selectedIds.length })}
        pending={deleteServices.isPending}
        onConfirm={() => void handleBulkDelete()}
      />

      {view === "active" && !selecting && can('prestations', 'create') && (
        <Fab tutorial="services-new" onClick={() => void navigate('/prestations/nouveau')} />
      )}
    </div>
  );
}
