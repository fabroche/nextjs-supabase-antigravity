"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { EditWorkflowDialog } from "./edit-workflow-dialog"
import { archiveWorkflow } from "@/lib/supabase/queries"
import type { DbWorkflowStats } from "@/lib/supabase/types"

interface WorkflowActionsMenuProps {
  workflow: DbWorkflowStats
  onMutated: () => void
  onArchived?: () => void
}

export function WorkflowActionsMenu({ workflow, onMutated, onArchived }: WorkflowActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  async function handleArchive() {
    setIsArchiving(true)
    try {
      await archiveWorkflow(workflow.id)
      onArchived ? onArchived() : onMutated()
    } catch {
      // silently ignore — user can retry
    } finally {
      setIsArchiving(false)
      setArchiveOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => e.preventDefault()}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              setEditOpen(true)
            }}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.preventDefault()
              setArchiveOpen(true)
            }}
          >
            <Archive className="mr-2 h-3.5 w-3.5" />
            Archivar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditWorkflowDialog
        workflow={workflow}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={onMutated}
      />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{workflow.name}</strong> dejará de aparecer en el dashboard.
              Sus ejecuciones históricas se conservan y el workflow puede restaurarse desde la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
