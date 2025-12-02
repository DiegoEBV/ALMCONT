# Flujos Funcionales por Rol

## Autenticación y Autorización
- Login en `src/components/auth/Login.tsx` usando `useAuth`.
- `useAuth` intenta Supabase Auth; si falla, usa `localAuth` y crea sesión local.
- Rutas protegidas con `ProtectedRoute` (`src/components/auth/ProtectedRoute.tsx`), validan `allowedRoles`.
- Contexto de usuario para RLS vía `supabase.rpc('set_user_context')`.

## Roles
- `COORDINACION`: crea y gestiona requerimientos, solicitudes de compra, administra usuarios y obras.
- `LOGISTICA`: atiende solicitudes, crea órdenes, gestiona proveedores, GPS y logística.
- `ALMACENERO`: recepciona `Entradas`, atiende `Salidas`, gestiona `Stock`, ubicaciones, inventario cíclico y devoluciones.
- `PRODUCCION`: crea requerimientos y da seguimiento.
- `RESIDENTE`: visualiza dashboards y seguimiento.

## Flujo de Requerimientos → Compras
- Producción crea requerimiento: página `src/pages/CreateRequirement.tsx` → servicio `requerimientosService.create` (`src/services/requerimientos.ts`).
- Coordinación revisa y agrupa requerimientos en una Solicitud de Compra: `src/pages/SolicitudesCompra.tsx` → `solicitudesCompraService`.
- Asociaciones RQ↔SC: `RqScService` (`src/services/solicitudesCompra.ts`).

## Flujo de Solicitud → Orden de Compra
- Logística crea Orden de Compra desde una SC: `src/pages/OrdenesCompra.tsx` → `ordenesCompraService.create`.
- Asociaciones SC↔OC: `ScOcService`.
- Estados OC: `PENDIENTE` → `APROBADA` → `ENVIADA` → `RECIBIDA`.

## Flujo de Entradas (Recepción)
- Almacenero registra `Entrada` al recibir materiales: `src/pages/Entradas.tsx` → `entradasService.create`.
- Ítems de entrada (`entrada_items`) con cantidades recibidas/aceptadas.
- Actualización de `stock_obra_material` por obra/material.

## Flujo de Salidas (Despacho)
- Almacenero valida stock y registra `Salida`: `src/pages/Salidas.tsx` → `salidasService.create`.
- Verificación previa: `salidasService.verificarStockDisponible`.
- Ítems de salida (`salida_items`), decremento de stock y registro en Kardex.

## Flujo de Stock/Kardex
- Consulta y filtros de stock: `stockService.getStockWithFilters`.
- Movimientos de Kardex (ENTRADA/SALIDA): `stockService.getKardexMovimientos` cruza `entrada_items`/`salida_items` con `entradas`/`salidas`.
- Alertas de stock bajo con `stock_minimo`; reorden en `ReorderConfiguration` y `reorderService`.

## Flujo de Ubicaciones e Inventario Cíclico
- Gestión de ubicaciones: `src/pages/LocationManager.tsx` → `locationService` y `almacenService`.
- Inventario cíclico: `src/pages/CyclicInventory.tsx` → `cyclicInventoryService` para conteos periódicos y discrepancias.

## Flujo de Devoluciones y Préstamos
- Devoluciones: `ReturnManagement` (`src/pages/ReturnManagement.tsx`) → `returnService` registra retorno, ajusta stock y valor.
- Préstamos: `LoanManagement` → `loanService` y alertas `loanAlertService`.

## Flujo de Logística
- Optimización de ruta y ubicaciones de entrega: `api/routes/logistics.ts` → `LogisticsService`.
- Comparación de precios de proveedores y contratos marco.

## Flujo de GPS
- Ingesta segura: `POST /api/gps/ingest` con `x-gps-token`.
- Gestión de vehículos y dispositivos: `src/components/gps/*`, endpoints `api/routes/gps.ts`.
- Geocercas y alertas: creación/edición y actualización de estado.

## Flujo de Analítica
- KPIs y dashboard: `src/pages/AdvancedAnalytics.tsx` consumen `api/analytics/*`.
- Reportes de eficiencia y comparativos de obras.

## Notificaciones y Templates
- Push web: `api/routes/push.ts` para suscripciones y envío.
- Templates: `src/pages/Templates.tsx` con GrapesJS.

## Manejo de Errores y Logging
- Frontend: `ErrorBoundary` y toasts (`sonner`).
- Backend: middleware 500/404; respuestas detalladas por ruta.

## Configuración de Entorno
- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` en `src/lib/supabase.ts`.
- Backend: `SUPABASE_URL`, `SUPABASE_*`, `JWT_SECRET`, `CORS_ORIGIN`, `GPS_INGEST_TOKEN`.

