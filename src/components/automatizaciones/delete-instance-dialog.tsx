"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { actionArchiveInstance } from "@/app/actions/n8n-instances"

interface DeleteInstanceDialogProps {
  instanceId: string
  instanceName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeleteInstanceDialog({
  instanceId,
  instanceName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteInstanceDialogProps) {
  const [confirmation, setConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canConfirm = confirmation === instanceName && !isDeleting

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)
    const result = await actionArchiveInstance(instanceId)
    if ("error" in result) {
      setError(result.error ?? "Error desconocido")
      setIsDeleting(false)
      return
    }
    onOpenChange(false)
    setConfirmation("")
    onDeleted()
  }

  function handleOpenChange(value: boolean) {
    if (!value) setConfirmation("")
    setError(null)
    onOpenChange(value)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar instancia</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Esta acción archivará <strong>{instanceName}</strong>. El histórico de
                ejecuciones se conserva, pero la instancia dejará de aparecer en el dashboard.
              </p>
              <p className="text-sm">
                Escribe <strong>{instanceName}</strong> para confirmar:
              </p>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={instanceName}
                autoComplete="off"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!canConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
