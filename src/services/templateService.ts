import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface Template {
  id: string;
  name: string;
  description?: string;
  category: 'report' | 'document' | 'label' | 'invoice' | 'certificate';
  template_data: any;
  variables: TemplateVariable[];
  preview_image?: string;
  is_public: boolean;
  is_active: boolean;
  tags: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  version: number;
  parent_template_id?: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'array' | 'object' | 'calculated';
  description: string;
  required?: boolean;
  default_value?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
}

export interface TemplateInstance {
  id: string;
  template_id: string;
  generated_by?: string;
  data_context: any;
  output_format: 'pdf' | 'excel' | 'html' | 'docx' | 'csv';
  file_url?: string;
  file_size?: number;
  generation_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  generated_at: string;
  expires_at?: string;
  download_count: number;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: Template['category'];
  template_data: any;
  variables: TemplateVariable[];
  preview_image?: string;
  is_public?: boolean;
  tags?: string[];
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

export interface GenerateDocumentRequest {
  template_id: string;
  data_context: any;
  output_format: TemplateInstance['output_format'];
  expires_in_hours?: number;
}

export class TemplateService {
  /**
   * Obtener todos los templates accesibles para el usuario actual
   */
  static async getTemplates(filters?: {
    category?: string;
    is_public?: boolean;
    search?: string;
    tags?: string[];
  }): Promise<Template[]> {
    try {
      let query = supabase
        .from('report_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.is_public !== undefined) {
        query = query.eq('is_public', filters.is_public);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching templates:', error);
        toast.error('Error al cargar las plantillas');
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTemplates:', error);
      throw error;
    }
  }

  /**
   * Obtener un template por ID
   */
  static async getTemplate(id: string): Promise<Template | null> {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Template not found
        }
        console.error('Error fetching template:', error);
        toast.error('Error al cargar la plantilla');
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getTemplate:', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo template
   */
  static async createTemplate(templateData: CreateTemplateRequest): Promise<Template> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase
        .from('report_templates')
        .insert({
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          template_data: templateData.template_data,
          variables: templateData.variables,
          preview_image: templateData.preview_image,
          is_public: templateData.is_public || false,
          tags: templateData.tags || [],
          created_by: userData.user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating template:', error);
        toast.error('Error al crear la plantilla');
        throw error;
      }

      toast.success('Plantilla creada exitosamente');
      return data;
    } catch (error) {
      console.error('Error in createTemplate:', error);
      throw error;
    }
  }

  /**
   * Actualizar un template existente
   */
  static async updateTemplate(templateData: UpdateTemplateRequest): Promise<Template> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuario no autenticado');
      }

      const { id, ...updateData } = templateData;
      
      // Obtener versión actual
      const { data: currentTemplate } = await supabase
        .from('report_templates')
        .select('version')
        .eq('id', id)
        .eq('created_by', userData.user.id)
        .single();

      if (!currentTemplate) {
        throw new Error('Template no encontrado o sin permisos');
      }

      // Actualizar template
      const { data, error } = await supabase
        .from('report_templates')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          version: (currentTemplate.version || 1) + 1
        })
        .eq('id', id)
        .eq('created_by', userData.user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating template:', error);
        toast.error('Error al actualizar la plantilla');
        throw error;
      }

      toast.success('Plantilla actualizada exitosamente');
      return data;
    } catch (error) {
      console.error('Error in updateTemplate:', error);
      throw error;
    }
  }

  /**
   * Eliminar un template (soft delete)
   */
  static async deleteTemplate(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('report_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting template:', error);
        toast.error('Error al eliminar la plantilla');
        throw error;
      }

      toast.success('Plantilla eliminada exitosamente');
    } catch (error) {
      console.error('Error in deleteTemplate:', error);
      throw error;
    }
  }

  /**
   * Duplicar un template
   */
  static async duplicateTemplate(id: string, newName?: string): Promise<Template> {
    try {
      const originalTemplate = await this.getTemplate(id);
      if (!originalTemplate) {
        throw new Error('Template no encontrado');
      }

      const duplicatedTemplate = await this.createTemplate({
        name: newName || `${originalTemplate.name} (Copia)`,
        description: originalTemplate.description,
        category: originalTemplate.category,
        template_data: originalTemplate.template_data,
        variables: originalTemplate.variables,
        tags: originalTemplate.tags,
        is_public: false // Las copias son privadas por defecto
      });

      return duplicatedTemplate;
    } catch (error) {
      console.error('Error in duplicateTemplate:', error);
      throw error;
    }
  }

  /**
   * Generar documento desde template
   */
  static async generateDocument(request: GenerateDocumentRequest): Promise<TemplateInstance> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuario no autenticado');
      }

      // Crear instancia del template
      const expiresAt = request.expires_in_hours 
        ? new Date(Date.now() + request.expires_in_hours * 60 * 60 * 1000).toISOString()
        : null;

      const { data: instance, error: instanceError } = await supabase
        .from('template_instances')
        .insert({
          template_id: request.template_id,
          generated_by: userData.user.id,
          data_context: request.data_context,
          output_format: request.output_format,
          generation_status: 'pending',
          expires_at: expiresAt
        })
        .select()
        .single();

      if (instanceError) {
        console.error('Error creating template instance:', instanceError);
        toast.error('Error al crear la instancia del documento');
        throw instanceError;
      }

      // Procesar generación del documento en background
      this.processDocumentGeneration(instance.id);

      return instance;
    } catch (error) {
      console.error('Error in generateDocument:', error);
      throw error;
    }
  }

  /**
   * Procesar generación del documento (background)
   */
  private static async processDocumentGeneration(instanceId: string): Promise<void> {
    try {
      // Actualizar estado a processing
      await supabase
        .from('template_instances')
        .update({ generation_status: 'processing' })
        .eq('id', instanceId);

      // Obtener instancia y template
      const { data: instance } = await supabase
        .from('template_instances')
        .select(`
          *,
          template:report_templates(*)
        `)
        .eq('id', instanceId)
        .single();

      if (!instance) {
        throw new Error('Instancia no encontrada');
      }

      // Procesar variables dinámicas
      const processedData = await this.processVariables(instance.template, instance.data_context);

      // Generar documento según formato
      let fileUrl: string;
      let fileSize: number;

      switch (instance.output_format) {
        case 'pdf':
          ({ url: fileUrl, size: fileSize } = await this.generatePDF(instance.template, processedData));
          break;
        case 'excel':
          ({ url: fileUrl, size: fileSize } = await this.generateExcel(instance.template, processedData));
          break;
        case 'html':
          ({ url: fileUrl, size: fileSize } = await this.generateHTML(instance.template, processedData));
          break;
        default:
          throw new Error(`Formato no soportado: ${instance.output_format}`);
      }

      // Actualizar instancia con resultado
      await supabase
        .from('template_instances')
        .update({
          generation_status: 'completed',
          file_url: fileUrl,
          file_size: fileSize
        })
        .eq('id', instanceId);

    } catch (error) {
      console.error('Error processing document generation:', error);
      
      // Actualizar instancia con error
      await supabase
        .from('template_instances')
        .update({
          generation_status: 'failed',
          error_message: error instanceof Error ? error.message : 'Error desconocido'
        })
        .eq('id', instanceId);
    }
  }

  /**
   * Procesar variables dinámicas
   */
  private static async processVariables(template: Template, data: any): Promise<any> {
    const processedData = { ...data };
    
    // Agregar variables del sistema
    processedData.fecha_actual = new Date().toLocaleDateString('es-PE');
    processedData.hora_actual = new Date().toLocaleTimeString('es-PE');
    processedData.usuario_actual = (await supabase.auth.getUser()).data.user?.email || 'Usuario';
    
    // Procesar variables calculadas
    for (const variable of template.variables) {
      if (variable.type === 'calculated') {
        processedData[variable.name] = await this.calculateVariable(variable, processedData);
      }
    }
    
    return processedData;
  }

  /**
   * Calcular variable dinámica
   */
  private static async calculateVariable(variable: TemplateVariable, data: any): Promise<any> {
    // Implementar lógica de cálculo según el tipo de variable
    // Por ahora retornamos un valor por defecto
    return variable.default_value || null;
  }

  /**
   * Generar PDF
   */
  private static async generatePDF(template: Template, data: any): Promise<{ url: string; size: number }> {
    // Implementación pendiente - requiere puppeteer o similar
    // Por ahora simulamos la generación
    const mockUrl = `https://example.com/generated/${template.id}.pdf`;
    return { url: mockUrl, size: 1024 };
  }

  /**
   * Generar Excel
   */
  private static async generateExcel(template: Template, data: any): Promise<{ url: string; size: number }> {
    // Implementación pendiente - requiere ExcelJS
    // Por ahora simulamos la generación
    const mockUrl = `https://example.com/generated/${template.id}.xlsx`;
    return { url: mockUrl, size: 2048 };
  }

  /**
   * Generar HTML
   */
  private static async generateHTML(template: Template, data: any): Promise<{ url: string; size: number }> {
    try {
      // Procesar template HTML
      let htmlContent = this.processHTMLTemplate(template.template_data, data);
      
      // Subir archivo HTML a Supabase Storage
      const fileName = `template_${template.id}_${Date.now()}.html`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, new Blob([htmlContent], { type: 'text/html' }));

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      return {
        url: urlData.publicUrl,
        size: new Blob([htmlContent]).size
      };
    } catch (error) {
      console.error('Error generating HTML:', error);
      throw error;
    }
  }

  /**
   * Procesar template HTML con datos
   */
  private static processHTMLTemplate(templateData: any, data: any): string {
    let html = '<html><head><title>Documento Generado</title></head><body>';
    
    // Procesar componentes del template
    for (const component of templateData.components || []) {
      html += this.renderComponent(component, data);
    }
    
    html += '</body></html>';
    
    // Reemplazar variables
    return this.replaceVariables(html, data);
  }

  /**
   * Renderizar componente individual
   */
  private static renderComponent(component: any, data: any): string {
    switch (component.type) {
      case 'text':
        return `<div style="${this.styleToCSS(component.style || {})}">${component.content}</div>`;
      
      case 'table':
        return this.renderTable(component, data);
      
      case 'qr':
        return `<div style="${this.styleToCSS(component.style || {})}">QR: ${component.content}</div>`;
      
      default:
        return '';
    }
  }

  /**
   * Renderizar tabla
   */
  private static renderTable(component: any, data: any): string {
    const tableData = data[component.dataSource] || [];
    
    let html = '<table border="1" style="border-collapse: collapse; width: 100%;">';
    
    // Headers
    html += '<thead><tr>';
    for (const column of component.columns || []) {
      html += `<th style="padding: 8px; background-color: #f5f5f5;">${column.title}</th>`;
    }
    html += '</tr></thead>';
    
    // Rows
    html += '<tbody>';
    for (const row of tableData) {
      html += '<tr>';
      for (const column of component.columns || []) {
        html += `<td style="padding: 8px;">${row[column.field] || ''}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    
    return html;
  }

  /**
   * Convertir objeto de estilo a CSS
   */
  private static styleToCSS(style: any): string {
    return Object.entries(style)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
      .join('; ');
  }

  /**
   * Reemplazar variables en texto
   */
  private static replaceVariables(text: string, data: any): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const value = data[variableName.trim()];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Obtener instancias de template
   */
  static async getTemplateInstances(templateId?: string): Promise<TemplateInstance[]> {
    try {
      let query = supabase
        .from('template_instances')
        .select('*')
        .order('generated_at', { ascending: false });

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching template instances:', error);
        toast.error('Error al cargar las instancias');
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTemplateInstances:', error);
      throw error;
    }
  }

  /**
   * Incrementar contador de descargas
   */
  static async incrementDownloadCount(instanceId: string): Promise<void> {
    try {
      // Obtener el count actual
      const { data: currentInstance } = await supabase
        .from('template_instances')
        .select('download_count')
        .eq('id', instanceId)
        .single();

      if (currentInstance) {
        await supabase
          .from('template_instances')
          .update({ download_count: (currentInstance.download_count || 0) + 1 })
          .eq('id', instanceId);
      }
    } catch (error) {
      console.error('Error incrementing download count:', error);
      throw error;
    }
  }

  /**
   * Limpiar instancias expiradas
   */
  static async cleanupExpiredInstances(): Promise<void> {
    try {
      const { error } = await supabase
        .from('template_instances')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired instances:', error);
      }
    } catch (error) {
      console.error('Error in cleanupExpiredInstances:', error);
    }
  }
}

export default TemplateService;