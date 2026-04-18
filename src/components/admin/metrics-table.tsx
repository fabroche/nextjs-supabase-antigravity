"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { actionUpdateMetricDefinition, actionReorderMetricDefinitions } from "@/app/actions/metric-definitions"
import type { DbMetricDefinition } from "@/lib/supabase/types"

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  instance: "Instancia",
  workflow: "Workflow",
}

const FORMAT_LABELS: Record<string, string> = {
  number: "Número",
  currency: "Moneda",
  percent: "Porcentaje",
  tokens: "Tokens",
}

interface SortableRowProps {
  definition: DbMetricDefinition
  onLabelSave: (id: string, label: string) => Promise<void>
  onToggleActive: (id: string, isActive: boolean) => Promise<void>
}

function SortableRow({ definition, onLabelSave, onToggleActive }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: definition.id,
  })
  const [label, setLabel] = useState(definition.label)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function handleLabelBlur() {
    if (label === definition.label) { setEditing(false); return }
    setSaving(true)
    await onLabelSave(definition.id, label)
    setSaving(false)
    setEditing(false)
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleLabelBlur}
              onKeyDown={(e) => { if (e.key === "Enter") handleLabelBlur() }}
              className="h-7 text-sm w-36"
              autoFocus
            />
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </div>
        ) : (
          <button
            className="text-sm text-left hover:underline"
            onClick={() => setEditing(true)}
          >
            {label}
          </button>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">{SCOPE_LABELS[definition.scope] ?? definition.scope}</Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {FORMAT_LABELS[definition.format] ?? definition.format}
      </TableCell>
      <TableCell>
        <Switch
          checked={definition.is_active}
          onCheckedChange={(v) => onToggleActive(definition.id, v)}
        />
      </TableCell>
    </TableRow>
  )
}

interface MetricsTableProps {
  initialDefinitions: DbMetricDefinition[]
}

export function MetricsTable({ initialDefinitions }: MetricsTableProps) {
  const [items, setItems] = useState(initialDefinitions)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      display_order: idx,
    }))
    setItems(reordered)
    await actionReorderMetricDefinitions(reordered.map(({ id, display_order }) => ({ id, display_order })))
  }

  async function handleLabelSave(id: string, label: string) {
    await actionUpdateMetricDefinition({ id, label })
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, label } : i)))
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    await actionUpdateMetricDefinition({ id, is_active: isActive })
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: isActive } : i)))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Label</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Formato</TableHead>
              <TableHead>Activo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((def) => (
              <SortableRow
                key={def.id}
                definition={def}
                onLabelSave={handleLabelSave}
                onToggleActive={handleToggleActive}
              />
            ))}
          </TableBody>
        </Table>
      </SortableContext>
    </DndContext>
  )
}
