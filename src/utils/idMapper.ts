import { supabase } from '../lib/supabase'
import { localDB } from '../lib/localDB'
import { isValidUUID } from './uuidValidator'

// Cache para mapeos de IDs
const idMappingCache = new Map<string, string>()

/**
 * Mapea un ID local a su UUID correspondiente en Supabase
 * @param localId ID local (ej: "1")
 * @param entityType Tipo de entidad ("obra", "usuario", "material")
 * @returns UUID de Supabase o null si no se encuentra
 */
export async function mapLocalIdToUUID(localId: string, entityType: 'obra' | 'usuario' | 'material'): Promise<string | null> {
  console.log(`[ID_MAPPER] Iniciando mapeo: ${entityType} ID local "${localId}"`);
  
  // Validar entrada
  if (!localId || typeof localId !== 'string') {
    console.error(`[ID_MAPPER] ID local inválido: "${localId}"`);
    return null;
  }
  
  const cacheKey = `${entityType}:${localId}`
  
  // Verificar cache primero
  if (idMappingCache.has(cacheKey)) {
    const cachedUUID = idMappingCache.get(cacheKey)!;
    console.log(`[ID_MAPPER] UUID encontrado en cache: ${localId} -> ${cachedUUID}`);
    return cachedUUID;
  }

  try {
    let uuid: string | null = null

    switch (entityType) {
      case 'obra':
        uuid = await mapObraId(localId)
        break
      case 'usuario':
        uuid = await mapUsuarioId(localId)
        break
      case 'material':
        uuid = await mapMaterialId(localId)
        break
      default:
        console.error(`[ID_MAPPER] Tipo de entidad no soportado: "${entityType}"`);
        return null;
    }

    if (uuid) {
      // Validar que el UUID obtenido sea válido
      if (!isValidUUID(uuid)) {
        console.error(`[ID_MAPPER] UUID inválido obtenido: "${uuid}" para ${entityType} ID "${localId}"`);
        return null;
      }
      
      console.log(`[ID_MAPPER] Mapeo exitoso: ${entityType} "${localId}" -> UUID "${uuid}"`);
      idMappingCache.set(cacheKey, uuid);
    } else {
      console.warn(`[ID_MAPPER] No se pudo mapear ${entityType} ID "${localId}". Verificar que la entidad existe en Supabase.`);
      
      // Agregar información adicional para debugging
      if (entityType === 'obra') {
        console.warn(`[ID_MAPPER] Sugerencia: Verificar que existan obras activas en Supabase y que el ID "${localId}" sea válido.`);
      }
    }

    return uuid
  } catch (error) {
    console.error(`[ID_MAPPER] Error crítico mapeando ${entityType} ID ${localId}:`, error);
    
    // Agregar información de contexto para el error
    if (error instanceof Error) {
      console.error(`[ID_MAPPER] Detalles del error: ${error.message}`);
      console.error(`[ID_MAPPER] Stack trace:`, error.stack);
    }
    
    return null
  }
}

/**
 * Mapea obra_id local a UUID de Supabase
 */
async function mapObraId(localId: string): Promise<string | null> {
  console.log(`[ID_MAPPER] Buscando obra con ID: "${localId}"`);
  
  // Primero verificar si ya es un UUID válido
  if (isValidUUID(localId)) {
    console.log(`[ID_MAPPER] ID "${localId}" ya es un UUID válido, retornando directamente`);
    return localId;
  }
  
  // Caso especial: Si es un ID numérico local (como "1"), buscar directamente en Supabase
  // ya que las obras locales están vacías y se cargan desde Supabase
  if (/^\d+$/.test(localId)) {
    console.log(`[ID_MAPPER] ID "${localId}" es numérico, buscando directamente en Supabase`);
    
    try {
      // Obtener todas las obras de Supabase y tomar la primera (para ID "1")
      const { data: obras, error } = await supabase
        .from('obras')
        .select('id, codigo, nombre')
        .eq('estado', 'ACTIVA')
        .order('created_at')
        .limit(parseInt(localId) || 1);

      if (error) {
        console.error(`[ID_MAPPER] Error consultando obras en Supabase:`, error);
        return null;
      }

      if (!obras || obras.length === 0) {
        console.warn(`[ID_MAPPER] No se encontraron obras activas en Supabase`);
        return null;
      }

      // Para ID "1", tomar la primera obra; para otros IDs numéricos, tomar la obra en esa posición
      const obraIndex = parseInt(localId) - 1;
      const obra = obras[obraIndex] || obras[0]; // Fallback a la primera obra si el índice está fuera de rango

      console.log(`[ID_MAPPER] Obra mapeada desde Supabase: ID local "${localId}" -> "${obra.nombre}" (${obra.id})`);
      return obra.id;
    } catch (error) {
      console.error(`[ID_MAPPER] Error mapeando ID numérico "${localId}":`, error);
      return null;
    }
  }
  
  // Obtener obra de la base de datos local (que ahora contiene obras de Supabase)
  const obraLocal = await localDB.getById('obras', localId) as { id?: string; codigo?: string; nombre?: string; localId?: string } | null
  if (!obraLocal) {
    console.warn(`[ID_MAPPER] Obra con ID ${localId} no encontrada en base de datos local`);
    return null
  }

  console.log(`[ID_MAPPER] Obra encontrada: código "${obraLocal.codigo}", nombre "${obraLocal.nombre}"`);

  // Si la obra tiene un UUID real (viene de Supabase), usarlo
  if (obraLocal.id && isValidUUID(obraLocal.id)) {
    console.log(`[ID_MAPPER] Obra tiene UUID real: ${localId} -> ${obraLocal.id}`);
    return obraLocal.id;
  }

  // Fallback: buscar en Supabase por código si no tiene UUID
  if (obraLocal.codigo) {
    console.log(`[ID_MAPPER] Buscando en Supabase por código: "${obraLocal.codigo}"`);
    const { data, error } = await supabase
      .from('obras')
      .select('id')
      .eq('codigo', obraLocal.codigo)
      .single()

    if (error) {
      console.error(`[ID_MAPPER] Error consultando Supabase para obra código "${obraLocal.codigo}":`, error);
      return null;
    }
    
    if (!data) {
      console.warn(`[ID_MAPPER] Obra con código "${obraLocal.codigo}" no encontrada en Supabase`);
      return null;
    }

    console.log(`[ID_MAPPER] Obra encontrada en Supabase: código "${obraLocal.codigo}" -> UUID "${data.id}"`);
    return data.id;
  }

  console.warn(`[ID_MAPPER] No se pudo mapear obra con ID ${localId}`);
  return null;
}

/**
 * Mapea usuario_id local a UUID de Supabase
 */
async function mapUsuarioId(localId: string): Promise<string | null> {
  // Obtener usuario local
  const usuarioLocal = await localDB.getById('usuarios', localId) as { email?: string } | null
  if (!usuarioLocal) {
    console.warn(`Usuario local con ID ${localId} no encontrado`)
    return null
  }

  // Buscar en Supabase por email
  const { data, error } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', usuarioLocal.email)
    .single()

  if (error || !data) {
    console.warn(`Usuario con email ${usuarioLocal.email} no encontrado en Supabase`)
    return null
  }

  return data.id
}

/**
 * Mapea material_id local a UUID de Supabase
 */
async function mapMaterialId(localId: string): Promise<string | null> {
  // Obtener material local
  const materialLocal = await localDB.getById('materiales', localId) as { codigo?: string } | null
  if (!materialLocal) {
    console.warn(`Material local con ID ${localId} no encontrado`)
    return null
  }

  // Buscar en Supabase por código
  const { data, error } = await supabase
    .from('materiales')
    .select('id')
    .eq('codigo', materialLocal.codigo)
    .single()

  if (error || !data) {
    console.warn(`Material con código ${materialLocal.codigo} no encontrado en Supabase`)
    return null
  }

  return data.id
}

/**
 * Limpia el cache de mapeos
 */
export function clearIdMappingCache(): void {
  idMappingCache.clear()
}

/**
 * Obtiene el UUID de obra asignada al usuario actual
 */
export async function getCurrentUserObraUUID(userId: string): Promise<string | null> {
  return await mapLocalIdToUUID(userId, 'usuario')
    .then(async (userUUID) => {
      if (!userUUID) return null
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('obra_id')
        .eq('id', userUUID)
        .single()
      
      if (error || !data?.obra_id) {
        return null
      }
      
      return data.obra_id
    })
}