# 🔧 FIX: Supabase Realtime — Kong no resuelve el upstream

> **Contexto**: Documento para el agente con acceso al servidor Hostinger donde corre Dokploy + Supabase self-hosted.
>
> **Branch**: `fix/supabase-realtime-websocket`
>
> **Fecha**: 2026-04-09
>
> **Prioridad**: ALTA — Realtime completamente roto en producción

---

## 🎯 Causa raíz (ya diagnosticada)

**Kong no puede resolver vía DNS de Docker el hostname del contenedor del servicio Realtime.** El plugin de upstream del `kong.yml` apunta a un hostname que no existe en la red Docker actual (probablemente porque Dokploy renombró el contenedor o porque la versión de Supabase cambió el nombre del servicio).

**No es problema de:** la app Next.js, la base de datos, las migraciones, RLS, JWT, headers de WebSocket, ni Traefik. Todo eso está verificado y funciona. El problema es **solo** la línea del `kong.yml` que define el upstream URL para la ruta `/realtime/v1/`.

---

## 🧪 Evidencia que ya tenemos (no la repitas)

Estos tests ya están hechos desde el cliente, no hace falta volver a correrlos:

| Test | Resultado | Conclusión |
|------|-----------|------------|
| `curl https://supabase.genzai.cloud/realtime/v1/` (sin apikey) | `401 Unauthorized` desde `Server: kong/2.8.1` con `{"message":"No API key found in request"}` | ✅ Kong tiene la ruta `/realtime/v1/` configurada y exige apikey |
| `curl https://supabase.genzai.cloud/realtime/v1/?apikey=<ANON_KEY>` | `503 Service Unavailable` con `{"message":"name resolution failed"}` y `Server: kong/2.8.1` | 🔥 **Kong valida la apikey OK pero no puede resolver el hostname del backend Realtime** |
| `SELECT * FROM pg_publication_tables WHERE pubname='supabase_realtime'` | Devuelve `activity_feed` y `notifications` | ✅ Migración 005 aplicada correctamente |
| Studio (`https://supabase.genzai.cloud`) responde y permite SQL queries | OK | ✅ Kong + Traefik + DB funcionan para HTTP normal |

**El error `name resolution failed` viene del propio Kong intentando hacer DNS lookup del upstream**, no del servicio Realtime. Esto es 100% un problema de cómo `kong.yml` referencia al contenedor.

---

## 🛠️ Diagnóstico (4 pasos en el servidor)

### Paso 1 — ¿Cómo se llama realmente el contenedor de Realtime?

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | grep -i realtime
```

**Anota el nombre exacto.** Posibles nombres según la versión/instalación:
- `supabase-realtime`
- `realtime-dev.supabase-realtime`
- `supabase-realtime-1`
- `supabase_realtime_1`
- `<dokploy-prefix>-realtime-<hash>`

Si **no aparece nada** → el contenedor no está corriendo. Salta a [Solución D](#solución-d).

---

### Paso 2 — ¿Qué hostname tiene configurado Kong para el upstream?

```bash
docker exec supabase-kong cat /home/kong/kong.yml | grep -A 10 "name: realtime"
```

Busca la sección que define el service de Realtime. Vas a ver algo como:

```yaml
- name: realtime-v1
  url: http://realtime-dev.supabase-realtime:4000/socket
  routes:
    - name: realtime-v1
      strip_path: true
      paths:
        - /realtime/v1/
```

**Compara el hostname del `url:` con el nombre real del contenedor del Paso 1.** Si no coinciden, **esa es la raíz del problema** y vas a la [Solución A](#solución-a).

> **Nota**: el archivo puede estar en otra ruta. Alternativas:
> - `/etc/kong/kong.yml`
> - `/var/lib/kong/kong.yml`
> - Ruta montada como volumen: `docker inspect supabase-kong | grep -i kong.yml`

---

### Paso 3 — ¿Están Kong y Realtime en la misma red Docker?

```bash
# Listar redes de Kong
docker inspect supabase-kong --format '{{json .NetworkSettings.Networks}}' | jq 'keys'

# Listar redes del contenedor de Realtime (usa el nombre del Paso 1)
docker inspect <NOMBRE_REAL_CONTAINER_REALTIME> --format '{{json .NetworkSettings.Networks}}' | jq 'keys'
```

**Si las dos listas no comparten al menos una red en común** → Docker DNS no resuelve entre ellos. Vas a la [Solución B](#solución-b).

---

### Paso 4 — Verificar resolución DNS desde Kong

Una vez que sepas el nombre real del contenedor (Paso 1), prueba si Kong lo puede resolver:

```bash
docker exec supabase-kong getent hosts <NOMBRE_REAL_CONTAINER_REALTIME>
```

- **Devuelve una IP** → DNS funciona, problema es solo `kong.yml` mal configurado → [Solución A](#solución-a)
- **No devuelve nada / error** → confirma problema de red → [Solución B](#solución-b)

---

## ✅ Soluciones

### Solución A — Hostname del `kong.yml` no coincide con el contenedor real

Edita el `kong.yml` (o el archivo donde esté la config de Kong) y reemplaza el `url:` del service `realtime-v1` con el hostname real del contenedor.

**Ejemplo**, si el contenedor real se llama `supabase-realtime`:

```yaml
- name: realtime-v1
  url: http://supabase-realtime:4000/socket
  routes:
    - name: realtime-v1
      strip_path: true
      paths:
        - /realtime/v1/
```

> **OJO con el path `/socket`**: el servicio Realtime de Supabase escucha en `/socket` por defecto. NO lo quites del `url:`. Solo cambia el hostname.
>
> **OJO con el puerto**: verifica que el contenedor de Realtime expone realmente el puerto 4000 con `docker port <NOMBRE_REAL>`. Algunas versiones usan otro puerto interno.

Recarga Kong sin reiniciar:

```bash
docker exec supabase-kong kong reload
```

Si Kong corre con config declarativa montada como volumen, también puede requerir reiniciar el contenedor:

```bash
docker restart supabase-kong
```

---

### Solución B — Kong y Realtime en redes distintas

Conecta el contenedor de Realtime a la misma red que Kong:

```bash
# Obtener el nombre de la red de Kong
NETWORK=$(docker inspect supabase-kong --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' | head -1)

# Conectar Realtime a esa red
docker network connect $NETWORK <NOMBRE_REAL_CONTAINER_REALTIME>
```

Verifica:

```bash
docker exec supabase-kong getent hosts <NOMBRE_REAL_CONTAINER_REALTIME>
```

**Si esto se hizo manualmente, no es persistente.** Para que sobreviva un reinicio del stack, hay que arreglar el `docker-compose.yml` (o la config equivalente de Dokploy) para que ambos servicios declaren la misma red.

---

### Solución D — Contenedor de Realtime no existe

Si el Paso 1 no devolvió ningún contenedor de Realtime, el servicio nunca se desplegó (o se cayó y Dokploy no lo levantó).

1. Revisa el stack de Supabase en Dokploy → confirma que el servicio `realtime` está habilitado
2. Si falta, agrégalo desde el `docker-compose.yml` oficial de Supabase self-hosted
3. Levanta el servicio:
   ```bash
   docker compose up -d realtime
   ```
4. Verifica logs:
   ```bash
   docker logs <NOMBRE_REAL_CONTAINER_REALTIME> --tail 100
   ```

---

## ✅ Verificación final

Después de aplicar la fix, ejecuta estos 3 tests **en orden**:

### Test 1 — Desde cualquier máquina, sin acceso al servidor

```bash
curl -i -m 10 "https://supabase.genzai.cloud/realtime/v1/?apikey=<ANON_KEY>"
```

**Esperado**: cualquier cosa **menos** `503 name resolution failed`. Lo más probable es `200`, `404`, o `426 Upgrade Required` desde el servicio Realtime. Cualquiera de esos confirma que Kong ya alcanza al backend.

### Test 2 — Upgrade WebSocket directo

```bash
curl -i -m 10 \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "https://supabase.genzai.cloud/realtime/v1/websocket?apikey=<ANON_KEY>&vsn=1.0.0"
```

**Esperado**: `101 Switching Protocols`.

### Test 3 — End-to-end desde el navegador

1. Abre `https://dashboard.genzai.cloud` (la app Next.js)
2. Login → ve al dashboard
3. La sección "Actividad Reciente" debe mostrar **"En vivo"** con icono Wifi verde (no "Desconectado")
4. En SQL Editor de Supabase corre:
   ```sql
   INSERT INTO activity_feed (source, event_type, actor, action, description)
   VALUES ('telegram', 'test', 'admin', 'test', 'Test Realtime — si ves esto en el dashboard sin recargar, funciona ✅');
   ```
5. El evento debe aparecer **instantáneamente** en el dashboard sin recargar

---

## 📁 Archivos del proyecto Next.js (NO los toques)

Estos archivos están bien y NO necesitan cambios. Listados solo como referencia por si el agente quiere entender el flujo del cliente:

- `src/hooks/use-activity-feed.ts` — suscribe a `activity_feed`
- `src/hooks/use-notifications.ts` — suscribe a `notifications`
- `src/lib/supabase/client.ts` — cliente browser
- `src/components/dashboard/activity-feed.tsx` — UI del feed con indicador de conexión
- `supabase/migrations/005_notifications.sql` — tablas + `ALTER PUBLICATION`

URL Supabase: `https://supabase.genzai.cloud`
WebSocket target: `wss://supabase.genzai.cloud/realtime/v1/websocket`

---

## 📝 Cuando termines

Documenta qué solución aplicaste exactamente:
- ¿Cuál era el hostname mal configurado en `kong.yml`?
- ¿Cuál es el nombre real del contenedor de Realtime?
- ¿Tuviste que tocar la red Docker o solo el `kong.yml`?
- ¿La fix sobrevive a un `docker compose down && up`?

Eso me permite actualizar el `claude.md` del proyecto con la info de infraestructura para que no nos vuelva a pasar.
