"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Loader2, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { testN8NConnection } from "@/lib/n8n/test-connection"
import {
  actionUpdateInstance,
  updateInstanceSchema,
  type UpdateInstanceInput,
} from "@/app/actions/n8n-instances"
import type { DbN8NInstance } from "@/lib/supabase/types"

interface EditInstanceDialogProps {
  instance: DbN8NInstance
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

function maskApiKey(key: string | null): string {
  if (!key) return ""
  if (key.length <= 4) return "••••"
  return `••••••••${key.slice(-4)}`
}

export function EditInstanceDialog({
  instance,
  open,
  onOpenChange,
  onUpdated,
}: EditInstanceDialogProps) {
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "fail">("idle")
  const [testError, setTestError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [changingKey, setChangingKey] = useState(false)

  const form = useForm<UpdateInstanceInput>({
    resolver: zodResolver(updateInstanceSchema),
    defaultValues: {
      id: instance.id,
      name: instance.name,
      environment: instance.environment,
      api_base_url: instance.api_base_url ?? "",
      api_key: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        id: instance.id,
        name: instance.name,
        environment: instance.environment,
        api_base_url: instance.api_base_url ?? "",
        api_key: "",
      })
      setTestState("idle")
      setTestError(null)
      setSubmitError(null)
      setChangingKey(false)
    }
  }, [open, instance, form])

  const apiBaseUrl = form.watch("api_base_url")
  const apiKey = form.watch("api_key")
  const canTest = changingKey && !!apiBaseUrl && !!apiKey && testState !== "testing"

  async function handleTest() {
    if (!apiBaseUrl || !apiKey) return
    setTestState("testing")
    setTestError(null)
    const result = await testN8NConnection(apiBaseUrl, apiKey)
    if (result.ok) {
      setTestState("ok")
    } else {
      setTestState("fail")
      setTestError(result.error ?? "Conexión fallida")
    }
  }

  async function onSubmit(values: UpdateInstanceInput) {
    setSubmitError(null)
    // If not changing the key, omit it from the update
    const payload: UpdateInstanceInput = {
      ...values,
      api_key: changingKey ? values.api_key : undefined,
    }
    const result = await actionUpdateInstance(payload)
    if ("error" in result) {
      setSubmitError(result.error ?? "Error desconocido")
      return
    }
    onOpenChange(false)
    onUpdated()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Editar instancia</DialogTitle>
          <DialogDescription>
            Modifica los datos de <strong>{instance.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entorno</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="production">Producción</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="development">Desarrollo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="api_base_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL base de la API</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e)
                        if (changingKey) setTestState("idle")
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>API Key</FormLabel>
              {!changingKey ? (
                <div className="flex items-center gap-3">
                  <Input
                    value={maskApiKey(instance.api_key)}
                    disabled
                    className="font-mono text-muted-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setChangingKey(true)}
                  >
                    Cambiar
                  </Button>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Nueva API key"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            setTestState("idle")
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {changingKey && (
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={!canTest}
                >
                  {testState === "testing" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wifi className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Probar conexión
                </Button>
                {testState === "ok" && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Conexión exitosa
                  </span>
                )}
                {testState === "fail" && (
                  <span className="text-sm text-destructive">{testError}</span>
                )}
              </div>
            )}

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  form.formState.isSubmitting ||
                  (changingKey && testState !== "ok")
                }
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
