# Sistema de Autenticación

## Stack

Supabase Auth con OTP email. Clientes via `@supabase/ssr`.

## Rutas

| Ruta | Propósito |
|------|-----------|
| `/login` | Login + registro. Dual-mode (toggle). Split-screen con cover image |
| `/verify-email` | Verificación OTP — 6 dígitos, auto-submit al completar, reenvío |
| `/auth/callback` | Handler OAuth / email link fallback |

## Middleware (`middleware.ts` + `lib/supabase/middleware.ts`)

- Protege todas las rutas excepto `/login`, `/verify-email`, `/auth/callback`, assets estáticos
- No-auth → redirect `/login`
- Auth en `/login` → redirect `/`
- Mantiene session cookies entre requests

## Server Actions (`lib/auth/actions.ts`)

```typescript
signIn(formData)   // Email + password → session
signUp(formData)   // Registro → Supabase envía OTP por email → redirect /verify-email
signOut()          // Limpia session → redirect /login
getUser()          // Usuario actual
```

## Flujo OTP

1. `signUp()` → Supabase envía email con código 6 dígitos
2. Usuario en `/verify-email` ingresa código
3. `supabase.auth.verifyOtp({ email, token, type: 'email' })`
4. Éxito → redirect `/login` con mensaje de confirmación
5. Códigos expiran en 60 minutos

## Seguridad

- Cookies HTTP-only para session
- Hashing de passwords por Supabase
- Server-side auth (no client-side JWT parsing)
- CSRF protection vía Next.js
