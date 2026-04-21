"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useBusiness } from "@/contexts/business-context"
import { updateWorkflowName, reassignWorkflow, fetchN8NInstances } from "@/lib/supabase/queries"
import type { DbWorkflowStats, DbN8NInstance } from "@/lib/supabase/types"

interface EditWorkflowDialogProps {
  workflow: DbWorkflowStats
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function EditWorkflowDialog({
  workflow,
  open,
  onOpenChange,
  onUpdated,
}: EditWorkflowDialogProps) {
  const { selectedBusiness } = useBusiness()
  const [name, setName] = useState(workflow.name)
  const [instanceId, setInstanceId] = useState(workflow.instance_id)
  const [instances, setInstances] = useState<DbN8NInstance[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(workflow.name)
      setInstanceId(workflow.instance_id)
      setError(null)
      fetchN8NInstances(selectedBusiness?.id)
        .then(setInstances)
        .catch(() => setInstances([]))
    }
  }, [open, workflow, selectedBusiness?.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setIsSubmitting(true)
    setError(null)
    try {
      const nameChanged     = name.trim() !== workflow.name
      const instanceChanged = instanceId !== workflow.instance_id

      if (nameChanged) await updateWorkflowName(workflow.id, name.trim())
      if (instanceChanged) await reassignWorkflow(workflow.id, instanceId)

      onOpenChange(false)
      onUpdated()
    } catch {
      setError("Error al guardar los cambios. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Editar workflow</DialogTitle>
          <DialogDescription>
            Modifica el nombre o la instancia de <strong>{workflow.name}</strong>.
            Cambiar la instancia actualiza también todas las ejecuciones históricas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="wf-name">Nombre</Label>
            <Input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wf-instance">Instancia</Label>
            <Select value={instanceId} onValueChange={setInstanceId}>
              <SelectTrigger id="wf-instance">
                <SelectValue placeholder="Selecciona una instancia" />
              </SelectTrigger>
              <SelectContent>
                {instances.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
