import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Camera, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PhotoLightbox } from '@/components/common/PhotoLightbox'
import { usePhotos, useUploadPhoto, useDeletePhoto } from '@/hooks/use-photos'
import { useProject } from '@/hooks/use-projects'
import { usePermissions } from '@/hooks/use-permissions'
import type { Photo, PhotoType } from '@/types/api'
import { TutorialHelpButton } from '@/tutorials/TutorialHelpButton'

function PhotoSection({
  type,
  label,
  projectId,
  locked,
  canDelete,
}: {
  type: PhotoType
  label: string
  projectId: string
  locked: boolean
  canDelete: boolean
}) {
  const { t } = useTranslation()
  const { data: photos } = usePhotos(projectId)
  const upload = useUploadPhoto()
  const deletePhoto = useDeletePhoto(projectId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; index: number; title: string } | null>(null)

  const filtered = photos?.filter((p) => p.type === type) ?? []

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await upload.mutateAsync({
        projectId,
        file,
        type,
        order: filtered.length,
      })
      toast.success(t('photos.photo_added'))
    } catch {
      toast.error(t('photos.upload_error'))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3" data-tutorial={`photos-${type.toLowerCase()}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {label} <span className="text-muted-foreground font-normal">({filtered.length})</span>
        </h2>
        {!locked && (
          <button
            className="flex min-h-[44px] min-w-[44px] items-center justify-center"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <ImagePlus className="h-5 w-5 text-primary" />
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e)}
      />

      {filtered.length === 0 ? (
        locked ? (
          <p className="text-sm text-muted-foreground italic">{t('photos.no_photo')}</p>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted py-4 text-muted-foreground transition-colors active:bg-muted"
          >
            <Camera className="h-5 w-5" />
            <span className="text-sm md:hidden">{t('photos.take_photo', { label: label.toLowerCase() })}</span>
            <span className="hidden text-sm md:inline">{t('photos.import_photo', { label: label.toLowerCase() })}</span>
          </button>
        )
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map((photo, i) => (
            <div key={photo.id} className="relative">
              <button
                className="w-full"
                onClick={() => setLightbox({ photos: filtered, index: i, title: t(type === 'BEFORE' ? 'photos.title_before' : 'photos.title_after') })}
              >
                <img
                  src={photo.signedUrl ?? ''}
                  alt={`${label} ${photo.order}`}
                  className="aspect-square w-full rounded-lg object-cover bg-muted"
                />
              </button>
              {canDelete && (
                <button
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                  disabled={deletingId === photo.id}
                  onClick={async () => {
                    setDeletingId(photo.id)
                    try {
                      await deletePhoto.mutateAsync(photo.id)
                      toast.success(t('photos.photo_deleted'))
                    } catch {
                      toast.error(t('photos.delete_error'))
                    } finally {
                      setDeletingId(null)
                    }
                  }}
                >
                  {deletingId === photo.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          ))}
          {!locked && (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-muted text-muted-foreground transition-colors active:bg-muted"
            >
              <Camera className="h-6 w-6" />
            </button>
          )}
        </div>
      )}

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          title={lightbox.title}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}

const LOCKED_STATUSES = ['AWAITING_SIGNATURE', 'COMPLETED', 'DISPUTED']

export function PhotosPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: project } = useProject(id ?? '')
  const { can } = usePermissions()

  if (!id) return null

  const locked = project ? LOCKED_STATUSES.includes(project.status) : false
  const canDelete = !locked && can('chantiers', 'update')

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card active:bg-muted"
          data-tutorial="photos-back"
          onClick={() => void navigate(`/chantiers/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">{t('photos.title')}</h1>
        <TutorialHelpButton scope="photos" className="ml-auto h-10 w-10 shrink-0" />
      </div>

      {locked && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          {t('photos.locked_notice')}
        </div>
      )}

      <PhotoSection type="BEFORE" label={t('photos.before')} projectId={id} locked={locked} canDelete={canDelete} />
      <PhotoSection type="AFTER" label={t('photos.after')} projectId={id} locked={locked} canDelete={canDelete} />

      <Button
        variant="outline"
        className="w-full min-h-[44px]"
        onClick={() => void navigate(`/chantiers/${id}`)}
      >
        {t('photos.back_to_project')}
      </Button>
    </div>
  )
}
