# Cóbralo

App web (PWA) en español para trabajadores independientes latinos en EE. UU.: anotar trabajos y cobrar a clientes atrasados por WhatsApp o SMS en segundos.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Auth + Postgres con RLS) · Stripe (suscripción) · jsPDF (recibos) · lucide-react.

## Funciones

- **Landing** pública con cómo funciona, beneficios, precio, FAQ y páginas de Términos y Privacidad.
- **Cuenta:** registro, entrar, "Olvidé mi contraseña" y onboarding de 3 pasos (negocio, cómo te pagan, listo).
- **Inicio:** alerta "Hoy debes cobrar a X clientes", Te deben / Cobrado este mes / Clientes atrasados, y la lista de cobros pendientes ordenada por atraso.
- **Clientes:** teléfono +1 con máscara, idioma (español o inglés), búsqueda, total que debe, historial de trabajos y de cobros enviados, "Cobrar todo".
- **Trabajos:** fecha del trabajo y vencimiento, pagos parciales, método de pago y estado automático (Pendiente / Atrasado / Pagado).
  - **Trabajo fijo** (semanal, cada 2 semanas o mensual): el siguiente cobro se crea solo cuando llega su fecha.
- **Cobrar:**
  - Tres mensajes (Amigable / Firme / Último aviso), con el sugerido según cuántas veces ya cobraste.
  - Sale en el idioma del cliente, con tus datos de Zelle, Venmo y Cash App (con links), y lo puedes editar.
  - Se envía por WhatsApp (`wa.me`) o SMS (`sms:`), y cada envío queda registrado con fecha, hora y canal.
- **Recibo PDF** en el idioma del cliente, con número consecutivo; se comparte por WhatsApp o se descarga.
- **Historial:** filtros (Todos / Pendientes / Atrasados / Pagados) y resumen mensual (cuánto trabajaste, recibiste y falta).
- **Ajustes:** datos del negocio y de pago, suscripción, instalar la app, soporte por WhatsApp y cerrar sesión.
- **Suscripción:**
  - 7 días gratis sin tarjeta y aviso cuando faltan 2 días o menos.
  - Después, US$9.90/mes con Stripe Checkout y el portal de Stripe para cambiar la tarjeta o cancelar.
  - Al vencer, la app se bloquea con la pantalla "Tu prueba terminó". Los datos nunca se borran.
- **PWA:** se instala con ícono propio, pantalla completa y página sin conexión.

## Configuración

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta todo el archivo `supabase/migrations/0001_init.sql`. Crea:
   - las tablas `profiles`, `clients`, `jobs`, `payments` y `reminders_sent`;
   - las reglas RLS, los triggers y la función de trabajos fijos.
3. En **Authentication → URL Configuration**:
   - **Site URL:** la URL de tu app (ej. `https://cobralo.app`).
   - **Redirect URLs:** agrega `https://TU-DOMINIO/auth/callback` y `http://localhost:3000/auth/callback`.
4. (Opcional) En **Authentication → Providers → Email** decide si quieres confirmación por correo. Las dos opciones funcionan.

### 2. Stripe (modo de prueba)

1. En el [Dashboard de Stripe](https://dashboard.stripe.com/test), crea un producto "Cóbralo" con un **precio recurrente de US$9.90 al mes**. Copia el `price_...`.
2. Activa el **Customer Portal** (Settings → Billing → Customer portal) y permite cancelar y cambiar el método de pago.
3. Crea un webhook a `https://TU-DOMINIO/api/stripe/webhook` con estos eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - `invoice.paid`, `invoice.payment_failed`

   Copia el secreto `whsec_...`.
   - En local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

### 3. Variables de entorno

Copia `.env.example` a `.env.local` y llénalo:

| Variable | Dónde se obtiene |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (solo servidor) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | El webhook del paso anterior (`whsec_...`) |
| `STRIPE_PRICE_ID` | El precio de US$9.90/mes (`price_...`) |

### 4. Correr y publicar

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de producción
```

Para publicar, se recomienda Vercel: importa el repositorio, agrega las mismas variables de entorno y despliega.

## Seguridad

- **Datos separados:** RLS en todas las tablas, así que cada usuario solo ve y modifica sus propios datos.
- **Columnas protegidas:** los permisos por columna impiden que el usuario cambie desde el navegador:
  - su suscripción o su prueba gratis;
  - los montos pagados (`amount_paid` se calcula desde `payments` con un trigger);
  - los números de recibo.
- **Validación en la base:** no se aceptan pagos mayores a lo que falta, ni trabajos con clientes de otro usuario.
- **Suscripción:** solo la actualiza el servidor, con el webhook de Stripe y la service role.

Prueba automática de estas reglas (necesita una base de Postgres **vacía**, solo para pruebas):

```bash
DATABASE_URL=postgres://usuario:clave@localhost:5432/cobralo_test npm run test:db
```

## Estructura

```text
src/app/              Páginas (landing, auth, (app)/inicio, clientes, trabajos, cobrar, historial, ajustes, suscripcion)
src/app/api/stripe/   Checkout, portal y webhook de Stripe
src/components/       Componentes de UI y formularios
src/lib/              Formato (US$, MM/DD/YYYY, teléfonos), mensajes de cobro, recibos PDF, Supabase, Stripe
supabase/             Migración SQL y prueba de seguridad
public/               Íconos de la PWA, service worker y página sin conexión
```

Los íconos se regeneran con `npm run icons` (requiere Python con Pillow).

## Soporte

WhatsApp: [+55 91 98149-0959](https://wa.me/5591981490959)
