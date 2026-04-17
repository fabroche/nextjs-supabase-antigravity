"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditInstanceDialog } from "./edit-instance-dialog"
import { DeleteInstanceDialog } from "./delete-instance-dialog"
import type { DbN8NInstance } from "@/lib/supabase/types"

interface InstanceActionsMenuProps {
  instance: DbN8NInstance
  onMutated: () => void
}

export function InstanceActionsMenu({ instance, onMutated }: InstanceActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

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
              setDeleteOpen(true)
            }}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditInstanceDialog
        instance={instance}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={onMutated}
      />

      <DeleteInstanceDialog
        instanceId={instance.id}
        instanceName={instance.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onMutated}
      />
    </>
  )
}
