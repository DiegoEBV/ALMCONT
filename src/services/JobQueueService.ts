import { supabase } from '../lib/supabase';
import { importService, ImportJob, ImportError } from './ImportService';

interface QueueJob {
  id: string;
  type: 'import' | 'export' | 'validation';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  data: any;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  progress?: number;
  user_id: string;
}

interface JobProcessor {
  process: (job: QueueJob) => Promise<void>;
}

class JobQueueService {
  private static instance: JobQueueService;
  private processors: Map<string, JobProcessor> = new Map();
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;
  private readonly BATCH_SIZE = 5;
  private readonly POLL_INTERVAL = 2000; // 2 seconds

  private constructor() {
    this.registerDefaultProcessors();
  }

  static getInstance(): JobQueueService {
    if (!JobQueueService.instance) {
      JobQueueService.instance = new JobQueueService();
    }
    return JobQueueService.instance;
  }

  private registerDefaultProcessors() {
    // Registrar procesador de importación
    this.registerProcessor('import', {
      process: async (job: QueueJob) => {
        const { importJobId, data, fieldMapping } = job.data;
        
        // Actualizar estado del trabajo de importación
        await this.updateImportJobStatus(importJobId, 'processing');
        
        try {
          // Procesar la importación en lotes
          await this.processImportInBatches(importJobId, data, fieldMapping, job.id);
          
          // Marcar como completado
          await this.updateImportJobStatus(importJobId, 'completed');
        } catch (error) {
          console.error('Error processing import job:', error);
          await this.updateImportJobStatus(importJobId, 'failed', error.message);
          throw error;
        }
      }
    });

    // Registrar procesador de validación
    this.registerProcessor('validation', {
      process: async (job: QueueJob) => {
        const { data, targetTable, fieldMapping } = job.data;
        
        try {
          // Validar datos en lotes para mejor rendimiento
          const validationResult = await importService.validateData(data, targetTable, fieldMapping);
          
          // Guardar resultados de validación
          await this.saveValidationResults(job.id, validationResult);
        } catch (error) {
          console.error('Error processing validation job:', error);
          throw error;
        }
      }
    });
  }

  registerProcessor(type: string, processor: JobProcessor) {
    this.processors.set(type, processor);
  }

  async addJob(job: Omit<QueueJob, 'id' | 'created_at' | 'status'>): Promise<string> {
    const { data, error } = await supabase
      .from('job_queue')
      .insert({
        type: job.type,
        priority: job.priority,
        data: job.data,
        user_id: job.user_id,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error adding job to queue: ${error.message}`);
    }

    // Iniciar procesamiento si no está activo
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return data.id;
  }

  async getJob(jobId: string): Promise<QueueJob | null> {
    const { data, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error fetching job:', error);
      return null;
    }

    return data;
  }

  async getUserJobs(userId: string, limit = 50): Promise<QueueJob[]> {
    const { data, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Error fetching user jobs: ${error.message}`);
    }

    return data || [];
  }

  async updateJobStatus(
    jobId: string, 
    status: QueueJob['status'], 
    errorMessage?: string,
    progress?: number
  ): Promise<void> {
    const updates: any = { status };
    
    if (status === 'processing' && !updates.started_at) {
      updates.started_at = new Date().toISOString();
    }
    
    if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }
    
    if (errorMessage) {
      updates.error_message = errorMessage;
    }
    
    if (progress !== undefined) {
      updates.progress = progress;
    }

    const { error } = await supabase
      .from('job_queue')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job status:', error);
    }
  }

  private async updateImportJobStatus(
    importJobId: string, 
    status: ImportJob['status'], 
    errorMessage?: string
  ): Promise<void> {
    const updates: any = { status };
    
    if (status === 'processing') {
      updates.started_at = new Date().toISOString();
    }
    
    if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }
    
    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('import_jobs')
      .update(updates)
      .eq('id', importJobId);

    if (error) {
      console.error('Error updating import job status:', error);
    }
  }

  private async processImportInBatches(
    importJobId: string, 
    data: any[], 
    fieldMapping: Record<string, string>,
    queueJobId: string
  ): Promise<void> {
    const batchSize = 100;
    const totalBatches = Math.ceil(data.length / batchSize);
    let processedRecords = 0;
    let successfulRecords = 0;
    let failedRecords = 0;

    for (let i = 0; i < totalBatches; i++) {
      const batch = data.slice(i * batchSize, (i + 1) * batchSize);
      
      try {
        // Procesar lote
        const result = await importService.processBatch(importJobId, batch, fieldMapping);
        
        processedRecords += batch.length;
        successfulRecords += result.successful;
        failedRecords += result.failed;
        
        // Actualizar progreso
        const progress = Math.round((processedRecords / data.length) * 100);
        await this.updateJobStatus(queueJobId, 'processing', undefined, progress);
        
        // Actualizar estadísticas del trabajo de importación
        await supabase
          .from('import_jobs')
          .update({
            processed_records: processedRecords,
            successful_records: successfulRecords,
            failed_records: failedRecords
          })
          .eq('id', importJobId);
          
      } catch (error) {
        console.error(`Error processing batch ${i + 1}:`, error);
        failedRecords += batch.length;
        
        // Continuar con el siguiente lote en caso de error
        await importService.logImportError(importJobId, {
          import_job_id: importJobId,
          row_number: i * batchSize,
          field_name: 'batch',
          error_type: 'processing',
          error_message: `Error processing batch: ${error.message}`,
          raw_value: `Batch ${i + 1}`,
          created_at: new Date().toISOString()
        } as ImportError);
      }
      
      // Pequeña pausa entre lotes para no sobrecargar la base de datos
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async saveValidationResults(jobId: string, result: any): Promise<void> {
    // Guardar resultados de validación en una tabla temporal o cache
    const { error } = await supabase
      .from('validation_results')
      .upsert({
        job_id: jobId,
        result: result,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving validation results:', error);
    }
  }

  startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('Starting job queue processing...');
    
    this.processingInterval = setInterval(async () => {
      try {
        await this.processNextJobs();
      } catch (error) {
        console.error('Error in job processing cycle:', error);
      }
    }, this.POLL_INTERVAL);
  }

  stopProcessing(): void {
    if (!this.isProcessing) return;
    
    this.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    
    console.log('Stopped job queue processing.');
  }

  private async processNextJobs(): Promise<void> {
    // Obtener trabajos pendientes ordenados por prioridad y fecha de creación
    const { data: jobs, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false }) // high, medium, low
      .order('created_at', { ascending: true })
      .limit(this.BATCH_SIZE);

    if (error) {
      console.error('Error fetching pending jobs:', error);
      return;
    }

    if (!jobs || jobs.length === 0) {
      return; // No hay trabajos pendientes
    }

    // Procesar trabajos en paralelo (limitado por BATCH_SIZE)
    const processingPromises = jobs.map(job => this.processJob(job));
    await Promise.allSettled(processingPromises);
  }

  private async processJob(job: QueueJob): Promise<void> {
    const processor = this.processors.get(job.type);
    
    if (!processor) {
      console.error(`No processor found for job type: ${job.type}`);
      await this.updateJobStatus(job.id, 'failed', `No processor found for job type: ${job.type}`);
      return;
    }

    try {
      // Marcar trabajo como en procesamiento
      await this.updateJobStatus(job.id, 'processing');
      
      // Procesar trabajo
      await processor.process(job);
      
      // Marcar como completado
      await this.updateJobStatus(job.id, 'completed');
      
      console.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
      await this.updateJobStatus(job.id, 'failed', error.message);
    }
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const { data, error } = await supabase
      .from('job_queue')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (error) {
      throw new Error(`Error fetching queue stats: ${error.message}`);
    }

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    data?.forEach(job => {
      stats[job.status]++;
    });

    return stats;
  }

  async clearCompletedJobs(olderThanDays = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('job_queue')
      .delete()
      .in('status', ['completed', 'failed'])
      .lt('completed_at', cutoffDate)
      .select('id');

    if (error) {
      throw new Error(`Error clearing completed jobs: ${error.message}`);
    }

    return data?.length || 0;
  }
}

// Exportar instancia singleton
export const jobQueueService = JobQueueService.getInstance();
export default JobQueueService;
export type { QueueJob, JobProcessor };