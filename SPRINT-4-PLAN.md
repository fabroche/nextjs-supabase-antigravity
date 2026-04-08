# Sprint 4 — Plan de Implementación: Sistema de Tickets con Email

> **Estado**: Pendiente  
> **Dependencia**: Sprint 3 completado ✅  
> **Versión objetivo**: 0.7.0  
> **Fecha de creación**: 2026-04-08

---

## Objetivo

Implementar un sistema de tickets de soporte centralizado para Genzai. Los correos que llegan a `support@genzai.cloud` y `genzai.cloud@gmail.com` se convierten automáticamente en tickets gestionables desde un Kanban board. Los agentes pueden ver, responder, asignar y cambiar estados. El sistema incluye automatizaciones de seguimiento y cierre.

---

## Resumen de Decisiones

| Tema | Decisión |
|------|----------|
| Cuentas de correo | `support@genzai.cloud` (Hostinger) + `genzai.cloud@gmail.com` — extensible via `mailbox_accounts` |
| Servicio inbound | **Mailgun** Flex plan (1.000 emails/mes gratis) |
| Visual en card | Ícono del proveedor (Hostinger / Gmail) en cada ticket card |
| Alcance de tickets | Bandeja centralizada de Genzai — `business_id` nullable como etiqueta del cliente |
| Acceso `negocio` | Sin acceso a tickets |
| Estados | `new` → `open` → `on_hold` / `pending` / `solved` |
| `new` | Sin asignar, nadie lo ha visto |
| `open` | Asignado a un agente, en atención activa |
| Auto `solved → open` | Si el cliente responde un ticket resuelto, vuelve a `open` |
| Auto seguimiento | `pending` 2 días → correo de seguimiento como "Genzai Bot" |
| Auto cierre | `pending` 4 días sin respuesta → `solved` automáticamente |
| Auto-reply | Confirmación inmediata al recibir ticket nuevo (con anti-bucle) |
| Asignación automática | Round-robin entre `admin` + `agenteL2` al entrar el ticket |
| Reasignación | Solo `agenteL2` y `admin` pueden reasignar |
| Respuestas | Salen desde la misma cuenta que recibió el ticket (SMTP por mailbox) |
| Adjuntos recibidos | ✅ MVP — recibir del cliente y mostrar en el hilo |
| Adjuntos al responder | ❌ Post-MVP |
| Roles soporte | `support_role TEXT CHECK` en `user_profiles` — `agenteL1`, `agenteL2`, `NULL` |
| Dashboard agentes | Métricas de soporte únicamente — sin métricas financieras |
| Dashboard `negocio` | Métricas financieras únicamente — sin soporte |
| Extensibilidad roles | `TEXT + CHECK constraint + NULL default` |

---

## Matriz de Acceso

```
                      Métricas     Dashboard    Kanban        Config
                      financieras  soporte      tickets       sistema

admin                 ✅           ✅           ✅            ✅
negocio               ✅           ❌           ❌            ❌
agenteL2              ❌           ✅           ✅ (todos)    ❌
agenteL1              ❌           ✅ (suyos)   ✅ (suyos)   ❌
```

---

## Inventario

| Recurso | Estado | Notas |
|---------|--------|-------|
| `src/lib/supabase/admin.ts` | ⚠️ Sprint 3 | Necesario — service_role client |
| `src/lib/supabase/types.ts` | ✅ Listo | Agregar tipos de tickets |
| `src/lib/supabase/queries.ts` | ✅ Listo | Agregar queries de tickets |
| `src/contexts/auth-context.tsx` | ✅ Listo | Provee `user.id` |
| `src/app/api/webhooks/[source]/` | ⚠️ Sprint 3 | Agregar source `email` |
| `src/middleware.ts` | ✅ Listo | Actualizar para rutas de agentes |
| `src/app/tickets/` | ❌ Crear | Kanban + detalle de ticket |
| `src/components/tickets/` | ❌ Crear | Todos los componentes de tickets |
| `src/hooks/use-tickets.ts` | ❌ Crear | Hook Realtime para tickets |
| `nodemailer` | ❌ Instalar | Envío de correos SMTP |
| `@dnd-kit/core` | ❌ Instalar | Drag & drop Kanban |
| Mailgun account | ❌ Configurar | Setup DNS + forwarding |


---

## Estructura de Archivos Nuevos

```
src/
├── app/
│   ├── tickets/
│   │   ├── page.tsx                        ← Kanban board principal
│   │   └── [id]/
│   │       └── page.tsx                    ← Detalle + hilo del ticket
│   └── api/
│       ├── webhooks/
│       │   └── [source]/route.ts           ← Agregar case 'email'
│       └── tickets/
│           ├── [id]/
│           │   ├── reply/route.ts          ← POST — responder ticket
│           │   ├── status/route.ts         ← PATCH — cambiar estado
│           │   └── assign/route.ts         ← PATCH — asignar agente
│           └── route.ts                    ← GET — listar tickets
├── components/
│   └── tickets/
│       ├── kanban-board.tsx                ← Columnas drag & drop
│       ├── ticket-card.tsx                 ← Card con ícono proveedor
│       ├── ticket-thread.tsx               ← Hilo de mensajes
│       ├── reply-form.tsx                  ← Formulario de respuesta
│       ├── assign-select.tsx               ← Selector de agente
│       └── support-metrics.tsx             ← Dashboard métricas soporte
├── hooks/
│   ├── use-tickets.ts                      ← Realtime Kanban
│   └── use-ticket-detail.ts               ← Realtime hilo
└── lib/
    └── supabase/
        └── email/
            ├── send.ts                     ← nodemailer SMTP por mailbox
            └── templates.ts               ← Plantillas de correo
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/supabase/types.ts` | Agregar `DbTicket`, `DbTicketMessage`, `DbMailboxAccount` |
| `src/lib/supabase/queries.ts` | Agregar queries de tickets |
| `src/middleware.ts` | Rutas `/tickets` protegidas por `support_role` o `admin` |
| `src/components/dashboard/sidebar.tsx` | Agregar enlace "Tickets" para agentes y admin |
| `src/app/api/webhooks/_lib/normalizers.ts` | Agregar `normalizeEmail()` |
| `supabase/migrations/` | `007_tickets.sql`, `008_ticket_automations.sql` |

---

## Migraciones de Base de Datos

### `supabase/migrations/007_tickets.sql`

```sql
-- ============================================================
-- Roles de soporte en user_profiles
-- ============================================================
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS support_role TEXT
  CHECK (support_role IN ('agenteL1', 'agenteL2'))
  DEFAULT NULL;

-- ============================================================
-- Cuentas de correo gestionadas
-- ============================================================
CREATE TABLE mailbox_accounts (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id       UUID        REFERENCES businesses(id) ON DELETE SET NULL,
  email             TEXT        NOT NULL UNIQUE,
  provider          TEXT        NOT NULL CHECK (provider IN ('hostinger', 'gmail')),
  display_name      TEXT        NOT NULL,
  smtp_host         TEXT        NOT NULL,
  smtp_port         INTEGER     NOT NULL DEFAULT 465,
  smtp_user         TEXT        NOT NULL,
  smtp_pass_encrypted TEXT      NOT NULL,  -- encriptar antes de guardar
  is_active         BOOLEAN     DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Tickets
-- ============================================================
CREATE TABLE tickets (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  mailbox_account_id UUID       NOT NULL REFERENCES mailbox_accounts(id),
  business_id       UUID        REFERENCES businesses(id) ON DELETE SET NULL,
  subject           TEXT        NOT NULL,
  from_email        TEXT        NOT NULL,
  from_name         TEXT,
  status            TEXT        NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'open', 'on_hold', 'pending', 'solved')),
  assigned_to       UUID        REFERENCES user_profiles(id) ON DELETE SET NULL,
  message_id        TEXT        UNIQUE,    -- ID del correo original para threading
  pending_since     TIMESTAMPTZ,           -- cuando entró en estado pending
  solved_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Mensajes del hilo de cada ticket
-- ============================================================
CREATE TABLE ticket_messages (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id     UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  direction     TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound', 'system')),
  from_email    TEXT        NOT NULL,
  from_name     TEXT,
  body_html     TEXT,
  body_text     TEXT,
  message_id    TEXT,                      -- para threading de correo
  in_reply_to   TEXT,                      -- encadena respuestas
  attachments   JSONB       DEFAULT '[]',  -- [{filename, url, size, content_type}]
  is_auto_reply BOOLEAN     DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX idx_tickets_status        ON tickets(status);
CREATE INDEX idx_tickets_assigned      ON tickets(assigned_to);
CREATE INDEX idx_tickets_mailbox       ON tickets(mailbox_account_id);
CREATE INDEX idx_tickets_pending_since ON tickets(pending_since) WHERE status = 'pending';
CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id, created_at ASC);

-- Auto-update updated_at
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE mailbox_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages   ENABLE ROW LEVEL SECURITY;

-- mailbox_accounts: solo admin via service_role desde backend
-- (no se expone directamente al cliente)

-- tickets: admin ve todo, agenteL2 ve todo, agenteL1 solo los suyos
CREATE POLICY "Admin sees all tickets"
  ON tickets FOR ALL
  USING (is_admin());

CREATE POLICY "AgenteL2 sees all tickets"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND support_role = 'agenteL2'
    )
  );

CREATE POLICY "AgenteL2 can update tickets"
  ON tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND support_role = 'agenteL2'
    )
  );

CREATE POLICY "AgenteL1 sees own tickets"
  ON tickets FOR SELECT
  USING (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND support_role = 'agenteL1'
    )
  );

CREATE POLICY "AgenteL1 can update own tickets"
  ON tickets FOR UPDATE
  USING (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND support_role = 'agenteL1'
    )
  );

-- ticket_messages: mismas reglas que tickets (via ticket_id)
CREATE POLICY "Admin sees all messages"
  ON ticket_messages FOR ALL
  USING (is_admin());

CREATE POLICY "Agents see messages of accessible tickets"
  ON ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
      AND (
        -- agenteL2: todos los tickets
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND support_role = 'agenteL2')
        OR
        -- agenteL1: solo sus tickets
        (t.assigned_to = auth.uid() AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND support_role = 'agenteL1'))
      )
    )
  );

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;

-- Seed: cuentas de correo iniciales (rellenar smtp_pass_encrypted en producción)
INSERT INTO mailbox_accounts (email, provider, display_name, smtp_host, smtp_port, smtp_user, smtp_pass_encrypted)
VALUES
  ('support@genzai.cloud', 'hostinger', 'Genzai Support', 'smtp.hostinger.com', 465, 'support@genzai.cloud', 'ENCRYPTED_PLACEHOLDER'),
  ('genzai.cloud@gmail.com', 'gmail', 'Genzai Gmail', 'smtp.gmail.com', 465, 'genzai.cloud@gmail.com', 'ENCRYPTED_PLACEHOLDER');
```


### `supabase/migrations/008_ticket_automations.sql`

```sql
-- ============================================================
-- Automatizaciones de tickets via pg_cron
-- Requiere extensión pg_cron habilitada en Supabase
-- ============================================================

-- Cron job: cada hora revisa tickets en pending
-- La Edge Function 'ticket-automations' hace el trabajo real
SELECT cron.schedule(
  'ticket-pending-check',
  '0 * * * *',   -- cada hora
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/ticket-automations',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

> **Nota**: La lógica real de envío del correo de seguimiento y el cambio de estado
> vive en una Supabase Edge Function `ticket-automations` (no en Next.js)
> porque necesita ejecutarse de forma independiente al servidor de la app.
> El pg_cron solo dispara la Edge Function cada hora.

---

## Variables de Entorno a Agregar

```bash
# Mailgun
MAILGUN_API_KEY=key-xxx
MAILGUN_WEBHOOK_SECRET=xxx      # Para validar firma del webhook inbound

# Encriptación de credenciales SMTP (usar AES-256 o similar)
SMTP_ENCRYPTION_KEY=xxx         # Clave para encriptar/desencriptar smtp_pass

# Notion Sprint DB (si no está ya del Sprint 3)
NOTION_SPRINT_DB_ID=xxx
```

---

## Configuración de Mailgun

### Paso 1 — Verificar dominio en Mailgun
1. Crear cuenta en mailgun.com (Flex plan)
2. Ir a **Sending → Domains → Add New Domain**
3. Añadir `genzai.cloud`
4. Configurar registros DNS que Mailgun indica (MX, TXT, CNAME)

### Paso 2 — Configurar Inbound Routes en Mailgun
En **Receiving → Routes → Create Route**:

```
Expression: match_recipient("support@genzai.cloud")
Actions:    Forward → https://tu-dominio.com/api/webhooks/email
            Store (opcional, para backup)
Priority:   10
```

### Paso 3 — Reenvío desde Hostinger
En el panel de Hostinger → `support@genzai.cloud` → **Create Forwarders**:
```
Reenviar a: support@mg.genzai.cloud   (dirección MX de Mailgun)
```

### Paso 4 — Reenvío desde Gmail
Gmail Settings → Forwarding → Add forwarding address:
```
Reenviar a: genzai.cloud@mg.genzai.cloud
```

### Paso 5 — Webhook Secret
En Mailgun → **Webhooks → Add Webhook**:
- Copiar el signing key
- Guardarlo en `webhook_sources` table con `source = 'email'`

---

## Implementación Detallada

### Paso 1 — Dependencias a instalar

```bash
npm install nodemailer @types/nodemailer
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Paso 2 — Tipos en `src/lib/supabase/types.ts`

```typescript
export interface DbMailboxAccount {
  id: string
  business_id: string | null
  email: string
  provider: 'hostinger' | 'gmail'
  display_name: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  is_active: boolean
  created_at: string
}

export type TicketStatus = 'new' | 'open' | 'on_hold' | 'pending' | 'solved'

export interface DbTicket {
  id: string
  mailbox_account_id: string
  business_id: string | null
  subject: string
  from_email: string
  from_name: string | null
  status: TicketStatus
  assigned_to: string | null
  message_id: string | null
  pending_since: string | null
  solved_at: string | null
  created_at: string
  updated_at: string
  // joins opcionales
  mailbox_account?: DbMailboxAccount
  assignee?: { id: string; full_name: string | null }
}

export interface DbTicketMessage {
  id: string
  ticket_id: string
  direction: 'inbound' | 'outbound' | 'system'
  from_email: string
  from_name: string | null
  body_html: string | null
  body_text: string | null
  message_id: string | null
  in_reply_to: string | null
  attachments: Array<{
    filename: string
    url: string
    size: number
    content_type: string
  }>
  is_auto_reply: boolean
  created_at: string
}
```

### Paso 3 — SMTP sender: `src/lib/supabase/email/send.ts`

```typescript
import nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Desencriptar contraseña SMTP (implementar con crypto AES-256)
function decryptSmtpPass(encrypted: string): string {
  // usar SMTP_ENCRYPTION_KEY del env
  // implementar con: crypto.createDecipheriv(...)
  return encrypted // placeholder — implementar antes de producción
}

export async function sendEmailFromMailbox(opts: {
  mailboxAccountId: string
  to: string
  subject: string
  bodyHtml: string
  bodyText: string
  inReplyTo?: string
  references?: string
  fromName?: string
}): Promise<{ messageId: string }> {
  // Obtener credenciales del mailbox
  const { data: mailbox, error } = await supabaseAdmin
    .from('mailbox_accounts')
    .select('*')
    .eq('id', opts.mailboxAccountId)
    .single()

  if (error || !mailbox) throw new Error('Mailbox not found')

  const transporter = nodemailer.createTransport({
    host: mailbox.smtp_host,
    port: mailbox.smtp_port,
    secure: true,
    auth: {
      user: mailbox.smtp_user,
      pass: decryptSmtpPass(mailbox.smtp_pass_encrypted),
    },
  })

  const info = await transporter.sendMail({
    from: `"${opts.fromName ?? mailbox.display_name}" <${mailbox.email}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.bodyHtml,
    text: opts.bodyText,
    inReplyTo: opts.inReplyTo,
    references: opts.references,
  })

  return { messageId: info.messageId }
}
```

### Paso 4 — Normalizer de email en `src/app/api/webhooks/_lib/normalizers.ts`

```typescript
// Agregar al switch existente en normalizeEvent():
case 'email':
  return normalizeMailgunInbound(payload)

// Mailgun inbound payload normalizer
async function normalizeMailgunInbound(payload: any): Promise<NormalizedEvent | null> {
  const from = payload.sender || payload.from
  const to = payload.recipient
  const subject = payload.subject || '(sin asunto)'
  const messageId = payload['Message-Id'] || payload['message-id']
  const inReplyTo = payload['In-Reply-To'] || payload['in-reply-to']
  const bodyHtml = payload['body-html'] || null
  const bodyText = payload['body-plain'] || null

  // Anti-bucle: ignorar correos automáticos
  const autoSubmitted = payload['Auto-Submitted'] || payload['auto-submitted']
  if (autoSubmitted && autoSubmitted !== 'no') return null
  if (payload['X-Auto-Reply-To']) return null

  // Extraer nombre del remitente
  const fromName = extractName(from)
  const fromEmail = extractEmail(from)

  return {
    source: 'email',
    event_type: inReplyTo ? 'email.reply' : 'email.new',
    actor: fromName || fromEmail,
    action: inReplyTo ? 'respondió' : 'escribió',
    description: `${fromName || fromEmail}: ${subject}`,
    metadata: {
      from_email: fromEmail,
      from_name: fromName,
      to_email: extractEmail(to),
      subject,
      message_id: messageId,
      in_reply_to: inReplyTo,
      body_html: bodyHtml,
      body_text: bodyText,
      attachments: parseMailgunAttachments(payload),
    },
  }
}

function extractEmail(str: string): string {
  const match = str.match(/<(.+?)>/)
  return match ? match[1] : str.trim()
}

function extractName(str: string): string | null {
  const match = str.match(/^"?(.+?)"?\s*</)
  return match ? match[1].trim() : null
}

function parseMailgunAttachments(payload: any): Array<object> {
  // Mailgun incluye attachments como URLs temporales
  if (!payload.attachments) return []
  try {
    const atts = typeof payload.attachments === 'string'
      ? JSON.parse(payload.attachments)
      : payload.attachments
    return atts.map((a: any) => ({
      filename: a.name,
      url: a.url,
      size: a.size,
      content_type: a['content-type'],
    }))
  } catch {
    return []
  }
}
```


### Paso 5 — Endpoint de email: `src/app/api/webhooks/[source]/route.ts`

Agregar al `processWebhook()` existente el case `email`:

```typescript
// En processWebhook(), después de insertar en activity_feed:
if (event.source === 'email') {
  await processEmailWebhook(event.metadata as EmailMetadata)
  return  // el email tiene su propio flujo, no usa notifications
}

async function processEmailWebhook(meta: EmailMetadata) {
  const { from_email, from_name, to_email, subject, message_id, in_reply_to, body_html, body_text, attachments } = meta

  // Identificar el mailbox destino
  const { data: mailbox } = await supabaseAdmin
    .from('mailbox_accounts')
    .select('id')
    .eq('email', to_email)
    .eq('is_active', true)
    .single()

  if (!mailbox) return // correo a cuenta no gestionada — ignorar

  // ¿Es respuesta a un ticket existente?
  let ticket = null
  if (in_reply_to) {
    const { data } = await supabaseAdmin
      .from('tickets')
      .select('id, status, assigned_to, mailbox_account_id')
      .eq('message_id', in_reply_to)
      .single()
    ticket = data
  }

  if (ticket) {
    // Respuesta a ticket existente
    await supabaseAdmin.from('ticket_messages').insert({
      ticket_id: ticket.id,
      direction: 'inbound',
      from_email,
      from_name,
      body_html,
      body_text,
      message_id,
      in_reply_to,
      attachments: attachments || [],
    })

    // Si estaba solved, reabrirlo
    if (ticket.status === 'solved') {
      await supabaseAdmin
        .from('tickets')
        .update({ status: 'open', solved_at: null })
        .eq('id', ticket.id)
    }
  } else {
    // Ticket nuevo
    const { data: newTicket } = await supabaseAdmin
      .from('tickets')
      .insert({
        mailbox_account_id: mailbox.id,
        subject,
        from_email,
        from_name,
        status: 'new',
        message_id,
      })
      .select()
      .single()

    if (!newTicket) return

    // Insertar primer mensaje
    await supabaseAdmin.from('ticket_messages').insert({
      ticket_id: newTicket.id,
      direction: 'inbound',
      from_email,
      from_name,
      body_html,
      body_text,
      message_id,
      attachments: attachments || [],
    })

    // Auto-reply de confirmación
    await sendAutoReply(newTicket, mailbox.id, from_email, from_name, subject, message_id)

    // Asignación automática round-robin
    await assignTicketRoundRobin(newTicket.id, mailbox.id)
  }
}
```

### Paso 6 — Auto-reply y Round-Robin

```typescript
async function sendAutoReply(ticket: any, mailboxId: string, toEmail: string, toName: string | null, subject: string, originalMessageId: string) {
  const bodyText = `Hola${toName ? ` ${toName}` : ''},\n\nHemos recibido tu solicitud correctamente.\nTu ticket #${ticket.id.slice(0, 8)} ha sido registrado y en breve un agente de nuestro equipo de soporte técnico estará contigo.\n\nGenzai Support`
  const bodyHtml = `<p>Hola${toName ? ` ${toName}` : ''},</p><p>Hemos recibido tu solicitud correctamente.<br>Tu ticket <strong>#${ticket.id.slice(0, 8)}</strong> ha sido registrado y en breve un agente de nuestro equipo de soporte técnico estará contigo.</p><p>Genzai Support</p>`

  const { messageId } = await sendEmailFromMailbox({
    mailboxAccountId: mailboxId,
    to: toEmail,
    subject: `Re: ${subject}`,
    bodyHtml,
    bodyText,
    inReplyTo: originalMessageId,
    references: originalMessageId,
    fromName: 'Genzai Support',
  })

  await supabaseAdmin.from('ticket_messages').insert({
    ticket_id: ticket.id,
    direction: 'outbound',
    from_email: '', // se rellena con el email del mailbox
    body_html: bodyHtml,
    body_text: bodyText,
    message_id: messageId,
    in_reply_to: originalMessageId,
    is_auto_reply: true,
  })
}

// Round-robin: asigna al admin o agenteL2 con menos tickets abiertos
async function assignTicketRoundRobin(ticketId: string, mailboxId: string) {
  // Obtener candidatos: admin + agenteL2
  const { data: candidates } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .or('role.eq.admin,support_role.eq.agenteL2')

  if (!candidates || candidates.length === 0) return

  // Contar tickets abiertos por candidato
  const counts = await Promise.all(
    candidates.map(async (c) => {
      const { count } = await supabaseAdmin
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', c.id)
        .in('status', ['new', 'open', 'on_hold', 'pending'])
      return { id: c.id, count: count || 0 }
    })
  )

  // Asignar al que tiene menos tickets
  counts.sort((a, b) => a.count - b.count)
  const assignTo = counts[0].id

  await supabaseAdmin
    .from('tickets')
    .update({ assigned_to: assignTo, status: 'open' })
    .eq('id', ticketId)
}
```

### Paso 7 — Automatizaciones de seguimiento (Supabase Edge Function)

Crear Edge Function `supabase/functions/ticket-automations/index.ts`:

```typescript
// Esta función es llamada por pg_cron cada hora
// Revisa tickets en pending y actúa según el tiempo transcurrido

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)

  // 1. Tickets en pending > 4 días → solved
  const { data: toSolve } = await supabase
    .from('tickets')
    .select('id')
    .eq('status', 'pending')
    .lt('pending_since', fourDaysAgo.toISOString())

  for (const ticket of toSolve || []) {
    await supabase
      .from('tickets')
      .update({ status: 'solved', solved_at: now.toISOString() })
      .eq('id', ticket.id)

    await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      direction: 'system',
      from_email: 'system',
      body_text: 'Ticket cerrado automáticamente por inactividad.',
      is_auto_reply: false,
    })
  }

  // 2. Tickets en pending entre 2 y 4 días → enviar seguimiento (solo una vez)
  // (verificar que no se haya enviado ya un auto-reply de seguimiento)
  const { data: toFollowUp } = await supabase
    .from('tickets')
    .select('id, from_email, from_name, subject, assigned_to, mailbox_account_id, message_id')
    .eq('status', 'pending')
    .lt('pending_since', twoDaysAgo.toISOString())
    .gte('pending_since', fourDaysAgo.toISOString())

  for (const ticket of toFollowUp || []) {
    // Verificar que no existe ya un follow-up enviado
    const { count } = await supabase
      .from('ticket_messages')
      .select('id', { count: 'exact', head: true })
      .eq('ticket_id', ticket.id)
      .eq('direction', 'outbound')
      .eq('is_auto_reply', true)
      .gte('created_at', twoDaysAgo.toISOString())

    if (count && count > 0) continue // ya se envió follow-up

    // Obtener nombre del agente asignado
    let agentName = 'nuestro equipo'
    if (ticket.assigned_to) {
      const { data: agent } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', ticket.assigned_to)
        .single()
      agentName = agent?.full_name || agentName
    }

    const bodyText = `Hola${ticket.from_name ? ` ${ticket.from_name}` : ''},\n\nSoy Genzai Bot y te escribo de parte de ${agentName}, quien está atendiendo tu caso.\n\nQueremos asegurarnos de que tu consulta "${ticket.subject}" haya quedado resuelta. ¿Pudiste resolver tu problema?\n\nSi necesitas más ayuda solo responde este correo. Si no recibimos respuesta en 2 días daremos el caso por resuelto, pero siempre puedes reabrir escribiéndonos.\n\nGenzai Bot — en nombre de ${agentName}`

    // Enviar correo (llamar al endpoint de envío o duplicar lógica nodemailer aquí)
    // En producción: llamar a una función compartida de envío SMTP

    await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      direction: 'outbound',
      from_email: 'system',
      body_text: bodyText,
      in_reply_to: ticket.message_id,
      is_auto_reply: true,
    })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```


### Paso 8 — Middleware: rutas protegidas por support_role

En `src/middleware.ts`, agregar lógica para `/tickets`:

```typescript
// Las rutas /tickets solo son accesibles para admin, agenteL1 y agenteL2
// El middleware llama a get_user_role() y también verifica support_role
// Si el usuario es negocio sin support_role → redirect a /
```

### Paso 9 — Sidebar: enlace de Tickets

En `src/components/dashboard/sidebar.tsx`, agregar el enlace "Tickets" solo visible para admin, agenteL1 y agenteL2. Los usuarios negocio no ven la sección.

### Paso 10 — Frontend: Kanban Board

**`src/app/tickets/page.tsx`** — vista principal con columnas de estado.

Usa `@dnd-kit/core` para drag & drop entre columnas. Al soltar una card en otra columna hace `PATCH /api/tickets/[id]/status`.

Columnas:
```
[ NEW ]  [ OPEN ]  [ ON HOLD ]  [ PENDING ]  [ SOLVED ]
```

**`src/components/tickets/ticket-card.tsx`**:
- Asunto del ticket
- Nombre y email del remitente
- Tiempo transcurrido (ej: "hace 2 horas")
- Ícono del proveedor: 🟠 Hostinger / 🔵 Gmail (SVG icons en producción)
- Badge de estado
- Avatar del agente asignado

**`src/app/tickets/[id]/page.tsx`** — detalle del ticket:
- Hilo de mensajes (inbound / outbound / system diferenciados visualmente)
- Adjuntos del cliente con preview de imagen o link de descarga
- Formulario de respuesta al fondo
- Panel lateral: estado, asignado, negocio cliente, fechas

**`src/components/tickets/reply-form.tsx`**:
- Textarea para el cuerpo del mensaje
- Selector de estado post-respuesta (ej: al responder → cambiar a `pending`)
- Botón enviar → `POST /api/tickets/[id]/reply`

### Paso 11 — Support Metrics Dashboard

**`src/components/tickets/support-metrics.tsx`**

Métricas visibles para agenteL1 (solo suyas) y agenteL2/admin (globales):

| Métrica | Descripción |
|---------|-------------|
| Tickets abiertos | count status IN ('new','open') |
| Tickets en pending | count status = 'pending' |
| Tickets vencidos | pending_since > 2 días |
| Tickets resueltos hoy | solved_at::date = today |
| Tiempo promedio resolución | avg(solved_at - created_at) |
| Carga por agente | count tickets por assigned_to (solo agenteL2/admin) |

Se integra en `/tickets` encima del Kanban como cards de métricas (mismo componente `MetricCard` que ya existe).

---

## Fases de Implementación

| Fase | Tareas |
|------|--------|
| **Fase 1 — Fundación** | Migraciones 007 y 008 / Variables de entorno / Configurar Mailgun y DNS / Seed de mailbox_accounts |
| **Fase 2 — Inbound email** | Normalizer de Mailgun / Endpoint `/api/webhooks/email` / Lógica de creación de tickets / Auto-reply / Round-robin |
| **Fase 3 — Frontend básico** | Sidebar enlace Tickets / Middleware rutas / Kanban board / Ticket card con ícono proveedor / Ticket detail + hilo |
| **Fase 4 — Respuestas y estados** | Reply form / `PATCH status` / `PATCH assign` / Vista agenteL1 vs agenteL2 / Support metrics |
| **Fase 5 — Automatizaciones** | Edge Function ticket-automations / pg_cron setup / Test flujo pending 2d → followup → 4d → solved |

---

## Criterios de Aceptación

- [ ] Correo a `support@genzai.cloud` crea ticket en DB automáticamente
- [ ] Correo a `genzai.cloud@gmail.com` crea ticket en DB automáticamente
- [ ] Auto-reply de confirmación se envía al remitente en segundos
- [ ] Auto-reply no se envía si es correo automático (Anti-bucle funciona)
- [ ] Ticket nuevo se asigna automáticamente por round-robin
- [ ] Ticket aparece en columna `new` del Kanban sin recargar (Realtime)
- [ ] Card del ticket muestra ícono correcto del proveedor
- [ ] Drag & drop entre columnas cambia estado en DB
- [ ] agenteL1 solo ve sus tickets asignados
- [ ] agenteL2 ve todos los tickets
- [ ] Solo agenteL2 y admin pueden reasignar tickets
- [ ] Respuesta del agente sale desde la misma cuenta que recibió el ticket
- [ ] Respuesta del cliente a ticket `solved` lo vuelve a `open`
- [ ] Adjuntos del cliente visibles en el hilo del ticket
- [ ] Ticket en `pending` 2 días → correo de seguimiento de Genzai Bot
- [ ] Ticket en `pending` 4 días → pasa a `solved` automáticamente
- [ ] rol `negocio` no ve ni accede a la sección de tickets
- [ ] `npm run build` sin errores de TypeScript

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Mailgun marca correos como spam | Clientes no reciben respuestas | Verificar SPF/DKIM/DMARC en DNS de genzai.cloud |
| smtp_pass_encrypted en texto plano en DB | Brecha de seguridad | Implementar AES-256 con SMTP_ENCRYPTION_KEY antes de producción |
| Bucle de correos automáticos | Spam / tickets basura | Anti-bucle por headers Auto-Submitted + X-Auto-Reply-To |
| pg_cron no disponible en plan Supabase free | Automatizaciones no funcionan | Verificar plan; alternativa: cron externo via Dokploy que llame a la Edge Function |
| Drag & drop no funciona en mobile | UX degradada en móvil | @dnd-kit soporta touch; verificar en dispositivos reales |
| Ticket duplicado si Mailgun reintenta webhook | Datos inconsistentes | Idempotencia por `message_id UNIQUE` en tabla tickets |
| Edge Function falla y no envía follow-up | Tickets quedan abiertos sin seguimiento | Dead letter en ticket_messages con direction='system' y error registrado |

---

## Dependencias a Instalar

```bash
# Envío de correo SMTP
npm install nodemailer
npm install -D @types/nodemailer

# Drag & drop Kanban
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

_Fecha de creación: 2026-04-08_  
_Sprint: 4_  
_Versión objetivo: 0.7.0_  
_Dependencia: Sprint 3 completado_
