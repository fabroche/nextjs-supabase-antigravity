"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchUserProfile, updateUserProfile } from "@/lib/supabase/queries"
import type { DbUserProfile } from "@/lib/supabase/types"

export default function SettingsPage() {
  const [profile, setProfile] = useState<DbUserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [telegramId, setTelegramId] = useState("")
  const [notionPersonId, setNotionPersonId] = useState("")

  useEffect(() => {
    fetchUserProfile()
      .then((p) => {
        setProfile(p)
        setTelegramId(p?.telegram_id ?? "")
        setNotionPersonId(p?.notion_person_id ?? "")
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateUserProfile({
        telegram_id: telegramId.trim() || null,
        notion_person_id: notionPersonId.trim() || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">
          Configura tu perfil e integraciones
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Integraciones</CardTitle>
          <CardDescription>
            Vincula tu cuenta con otras plataformas para recibir notificaciones personales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-64" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-64" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="telegram-id">Telegram ID</Label>
                <Input
                  id="telegram-id"
                  placeholder="Ej: 123456789"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Tu ID numérico de Telegram. Consúltalo enviando un mensaje a{" "}
                  <span className="font-mono">@userinfobot</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notion-id">Notion Person ID</Label>
                <Input
                  id="notion-id"
                  placeholder="Ej: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={notionPersonId}
                  onChange={(e) => setNotionPersonId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  UUID de tu usuario en Notion. Lo encuentras en la URL de tu perfil.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Guardando…" : "Guardar cambios"}
                </Button>
                {saved && (
                  <span className="text-sm text-green-600">Cambios guardados</span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {profile && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Información de cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rol</span>
              <span className="capitalize font-medium">{profile.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Última actualización</span>
              <span>{new Date(profile.updated_at).toLocaleDateString("es")}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}
