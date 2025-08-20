# Funcionalidades Avanzadas del Sistema de Almacén

## 1. Descripción General

Este documento describe cinco funcionalidades avanzadas que mejorarán significativamente la eficiencia operativa del sistema de almacén:

1. **Flujos de Aprobación Automática**: Sistema inteligente de aprobaciones basado en montos y tipos de material
2. **Reorden Automático**: Generación automática de solicitudes de compra cuando el stock alcanza niveles mínimos
3. **Mapeo de Ubicaciones Físicas**: Sistema de gestión de ubicaciones en almacén (estantes, zonas, pasillos)
4. **Inventario Cíclico**: Programación y gestión de conteos periódicos automatizados
5. **Gestión de Devoluciones**: Proceso completo para materiales devueltos o defectuosos

## 2. Funcionalidad 1: Flujos de Aprobación Automática

### 2.1 Descripción
Sistema que automatiza las aprobaciones de solicitudes de compra y movimientos de materiales basado en reglas predefinidas por monto, tipo de material, usuario solicitante y obra.

### 2.2 Características Principales
- Configuración de reglas de aprobación por rol y monto
- Aprobación automática para montos menores al límite establecido
- Escalamiento automático a supervisores para montos mayores
- Aprobación especial para materiales críticos o controlados
- Historial completo de aprobaciones y rechazos
- Notificaciones automáticas a aprobadores

### 2.3 Reglas de Negocio
- Solicitudes < $1,000: Aprobación automática
- Solicitudes $1,000 - $5,000: Requiere aprobación de supervisor
- Solicitudes > $5,000: Requiere aprobación de gerente
- Materiales críticos: Siempre requieren aprobación manual
- Materiales controlados: Requieren doble aprobación

### 2.4 Estados de Aprobación
- **Pendiente**: Esperando revisión
- **Aprobado Automáticamente**: Cumple criterios de auto-aprobación
- **Aprobado Manualmente**: Aprobado por supervisor/gerente
- **Rechazado**: No cumple criterios o rechazado manualmente
- **En Escalamiento**: Enviado a nivel superior de aprobación

## 3. Funcionalidad 2: Reorden Automático

### 3.1 Descripción
Sistema que monitorea continuamente los niveles de stock y genera automáticamente solicitudes de compra cuando los materiales alcanzan su punto de reorden.

### 3.2 Características Principales
- Configuración de stock mínimo y punto de reorden por material
- Cálculo automático de cantidad a ordenar basado en consumo histórico
- Generación automática de solicitudes de compra
- Consideración de lead times de proveedores
- Alertas preventivas antes de llegar al stock mínimo
- Análisis de tendencias de consumo

### 3.3 Algoritmo de Reorden
- **Stock Mínimo**: Cantidad mínima que debe mantenerse en almacén
- **Punto de Reorden**: Nivel que activa la generación automática de SC
- **Cantidad a Ordenar**: Basada en consumo promedio y lead time
- **Stock de Seguridad**: Buffer adicional para variaciones de demanda

### 3.4 Configuración por Material
- Stock mínimo configurable
- Lead time del proveedor
- Consumo promedio mensual
- Estacionalidad (si aplica)
- Proveedor preferido
- Cantidad mínima de orden

## 4. Funcionalidad 3: Mapeo de Ubicaciones Físicas

### 4.1 Descripción
Sistema de gestión de ubicaciones físicas que permite mapear y controlar la ubicación exacta de cada material en el almacén.

### 4.2 Estructura de Ubicaciones
- **Almacén**: Edificio o área principal
- **Zona**: Área específica dentro del almacén (A, B, C)
- **Pasillo**: Corredor dentro de la zona (01, 02, 03)
- **Estante**: Estructura de almacenamiento (E1, E2, E3)
- **Nivel**: Altura en el estante (N1, N2, N3, N4)
- **Posición**: Ubicación específica (P1, P2, P3)

### 4.3 Código de Ubicación
Formato: `ALM-ZONA-PASILLO-ESTANTE-NIVEL-POSICION`
Ejemplo: `A01-A-01-E1-N2-P3`

### 4.4 Características Principales
- Asignación automática de ubicaciones para nuevos materiales
- Optimización de ubicaciones basada en rotación de inventario
- Mapa visual del almacén
- Búsqueda rápida de ubicaciones
- Historial de movimientos por ubicación
- Generación de rutas de picking optimizadas

### 4.5 Tipos de Ubicación
- **Fija**: Ubicación permanente para un material específico
- **Flotante**: Ubicación que puede cambiar según disponibilidad
- **Picking**: Ubicación de fácil acceso para materiales de alta rotación
- **Reserva**: Ubicación para stock de reserva
- **Cuarentena**: Ubicación para materiales en inspección

## 5. Funcionalidad 4: Inventario Cíclico

### 5.1 Descripción
Sistema de conteos periódicos programados que permite mantener la precisión del inventario sin necesidad de parar operaciones.

### 5.2 Tipos de Conteo
- **Conteo ABC**: Basado en valor de inventario (A: mensual, B: trimestral, C: semestral)
- **Conteo por Rotación**: Basado en frecuencia de movimiento
- **Conteo Aleatorio**: Selección aleatoria de materiales
- **Conteo por Ubicación**: Conteo completo de una zona específica
- **Conteo de Excepción**: Para materiales con discrepancias frecuentes

### 5.3 Programación Automática
- Generación automática de órdenes de conteo
- Asignación de contadores según disponibilidad
- Balanceo de carga de trabajo
- Consideración de operaciones críticas
- Reprogramación automática en caso de conflictos

### 5.4 Proceso de Conteo
1. **Generación**: Sistema genera orden de conteo
2. **Asignación**: Se asigna contador responsable
3. **Ejecución**: Contador realiza conteo físico
4. **Registro**: Ingreso de cantidades contadas
5. **Análisis**: Comparación con stock teórico
6. **Ajuste**: Corrección de discrepancias
7. **Aprobación**: Validación de ajustes

### 5.5 Análisis de Discrepancias
- Identificación de patrones de error
- Análisis de causas raíz
- Métricas de precisión por contador
- Reportes de tendencias
- Alertas por discrepancias significativas

## 6. Funcionalidad 5: Gestión de Devoluciones

### 6.1 Descripción
Sistema completo para gestionar materiales devueltos, defectuosos o que requieren reparación.

### 6.2 Tipos de Devolución
- **Devolución de Obra**: Material no utilizado que regresa al almacén
- **Material Defectuoso**: Material con fallas de calidad
- **Devolución a Proveedor**: Material que se devuelve al proveedor
- **Material para Reparación**: Material que requiere mantenimiento
- **Exceso de Inventario**: Material que excede necesidades

### 6.3 Estados de Devolución
- **Solicitada**: Devolución iniciada pero no recibida
- **En Tránsito**: Material en camino al almacén
- **Recibida**: Material recibido en almacén
- **En Inspección**: Material siendo evaluado
- **Aprobada**: Devolución aceptada
- **Rechazada**: Devolución no aceptada
- **Procesada**: Devolución completamente procesada

### 6.4 Proceso de Devolución
1. **Solicitud**: Creación de solicitud de devolución
2. **Autorización**: Aprobación de la devolución
3. **Transporte**: Envío del material al almacén
4. **Recepción**: Recibo físico del material
5. **Inspección**: Evaluación del estado del material
6. **Decisión**: Determinar acción a tomar
7. **Procesamiento**: Ejecutar acción decidida
8. **Cierre**: Finalización del proceso

### 6.5 Acciones Posibles
- **Reintegrar**: Devolver al stock disponible
- **Reparar**: Enviar a reparación
- **Descartar**: Dar de baja del inventario
- **Devolver a Proveedor**: Retornar al proveedor original
- **Vender como Usado**: Venta a precio reducido

## 7. Impacto en el Modelo de Datos

### 7.1 Nuevas Tablas Requeridas

#### Tabla: reglas_aprobacion
```sql
CREATE TABLE reglas_aprobacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    tipo_regla VARCHAR(20) NOT NULL, -- 'monto', 'material', 'usuario', 'obra'
    condicion JSONB NOT NULL, -- Condiciones específicas
    accion VARCHAR(20) NOT NULL, -- 'aprobar', 'rechazar', 'escalar'
    aprobador_requerido UUID REFERENCES usuarios(id),
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tabla: aprobaciones
```sql
CREATE TABLE aprobaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id UUID NOT NULL, -- Referencia a SC, entrada, salida
    tipo_solicitud VARCHAR(20) NOT NULL, -- 'sc', 'entrada', 'salida'
    estado VARCHAR(20) DEFAULT 'pendiente',
    regla_aplicada UUID REFERENCES reglas_aprobacion(id),
    aprobador UUID REFERENCES usuarios(id),
    comentarios TEXT,
    fecha_aprobacion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tabla: configuracion_reorden
```sql
CREATE TABLE configuracion_reorden (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materiales(id),
    stock_minimo INTEGER NOT NULL,
    punto_reorden INTEGER NOT NULL,
    cantidad_reorden INTEGER NOT NULL,
    lead_time_dias INTEGER DEFAULT 7,
    proveedor_preferido UUID REFERENCES proveedores(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tabla: ubicaciones
```sql
CREATE TABLE ubicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    almacen VARCHAR(10) NOT NULL,
    zona VARCHAR(10) NOT NULL,
    pasillo VARCHAR(10) NOT NULL,
    estante VARCHAR(10) NOT NULL,
    nivel VARCHAR(10) NOT NULL,
    posicion VARCHAR(10) NOT NULL,
    tipo_ubicacion VARCHAR(20) DEFAULT 'flotante',
    capacidad_maxima INTEGER,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tabla: stock_ubicaciones
```sql
CREATE TABLE stock_ubicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materiales(id),
    ubicacion_id UUID REFERENCES ubicaciones(id),
    cantidad INTEGER NOT NULL DEFAULT 0,
    fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(material_id, ubicacion_id)
);
```

#### Tabla: conteos_ciclicos
```sql
CREATE TABLE conteos_ciclicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_conteo VARCHAR(20) UNIQUE NOT NULL,
    tipo_conteo VARCHAR(20) NOT NULL,
    estado VARCHAR(20) DEFAULT 'programado',
    fecha_programada DATE NOT NULL,
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    contador_asignado UUID REFERENCES usuarios(id),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tabla: detalle_conteos
```sql
CREATE TABLE detalle_conteos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conteo_id UUID REFERENCES conteos_ciclicos(id),
    material_id UUID REFERENCES materiales(id),
    ubicacion_id UUID REFERENCES ubicaciones(id),
    stock_teorico INTEGER NOT NULL,
    stock_contado INTEGER,
    diferencia INTEGER,
    estado VARCHAR(20) DEFAULT 'pendiente',
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tabla: devoluciones
```sql
CREATE TABLE devoluciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_devolucion VARCHAR(20) UNIQUE NOT NULL,
    tipo_devolucion VARCHAR(30) NOT NULL,
    estado VARCHAR(20) DEFAULT 'solicitada',
    obra_origen UUID REFERENCES obras(id),
    solicitante UUID REFERENCES usuarios(id),
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_recepcion TIMESTAMP WITH TIME ZONE,
    motivo TEXT NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tabla: detalle_devoluciones
```sql
CREATE TABLE detalle_devoluciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devolucion_id UUID REFERENCES devoluciones(id),
    material_id UUID REFERENCES materiales(id),
    cantidad INTEGER NOT NULL,
    estado_material VARCHAR(20) NOT NULL, -- 'bueno', 'defectuoso', 'reparable'
    accion_tomada VARCHAR(30), -- 'reintegrar', 'reparar', 'descartar'
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7.2 Modificaciones a Tablas Existentes

#### Tabla: materiales (agregar campos)
```sql
ALTER TABLE materiales ADD COLUMN clasificacion_abc VARCHAR(1) DEFAULT 'C';
ALTER TABLE materiales ADD COLUMN frecuencia_conteo INTEGER DEFAULT 180; -- días
ALTER TABLE materiales ADD COLUMN ultimo_conteo DATE;
ALTER TABLE materiales ADD COLUMN material_critico BOOLEAN DEFAULT false;
ALTER TABLE materiales ADD COLUMN requiere_aprobacion BOOLEAN DEFAULT false;
```

#### Tabla: solicitudes_compra (agregar campos)
```sql
ALTER TABLE solicitudes_compra ADD COLUMN estado_aprobacion VARCHAR(20) DEFAULT 'pendiente';
ALTER TABLE solicitudes_compra ADD COLUMN generada_automaticamente BOOLEAN DEFAULT false;
ALTER TABLE solicitudes_compra ADD COLUMN configuracion_reorden_id UUID REFERENCES configuracion_reorden(id);
```

#### Tabla: entradas (agregar campos)
```sql
ALTER TABLE entradas ADD COLUMN devolucion_id UUID REFERENCES devoluciones(id);
ALTER TABLE entradas ADD COLUMN requiere_inspeccion BOOLEAN DEFAULT false;
```

#### Tabla: salidas (agregar campos)
```sql
ALTER TABLE salidas ADD COLUMN ruta_picking JSONB; -- Secuencia optimizada de ubicaciones
```

## 8. Nuevos Componentes y Servicios

### 8.1 Servicios Backend

#### ApprovalService
- `evaluateApprovalRules(solicitud)`: Evalúa reglas de aprobación
- `processAutoApproval(solicitud)`: Procesa aprobación automática
- `escalateApproval(solicitud)`: Escala a siguiente nivel
- `getApprovalHistory(solicitudId)`: Obtiene historial de aprobaciones

#### ReorderService
- `checkReorderPoints()`: Verifica puntos de reorden
- `generateAutomaticPurchaseRequest(material)`: Genera SC automática
- `calculateReorderQuantity(material)`: Calcula cantidad a ordenar
- `updateReorderConfiguration(config)`: Actualiza configuración

#### LocationService
- `assignLocation(material, cantidad)`: Asigna ubicación automática
- `optimizeLocations()`: Optimiza ubicaciones por rotación
- `generatePickingRoute(materiales)`: Genera ruta de picking
- `getLocationMap()`: Obtiene mapa visual del almacén

#### CyclicInventoryService
- `generateCyclicCounts()`: Genera conteos programados
- `assignCounter(conteo)`: Asigna contador
- `processCountResults(conteo)`: Procesa resultados de conteo
- `analyzeDiscrepancies()`: Analiza discrepancias

#### ReturnService
- `createReturn(devolucion)`: Crea nueva devolución
- `processReturnInspection(devolucion)`: Procesa inspección
- `executeReturnAction(detalle, accion)`: Ejecuta acción decidida
- `getReturnHistory(materialId)`: Obtiene historial de devoluciones

### 8.2 Componentes Frontend

#### ApprovalWorkflow
- Panel de aprobaciones pendientes
- Configuración de reglas de aprobación
- Historial de aprobaciones
- Notificaciones de aprobaciones requeridas

#### ReorderConfiguration
- Configuración de parámetros de reorden por material
- Dashboard de alertas de stock bajo
- Historial de reórdenes automáticas
- Análisis de consumo y tendencias

#### LocationManager
- Mapa visual del almacén
- Asignación manual de ubicaciones
- Búsqueda de materiales por ubicación
- Optimización de ubicaciones

#### CyclicInventory
- Programación de conteos
- Interface de conteo móvil
- Análisis de discrepancias
- Reportes de precisión de inventario

#### ReturnManagement
- Creación de solicitudes de devolución
- Recepción e inspección de devoluciones
- Procesamiento de acciones
- Reportes de devoluciones

## 9. Modificaciones a Componentes Existentes

### 9.1 Dashboard
- Agregar métricas de aprobaciones pendientes
- Mostrar alertas de reorden automático
- Indicadores de precisión de inventario
- Resumen de devoluciones en proceso

### 9.2 SolicitudesCompra
- Integrar flujo de aprobaciones
- Mostrar estado de aprobación
- Indicar si fue generada automáticamente
- Historial de aprobaciones

### 9.3 Stock
- Mostrar ubicaciones de materiales
- Indicadores de punto de reorden
- Alertas de stock crítico
- Programación de conteos cíclicos

### 9.4 Entradas
- Integrar recepción de devoluciones
- Asignación automática de ubicaciones
- Proceso de inspección
- Captura de fotos para devoluciones

### 9.5 Salidas
- Generar rutas de picking optimizadas
- Validar ubicaciones durante picking
- Crear devoluciones desde salidas
- Actualizar ubicaciones automáticamente

## 10. Consideraciones de UX/UI

### 10.1 Principios de Diseño
- **Automatización Transparente**: Los procesos automáticos deben ser visibles pero no intrusivos
- **Feedback Inmediato**: Notificaciones claras sobre acciones automáticas
- **Control Manual**: Siempre permitir override manual cuando sea necesario
- **Información Contextual**: Mostrar información relevante en el momento adecuado

### 10.2 Elementos de UI

#### Indicadores de Estado
- Badges para estados de aprobación
- Iconos para tipos de ubicación
- Colores para niveles de stock
- Progreso para conteos cíclicos

#### Notificaciones
- Toast notifications para acciones automáticas
- Badges en menú para items pendientes
- Alertas en dashboard para acciones requeridas
- Emails para aprobaciones críticas

#### Formularios Inteligentes
- Auto-completado basado en ubicaciones
- Validación en tiempo real
- Sugerencias basadas en historial
- Campos condicionales según contexto

### 10.3 Flujos de Usuario Optimizados

#### Flujo de Aprobación
1. Notificación de aprobación requerida
2. Vista rápida de detalles de solicitud
3. Botones de acción rápida (Aprobar/Rechazar)
4. Comentarios opcionales
5. Confirmación de acción

#### Flujo de Conteo Cíclico
1. Lista de conteos asignados
2. Selección de conteo a realizar
3. Navegación guiada a ubicaciones
4. Captura rápida de cantidades
5. Identificación automática de discrepancias
6. Confirmación de conteo completado

#### Flujo de Devolución
1. Selección de tipo de devolución
2. Búsqueda y selección de materiales
3. Especificación de cantidades y motivos
4. Captura de fotos (si aplica)
5. Envío de solicitud
6. Seguimiento de estado

## 11. Integración con Sistema Actual

### 11.1 Compatibilidad
- Todas las funcionalidades existentes se mantienen
- Migración gradual de datos existentes
- Configuración opcional de nuevas funcionalidades
- Modo de compatibilidad para transición

### 11.2 Migración de Datos
- Script de migración para ubicaciones existentes
- Configuración inicial de reglas de aprobación
- Establecimiento de parámetros de reorden
- Clasificación ABC automática basada en movimientos históricos

### 11.3 Configuración Inicial
- Wizard de configuración para nuevas funcionalidades
- Valores por defecto sensatos
- Importación de configuraciones desde Excel
- Validación de configuraciones

## 12. Beneficios Esperados

### 12.1 Eficiencia Operativa
- Reducción del 60% en tiempo de aprobaciones
- Eliminación del 90% de stockouts por reorden automático
- Reducción del 40% en tiempo de búsqueda de materiales
- Mejora del 80% en precisión de inventario
- Reducción del 50% en tiempo de procesamiento de devoluciones

### 12.2 Control y Visibilidad
- Trazabilidad completa de ubicaciones
- Historial detallado de aprobaciones
- Métricas en tiempo real de inventario
- Alertas proactivas de problemas
- Reportes automáticos de gestión

### 12.3 Reducción de Costos
- Menor inversión en inventario por optimización de stock
- Reducción de pérdidas por materiales extraviados
- Menor tiempo de personal en tareas administrativas
- Reducción de errores de inventario
- Optimización de espacio de almacén

## 13. Cronograma de Implementación

### Fase 1 (4 semanas): Flujos de Aprobación
- Diseño e implementación de modelo de datos
- Desarrollo de servicio de aprobaciones
- Creación de componentes de UI
- Integración con solicitudes existentes
- Pruebas y validación

### Fase 2 (3 semanas): Reorden Automático
- Implementación de configuración de reorden
- Desarrollo de algoritmo de reorden
- Creación de servicio de monitoreo
- Integración con generación de SC
- Pruebas de automatización

### Fase 3 (5 semanas): Ubicaciones Físicas
- Diseño de estructura de ubicaciones
- Implementación de asignación automática
- Desarrollo de mapa visual
- Integración con entradas y salidas
- Migración de datos existentes

### Fase 4 (4 semanas): Inventario Cíclico
- Implementación de programación automática
- Desarrollo de interface de conteo
- Creación de análisis de discrepancias
- Integración con ajustes de inventario
- Pruebas de precisión

### Fase 5 (3 semanas): Gestión de Devoluciones
- Implementación de flujo de devoluciones
- Desarrollo de proceso de inspección
- Creación de acciones automáticas
- Integración con entradas
- Pruebas de proceso completo

### Fase 6 (2 semanas): Integración y Optimización
- Integración completa de todas las funcionalidades
- Optimización de rendimiento
- Pruebas de carga
- Documentación de usuario
- Capacitación del equipo

**Tiempo Total Estimado: 21 semanas**