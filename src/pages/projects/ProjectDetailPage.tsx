import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Euro,
  Camera,
  FileText,
  Send,
  AlertTriangle,
  Download,
  Users,
  ChevronRight,
  Loader2,
  Pencil,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Stepper } from "@/components/common/Stepper";
import { Avatar } from "@/components/common/Avatar";
import {
  useProject,
  useUpdateProjectStatus,
  useAssignUsers,
  useUnassignUser,
  useDeleteProject,
} from "@/hooks/use-projects";
import { usePhotos } from "@/hooks/use-photos";
import { useReport, useReportPdfUrl, useSendReport, useGenerateReport } from "@/hooks/use-report";
import { useCreateSignatureRequest, useSendReserveLiftRequest } from "@/hooks/use-signature";
import { useUsers } from "@/hooks/use-users";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDate, formatCurrency, fullName } from "@/lib/utils";
import type { Photo, ProjectStatus } from "@/types/api";
import { PhotoLightbox } from "@/components/common/PhotoLightbox";

const NEXT_STATUS: Partial<Record<ProjectStatus, ProjectStatus>> = {
  DRAFT: "PLANNED",
  PLANNED: "IN_PROGRESS",
  IN_PROGRESS: "AWAITING_SIGNATURE",
  DISPUTED: "IN_PROGRESS",
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { can } = usePermissions();
  const [lightbox, setLightbox] = useState<{
    photos: Photo[];
    index: number;
    title?: string;
  } | null>(null);

  const TRANSITION_LABELS: Partial<Record<ProjectStatus, string>> = {
    DRAFT: t('project.transition_plan'),
    PLANNED: t('project.transition_start'),
    IN_PROGRESS: t('project.transition_close'),
    DISPUTED: t('project.transition_resume'),
  };

  const { data: project, isLoading } = useProject(id ?? "");
  const { data: photos } = usePhotos(id ?? "");
  const { data: report } = useReport(id ?? "");
  const { data: pdfData } = useReportPdfUrl(
    id ?? "",
    project?.status === "COMPLETED",
  );
  const { data: allUsers } = useUsers({ enabled: can('chantiers', 'update') });

  const updateStatus = useUpdateProjectStatus(id ?? "");
  const createSigRequest = useCreateSignatureRequest(id ?? "");
  const sendReserveLift = useSendReserveLiftRequest(id ?? "");
  const sendReport = useSendReport(id ?? "");
  const generateReport = useGenerateReport(id ?? "");
  const assignUsers = useAssignUsers(id ?? "");
  const unassignUser = useUnassignUser(id ?? "");
  const deleteProject = useDeleteProject();

  if (isLoading) {
    return (
      <div className="space-y-4 pb-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">{t('project.not_found')}</p>
        <Button
          variant="ghost"
          className="mt-4 min-h-[44px]"
          onClick={() => void navigate(-1)}
        >
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const beforePhotos = photos?.filter((p) => p.type === "BEFORE") ?? [];
  const afterPhotos = photos?.filter((p) => p.type === "AFTER") ?? [];
  const assignedUserIds = new Set(project.assignments.map((a) => a.userId));
  const assignedUsers = project.assignments.map((a) => a.user);
  const isLocked = ["AWAITING_SIGNATURE", "AWAITING_RESERVE_LIFT", "COMPLETED", "DISPUTED"].includes(
    project.status,
  );

  async function handleTransition() {
    const next = NEXT_STATUS[project!.status];
    if (!next) return;
    try {
      await updateStatus.mutateAsync(next);
      toast.success(t('project.status_updated'));
    } catch {
      toast.error(t('project.status_error'));
    }
  }

  async function handleSendSignature() {
    try {
      await createSigRequest.mutateAsync('remote');
      toast.success(t('project.sig_sent'));
    } catch {
      toast.error(t('project.sig_error'));
    }
  }

  async function handleSignOnsite() {
    try {
      const req = await createSigRequest.mutateAsync('onsite');
      window.location.href = `/sign/${req.token}?back=1`;
    } catch {
      toast.error(t('project.sig_error'));
    }
  }

  async function handleSendReserveLift() {
    try {
      await sendReserveLift.mutateAsync('remote');
      toast.success(t('project.sig_sent'));
    } catch {
      toast.error(t('project.sig_error'));
    }
  }

  async function handleReserveLiftOnsite() {
    try {
      const req = await sendReserveLift.mutateAsync('onsite');
      window.location.href = `/sign/${req.token}?back=1`;
    } catch {
      toast.error(t('project.sig_error'));
    }
  }

  async function handleAssign(userId: string) {
    try {
      await assignUsers.mutateAsync([userId]);
      toast.success(t('project.member_added'));
    } catch {
      toast.error(t('project.member_add_error'));
    }
  }

  async function handleUnassign(userId: string) {
    try {
      await unassignUser.mutateAsync(userId);
      toast.success(t('project.member_removed'));
    } catch {
      toast.error(t('project.member_remove_error'));
    }
  }

  const availableToAssign =
    allUsers?.filter((u) => !assignedUserIds.has(u.id)) ?? [];

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          onClick={() => void navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">
              {project.reference}
            </span>
            <StatusBadge status={project.status} />
          </div>
          <h1 className="mt-0.5 text-lg font-bold leading-snug">
            {project.title}
          </h1>
        </div>
        {can('chantiers', 'update') && !isLocked && (
          <button
            aria-label={t('project.edit_aria')}
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
            onClick={() => void navigate(`/chantiers/${id}/modifier`)}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {can('chantiers', 'delete') && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                aria-label={t('common.delete')}
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-card text-red-600 active:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('project.delete_confirm_title')}</AlertDialogTitle>
                <AlertDialogDescription>{t('project.delete_confirm_message')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={async () => {
                    try {
                      await deleteProject.mutateAsync(id!);
                      toast.success(t('project.delete_success'));
                      void navigate('/chantiers');
                    } catch {
                      toast.error(t('project.delete_error'));
                    }
                  }}
                >
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* DISPUTED warning */}
      {project.status === "DISPUTED" && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-800">
              {(project.signatureRequests?.length ?? 0) > 0
                ? t('project.sig_refused')
                : t('project.disputed_title')}
            </p>
            {project.signatureRequests?.[0]?.refusalComment && (
              <p className="text-xs text-red-700 mt-1 italic">
                « {project.signatureRequests[0].refusalComment} »
              </p>
            )}
          </div>
        </div>
      )}

      {/* Refusal history (visible on all statuses) */}
      {(project.signatureRequests?.length ?? 0) > 0 && project.status !== "DISPUTED" && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-orange-800">
            {t('project.refusal_history')}
          </p>
          {project.signatureRequests!.map((r) => (
            <div key={r.id} className="space-y-0.5">
              <p className="text-xs text-orange-700">
                {new Date(r.refusedAt).toLocaleDateString(i18n.language, {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {r.refusalComment && (
                <p className="text-xs text-orange-800 italic">« {r.refusalComment} »</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stepper */}
      {project.status !== "DISPUTED" && project.status !== "AWAITING_RESERVE_LIFT" && (
        <Card className="p-4">
          <Stepper status={project.status} />
        </Card>
      )}

      {/* Action button */}
      {can('chantiers', 'update') && NEXT_STATUS[project.status] && (
        <Button
          className="w-full min-h-[48px] text-base"
          onClick={() => void handleTransition()}
          disabled={updateStatus.isPending}
        >
          {updateStatus.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {TRANSITION_LABELS[project.status]}
        </Button>
      )}

      {/* Reserve lift options */}
      {project.status === "AWAITING_RESERVE_LIFT" && can('chantiers', 'update') && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground px-1">{t('project.send_reserve_lift')}</p>
          <Button
            variant="outline"
            className="w-full min-h-[48px] gap-3 justify-start"
            onClick={() => void handleReserveLiftOnsite()}
            disabled={sendReserveLift.isPending}
          >
            <Smartphone className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium leading-tight">{t('project.sig_onsite')}</p>
              <p className="text-xs text-muted-foreground leading-tight">{t('project.sig_onsite_sub')}</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full min-h-[48px] gap-3 justify-start"
            onClick={() => void handleSendReserveLift()}
            disabled={sendReserveLift.isPending}
          >
            <Send className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium leading-tight">
                {sendReserveLift.isPending ? t('project.sending') : t('project.send_sig_link')}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">{t('project.sig_remote_sub')}</p>
            </div>
          </Button>
        </div>
      )}

      {/* Signature options */}
      {project.status === "AWAITING_SIGNATURE" && can('chantiers', 'update') && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground px-1">{t('project.sig_choose')}</p>
          <Button
            variant="outline"
            className="w-full min-h-[48px] gap-3 justify-start"
            onClick={() => void handleSignOnsite()}
            disabled={createSigRequest.isPending}
          >
            <Smartphone className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium leading-tight">{t('project.sig_onsite')}</p>
              <p className="text-xs text-muted-foreground leading-tight">{t('project.sig_onsite_sub')}</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full min-h-[48px] gap-3 justify-start"
            onClick={() => void handleSendSignature()}
            disabled={createSigRequest.isPending}
          >
            <Send className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium leading-tight">
                {createSigRequest.isPending ? t('project.sending') : t('project.send_sig_link')}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">{t('project.sig_remote_sub')}</p>
            </div>
          </Button>
        </div>
      )}

      {/* Generate report — COMPLETED but no PDF yet */}
      {project.status === "COMPLETED" && pdfData && !pdfData.pdfUrl && can('chantiers', 'update') && (
        <Button
          variant="outline"
          className="w-full min-h-[48px] gap-2"
          disabled={generateReport.isPending}
          onClick={async () => {
            try {
              await generateReport.mutateAsync();
              toast.success(t('project.report_generated'));
            } catch {
              toast.error(t('project.report_generate_error'));
            }
          }}
        >
          <FileText className="h-4 w-4" />
          {generateReport.isPending ? t('project.generating') : t('project.generate_report')}
        </Button>
      )}

      {/* PDF download + send to client */}
      {project.status === "COMPLETED" && pdfData?.pdfUrl && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <a
              href={pdfData.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              {t('common.download')}
            </a>
            {project.client.email && can('chantiers', 'update') && (
              <Button
                variant="outline"
                className="flex-1 min-h-[48px] gap-2"
                disabled={sendReport.isPending}
                onClick={async () => {
                  try {
                    await sendReport.mutateAsync();
                    toast.success(t('project.report_sent'));
                  } catch {
                    toast.error(t('project.report_send_error'));
                  }
                }}
              >
                <Send className="h-4 w-4" />
                {sendReport.isPending ? t('project.sending') : t('project.send_to_client')}
              </Button>
            )}
          </div>
          {report?.lastSentAt && (
            <p className="text-center text-xs text-muted-foreground">
              {t('project.report_sent_on', {
                date: new Date(report.lastSentAt).toLocaleDateString(i18n.language, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }),
                time: new Date(report.lastSentAt).toLocaleTimeString(i18n.language, {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </p>
          )}
        </div>
      )}

      {/* Info */}
      <Card className="divide-y">
        <div className="flex items-start gap-3 p-4">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{t('project.info_address')}</p>
            <p className="text-sm font-medium">{project.address}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{t('project.info_client')}</p>
            <p className="text-sm font-medium">{fullName(project.client)}</p>
            {project.client.email && (
              <p className="text-xs text-muted-foreground">
                {project.client.email}
              </p>
            )}
          </div>
          {can('clients', 'update') && (
            <button
              aria-label={t('project.edit_client_aria')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
              onClick={() => navigate(`/clients/${project.client.id}?edit=true`)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {(project.startDate || project.expectedEndDate) && (
          <div className="flex items-start gap-3 p-4">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('project.info_dates')}</p>
              <p className="text-sm">
                {formatDate(project.startDate)} →{" "}
                {formatDate(project.expectedEndDate)}
              </p>
            </div>
          </div>
        )}
        {project.quoteAmount && (
          <div className="flex items-start gap-3 p-4">
            <Euro className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('project.info_quote')}</p>
              <p className="text-sm font-semibold">
                {formatCurrency(project.quoteAmount)}
              </p>
            </div>
          </div>
        )}
        {project.description && (
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t('project.info_description')}</p>
            <p className="text-sm whitespace-pre-wrap">{project.description}</p>
          </div>
        )}
        {project.notes && (
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{t('project.info_notes')}</p>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {project.notes}
            </p>
          </div>
        )}
      </Card>

      {/* Team */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">{t('project.team')}</h2>
        <Card className="divide-y">
          {assignedUsers.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              {t('project.no_member')}
            </p>
          )}
          {assignedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-4 min-h-[56px]"
            >
              <Avatar
                id={user.id}
                firstName={user.firstName}
                lastName={user.lastName}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{fullName(user)}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.customRole?.name ?? (user.role === 'ADMIN' ? t('users.role_admin') : t('users.role_member'))}
                </p>
              </div>
              {can('chantiers', 'update') && !isLocked && (
                <button
                  className="text-xs text-red-600 min-h-[44px] px-2"
                  onClick={() => void handleUnassign(user.id)}
                >
                  {t('project.remove_member')}
                </button>
              )}
            </div>
          ))}
        </Card>

        {can('chantiers', 'update') && !isLocked && availableToAssign.length > 0 && (
          <Card className="divide-y">
            <p className="p-3 text-xs font-medium text-muted-foreground">
              {t('project.add_member')}
            </p>
            {availableToAssign.map((user) => (
              <button
                key={user.id}
                onClick={() => void handleAssign(user.id)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-muted min-h-[56px]"
              >
                <Avatar
                  id={user.id}
                  firstName={user.firstName}
                  lastName={user.lastName}
                  size="sm"
                />
                <span className="flex-1 text-sm">{fullName(user)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </Card>
        )}
      </div>

      {/* Photos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('project.photos')}</h2>
          <button
            className="flex items-center gap-1 text-xs text-primary font-medium min-h-[44px]"
            onClick={() => void navigate(`/chantiers/${id}/photos`)}
          >
            <Camera className="h-3.5 w-3.5" />
            {isLocked ? t('project.view_photos') : t('project.manage_photos')}
          </button>
        </div>
        {(photos ?? []).length === 0 ? (
          isLocked ? (
            <p className="text-sm text-muted-foreground italic">{t('project.no_photo')}</p>
          ) : (
            <button
              className="w-full flex items-center gap-2 rounded-lg border border-dashed p-3 text-muted-foreground transition-colors active:bg-muted"
              onClick={() => void navigate(`/chantiers/${id}/photos`)}
            >
              <Camera className="h-4 w-4 shrink-0" />
              <span className="text-sm">{t('project.no_photo_add')}</span>
            </button>
          )
        ) : (
          <div className="space-y-3">
            {[
              { label: t('project.photos_before'), list: beforePhotos },
              { label: t('project.photos_after'), list: afterPhotos },
            ].map(({ label, list }) => (
              <div key={label} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {label.toUpperCase()}{" "}
                  <span className="font-normal">({list.length})</span>
                </p>
                {list.length === 0 ? (
                  <button
                    className="text-xs text-muted-foreground italic"
                    onClick={() => void navigate(`/chantiers/${id}/photos`)}
                  >
                    {t('project.no_photo_add')}
                  </button>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {list.slice(-5).map((photo, i) => (
                      <button
                        key={photo.id}
                        onClick={() =>
                          setLightbox({
                            photos: list,
                            index: i,
                            title: `Photos ${label.toLowerCase()}`,
                          })
                        }
                      >
                        <img
                          src={photo.signedUrl ?? ""}
                          alt=""
                          className="h-24 w-24 shrink-0 rounded-md object-cover bg-muted"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          title={lightbox.title}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Report */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('project.report')}</h2>
          {can('chantiers', 'update') && !isLocked && (
            <button
              className="flex items-center gap-1 text-xs text-primary font-medium min-h-[44px]"
              onClick={() => void navigate(`/chantiers/${id}/rapport`)}
            >
              <FileText className="h-3.5 w-3.5" />
              {t('project.edit_report')}
            </button>
          )}
        </div>
        <Card className="p-4">
          {report?.comment ? (
            <p className="text-sm whitespace-pre-wrap">{report.comment}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('project.no_comment')}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
