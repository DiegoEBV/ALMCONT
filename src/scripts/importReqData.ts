import { supabase } from './supabaseNode';
import reqData from '../assets/reqprueb.json';

interface ReqDataItem {
  BLOQUE: string;
  EMPRESA: string;
  TIPO: string;
  MATERIAL: string | null;
  DESCRIPCIÓN: string;
  'N° REQ.': string;
  'FECHA SOL.': number;
  'FECHA ATENCION': number | null;
  UNIDAD: string;
  CANTIDAD: number | string;
  'CANT. ATENDIDA': number | null;
  SOLICITANTE: string;
  'N° SOLICITUD DE COMPRA': string | null;
  'ORDEN DE COMPRA': string | null;
  PROVEEDOR: string | null;
  ESTADO: string;
  OBSERVACIONES: string | null;
  'P.U': number | null;
  SUBTOTAL: number;
}

// Helper function to parse dates
function parseDate(dateValue: number | string | null): string | null {
  if (!dateValue) return null;
  
  try {
    let date: Date;
    if (typeof dateValue === 'number') {
      // Handle timestamp
      date = new Date(dateValue);
    } else {
      // Handle string
      date = new Date(dateValue);
    }
    
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

// Helper function to normalize text
function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

// Helper function to map estado
function mapEstado(estado: string): string {
  const estadoMap: { [key: string]: string } = {
    'PENDIENTE': 'PENDIENTE',
    'EN_PROCESO': 'EN_PROCESO',
    'APROBADO': 'APROBADO',
    'RECHAZADO': 'RECHAZADO',
    'COMPLETADO': 'COMPLETADO',
    'CANCELADO': 'CANCELADO'
  };
  
  const normalizedEstado = estado.toUpperCase().replace(/\s+/g, '_');
  return estadoMap[normalizedEstado] || 'PENDIENTE';
}

// Function to get or create obra - Modified to create main project instead of individual blocks
async function getOrCreateObra(bloque: string, empresa: string): Promise<{ obraId: string, ubicacion: string }> {
  // Create main project obra instead of individual block obras
  const proyectoCodigo = `PROYECTO-${empresa}`.toUpperCase();
  const proyectoNombre = `Proyecto ${empresa}`;
  
  // Truncate codigo and nombre to fit database constraints
  const truncatedCodigo = proyectoCodigo.substring(0, 20);
  const truncatedNombre = proyectoNombre.substring(0, 100); // Assuming nombre can be longer
  
  // Check if main project obra exists
  const { data: existingObra, error: searchError } = await supabase
    .from('obras')
    .select('id')
    .eq('codigo', truncatedCodigo)
    .single();
  
  let obraId: string;
  
  if (existingObra && !searchError) {
    obraId = existingObra.id;
  } else {
    // Create new main project obra
    const { data: newObra, error: createError } = await supabase
      .from('obras')
      .insert({
        codigo: truncatedCodigo,
        nombre: truncatedNombre,
        descripcion: `Proyecto principal de ${empresa} con múltiples bloques/ubicaciones`,
        estado: 'ACTIVA'
      })
      .select('id')
      .single();
    
    if (createError) {
      throw new Error(`Error creating main project obra: ${createError.message}`);
    }
    
    obraId = newObra.id;
  }
  
  // Return both obra ID and the block as location
  return {
    obraId,
    ubicacion: bloque // This will be used as location within the obra
  };
}

// Function to get or create material
async function getOrCreateMaterial(material: string, descripcion: string, unidad: string): Promise<string> {
  // Handle null or undefined material
  if (!material || material.trim() === '') {
    throw new Error('Material name is required and cannot be empty');
  }
  
  const codigo = material.toUpperCase().replace(/\s+/g, '_');
  const nombre = normalizeText(material);
  
  // Check if material exists
  const { data: existingMaterial, error: searchError } = await supabase
    .from('materiales')
    .select('id')
    .eq('codigo', codigo)
    .single();
  
  if (existingMaterial && !searchError) {
    return existingMaterial.id;
  }
  
  // Create new material
  const { data: newMaterial, error: createError } = await supabase
    .from('materiales')
    .insert({
      codigo,
      nombre,
      descripcion: normalizeText(descripcion),
      categoria: 'GENERAL',
      unidad_medida: unidad ? unidad.toUpperCase() : 'UND',
      activo: true
    })
    .select('id')
    .single();
  
  if (createError) {
    throw new Error(`Error creating material: ${createError.message}`);
  }
  
  return newMaterial.id;
}

// Main import function
export async function importReqData(): Promise<void> {
  try {
    console.log('Starting import of requirement data...');
    console.log(`Found ${reqData.length} items to import`);
    
    // Get a default user ID for created_by field
    const { data: defaultUser } = await supabase
      .from('usuarios')
      .select('id')
      .limit(1)
      .single();
    
    if (!defaultUser) {
      throw new Error('No users found in database. Please create a user first.');
    }
    
    const defaultUserId = defaultUser.id;
    console.log(`Using default user ID: ${defaultUserId}`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < reqData.length; i++) {
      const item = reqData[i] as ReqDataItem;
      
      try {
        console.log(`Processing item ${i + 1}/${reqData.length}: ${item['N° REQ.']}`);
        
        // Get or create obra (now returns obra ID and location)
        const obraResult = await getOrCreateObra(item.BLOQUE, item.EMPRESA);
        const obraId = obraResult.obraId;
        const ubicacion = obraResult.ubicacion;
        
        // Get or create material - skip if material is null/empty
        if (!item.MATERIAL || item.MATERIAL.trim() === '') {
          console.warn(`Skipping item ${i + 1}: Material is empty or null`);
          continue;
        }
        
        const materialId = await getOrCreateMaterial(
          item.MATERIAL,
          item.DESCRIPCIÓN || 'Sin descripción',
          item.UNIDAD || 'UND'
        );
        
        // Parse dates - provide default if null
        const fechaRequerimiento = parseDate(item['FECHA SOL.']) || new Date().toISOString().split('T')[0];
        const fechaNecesidad = parseDate(item['FECHA ATENCION']) || new Date().toISOString().split('T')[0];
        
        // Check if requerimiento already exists
        const { data: existingReq } = await supabase
          .from('requerimientos')
          .select('id')
          .eq('numero_rq', item['N° REQ.'])
          .single();
        
        let requerimiento;
        if (existingReq) {
          // Use existing requerimiento
          requerimiento = existingReq;
          console.log(`Using existing requerimiento: ${item['N° REQ.']}`);
        } else {
          // Create new requerimiento
          const { data: newReq, error: reqError } = await supabase
            .from('requerimientos')
            .insert({
              numero_rq: item['N° REQ.'],
              obra_id: obraId,
              fecha_requerimiento: fechaRequerimiento,
              fecha_necesidad: fechaNecesidad,
              solicitante: normalizeText(item.SOLICITANTE),
              area_solicitante: item.TIPO,
              justificacion: `Requerimiento para ${item.MATERIAL} - Ubicación: ${ubicacion}`,
              prioridad: 'MEDIA',
              estado: mapEstado(item.ESTADO),
              observaciones: `Ubicación: ${ubicacion}${item.OBSERVACIONES ? ' - ' + item.OBSERVACIONES : ''}`,
              created_by: defaultUserId
            })
            .select('id')
            .single();
          
          if (reqError) {
            throw new Error(`Error creating requerimiento: ${reqError.message}`);
          }
          
          requerimiento = newReq;
        }
        
        // Create requerimiento item
        const { error: itemError } = await supabase
          .from('requerimiento_items')
          .insert({
            requerimiento_id: requerimiento.id,
            material_id: materialId,
            cantidad_solicitada: item.CANTIDAD,
            cantidad_aprobada: item['CANT. ATENDIDA'],
            precio_estimado: item['P.U'],
            especificaciones: item.DESCRIPCIÓN,
            observaciones: item.OBSERVACIONES || null
          });
        
        if (itemError) {
          throw new Error(`Error creating requerimiento item: ${itemError.message}`);
        }
        
        successCount++;
        console.log(`✓ Successfully imported item ${i + 1}`);
        
      } catch (error) {
        errorCount++;
        console.error(`✗ Error importing item ${i + 1}:`, error);
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Total items: ${reqData.length}`);
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('Import completed!');
    
  } catch (error) {
    console.error('Fatal error during import:', error);
    throw error;
  }
}

// Run import if this file is executed directly
if (process.argv[1] && process.argv[1].includes('importReqData.ts')) {
  importReqData()
    .then(() => {
      console.log('Import script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import script failed:', error);
      process.exit(1);
    });
}