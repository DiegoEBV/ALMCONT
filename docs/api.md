# API Principal

Base: `/api/*` (ver `api/app.ts`). Autenticación por `Authorization: Bearer <token>` salvo endpoints con `optionalAuth`.

## Health
- `GET /api/health`

## Analytics (`api/routes/analytics.ts`)
- `GET /api/analytics/kpis`
- `GET /api/analytics/work-comparisons`
- `GET /api/analytics/worker-efficiency`
- `GET /api/analytics/trends?days=30`
- `GET /api/analytics/dashboard`
- `POST /api/analytics/metrics`
- `GET /api/analytics/metrics/:type?entityType=&entityId=&limit=`
- `GET /api/analytics/reports/efficiency?workerId=&startDate=&endDate=`
- `GET /api/analytics/reports/works?workIds=`

## Logistics (`api/routes/logistics.ts`)
- `GET /api/logistics/delivery-locations`
- `POST /api/logistics/optimize-route` `{ locationIds: string[], vehicleCapacity?: number }`
- `GET /api/logistics/supplier-prices?materialIds=ID1,ID2`
- `GET /api/logistics/price-analysis/:materialId`
- `GET /api/logistics/contracts`
- `POST /api/logistics/contracts`
- `GET /api/logistics/contracts/:contractId`
- `GET /api/logistics/contracts/performance/summary`

## Warehouse (`api/routes/warehouse.ts`)
- `GET /api/warehouse/picking-items?workId=`
- `POST /api/warehouse/picking-lists/generate`
- `GET /api/warehouse/picking-lists/worker/:workerId`
- `PATCH /api/warehouse/picking-lists/:listId/items/:itemId`
- `GET /api/warehouse/alerts?workerId=&severity=`
- `POST /api/warehouse/alerts`
- `PATCH /api/warehouse/alerts/:alertId/acknowledge`
- `PATCH /api/warehouse/alerts/:alertId/resolve`
- `GET /api/warehouse/performance/:workerId?startDate=&endDate=`
- `GET /api/warehouse/statistics/picking-lists`
- `GET /api/warehouse/statistics/alerts`
- `PATCH /api/warehouse/picking-lists/:listId/items/bulk-update`
- `GET /api/warehouse/layout`

## GPS (`api/routes/gps.ts`)
- `POST /api/gps/ingest` header `x-gps-token`
- `GET /api/gps/vehicles`
- `GET /api/gps/vehicles/:id?limit=`
- `POST /api/gps/vehicles`
- `PUT /api/gps/vehicles/:id`
- `DELETE /api/gps/vehicles/:id`
- `GET /api/gps/devices`
- `POST /api/gps/devices`
- `PUT /api/gps/devices/:id`
- `DELETE /api/gps/devices/:id`
- `GET /api/gps/geofences`
- `POST /api/gps/geofences`
- `PUT /api/gps/geofences/:id`
- `DELETE /api/gps/geofences/:id`
- `GET /api/gps/alerts?limit=&status=`
- `PUT /api/gps/alerts/:id/status`
- `GET /api/gps/locations/vehicle/:vehicleId?limit=&startDate=&endDate=&minSpeed=&maxSpeed=`
- `POST /api/gps/locations`
- `GET /api/gps/assignments`
- `POST /api/gps/assignments`

## Push (web-push) (`api/routes/push.ts`)
- `GET /api/push/vapid-public-key`
- `POST /api/push/subscribe`
- `POST /api/push/send-notification`
- `POST /api/push/send-to-user`
- `GET /api/push/stats`

## Autenticación y Roles
- Middleware: `authenticateToken` valida JWT (`JWT_SECRET`).
- `roleValidation` aplica `validateRole([...])` según endpoint.

## Notas
- Las rutas de negocio (requerimientos, compras, entradas, salidas) se gestionan desde el frontend contra Supabase (`src/services/*`).
- Para operaciones avanzadas o agregaciones, usar endpoints Analytics/Logistics/Warehouse.

