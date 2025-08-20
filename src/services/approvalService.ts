import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';
import type { ApprovalRule, ApprovalRequest, Approval } from '../types';

export interface ApprovalHistory {
  id: string;
  approval_id: string;
  action: 'approve' | 'reject' | 'request_changes';
  user_id: string;
  comments?: string;
  created_at: string;
}

export interface ApprovalResult {
  requiere_aprobacion: boolean;
  nivel_requerido?: number;
  regla_aplicada?: ApprovalRule;
  aprobacion_id?: string;
  mensaje: string;
}

export class ApprovalService {
  /**
   * Evalúa si un documento requiere aprobación según las reglas configuradas
   */
  static async evaluateApprovalRequirement(
    request: ApprovalRequest
  ): Promise<ApprovalResult> {
    try {
      // Obtener reglas de aprobación activas para el tipo de documento
      const { data: rules, error: rulesError } = await supabase
        .from('reglas_aprobacion')
        .select('*')
        .eq('tipo_documento', request.tipo_documento)
        .eq('activa', true)
        .order('nivel_aprobacion', { ascending: true });

      if (rulesError) {
        throw new Error(`Error al obtener reglas de aprobación: ${rulesError.message}`);
      }

      if (!rules || rules.length === 0) {
        return {
          requiere_aprobacion: false,
          mensaje: 'No se requiere aprobación para este tipo de documento'
        };
      }

      // Evaluar cada regla
      for (const rule of rules) {
        const ruleApplies = await this.evaluateRule(rule, request);
        
        if (ruleApplies) {
          // Crear registro de aprobación pendiente
          const approval = await this.createApprovalRecord(rule, request);
          
          return {
            requiere_aprobacion: true,
            nivel_requerido: rule.nivel_aprobacion,
            regla_aplicada: rule,
            aprobacion_id: approval.id,
            mensaje: `Se requiere aprobación de nivel ${rule.nivel_aprobacion}: ${rule.descripcion}`
          };
        }
      }

      return {
        requiere_aprobacion: false,
        mensaje: 'El documento no requiere aprobación según las reglas configuradas'
      };
    } catch (error) {
      console.error('Error evaluating approval requirement:', error);
      throw new Error(`Error al evaluar requerimiento de aprobación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Evalúa si una regla específica aplica a la solicitud
   */
  private static async evaluateRule(
    rule: ApprovalRule,
    request: ApprovalRequest
  ): Promise<boolean> {
    try {
      // Evaluar condiciones básicas
      const conditions = rule.condiciones as any;
      
      // Evaluar condiciones de monto
      if (conditions.min_amount && request.monto_total && request.monto_total < conditions.min_amount) {
        return false;
      }
      if (conditions.max_amount && request.monto_total && request.monto_total > conditions.max_amount) {
        return false;
      }
      
      // Evaluar condiciones de tipo de documento
      if (conditions.tipos_documento && !conditions.tipos_documento.includes(request.tipo_documento)) {
        return false;
      }
      
      // Obtener información del usuario
      const { data: userProfile } = await supabase
        .from('usuarios')
        .select('rol, departamento')
        .eq('id', request.usuario_solicitante)
        .single();
      
      const userRole = userProfile?.rol;
      
      // Evaluar condiciones de usuario
      if (conditions.roles_excluidos && conditions.roles_excluidos.includes(userRole)) {
        return false;
      }

      // Evaluar condiciones adicionales en metadata
      if (conditions.metadata_required && request.metadata) {
        for (const [key, value] of Object.entries(conditions.metadata_required)) {
          if (request.metadata[key] !== value) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error evaluating rule:', error);
      return false;
    }
  }

  /**
   * Crea un registro de aprobación pendiente
   */
  private static async createApprovalRecord(
    rule: ApprovalRule,
    request: ApprovalRequest
  ): Promise<Approval> {
    try {
      const { data: approval, error } = await supabase
        .from('aprobaciones')
        .insert({
          tipo: request.tipo_documento,
          referencia_id: request.documento_id,
          nivel_aprobacion: rule.nivel_aprobacion,
          solicitante_id: request.usuario_solicitante,
          estado: 'pendiente',
          fecha_solicitud: new Date().toISOString(),
          comentarios: request.descripcion,
          datos_solicitud: request.metadata || {}
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Error al crear registro de aprobación: ${error.message}`);
      }

      return approval;
    } catch (error) {
      console.error('Error creating approval record:', error);
      throw error;
    }
  }

  /**
   * Procesa una aprobación (aprobar o rechazar)
   */
  static async processApproval(
    approvalId: string,
    approverId: string,
    action: 'aprobar' | 'rechazar',
    comments?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar que el usuario tiene permisos para aprobar
      const canApprove = await this.canUserApprove(approvalId, approverId);
      if (!canApprove) {
        return {
          success: false,
          message: 'No tienes permisos para procesar esta aprobación'
        };
      }

      // Actualizar el registro de aprobación
      const { data: approval, error } = await supabase
        .from('aprobaciones')
        .update({
          estado: action === 'aprobar' ? 'aprobado' : 'rechazado',
          aprobador_id: approverId,
          fecha_respuesta: new Date().toISOString(),
          comentarios: comments
        })
        .eq('id', approvalId)
        .select()
        .single();

      if (error) {
        throw new Error(`Error al procesar aprobación: ${error.message}`);
      }

      // Si fue aprobada, actualizar el documento original
      if (action === 'aprobar') {
        await this.updateDocumentStatus(approval);
      }

      return {
        success: true,
        message: `Solicitud ${action === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente`
      };
    } catch (error) {
      console.error('Error processing approval:', error);
      return {
        success: false,
        message: `Error al procesar aprobación: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Verifica si un usuario puede aprobar una solicitud específica
   */
  private static async canUserApprove(
    approvalId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Obtener información de la aprobación
      const { data: approval, error: approvalError } = await supabase
        .from('aprobaciones')
        .select('*')
        .eq('id', approvalId)
        .single();

      if (approvalError || !approval) {
        return false;
      }

      // Obtener información del usuario
      const { data: user, error: userError } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return false;
      }

      // Verificar nivel de aprobación
      const requiredLevel = approval.nivel_aprobacion;
      const userLevel = user.rol === 'admin' ? 999 : user.rol === 'supervisor' ? 2 : 1;

      return userLevel >= requiredLevel;
    } catch (error) {
      console.error('Error checking approval permissions:', error);
      return false;
    }
  }

  /**
   * Actualiza el estado del documento original después de la aprobación
   */
  private static async updateDocumentStatus(approval: Approval): Promise<void> {
    try {
      const tableName = approval.tipo === 'solicitud_compra' 
        ? 'solicitudes_compra' 
        : approval.tipo === 'entrada' 
        ? 'entradas' 
        : 'salidas';

      const { error } = await supabase
        .from(tableName as any)
        .update({ 
          estado: 'aprobada',
          fecha_aprobacion: new Date().toISOString(),
          aprobado_por: approval.aprobador_id
        })
        .eq('id', approval.referencia_id);

      if (error) {
        throw new Error(`Error al actualizar estado del documento: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  }

  /**
   * Obtiene las aprobaciones pendientes para un usuario
   */
  static async getPendingApprovals(userId: string): Promise<Approval[]> {
    try {
      // Obtener información del usuario
      const { data: user } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', userId)
        .single();

      if (!user) {
        return [];
      }

      const userLevel = user.rol === 'admin' ? 999 : user.rol === 'supervisor' ? 2 : 1;

      // Obtener aprobaciones pendientes que el usuario puede procesar
      const { data: approvals, error } = await supabase
        .from('aprobaciones')
        .select(`
          *,
          usuarios!aprobaciones_solicitante_id_fkey(nombre, email)
        `)
        .eq('estado', 'pendiente')
        .lte('nivel_aprobacion', userLevel)
        .order('fecha_solicitud', { ascending: true });

      if (error) {
        throw new Error(`Error al obtener aprobaciones pendientes: ${error.message}`);
      }

      return approvals || [];
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de aprobaciones
   */
  static async getApprovalHistory(
    filters?: {
      tipo_documento?: string;
      estado?: string;
      fecha_desde?: string;
      fecha_hasta?: string;
    }
  ): Promise<Approval[]> {
    try {
      let query = supabase
        .from('aprobaciones')
        .select(`
          *,
          reglas_aprobacion(*),
          usuarios!aprobaciones_usuario_solicitante_fkey(nombre, email),
          aprobador:usuarios!aprobaciones_usuario_aprobador_fkey(nombre, email)
        `);

      if (filters?.tipo_documento) {
        query = query.eq('tipo_documento', filters.tipo_documento);
      }

      if (filters?.estado) {
        query = query.eq('estado', filters.estado);
      }

      if (filters?.fecha_desde) {
        query = query.gte('fecha_solicitud', filters.fecha_desde);
      }

      if (filters?.fecha_hasta) {
        query = query.lte('fecha_solicitud', filters.fecha_hasta);
      }

      const { data: approvals, error } = await query
        .order('fecha_solicitud', { ascending: false });

      if (error) {
        throw new Error(`Error al obtener historial de aprobaciones: ${error.message}`);
      }

      return approvals || [];
    } catch (error) {
      console.error('Error getting approval history:', error);
      throw error;
    }
  }
}