// Agregar UserRole que falta
export type UserRole = 'COORDINACION' | 'LOGISTICA' | 'ALMACENERO'

// Tipos de autenticación
export interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

// Tipos base
export interface Usuario {
  id: string
  email: string
  password: string
  nombre: string
  apellido: string
  rol: UserRole
  obra_id: string
  activo: boolean
  created_at: string
  updated_at: string
  obra?: Obra
}

export interface Obra {
  id: string
  nombre: string
  codigo: string
  ubicacion: string
  fecha_inicio: string
  fecha_fin_estimada?: string
  estado: 'ACTIVA' | 'PAUSADA' | 'FINALIZADA' | 'CANCELADA'
  presupuesto?: number
  responsable_id?: string
  responsable?: string
  descripcion?: string
  created_at: string
  updated_at: string
}

export interface Material {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  categoria: string
  subcategoria?: string
  unidad: string
  precio_referencial?: number
  precio_unitario?: number
  especificaciones?: string
  proveedor_preferido?: string
  stock_minimo?: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Requerimiento {
  id: string
  obra_id: string
  numero_rq: string
  fecha_solicitud: string
  fecha_requerimiento: string
  descripcion_actividad: string
  solicitante: string
  area_solicitante?: string
  material_id: string
  cantidad_solicitada: number
  unidad: string
  especificaciones_tecnicas?: string
  justificacion?: string
  fecha_necesidad?: string
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE'
  presupuesto_referencial?: number
  codigo_presupuesto?: string
  observaciones?: string
  archivo_adjunto?: string
  estado: 'PENDIENTE' | 'ASIGNADO' | 'ATENDIDO' | 'CANCELADO'
  aprobado_por?: string
  fecha_aprobacion?: string
  created_at: string
  updated_at: string
  created_by: string
  actividad_descripcion: string
  // Relaciones
  obra?: Obra
  material?: Material
  [key: string]: unknown
}

export interface RequerimientoFormData {
  numero_rq: string
  fecha_solicitud: string
  fecha_requerimiento: string
  fecha_necesidad: string
  obra_id: string
  material_id: string
  cantidad_solicitada: number
  unidad: string
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE'
  solicitante: string
  observaciones?: string
  especificaciones_tecnicas?: string
  justificacion?: string
  descripcion_actividad?: string
  area_solicitante?: string
  codigo_presupuesto?: string
  archivo_adjunto?: string
  estado?: 'PENDIENTE' | 'ASIGNADO' | 'ATENDIDO' | 'CANCELADO'
  fecha_aprobacion?: string
  actividad_descripcion?: string
  created_by?: string
  presupuesto_referencial?: number
  aprobado_por?: string
}

export interface EntradaFormData {
  obra_id: string
  material_id: string
  solicitud_compra_id: string
  cantidad: number
  fecha_entrada: string
  numero_sc: string
  observaciones?: string
  created_by: string
}

export interface SalidaFormData {
  obra_id: string
  material_id: string
  requerimiento_id?: string
  cantidad: number
  cantidad_entregada: number
  fecha_salida: string
  fecha_entrega: string
  solicitante: string
  motivo: string
  observaciones?: string
  created_by: string
}

export interface SolicitudCompraFormData {
  obra_id: string
  sc_numero?: string
  oc_numero?: string
  proveedor?: string
  fecha_solicitud: string
  fecha_entrega?: string
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'PROCESADO' | 'CANCELADO'
  total: number
  observaciones?: string
  created_by?: string
}

export interface SolicitudCompra {
  id: string
  sc_numero: string
  obra_id: string
  proveedor: string
  fecha_solicitud: string
  fecha_entrega?: string | null
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'PROCESADO' | 'CANCELADO'
  total: number
  observaciones: string
  usuario_id: string
  created_at: string
  updated_at: string
  obra?: Obra
  requerimientos?: Requerimiento[]
  [key: string]: unknown
}

export interface RqSc {
  id: string
  rq_id: string
  sc_id: string
  created_at: string
  requerimiento?: Requerimiento
  solicitud_compra?: SolicitudCompra
}

export interface Entrada {
  id: string
  obra_id: string
  solicitud_compra_id?: string
  material_id: string
  cantidad_recibida: number
  cantidad_atendida: number
  fecha_recepcion: string
  fecha_entrada: string
  numero_factura?: string
  numero_guia?: string
  numero_sc?: string
  proveedor: string
  precio_unitario?: number
  observaciones?: string
  recibido_por: string
  usuario_id?: string
  created_at: string
  updated_at: string
  obra?: Obra
  material?: Material
  solicitud_compra?: SolicitudCompra
  usuario?: AuthUser
}

export interface Salida {
  id: string
  obra_id: string
  requerimiento_id?: string
  material_id: string
  cantidad_entregada: number
  fecha_entrega: string
  numero_salida?: string
  solicitante: string
  motivo: string
  observaciones?: string
  entregado_por: string
  usuario_id?: string
  created_at: string
  updated_at: string
  obra?: Obra
  material?: Material
  requerimiento?: Requerimiento
  usuario?: AuthUser
}

export interface StockObraMaterial {
  id: string
  obra_id: string
  material_id: string
  cantidad_actual: number
  cantidad_minima: number
  ubicacion?: string
  created_at: string
  updated_at: string
  obra?: Obra
  material?: Material
  [key: string]: unknown
}

// Alias para compatibilidad
export type Stock = StockObraMaterial

// Tipos para crear y actualizar stock
export interface CreateStockData {
  obra_id: string
  material_id: string
  cantidad_actual: number
  cantidad_minima?: number
}

export interface UpdateStockData {
  cantidad_actual?: number
  cantidad_minima?: number
}

// Tipos para componentes UI
export interface TableColumn<T> {
  key: string
  title: string
  dataIndex?: keyof T
  render?: (value: T[keyof T], record: T, index: number) => React.ReactNode
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  className?: string
}

export interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void
  sortKey?: keyof T
  sortDirection?: 'asc' | 'desc'
  pagination?: {
    currentPage: number
    totalPages: number
    pageSize: number
    totalItems: number
    onPageChange: (page: number) => void
  }
}

// Tipos para filtros
export interface RequerimientoFilters {
  busqueda?: string
  obra_id?: string
  estado?: string
  prioridad?: string
  fecha_desde?: string
  fecha_hasta?: string
  material_id?: string
  numero_rq?: string
  solicitante?: string
}

export interface SolicitudCompraFilters {
  obra_id?: string
  estado?: string
  proveedor?: string
  fecha_desde?: string
  fecha_hasta?: string
  busqueda?: string
}

export interface EntradaFilters {
  obra_id?: string
  material_id?: string
  proveedor?: string
  fecha_desde?: string
  fecha_hasta?: string
  busqueda?: string
}

export interface SalidaFilters {
  obra_id?: string
  material_id?: string
  solicitante?: string
  fecha_desde?: string
  fecha_hasta?: string
  busqueda?: string
}

export interface StockFilters {
  obra_id?: string
  material_id?: string
  categoria?: string
  stock_bajo?: boolean
  busqueda?: string
}

// Tipos para estadísticas y reportes
export interface EstadisticasObra {
  total_requerimientos: number
  requerimientos_pendientes: number
  requerimientos_asignados: number
  requerimientos_atendidos: number
  total_materiales: number
  valor_stock_total: number
  entradas_mes_actual: number
  salidas_mes_actual: number
}

export interface MovimientoKardex {
  fecha: string
  tipo: 'ENTRADA' | 'SALIDA'
  documento: string
  cantidad: number
  precio_unitario?: number
  saldo: number
  observaciones?: string
}

// Tipos para autenticación
export interface AuthUser {
  id: string
  email: string
  nombre: string
  apellido: string
  rol: UserRole
  obra_id: string
  activo: boolean
  obra?: Obra
}

export interface AuthSession {
  user: AuthUser
  token: string
  expiresAt: number
}

export interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

// Tipos para opciones de select
export interface SelectOption {
  value: string
  label: string
}

// Tipos para respuestas de API
export interface ApiResponse<T> {
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

// Tipos para importación XLSX
export interface ImportResult {
  success: number
  errors: number
  details: {
    row: number
    error: string
  }[]
}

export interface XLSXRow {
  [key: string]: unknown
}

// Tipo para movimientos de stock en kardex
export interface MovimientoStock {
  id: string
  tipo: 'ENTRADA' | 'SALIDA' | 'TRANSFERENCIA' | 'AJUSTE'
  fecha: string
  cantidad: number
  saldo_acumulado: number
  numero_sc?: string
  solicitante?: string
  motivo?: string
  observaciones?: string
  created_by: string
}

// Interfaz para movimientos de kardex con información completa
export interface KardexMovimiento {
  id: string
  material_id: string
  obra_id: string
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'TRANSFERENCIA' | 'AJUSTE'
  cantidad: number
  fecha: string
  documento_referencia?: string
  observaciones?: string
  usuario_id: string
  saldo_anterior: number
  saldo_actual: number
  created_at: string
  // Relaciones
  material?: Material
  obra?: Obra
  usuario?: Usuario
}

// Tipos para notificaciones
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
}

// Tipos para configuración
export interface AppConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  environment: 'development' | 'production'
  version: string
}

export interface DatabaseConfig {
  localStorageKey: string
  version: string
}

// Tipos para reportes
export interface FiltrosReporte {
  obraId?: string
  obra_id?: string
  fechaInicio?: string
  fechaFin?: string
  fecha_desde?: string
  fecha_hasta?: string
  categoria?: string
  estado?: string
  stockBajo?: boolean
}

export interface ReporteData {
  [key: string]: string | number | boolean | Date | null | undefined
}

export interface ReporteRequerimientos {
  obra: string
  total_requerimientos: number
  pendientes: number
  asignados: number
  atendidos: number
  valor_total: number
}

export interface ReporteStock {
  obra: string
  material: string
  categoria: string
  cantidad_actual: number
  stock_minimo: number
  valor_total: number
  estado: 'NORMAL' | 'BAJO' | 'AGOTADO'
}

export interface ReporteMovimientos {
  fecha: string
  entradas: number
  salidas: number
  transferencias: number
  ajustes: number
  valor_entradas: number
  valor_salidas: number
}

export interface ReporteConsumo {
  material_id: string
  material_nombre: string
  material_codigo: string
  obra_id: string
  obra_nombre: string
  cantidad_consumida: number
  valor_consumido: number
  periodo: string
}

// Interfaz para órdenes de compra
export interface OrdenCompra {
  id: string
  oc_numero: string
  sc_id: string
  obra_id: string
  proveedor: string
  fecha_orden: string
  fecha_entrega_estimada?: string
  fecha_entrega_real?: string
  estado: 'PENDIENTE' | 'APROBADA' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA'
  subtotal: number
  igv: number
  total: number
  moneda: 'PEN' | 'USD'
  condiciones_pago?: string
  observaciones?: string
  usuario_id: string
  created_at: string
  updated_at: string
  // Relaciones
  obra?: Obra
  usuario?: Usuario
  solicitud_compra?: SolicitudCompra
  [key: string]: unknown
}

// Interfaz para formulario de órdenes de compra
export interface OrdenCompraFormData {
  oc_numero: string
  sc_id: string
  obra_id: string
  proveedor: string
  fecha_orden: string
  fecha_entrega_estimada?: string
  estado: 'PENDIENTE' | 'APROBADA' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA'
  subtotal: number
  igv: number
  total: number
  moneda: 'PEN' | 'USD'
  condiciones_pago?: string
  observaciones?: string
}

// Interfaz para filtros de órdenes de compra
export interface OrdenCompraFilters {
  obra_id?: string
  proveedor?: string
  estado?: string
  fecha_desde?: string
  fecha_hasta?: string
  oc_numero?: string
}

// Interfaz para relación entre Solicitud de Compra y Orden de Compra
export interface ScOc {
  id: string
  sc_id: string
  oc_id: string
  created_at: string
}

// Tipos para funcionalidades avanzadas

// Tipos para sistema de aprobaciones
export interface ApprovalRule {
  id: string;
  tipo_documento: string;
  condiciones: any;
  nivel_requerido: number;
  nivel_aprobacion: number;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequest {
  tipo_documento: string;
  documento_id: string;
  usuario_solicitante: string;
  descripcion?: string;
  metadata?: any;
  monto?: number;
  monto_total?: number;
  prioridad?: string;
  created_at: string;
}

// Tipos para sistema de reorden automático
export interface ReorderConfig {
  id: string
  material_id: string
  punto_reorden: number
  cantidad_maxima: number
  proveedor_preferido?: string
  tiempo_entrega_dias: number
  activo: boolean
  created_at: string
  updated_at: string
  material?: Material
}

export interface PurchaseRequest {
  id: string
  material_id: string
  cantidad_sugerida: number
  motivo: string
  estado: 'PENDIENTE' | 'APROBADO' | 'PROCESADO' | 'CANCELADO'
  fecha_sugerencia: string
  proveedor_sugerido?: string
  observaciones?: string
  created_at: string
  updated_at: string
  material?: Material
}

// Tipos para gestión de ubicaciones
export interface Location {
  id: string
  codigo: string
  nombre: string
  tipo: 'ESTANTERIA' | 'PISO' | 'CONTENEDOR' | 'AREA'
  capacidad_maxima?: number
  ubicacion_fisica?: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface MaterialLocation {
  id: string
  material_id: string
  location_id: string
  cantidad: number
  fecha_asignacion: string
  created_at: string
  updated_at: string
  material?: Material
  location?: Location
}

// Tipos para inventario cíclico
export interface CyclicCount {
  id: string
  fecha_programada: string
  clasificacion_abc: 'A' | 'B' | 'C'
  estado: 'PROGRAMADO' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO'
  usuario_asignado?: string
  fecha_inicio?: string
  fecha_fin?: string
  observaciones?: string
  created_at: string
  updated_at: string
}

export interface CountDetail {
  id: string
  cyclic_count_id: string
  material_id: string
  cantidad_sistema: number
  cantidad_fisica?: number
  diferencia?: number
  observaciones?: string
  created_at: string
  updated_at: string
  material?: Material
}

// Tipos para sistema de devoluciones
export interface Return {
  id: string
  numero_devolucion: string
  fecha_devolucion: string
  motivo: string
  estado: 'PENDIENTE' | 'APROBADO' | 'PROCESADO' | 'RECHAZADO'
  usuario_id: string
  observaciones?: string
  created_at: string
  updated_at: string
  usuario?: Usuario
}

export interface ReturnDetail {
  id: string
  return_id: string
  material_id: string
  cantidad: number
  motivo_detalle?: string
  estado_material: 'BUENO' | 'DAÑADO' | 'OBSOLETO'
  accion: 'REINTEGRAR' | 'REPARAR' | 'DESCARTAR'
  created_at: string
  updated_at: string
  material?: Material
}

// Alias para StockMovement (usado en locationService)
export type StockMovement = KardexMovimiento

// Tipos para configuración de notificaciones
export interface NotificationConfig {
  id: string
  tipo: 'STOCK_BAJO' | 'REORDEN' | 'APROBACION' | 'VENCIMIENTO'
  activo: boolean
  destinatarios: string[]
  condiciones: {
    [key: string]: any
  }
  created_at: string
  updated_at: string
}

export interface Approval {
  id: string;
  tipo: string;
  referencia_id: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  solicitante_id: string;
  aprobador_id?: string;
  fecha_solicitud: string;
  fecha_respuesta?: string;
  comentarios?: string;
  datos_solicitud: any;
  nivel_aprobacion: number;
  created_at: string;
  updated_at: string;
}