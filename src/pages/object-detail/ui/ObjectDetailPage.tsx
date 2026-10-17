import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { ArrowLeft, Archive, Edit, Loader2, MoreHorizontal, Upload } from 'lucide-react'
import {
  useObject,
  useArchiveObject,
  useChangeObjectStatus,
  STATUS_TRANSITIONS,
  type ObjectStatusTransition,
} from '@/features/objects'
import { useIsOwner } from '@/features/auth'
import { StatusBadge } from '@/entities/object'
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared'
import { ObjectInfoGrid } from './ObjectInfoGrid'
import { ObjectPackagesCard } from './ObjectPackagesCard'
import { ObjectStatsCard } from './ObjectStatsCard'

export function ObjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isOwner = useIsOwner()
  const archiveMutation = useArchiveObject()
  const statusMutation = useChangeObjectStatus()
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: object, isLoading, error } = useObject(id || '', !!id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (error || !object) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Объект не найден</h2>
        <p className="text-gray-500 mb-4">Объект не существует или недоступен</p>
        <Button onClick={() => navigate('/objects')}>Вернуться к списку</Button>
      </div>
    )
  }

  const isArchived = object.status === 'archived'
  const transitions = STATUS_TRANSITIONS[object.status] ?? []

  const handleStatus = async (to: ObjectStatusTransition) => {
    setActionError(null)
    try {
      await statusMutation.mutateAsync({ id: object.id, status: to })
    } catch (err) {
      const status = (err as AxiosError).response?.status
      setActionError(status === 409 ? 'Такой переход статуса недоступен.' : 'Не удалось сменить статус.')
    }
  }

  const handleArchive = async () => {
    setActionError(null)
    try {
      await archiveMutation.mutateAsync(object.id)
    } catch {
      setActionError('Не удалось архивировать объект.')
    } finally {
      setShowArchiveDialog(false)
    }
  }

  return (
    <div className="space-y-6">
      {actionError && (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {isArchived && (
        <Alert>
          <AlertDescription>Объект в архиве и доступен только для просмотра.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl break-words">{object.name}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Badge variant="outline">{object.code}</Badge>
                <StatusBadge status={object.status} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
              {!isArchived && (
                <Button size="sm" onClick={() => navigate(`/objects/${object.id}/upload`)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Загрузить документы
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Действия">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => navigate('/objects')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    К списку
                  </DropdownMenuItem>
                  {isOwner && !isArchived && (
                    <DropdownMenuItem onClick={() => navigate(`/objects/${object.id}/edit`)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Изменить
                    </DropdownMenuItem>
                  )}
                  {isOwner && transitions.length > 0 && <DropdownMenuSeparator />}
                  {isOwner &&
                    transitions.map((t) => (
                      <DropdownMenuItem
                        key={t.to}
                        disabled={statusMutation.isPending}
                        onClick={() => handleStatus(t.to)}
                      >
                        {t.label}
                      </DropdownMenuItem>
                    ))}
                  {isOwner && !isArchived && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setShowArchiveDialog(true)}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Архивировать
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ObjectInfoGrid object={object} />
        </CardContent>
      </Card>

      <ObjectStatsCard object={object} />

      <ObjectPackagesCard objectId={object.id} />

      <ConfirmDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={handleArchive}
        title="Архивировать объект?"
        description="Объект станет доступен только для просмотра. Это действие нельзя отменить."
        confirmText="Архивировать"
        variant="destructive"
        isLoading={archiveMutation.isPending}
      />
    </div>
  )
}
