# 🔧 FIX: Supabase Realtime WebSocket — Conexión Fallida

> **Contexto**: Este documento es para el agente que tiene acceso al servidor Hostinger donde corre Dokploy con Supabase self-hosted.
>
> **Branch**: `fix/supabase-realtime-websocket`
>
> **Fecha**: 2026-04-08
>
> **Prioridad**: ALTA — Funcionalidad de tiempo real completamente rota en producción

---

## 📋 Resumen del Problema

La aplicación Next.js intenta conectarse a **Supabase Realtime** vía WebSocket y falla repetidamente. En la consola del navegador del dashboard en producción, se ven estos errores:

```
WebSocket connection to 'wss://supabase.genzai.cloud/realtime/v1/websocket?apikey=eyJhb...' failed:
```

Estos errores se repiten cada pocos segundos (el cliente SDK intenta reconectar automáticamente), y en la UI del dashboard el componente "Actividad Reciente" muestra el estado **"Desconectado"** con el icono WifiOff.

### Qué debería funcionar

1. El frontend se suscribe a cambios en 2 tablas PostgreSQL vía Supabase Realtime:
   - **`activity_feed`** — Feed de eventos de webhooks (Telegram, Dokploy, Notion, N8N)
   - **`notifications`** — Notificaciones personales por usuario

2. Cuando un webhook inserta un registro en estas tablas, el cambio debería propagarse en tiempo real al navegador vía WebSocket.

3. El componente `ActivityFeed` debería mostrar **"En vivo"** (con icono Wifi verde) cuando la conexión está activa.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────┐     POST /api/webhooks/telegram
│  Telegram   │ ──────────────────────────────────► ┌──────────────────┐
│  Bot API    │                                      │  Next.js App     │
└─────────────┘                                      │  (Dokploy)       │
                                                     │                  │
                                                     │  processWebhook()│
                                                     │       │          │
                                                     └───────┼──────────┘
                                                             │ INSERT via service_role
                                                             ▼
                                                     ┌──────────────────┐
                                                     │  Supabase        │
                                                     │  (Dokploy)       │
                                                     │                  │
                                                     │  PostgreSQL      │
                                                     │  ├─activity_feed │
                                                     │  └─notifications │
                                                     │                  │
                                                     │  Realtime svc ◄──┼─── ❌ WebSocket FALLA AQUÍ
                                                     │  (puerto 4000)   │
                                                     └──────────────────┘
                                                             ▲
                                                             │ wss://supabase.genzai.cloud/realtime/v1/websocket
                                                             │
                                                     ┌───────┴──────────┐
                                                     │  Navegador       │
                                                     │  (Dashboard)     │
                                                     └──────────────────┘
```

### Componentes Supabase Self-Hosted involucrados

| Servicio | Puerto interno | Rol |
|----------|---------------|-----|
| `supabase-kong` (API Gateway) | 8000 | Reverse proxy principal, rutea a servicios internos |
| `supabase-realtime` | 4000 | Servidor WebSocket para Realtime |
| `supabase-db` | 5432 | PostgreSQL |

---

## 🔍 Diagnóstico Paso a Paso

Ejecuta estas verificaciones **en orden** en el servidor Hostinger:

### Paso 1: Verificar que el contenedor Realtime está corriendo

```bash
docker ps | grep realtime
```

**Esperado**: Debe aparecer un contenedor `supabase-realtime` o similar con status `Up`.

**Si NO aparece**: el servicio Realtime no está desplegado o se cayó. Revisa los logs:

```bash
docker logs supabase-realtime --tail 100
```

Y reinicia:

```bash
docker restart supabase-realtime
```

---

### Paso 2: Verificar conectividad interna al servicio Realtime

Desde dentro de la red Docker, prueba si Kong puede llegar a Realtime:

```bash
# Entra al contenedor de Kong
docker exec -it supabase-kong sh

# Prueba conexión HTTP al servicio Realtime
wget -qO- http://realtime-dev.supabase-realtime:4000/ || echo "FALLO"
```

> **Nota**: El hostname puede variar. Revisa tu `docker-compose.yml` de Supabase para ver el nombre exacto del servicio Realtime.

Alternativa, sin entrar al contenedor:

```bash
docker exec supabase-kong wget -qO- http://realtime-dev.supabase-realtime:4000/ 2>&1 || echo "FALLO"
```

---

### Paso 3: Verificar la configuración de Kong para Realtime

Kong es el API Gateway de Supabase. Debe tener una ruta configurada para `/realtime/v1/` que apunte al servicio Realtime.

**Opción A** — Verificar en el `kong.yml` (configuración declarativa):

```bash
# Buscar el archivo kong.yml dentro del contenedor o en el volume montado
docker exec supabase-kong cat /home/kong/kong.yml | grep -A 20 realtime
```

**Deberías ver algo como**:

```yaml
- name: realtime-v1
  url: http://realtime-dev.supabase-realtime:4000/socket
  routes:
    - name: realtime-v1
      strip_path: true
      paths:
        - /realtime/v1/
  plugins:
    - name: cors
```

Si **NO existe esta ruta**, ese es el problema. Necesitas agregarla.

**Opción B** — Verificar via Kong Admin API (si está expuesto):

```bash
curl http://localhost:8001/services | jq '.data[] | select(.name | contains("realtime"))'
```

---

### Paso 4: Verificar configuración de WebSocket en Kong

Kong debe pasar los headers de WebSocket correctamente. Verifica que NO haya plugins que bloqueen WebSocket en la ruta de Realtime.

```bash
docker exec supabase-kong cat /home/kong/kong.yml | grep -B 5 -A 30 "realtime"
```

---

### Paso 5: Verificar el proxy externo (Dokploy/Traefik)

Dokploy usa **Traefik** como reverse proxy. Traefik necesita pasar WebSocket correctamente.

Verifica los labels de Docker del servicio de Supabase en Dokploy:

```bash
# Ver labels del contenedor expuesto (Kong normalmente)
docker inspect supabase-kong | jq '.[0].Config.Labels' | grep -i traefik
```

Para WebSocket, Traefik necesita:
- NO tener timeout que corte conexiones largas
- Headers `Upgrade` y `Connection` deben propagarse

**Verifica en la configuración de Traefik**:

```bash
# Ver la configuración dinámica de Traefik
docker exec traefik cat /etc/traefik/traefik.yml 2>/dev/null || docker exec traefik cat /traefik.yml 2>/dev/null
```

O busca los middlewares activos:

```bash
# Ver routers y middlewares activos
curl -s http://localhost:8080/api/http/routers 2>/dev/null | jq '.'
```

> **IMPORTANTE**: Traefik soporta WebSocket **por defecto** si no hay middlewares que lo interfieran. El problema más común es un **timeout demasiado bajo** o un middleware que reescribe headers.

---

### Paso 6: Probar el WebSocket directamente

Desde el servidor, prueba conectarte al WebSocket:

```bash
# Instalar websocat si no está disponible
# Con curl usando upgrade headers:
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "https://supabase.genzai.cloud/realtime/v1/websocket?apikey=TU_ANON_KEY&vsn=1.0.0"
```

**Esperado**: Respuesta `101 Switching Protocols`

**Si devuelve 502/503/504**: El servicio Realtime no es accesible a través del proxy.

También prueba internamente sin SSL:

```bash
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "http://localhost:8000/realtime/v1/websocket?apikey=TU_ANON_KEY&vsn=1.0.0"
```

Si el test interno (puerto 8000) funciona pero el externo (HTTPS) falla → **el problema es Traefik/Dokploy**.

---

### Paso 7: Verificar la publicación Realtime en PostgreSQL

Conéctate a la base de datos y verifica que las tablas están en la publicación:

```bash
docker exec -it supabase-db psql -U postgres -c "SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
```

**Esperado**: Deben aparecer `activity_feed` y `notifications` en los resultados.

Si NO aparecen, ejecuta:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

### Paso 8: Verificar variables de entorno del servicio Realtime

El servicio Realtime necesita estas variables configuradas correctamente:

```bash
docker exec supabase-realtime env | grep -E "(DB_|SECRET|API)"
```

Variables críticas:
- `DB_HOST` — Debe apuntar al host de PostgreSQL (usualmente `supabase-db` o el nombre del servicio en Docker)
- `DB_PORT` — 5432
- `DB_USER` — `supabase_admin` o el usuario configurado
- `DB_PASSWORD` — La contraseña de la DB
- `API_JWT_SECRET` — Debe coincidir con el JWT secret del resto de Supabase
- `SECRET_KEY_BASE` — Para sesiones internas de Realtime (Phoenix framework)

---

## 🛠️ Soluciones según diagnóstico

### Solución A: Servicio Realtime caído → Reiniciar

```bash
docker restart supabase-realtime
docker logs -f supabase-realtime --tail 50
```

### Solución B: Kong no tiene ruta para Realtime → Agregar configuración

Edita el `kong.yml` y agrega la ruta de Realtime. Luego recarga Kong:

```bash
docker exec supabase-kong kong reload
```

### Solución C: Traefik bloquea WebSocket → Agregar headers/timeout

En la configuración de Dokploy para el servicio de Supabase, asegúrate de que los labels de Traefik incluyan:

```yaml
# Si se configuran vía docker-compose labels:
traefik.http.middlewares.supabase-ws.headers.customrequestheaders.Connection: "upgrade"
traefik.http.middlewares.supabase-ws.headers.customrequestheaders.Upgrade: "websocket"
```

O en la configuración de Traefik, asegúrate de que el `serversTransport` tenga timeout adecuado:

```yaml
serversTransport:
  forwardingTimeouts:
    dialTimeout: "30s"
    responseHeaderTimeout: "0s"
    idleConnTimeout: "90s"
```

### Solución D: Publicación PostgreSQL faltante → Ejecutar SQL

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

## ✅ Verificación Final

Una vez aplicada la solución, verifica:

1. **Desde el servidor**: El test de WebSocket del Paso 6 devuelve `101 Switching Protocols`
2. **Desde el navegador**: Abre el dashboard → La sección "Actividad Reciente" muestra **"En vivo"** con icono verde
3. **Test end-to-end**: Inserta un registro de prueba:

```sql
INSERT INTO activity_feed (source, event_type, actor, action, description)
VALUES ('telegram', 'test', 'admin', 'test', 'Test de Realtime - si ves esto, funciona ✅');
```

El nuevo evento debe aparecer **instantáneamente** en el dashboard sin refrescar la página.

---

## 📊 Resumen de acciones posibles

| # | Verificación | Comando clave | Solución si falla |
|---|-------------|---------------|-------------------|
| 1 | Contenedor Realtime corriendo | `docker ps \| grep realtime` | `docker restart supabase-realtime` |
| 2 | Conectividad interna | `docker exec supabase-kong wget ...` | Revisar red Docker |
| 3 | Ruta Kong configurada | `cat kong.yml \| grep realtime` | Agregar ruta en kong.yml |
| 4 | WebSocket en Kong | Verificar plugins | Remover plugins bloqueantes |
| 5 | Traefik pasa WebSocket | `docker inspect` labels | Agregar headers WS en Dokploy |
| 6 | WebSocket externo funciona | `curl -i -N ...` con Upgrade | Depende del paso que falle |
| 7 | Publicación PostgreSQL | `pg_publication_tables` | `ALTER PUBLICATION ADD TABLE` |
| 8 | Variables de entorno Realtime | `docker exec ... env` | Corregir .env de Realtime |

---

## 📁 Archivos del proyecto relevantes (referencia, no los modifiques)

Estos archivos viven en el repositorio de la app Next.js y NO necesitan cambios — el problema es de infraestructura del servidor:

- `src/hooks/use-activity-feed.ts` — Hook que suscribe a `activity_feed` vía Realtime
- `src/hooks/use-notifications.ts` — Hook que suscribe a `notifications` vía Realtime
- `src/lib/supabase/client.ts` — Crea el cliente browser con `NEXT_PUBLIC_SUPABASE_URL`
- `src/components/dashboard/activity-feed.tsx` — UI que muestra el feed y estado de conexión
- `supabase/migrations/005_notifications.sql` — Migración que crea las tablas y las agrega a `supabase_realtime`

La URL de Supabase es: `https://supabase.genzai.cloud`
El WebSocket intenta conectar a: `wss://supabase.genzai.cloud/realtime/v1/websocket`

---

> **⚠️ NOTA FINAL**: Una vez resuelto el problema, documenta qué solución se aplicó y qué configuración se cambió, para que pueda actualizar el `claude.md` del proyecto con la información de infraestructura.
