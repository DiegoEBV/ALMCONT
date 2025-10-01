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
      console.warn(`[ID_MAPPER] No se pudo mapear ${entityType} ID "${localId}"`);
    }

    return uuid
  } catch (error) {
    console.error(`[ID_MAPPER] Error mapeando ${entityType} ID ${localId}:`, error)
    return null
  }
}

/**
 * Mapea obra_id local a UUID de Supabase
 */
async function mapObraId(localId: string): Promise<string | null> {
  console.log(`[ID_MAPPER] Buscando obra local con ID: "${localId}"`);
  
  // Obtener obra local
  const obraLocal = await localDB.getById('obras', localId) as { codigo?: string; nombre?: string } | null
  if (!obraLocal) {
    console.warn(`[ID_MAPPER] Obra local con ID ${localId} no encontrada en base de datos local`);
    return null
  }

  console.log(`[ID_MAPPER] Obra local encontrada: código "${obraLocal.codigo}", nombre "${obraLocal.nombre}"`);

  // Buscar en Supabase por código
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
  return data.id
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