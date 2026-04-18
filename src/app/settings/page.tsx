"use client"

import { useState, useEffect, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchUserProfile, updateUserProfile, updateAvatarUrl } from "@/lib/supabase/queries"
import { createClient } from "@/lib/supabase/client"
import type { DbUserProfile } from "@/lib/supabase/types"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]

function getInitials(profile: DbUserProfile | null): string {
  if (profile?.full_name) {
    return profile.full_name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
  }
  return "?"
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<DbUserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Integrations tab
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [telegramId, setTelegramId] = useState("")
  const [notionPersonId, setNotionPersonId] = useState("")

  // Avatar tab
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarSaved, setAvatarSaved] = useState(false)

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

  // ── Integrations ──────────────────────────────────────────────────────────

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await updateUserProfile({
        telegram_id: telegramId.trim() || null,
        notion_person_id: notionPersonId.trim() || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  // ── Avatar ────────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarError("Formato no permitido. Usa PNG, JPG o WebP.")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setAvatarError("El archivo supera los 2 MB.")
      return
    }

    setPendingFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleUploadAvatar() {
    if (!pendingFile || !profile) return
    setIsUploading(true)
    setAvatarError(null)
    setAvatarSaved(false)

    try {
      const supabase = createClient()
      const ext = pendingFile.name.split(".").pop() ?? "jpg"
      const path = `${profile.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, pendingFile, { upsert: true, contentType: pendingFile.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path)

      await updateAvatarUrl(publicUrl)
      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev)
      setPendingFile(null)
      setAvatarSaved(true)
      setTimeout(() => setAvatarSaved(false), 3000)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Error al subir imagen")
    } finally {
      setIsUploading(false)
    }
  }

  const displayAvatar = avatarPreview ?? profile?.avatar_url ?? null

  return (
    <DashboardLayout>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-muted-foreground">
          Configura tu perfil e integraciones
        </p>
      </div>

      <Tabs defaultValue="perfil" className="max-w-lg">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="integraciones">Integraciones</TabsTrigger>
        </TabsList>

        {/* ── Perfil tab ───────────────────────────────────── */}
        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Foto de perfil</CardTitle>
              <CardDescription>
                PNG, JPG o WebP · máx. 2 MB
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {isLoading ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="h-9 w-32" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 text-lg">
                      <AvatarImage src={displayAvatar ?? undefined} alt="Avatar" />
                      <AvatarFallback>{getInitials(profile)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Cambiar foto
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {pendingFile ? pendingFile.name : "Sin archivo seleccionado"}
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_TYPES.join(",")}
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {avatarError && (
                    <p className="text-sm text-destructive">{avatarError}</p>
                  )}

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleUploadAvatar}
                      disabled={!pendingFile || isUploading}
                    >
                      {isUploading ? "Subiendo…" : "Guardar foto"}
                    </Button>
                    {avatarSaved && (
                      <span className="text-sm text-green-600">Foto actualizada</span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {profile && (
            <Card className="mt-4">
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
        </TabsContent>

        {/* ── Integraciones tab ────────────────────────────── */}
        <TabsContent value="integraciones">
          <Card>
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

                  {saveError && (
                    <p className="text-sm text-destructive">{saveError}</p>
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
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  )
}
