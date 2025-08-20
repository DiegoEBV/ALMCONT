import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import reqData from '../assets/reqprueb.json' with { type: 'json' }

// Interfaces para los datos del JSON
interface ReqDataItem {
  'N° REQ.': string;
  MATERIAL?: string;
  DESCRIPCIÓN: string;
  UNIDAD?: string;
  TIPO?: string;
  'P.U'?: number;
  CANTIDAD?: number;
  BLOQUE?: string;
  ESTADO: string;
  OBSERVACIONES?: string;
  SOLICITANTE?: string;
  EMPRESA?: string;
  'CANT. ATENDIDA'?: number;
  'FECHA SOL.'?: number;
  'FECHA ATENCION'?: number;
  'N° SOLICITUD DE COMPRA'?: string;
  PROVEEDOR?: string;
  SUBTOTAL?: number;
}

// Interfaces para la base de datos
interface Usuario {
  id: string;
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: string;
  obra_id: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface Obra {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string;
  ubicacion: string;
  fecha_inicio: string;
  fecha_fin_estimada?: string;
  estado: 'ACTIVA' | 'PAUSADA' | 'FINALIZADA';
  presupuesto?: number;
  responsable: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

interface Material {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  subcategoria?: string;
  unidad: string;
  precio_referencial?: number;
  precio_unitario?: number;
  especificaciones?: string;
  proveedor_preferido?: string;
  stock_minimo?: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface Requerimiento {
  id: string;
  obra_id: string;
  numero_rq: string;
  fecha_solicitud: string;
  fecha_requerimiento: string;
  descripcion_actividad: string;
  solicitante: string;
  area_solicitante?: string;
  material_id: string;
  cantidad_solicitada: number;
  unidad: string;
  especificaciones_tecnicas?: string;
  justificacion?: string;
  fecha_necesidad?: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  presupuesto_referencial?: number;
  codigo_presupuesto?: string;
  observaciones?: string;
  archivo_adjunto?: string;
  estado: 'PENDIENTE' | 'ASIGNADO' | 'ATENDIDO' | 'CANCELADO';
  aprobado_por?: string;
  fecha_aprobacion?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  actividad_descripcion: string;
}

interface StockObraMaterial {
  id: string;
  obra_id: string;
  material_id: string;
  cantidad_actual: number;
  cantidad_minima: number;
  ubicacion: string;
  created_at: string;
  updated_at: string;
}

interface Entrada {
  id: string;
  obra_id: string;
  material_id: string;
  cantidad: number;
  precio_unitario: number;
  proveedor: string;
  fecha_entrada: string;
  observaciones: string;
  usuario_id: string;
  created_at: string;
  updated_at: string;
}

interface Salida {
  id: string;
  obra_id: string;
  material_id: string;
  cantidad: number;
  destino: string;
  fecha_salida: string;
  observaciones: string;
  usuario_id: string;
  created_at: string;
  updated_at: string;
}

interface SolicitudCompra {
  id: string;
  sc_numero: string;
  obra_id: string;
  proveedor: string;
  fecha_solicitud: string;
  fecha_entrega: string | null;
  estado: string;
  total: number;
  observaciones: string;
  usuario_id: string;
  created_at: string;
  updated_at: string;
}

interface RqSc {
  id: string;
  rq_id: string;
  sc_id: string;
  created_at: string;
}

interface Database {
  usuarios: Usuario[];
  obras: Obra[];
  materiales: Material[];
  requerimientos: Requerimiento[];
  stock_obra_material: StockObraMaterial[];
  entradas: Entrada[];
  salidas: Salida[];
  solicitudes_compra: SolicitudCompra[];
  rq_sc: RqSc[];
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Función para convertir timestamp a fecha ISO
function timestampToISO(timestamp: number | null | undefined): string {
  if (!timestamp || isNaN(timestamp)) return new Date().toISOString()
  return new Date(timestamp).toISOString()
}

// Función para generar ID único
function generateId(): string {
  return randomUUID()
}

// Función para normalizar texto
function normalizeText(text: string | null | undefined): string {
  if (!text) return ''
  return text.toString().trim().replace(/\s+/g, ' ')
}

// Mapear estados del JSON a estados del sistema
function mapEstado(estado: string | undefined): string {
  if (!estado) return 'PENDIENTE'
  const estadoNorm = estado.toString().trim().toLowerCase()
  if (estadoNorm.includes('atendido')) return 'APROBADO'
  if (estadoNorm.includes('no tendrá atención')) return 'RECHAZADO'
  return 'PENDIENTE'
}

// Función principal para transformar datos
export function transformReqData(): Database {
  const database: Database = {
    usuarios: [
      {
        id: "1",
        email: "coordinador@obra.com",
        password: "123456",
        nombre: "Juan Carlos",
        apellido: "Pérez",
        rol: "COORDINACION",
        obra_id: "1",
        activo: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
      },
      {
        id: "2",
        email: "logistica@obra.com",
        password: "123456",
        nombre: "María",
        apellido: "González",
        rol: "LOGISTICA",
        obra_id: "1",
        activo: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
      },
      {
        id: "3",
        email: "almacenero@obra.com",
        password: "123456",
        nombre: "Carlos",
        apellido: "Rodríguez",
        rol: "ALMACENERO",
        obra_id: "1",
        activo: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
      }
    ],
    obras: [
      {
        id: "1",
        nombre: "Proyecto CHAVIN",
        codigo: "CHAVIN-001",
        descripcion: "Proyecto de construcción CHAVIN",
        ubicacion: "Lima, Perú",
        fecha_inicio: "2024-01-01",
        fecha_fin_estimada: "2024-12-31",
        estado: "ACTIVA" as const,
        presupuesto: 1000000,
        responsable: "Juan Carlos Pérez",
        activa: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
      }
    ],
    materiales: [],
    requerimientos: [],
    stock_obra_material: [],
    entradas: [],
    salidas: [],
    solicitudes_compra: [],
    rq_sc: []
  }

  // Crear materiales únicos basados en los datos
  const materialesMap = new Map() as Map<string, Material>
  const requerimientosMap = new Map() as Map<string, Requerimiento>
  const solicitudesMap = new Map() as Map<string, SolicitudCompra>

  (reqData as ReqDataItem[]).forEach((item: ReqDataItem) => {
    // Crear material si no existe
    const materialKey = `${item.MATERIAL || 'GENERAL'}-${item.DESCRIPCIÓN}`
    if (!materialesMap.has(materialKey)) {
      const materialId = generateId()
      materialesMap.set(materialKey, {
        id: materialId,
        codigo: `MAT-${materialesMap.size + 1}`,
        nombre: normalizeText(item.MATERIAL) || 'Material General',
        descripcion: normalizeText(item.DESCRIPCIÓN),
        unidad: normalizeText(item.UNIDAD) || 'UND',
        categoria: normalizeText(item.MATERIAL) || normalizeText(item.TIPO) || 'GENERAL',
        precio_referencial: item['P.U'] || 0,
        activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    // Crear requerimiento
    const material = materialesMap.get(materialKey)
    if (!material) return
    
    const materialId = material.id
    const reqKey = item['N° REQ.']
    
    if (!requerimientosMap.has(`${reqKey}-${materialId}`)) {
      const requerimientoId = generateId()
      requerimientosMap.set(`${reqKey}-${materialId}`, {
        id: requerimientoId,
        obra_id: "1",
        numero_rq: reqKey,
        fecha_solicitud: timestampToISO(item['FECHA SOL.']),
        fecha_requerimiento: timestampToISO(item['FECHA SOL.']),
        descripcion_actividad: `${item.BLOQUE} - ${normalizeText(item.DESCRIPCIÓN)}`,
        solicitante: normalizeText(item.SOLICITANTE),
        area_solicitante: normalizeText(item.BLOQUE),
        material_id: materialId,
        cantidad_solicitada: item.CANTIDAD || 0,
        unidad: normalizeText(item.UNIDAD) || 'UND',
        especificaciones_tecnicas: normalizeText(item.DESCRIPCIÓN),
        justificacion: `Requerimiento para ${normalizeText(item.BLOQUE)} - ${normalizeText(item.EMPRESA)}`,
        fecha_necesidad: timestampToISO(item['FECHA SOL.']),
        prioridad: "MEDIA" as 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE',
        presupuesto_referencial: item['P.U'] || undefined,
        observaciones: normalizeText(item.OBSERVACIONES),
        estado: mapEstado(item.ESTADO) as 'PENDIENTE' | 'ASIGNADO' | 'ATENDIDO' | 'CANCELADO',
        created_at: timestampToISO(item['FECHA SOL.']),
        updated_at: new Date().toISOString(),
        created_by: "1",
        actividad_descripcion: normalizeText(item.DESCRIPCIÓN)
      })
    }

    // Crear solicitud de compra si existe
    const scNumero = item['N° SOLICITUD DE COMPRA']
    if (scNumero && !solicitudesMap.has(scNumero)) {
      const scId = generateId()
      solicitudesMap.set(scNumero, {
        id: scId,
        sc_numero: scNumero,
        obra_id: "1",
        proveedor: normalizeText(item.PROVEEDOR) || 'Por definir',
        fecha_solicitud: timestampToISO(item['FECHA SOL.']),
        fecha_entrega: item['FECHA ATENCION'] ? timestampToISO(item['FECHA ATENCION']) : null,
        estado: mapEstado(item.ESTADO),
        total: item.SUBTOTAL || 0,
        observaciones: normalizeText(item.OBSERVACIONES),
        usuario_id: "2",
        created_at: timestampToISO(item['FECHA SOL.']),
        updated_at: new Date().toISOString()
      })
    }
  })

  // Convertir Maps a arrays
  const materialesArray: Material[] = Array.from(materialesMap.values())
  const requerimientosArray: Requerimiento[] = Array.from(requerimientosMap.values())
  const solicitudesArray: SolicitudCompra[] = Array.from(solicitudesMap.values())
  
  // Actualizar database con los arrays generados
  database.materiales = materialesArray
  database.requerimientos = requerimientosArray
  database.solicitudes_compra = solicitudesArray;

  // Crear relaciones RQ-SC
  (reqData as ReqDataItem[]).forEach((item: ReqDataItem) => {
    const scNumero = item['N° SOLICITUD DE COMPRA']
    if (scNumero) {
      const sc = database.solicitudes_compra.find(s => s.sc_numero === scNumero)
      const materialKey = `${item.MATERIAL || 'GENERAL'}-${item.DESCRIPCIÓN}`
      const material = materialesMap.get(materialKey)
      if (!material) return
      
      const materialId = material.id
      const req = database.requerimientos.find(r => r.numero_rq === item['N° REQ.'] && r.material_id === materialId)
      
      if (sc && req) {
        database.rq_sc.push({
          id: generateId(),
          rq_id: req.id,
          sc_id: sc.id,
          created_at: new Date().toISOString()
        })
      }
    }
  })

  // Crear stock inicial para materiales
  database.materiales.forEach((material: Material) => {
    database.stock_obra_material.push({
      id: generateId(),
      obra_id: "1",
      material_id: material.id,
      cantidad_actual: Math.floor(Math.random() * 100),
      cantidad_minima: 10,
      ubicacion: "Almacén Principal",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  })

  return database
}

// Función para guardar la base de datos actualizada
export function saveUpdatedDatabase() {
  const newDatabase = transformReqData()
  const dbPath = path.join(__dirname, '../data/database.json')
  
  try {
    fs.writeFileSync(dbPath, JSON.stringify(newDatabase, null, 2), 'utf8')
    console.log('✅ Base de datos actualizada exitosamente con datos de reqprueb.json')
    console.log(`📊 Datos importados:`)
    console.log(`   - ${newDatabase.materiales.length} materiales`)
    console.log(`   - ${newDatabase.requerimientos.length} requerimientos`)
    console.log(`   - ${newDatabase.solicitudes_compra.length} solicitudes de compra`)
    console.log(`   - ${newDatabase.rq_sc.length} relaciones RQ-SC`)
    return true
  } catch (error) {
    console.error('❌ Error al guardar la base de datos:', error)
    return false
  }
}

// Ejecutar directamente
saveUpdatedDatabase()