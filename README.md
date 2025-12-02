# Sistema de Gestión de Almacén (ALMCONT)

Proyecto monorepo con frontend React + Vite y backend Express + Supabase para gestionar requerimientos, compras, inventario, logística y analítica de obras.

## Resumen
- Frontend: `React 18`, `TypeScript`, `Vite`, `React Router`, `React Query`, `Tailwind` y componentes UI.
- Backend: `Express` (ESM), `TypeScript`, endpoints para logística, almacén, analítica, GPS y push.
- Datos: `Supabase` con políticas RLS, tablas para requerimientos, compras, entradas, salidas y stock.
- Estado: `AuthContext` + `React Query`; almacenamiento local (`localDB`).

## Estructura
- `src/`: frontend (páginas, componentes, hooks, servicios, tipos, utils). Entrada: `src/main.tsx`.
- `api/`: backend Express (`app.ts`, `server.ts`, `routes/*`, `middleware/*`, `services/*`).
- `supabase/migrations/`: SQL de esquema, datos de prueba, funciones y RLS.
- `public/`: estáticos y assets.

## Inicio Rápido
- Requisitos: Node 20+, Supabase proyecto con URL y claves.
- Variables `.env` (raíz):
  - Backend: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (ó `SUPABASE_SERVICE_ROLE_KEY`), `JWT_SECRET`, `CORS_ORIGIN`, `GPS_INGEST_TOKEN`.
  - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Desarrollo:
  - Frontend: `npm run client:dev` (Vite).
  - Backend: `npm run server:dev` (nodemon → `api/server.ts`).
  - Ambos: `npm run dev`.
- Build/preview: `npm run build`, `npm run preview`.

## Scripts NPM
- `client:dev`: arranca Vite.
- `server:dev`: arranca nodemon (servidor Express en dev).
- `dev`: frontend y backend en paralelo.
- `build`, `preview`, `lint`, `check`, `deploy`, `deploy:vercel`.

## Frontend
- Punto de entrada: `src/main.tsx` configura `QueryClientProvider` y `ErrorBoundary`.
- Rutas protegidas: `src/App.tsx` usa `ProtectedRoute` con `allowedRoles`.
- Autenticación: `src/hooks/useAuth.tsx` combina Supabase Auth y autenticación local (`localAuth`). Sincroniza obra y usuario con `supabaseUsersService`.
- UI: componentes en `src/components/ui/*` y dashboards avanzados en `src/components/dashboard/*`.

## Backend
- App Express: `api/app.ts` monta rutas `auth`, `analytics`, `logistics`, `warehouse`, `gps`, `push`.
- Middleware: `api/middleware/auth.ts` (`Bearer` JWT), `roleValidation.ts` para roles.
- Servicios: lógica en `api/services/*` (analítica, logística, almacén, GPS).
- Supabase: cliente backend en `api/config/supabase.ts` usando `SUPABASE_*`.

## Modelo de Datos (Supabase)
- Tablas clave: `requerimientos`, `solicitudes_compra`, `ordenes_compra`, `entradas`, `salidas`, `entrada_items`, `salida_items`, `materiales`, `obras`, `stock_obra_material`, `usuarios`.
- GPS: `gps_devices`, `gps_locations`, `vehicles`, `geofences`, `gps_alerts`, `vehicle_assignments`.
- SQL: ver `supabase/migrations/*.sql` para definiciones y RLS.

## Flujos Principales
- Autenticación: login Supabase; fallback local. Contexto de usuario se establece vía RPC `set_user_context`.
- Requerimientos → Compras → Entradas → Salidas → Kardex/Stock.
- Logística: optimización de rutas, contratos marco, comparación de precios.
- GPS: ingest con token, dispositivos, vehículos, geocercas y alertas.
- Analítica: KPIs, comparativas y reportes.

## Endpoints (resumen)
- `GET /api/health`.
- `api/analytics/*`: KPIs, tendencias, dashboard, métricas y reportes.
- `api/logistics/*`: ubicaciones, optimizar ruta, precios, contratos.
- `api/warehouse/*`: picking, alertas, rendimiento, layout.
- `api/gps/*`: ingest, vehicles, devices, geofences, alerts, locations, assignments.
- `api/push/*`: notificaciones web push y stats.

## Seguridad y Errores
- Autenticación con `Bearer` JWT (`JWT_SECRET`). Roles validados por middleware.
- RLS Supabase con contexto de usuario (`set_user_context`).
- Frontend: `ErrorBoundary` y notificaciones (`sonner`).
- Backend: manejadores de error por ruta y middleware 500/404.

## Despliegue
- Vercel para funciones serverless (`api/index.ts`).
- `deploy` y `deploy:vercel` disponibles.

## Referencias de Código
- `src/App.tsx`: rutas y roles.
- `src/hooks/useAuth.tsx`: flujo de login y sesión.
- `src/services/*`: acceso a datos por módulo.
- `api/app.ts`: montaje de rutas.
- `api/routes/*`: endpoints por dominio.

Consulta `docs/flows.md` para flujos detallados y `docs/api.md` para listado de endpoints.

