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
  SUBTOTAL: number | null;
}

// Helper function to parse Excel dates
function parseExcelDate(excelDate: number | string | null): string | null {
  if (!excelDate) return null;
  
  try {
    let date: Date;
    if (typeof excelDate === 'number') {
      // Excel date serial number (days since 1900-01-01)
      const excelEpoch = new Date(1900, 0, 1);
      date = new Date(excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000);
    } else {
      date = new Date(excelDate);
    }
    
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

// Helper function to normalize text
function normalizeText(text: string | null): string | null {
  if (!text) return null;
  return text.toString().trim().replace(/\s+/g, ' ');
}

// Helper function to parse numeric values
function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value);
  return isNaN(num) ? null : num;
}

// Main import function
export async function importReqDataNew(): Promise<void> {
  try {
    console.log('Starting import of requirement data to new table structure...');
    console.log(`Found ${reqData.length} items to import`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < reqData.length; i++) {
      const item = reqData[i] as ReqDataItem;
      
      try {
        console.log(`Processing item ${i + 1}/${reqData.length}: ${item['N° REQ.']}`);
        
        // Skip items without required data
        if (!item['N° REQ.'] || item['N° REQ.'].trim() === '') {
          console.warn(`Skipping item ${i + 1}: No requirement number`);
          continue;
        }
        
        // Parse dates
        const fechaSolicitud = parseExcelDate(item['FECHA SOL.']);
        const fechaAtencion = parseExcelDate(item['FECHA ATENCION']);
        
        // Parse numeric values
        const cantidadRaw = parseNumeric(item.CANTIDAD) || 0;
        const cantidad = Math.floor(cantidadRaw); // Convert to integer
        const cantidadAtendida = parseNumeric(item['CANT. ATENDIDA']);
        const precioUnitario = parseNumeric(item['P.U']);
        const subtotal = parseNumeric(item.SUBTOTAL);
        
        // Prepare the record for insertion
        const requerimientoData = {
          bloque: normalizeText(item.BLOQUE),
          empresa: normalizeText(item.EMPRESA),
          tipo: normalizeText(item.TIPO),
          material: normalizeText(item.MATERIAL),
          descripcion: normalizeText(item.DESCRIPCIÓN),
          numero_requerimiento: normalizeText(item['N° REQ.']),
          fecha_solicitud: fechaSolicitud,
          fecha_atencion: fechaAtencion,
          unidad: normalizeText(item.UNIDAD),
          cantidad: cantidad,
          cantidad_atendida: cantidadAtendida,
          solicitante: normalizeText(item.SOLICITANTE),
          numero_solicitud_compra: normalizeText(item['N° SOLICITUD DE COMPRA']),
          orden_compra: normalizeText(item['ORDEN DE COMPRA']),
          proveedor: normalizeText(item.PROVEEDOR),
          estado: normalizeText(item.ESTADO) || 'PENDIENTE',
          observaciones: normalizeText(item.OBSERVACIONES),
          precio_unitario: precioUnitario,
          subtotal: subtotal
        };
        
        // Insert into the new requerimientos table
        const { error: insertError } = await supabase
          .from('requerimientos')
          .insert(requerimientoData);
        
        if (insertError) {
          throw new Error(`Error inserting requerimiento: ${insertError.message}`);
        }
        
        successCount++;
        console.log(`✓ Successfully imported item ${i + 1}`);
        
      } catch (error) {
        errorCount++;
        const errorMsg = `Error importing item ${i + 1} (${item['N° REQ.']}): ${error}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Total items: ${reqData.length}`);
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Success rate: ${((successCount / reqData.length) * 100).toFixed(1)}%`);
    
    if (errors.length > 0) {
      console.log('\n=== Errors ===');
      errors.slice(0, 10).forEach(error => console.log(error));
      if (errors.length > 10) {
        console.log(`... and ${errors.length - 10} more errors`);
      }
    }
    
    console.log('Import completed!');
    
  } catch (error) {
    console.error('Fatal error during import:', error);
    throw error;
  }
}

// Run import if this file is executed directly
if (process.argv[1] && process.argv[1].includes('importReqDataNew.ts')) {
  importReqDataNew()
    .then(() => {
      console.log('Import script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import script failed:', error);
      process.exit(1);
    });
}