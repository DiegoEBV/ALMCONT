import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { toast } from 'sonner';

export interface ImportJob {
  id: string;
  user_id: string;
  file_name: string;
  file_type: 'csv' | 'xml' | 'json' | 'excel';
  file_size: number;
  target_table: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  warning_records?: number;
  field_mapping?: Record<string, string>;
  validation_rules?: Record<string, any>;
  error_summary?: Record<string, any>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ImportError {
  id: string;
  import_job_id: string;
  row_number: number;
  field_name?: string;
  error_type: string;
  error_message: string;
  raw_value?: string;
  suggested_fix?: string;
  created_at: string;
}

export interface ImportTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  target_table: string;
  field_mapping: Record<string, string>;
  validation_rules?: Record<string, any>;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ParsedData {
  headers: string[];
  data: Record<string, any>[];
  totalRows: number;
  preview: Record<string, any>[];
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  row: number;
  field: string;
  message: string;
  value: any;
  severity: 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  totalRows: number;
  validRows: number;
  summary?: {
    totalErrors: number;
    totalWarnings: number;
    errorsByField: Record<string, number>;
    warningsByField: Record<string, number>;
  };
}

class ImportService {
  // Parsear archivo según su tipo
  async parseFile(file: File): Promise<ParsedData> {
    const fileType = this.getFileType(file.name);
    
    switch (fileType) {
      case 'csv':
        return this.parseCSV(file);
      case 'excel':
        return this.parseExcel(file);
      case 'json':
        return this.parseJSON(file);
      case 'xml':
        return this.parseXML(file);
      default:
        throw new Error(`Tipo de archivo no soportado: ${fileType}`);
    }
  }

  // Parsear CSV
  private async parseCSV(file: File): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`Error parsing CSV: ${results.errors[0].message}`));
            return;
          }

          const data = results.data as Record<string, any>[];
          const headers = results.meta.fields || [];
          
          resolve({
            headers,
            data,
            totalRows: data.length,
            preview: data.slice(0, 10)
          });
        },
        error: (error) => reject(error)
      });
    });
  }

  // Parsear Excel
  private async parseExcel(file: File): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length === 0) {
            reject(new Error('El archivo Excel está vacío'));
            return;
          }

          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1).map(row => {
            const obj: Record<string, any> = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });

          resolve({
            headers,
            data: rows,
            totalRows: rows.length,
            preview: rows.slice(0, 10)
          });
        } catch (error) {
          reject(new Error(`Error parsing Excel: ${error}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Error reading Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Parsear JSON
  private async parseJSON(file: File): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const jsonData = JSON.parse(content);
          
          let data: Record<string, any>[];
          
          if (Array.isArray(jsonData)) {
            data = jsonData;
          } else if (jsonData.data && Array.isArray(jsonData.data)) {
            data = jsonData.data;
          } else {
            data = [jsonData];
          }

          if (data.length === 0) {
            reject(new Error('El archivo JSON no contiene datos'));
            return;
          }

          const headers = Object.keys(data[0]);

          resolve({
            headers,
            data,
            totalRows: data.length,
            preview: data.slice(0, 10)
          });
        } catch (error) {
          reject(new Error(`Error parsing JSON: ${error}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Error reading JSON file'));
      reader.readAsText(file);
    });
  }

  // Parsear XML
  private async parseXML(file: File): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');
          
          // Buscar el elemento raíz que contenga los datos
          const rootElement = xmlDoc.documentElement;
          const dataElements = rootElement.children;
          
          if (dataElements.length === 0) {
            reject(new Error('El archivo XML no contiene datos'));
            return;
          }

          const data: Record<string, any>[] = [];
          const headersSet = new Set<string>();

          // Extraer datos de cada elemento
          for (let i = 0; i < dataElements.length; i++) {
            const element = dataElements[i];
            const row: Record<string, any> = {};
            
            // Extraer atributos
            for (let j = 0; j < element.attributes.length; j++) {
              const attr = element.attributes[j];
              row[attr.name] = attr.value;
              headersSet.add(attr.name);
            }
            
            // Extraer elementos hijos
            for (let j = 0; j < element.children.length; j++) {
              const child = element.children[j];
              row[child.tagName] = child.textContent || '';
              headersSet.add(child.tagName);
            }
            
            // Si no hay hijos ni atributos, usar el contenido del texto
            if (element.children.length === 0 && element.attributes.length === 0) {
              row[element.tagName] = element.textContent || '';
              headersSet.add(element.tagName);
            }
            
            data.push(row);
          }

          const headers = Array.from(headersSet);

          resolve({
            headers,
            data,
            totalRows: data.length,
            preview: data.slice(0, 10)
          });
        } catch (error) {
          reject(new Error(`Error parsing XML: ${error}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Error reading XML file'));
      reader.readAsText(file);
    });
  }

  // Validar datos
  validateData(
    data: Record<string, any>[],
    fieldMapping: Record<string, string>,
    validationRules?: Record<string, any>
  ): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    data.forEach((row, index) => {
      Object.entries(fieldMapping).forEach(([sourceField, targetField]) => {
        const value = row[sourceField];
        const rules = validationRules?.[targetField];

        if (rules) {
          // Validación de campo requerido
          if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push({
              row: index + 1,
              field: sourceField,
              message: `El campo ${targetField} es requerido`,
              value,
              severity: 'error'
            });
          }

          // Validación de tipo de dato
          if (value !== undefined && value !== null && value !== '') {
            if (rules.type === 'number' && isNaN(Number(value))) {
              errors.push({
              row: index + 1,
              field: sourceField,
              message: `El campo ${targetField} debe ser un número`,
              value,
              severity: 'error'
            });
            }

            if (rules.type === 'email' && !this.isValidEmail(String(value))) {
              errors.push({
              row: index + 1,
              field: sourceField,
              message: `El campo ${targetField} debe ser un email válido`,
              value,
              severity: 'error'
            });
            }

            if (rules.type === 'date' && !this.isValidDate(String(value))) {
              warnings.push({
              row: index + 1,
              field: sourceField,
              message: `El campo ${targetField} podría no ser una fecha válida`,
              value,
              severity: 'warning'
            });
            }
          }

          // Validación de longitud
          if (rules.maxLength && String(value).length > rules.maxLength) {
            errors.push({
            row: index + 1,
            field: sourceField,
            message: `El campo ${targetField} excede la longitud máxima de ${rules.maxLength} caracteres`,
            value,
            severity: 'error'
          });
          }

          // Validación de valores permitidos
          if (rules.allowedValues && !rules.allowedValues.includes(value)) {
            errors.push({
            row: index + 1,
            field: sourceField,
            message: `El campo ${targetField} debe ser uno de: ${rules.allowedValues.join(', ')}`,
            value,
            severity: 'error'
          });
          }
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalRows: data.length,
      validRows: data.length - errors.length
    };
  }

  // Crear trabajo de importación
  async createImportJob(
    file: File,
    targetTable: string,
    fieldMapping: Record<string, string>,
    validationRules?: Record<string, any>
  ): Promise<ImportJob> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const parsedData = await this.parseFile(file);
    const validation = this.validateData(parsedData.data, fieldMapping, validationRules);

    const jobData = {
      user_id: user.id,
      file_name: file.name,
      file_type: this.getFileType(file.name),
      file_size: file.size,
      target_table: targetTable,
      total_records: parsedData.totalRows,
      field_mapping: fieldMapping,
      validation_rules: validationRules,
      error_summary: {
        validation_errors: validation.errors.length,
        validation_warnings: validation.warnings.length
      }
    };

    const { data, error } = await supabase
      .from('import_jobs')
      .insert(jobData)
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating import job: ${error.message}`);
    }

    // Si hay errores de validación, registrarlos
    if (validation.errors.length > 0) {
      await this.logImportErrors(data.id, validation.errors);
    }

    return data;
  }

  // Procesar importación (ahora usa el sistema de colas)
  async processImport(
    jobId: string,
    data: Record<string, any>[],
    fieldMapping: Record<string, string>
  ): Promise<{ successful: number; failed: number; errors: ImportError[] }> {
    // Para importaciones pequeñas (< 100 registros), procesar directamente
    if (data.length < 100) {
      return await this.processImportDirect(jobId, data, fieldMapping);
    }

    // Para importaciones grandes, usar el sistema de colas
    const { jobQueueService } = await import('./JobQueueService');
    
    await jobQueueService.addJob({
      type: 'import',
      priority: data.length > 1000 ? 'high' : 'medium',
      data: {
        importJobId: jobId,
        data,
        fieldMapping
      },
      user_id: (await supabase.auth.getUser()).data.user?.id || ''
    });

    // Retornar estado inicial
    return { successful: 0, failed: 0, errors: [] };
  }

  // Procesamiento directo para importaciones pequeñas
  async processImportDirect(
    jobId: string,
    data: Record<string, any>[],
    fieldMapping: Record<string, string>
  ): Promise<{ successful: number; failed: number; errors: ImportError[] }> {
    const errors: ImportError[] = [];
    let successful = 0;
    let failed = 0;

    try {
      // Actualizar estado a procesando
      await this.updateJobStatus(jobId, 'processing', { started_at: new Date().toISOString() });

      const mappedData = data.map(row => {
        const mappedRow: Record<string, any> = {};
        Object.entries(fieldMapping).forEach(([sourceField, targetField]) => {
          mappedRow[targetField] = row[sourceField];
        });
        return mappedRow;
      });

      // Obtener información del trabajo
      const { data: job } = await supabase
        .from('import_jobs')
        .select('target_table')
        .eq('id', jobId)
        .single();

      if (!job) {
        throw new Error('Trabajo de importación no encontrado');
      }

      // Procesar en lotes para evitar timeouts
      const batchSize = 100;
      let processedCount = 0;

      for (let i = 0; i < mappedData.length; i += batchSize) {
        const batch = mappedData.slice(i, i + batchSize);
        
        try {
          const { error } = await supabase
            .from(job.target_table)
            .insert(batch);

          if (error) {
            // Registrar errores del lote
            await this.logBatchError(jobId, i, batch.length, error.message);
            failed += batch.length;
          } else {
            successful += batch.length;
          }
        } catch (batchError) {
          await this.logBatchError(jobId, i, batch.length, String(batchError));
          failed += batch.length;
        }

        processedCount += batch.length;
        
        // Actualizar progreso
        await this.updateJobProgress(jobId, processedCount, successful, failed);
      }

      // Finalizar trabajo
      await this.updateJobStatus(jobId, 'completed', {
        completed_at: new Date().toISOString(),
        processed_records: processedCount,
        successful_records: successful,
        failed_records: failed
      });

    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', {
        completed_at: new Date().toISOString(),
        error_summary: { error: String(error) }
      });
      throw error;
    }

    return { successful, failed, errors };
  }

  // Procesar lote de datos (usado por JobQueueService)
  async processBatch(
    jobId: string,
    batch: Record<string, any>[],
    fieldMapping: Record<string, string>
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    const mappedData = batch.map(row => {
      const mappedRow: Record<string, any> = {};
      Object.entries(fieldMapping).forEach(([sourceField, targetField]) => {
        mappedRow[targetField] = row[sourceField];
      });
      return mappedRow;
    });

    // Obtener información del trabajo
    const { data: job } = await supabase
      .from('import_jobs')
      .select('target_table')
      .eq('id', jobId)
      .single();

    if (!job) {
      throw new Error('Trabajo de importación no encontrado');
    }

    try {
      const { error } = await supabase
        .from(job.target_table)
        .insert(mappedData);

      if (error) {
        failed = mappedData.length;
        await this.logBatchError(jobId, 0, mappedData.length, error.message);
      } else {
        successful = mappedData.length;
      }
    } catch (batchError) {
      failed = mappedData.length;
      await this.logBatchError(jobId, 0, mappedData.length, String(batchError));
    }

    return { successful, failed };
  }

  // Obtener trabajos de importación del usuario
  async getUserImportJobs(): Promise<ImportJob[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching import jobs: ${error.message}`);
    }

    return data || [];
  }

  // Obtener errores de importación
  async getImportErrors(jobId: string): Promise<ImportError[]> {
    const { data, error } = await supabase
      .from('import_errors')
      .select('*')
      .eq('import_job_id', jobId)
      .order('row_number', { ascending: true });

    if (error) {
      throw new Error(`Error fetching import errors: ${error.message}`);
    }

    return data || [];
  }

  // Gestión de plantillas
  async saveTemplate(template: Omit<ImportTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ImportTemplate> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await supabase
      .from('import_templates')
      .insert({ ...template, user_id: user.id })
      .select()
      .single();

    if (error) {
      throw new Error(`Error saving template: ${error.message}`);
    }

    return data;
  }

  async getUserTemplates(): Promise<ImportTemplate[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await supabase
      .from('import_templates')
      .select('*')
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching templates: ${error.message}`);
    }

    return data || [];
  }

  // Métodos auxiliares
  private getFileType(fileName: string): 'csv' | 'xml' | 'json' | 'excel' {
    const extension = fileName.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'csv':
        return 'csv';
      case 'xml':
        return 'xml';
      case 'json':
        return 'json';
      case 'xlsx':
      case 'xls':
        return 'excel';
      default:
        throw new Error(`Extensión de archivo no soportada: ${extension}`);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  private async updateJobStatus(
    jobId: string,
    status: ImportJob['status'],
    updates: Partial<ImportJob> = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('import_jobs')
      .update({ status, ...updates })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Error updating job status: ${error.message}`);
    }
  }

  async updateJobProgress(
    jobId: string,
    processed: number,
    successful: number,
    failed: number
  ): Promise<void> {
    const { error } = await supabase
      .from('import_jobs')
      .update({
        processed_records: processed,
        successful_records: successful,
        failed_records: failed
      })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Error updating job progress: ${error.message}`);
    }
  }

  private async logImportErrors(
    jobId: string,
    errors: ValidationResult['errors']
  ): Promise<void> {
    const errorRecords = errors.map(error => ({
      import_job_id: jobId,
      row_number: error.row,
      field_name: error.field,
      error_type: 'validation',
      error_message: error.message,
      raw_value: String(error.value)
    }));

    const { error } = await supabase
      .from('import_errors')
      .insert(errorRecords);

    if (error) {
      console.error('Error logging import errors:', error);
    }
  }

  async logImportError(
    jobId: string,
    error: ImportError
  ): Promise<void> {
    const { error: dbError } = await supabase
      .from('import_errors')
      .insert(error);

    if (dbError) {
      console.error('Error logging import error:', dbError);
    }
  }

  private async logBatchError(
    jobId: string,
    startRow: number,
    batchSize: number,
    errorMessage: string
  ): Promise<void> {
    const { error } = await supabase
      .from('import_errors')
      .insert({
        import_job_id: jobId,
        row_number: startRow + 1,
        error_type: 'batch_processing',
        error_message: `Error processing batch (rows ${startRow + 1}-${startRow + batchSize}): ${errorMessage}`
      });

    if (error) {
      console.error('Error logging batch error:', error);
    }
  }
}

export const importService = new ImportService();
export { ImportService };
export default ImportService;