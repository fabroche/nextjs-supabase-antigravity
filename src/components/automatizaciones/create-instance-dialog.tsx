"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Loader2, Plus, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useBusiness } from "@/contexts/business-context"
import { testN8NConnection } from "@/lib/n8n/test-connection"
import {
  createInstanceSchema,
  type CreateInstanceInput,
} from "@/app/actions/n8n-instances.schemas"
import { actionCreateInstance } from "@/app/actions/n8n-instances"

interface CreateInstanceDialogProps {
  onCreated: () => void
}

export function CreateInstanceDialog({ onCreated }: CreateInstanceDialogProps) {
  const { businesses, selectedBusiness, isAdmin } = useBusiness()
  const [open, setOpen] = useState(false)
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "fail">("idle")
  const [testError, setTestError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<CreateInstanceInput>({
    resolver: zodResolver(createInstanceSchema),
    defaultValues: {
      business_id: selectedBusiness?.id ?? "",
      instance_id: "",
      name: "",
      environment: "production",
      api_base_url: "",
      api_key: "",
    },
  })

  const apiBaseUrl = form.watch("api_base_url")
  const apiKey = form.watch("api_key")
  const canTest = !!apiBaseUrl && !!apiKey && testState !== "testing"

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

  async function onSubmit(values: CreateInstanceInput) {
    setSubmitError(null)
    const result = await actionCreateInstance(values)
    if ("error" in result) {
      setSubmitError(result.error ?? "Error desconocido")
      return
    }
    setOpen(false)
    form.reset()
    setTestState("idle")
    onCreated()
  }

  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (!value) {
      form.reset()
      setTestState("idle")
      setTestError(null)
      setSubmitError(null)
    }
  }

  if (!isAdmin) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva instancia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nueva instancia N8N</DialogTitle>
          <DialogDescription>
            Registra una instancia N8N para empezar a recibir webhooks.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {businesses.length > 1 && (
              <FormField
                control={form.control}
                name="business_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Negocio</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un negocio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {businesses.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Genzai Producción" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              name="instance_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instance ID</FormLabel>
                  <FormControl>
                    <Input placeholder="genzai-prod" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="api_base_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL base de la API</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://n8n.tudominio.com"
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

            <FormField
              control={form.control}
              name="api_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="n8n_api_..."
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

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || testState !== "ok"}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Guardar instancia
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
