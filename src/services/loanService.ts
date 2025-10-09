import { supabase } from '../lib/supabase';

// Interfaces para préstamos y terceros
export interface ThirdParty {
  id: string;
  razon_social: string;
  ruc: string;
  tipo_tercero: 'contratista' | 'subcontratista' | 'proveedor' | 'cliente';
  contacto_principal: string;
  telefono: string;
  email?: string;
  direccion?: string;
  estado: 'activo' | 'inactivo' | 'suspendido';
  calificacion?: number;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export interface LoanAgreement {
  id: string;
  numero_acuerdo: string;
  tercero_id: string;
  obra_id: string;
  tipo_acuerdo: 'prestamo_saliente' | 'prestamo_entrante' | 'intercambio';
  estado: 'activo' | 'vencido' | 'cancelado' | 'completado';
  fecha_inicio: string;
  fecha_vencimiento: string;
  condiciones_generales?: string;
  tipo_garantia?: 'deposito_efectivo' | 'carta_fianza' | 'retencion_pagos' | 'aval_personal';
  monto_garantia?: number;
  responsable_empresa: string;
  responsable_tercero: string;
  telefono_responsable_tercero?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialLoan {
  id: string;
  numero_prestamo: string;
  acuerdo_id?: string;
  tercero_id: string;
  obra_id: string;
  tipo_prestamo: 'prestamo_saliente' | 'prestamo_entrante' | 'intercambio';
  estado: 'solicitado' | 'aprobado' | 'entregado' | 'parcialmente_devuelto' | 'devuelto_completo' | 'vencido' | 'cancelado';
  fecha_solicitud: string;
  fecha_aprobacion?: string;
  fecha_entrega?: string;
  fecha_devolucion_programada?: string;
  fecha_devolucion_real?: string;
  solicitado_por: string;
  aprobado_por?: string;
  entregado_por?: string;
  recibido_por?: string;
  motivo: string;
  condiciones_devolucion?: string;
  penalidad_retraso?: number;
  valor_total_estimado?: number;
  observaciones?: string;
  created_at: string;
  updated_at: string;
  // Propiedades adicionales del join
  terceros?: {
    razon_social: string;
    contacto_principal: string;
  };
  obras?: {
    nombre: string;
  };
  usuarios_solicitante?: {
    nombre: string;
  };
  usuarios_aprobado?: {
    nombre: string;
  };
  detalle_prestamos?: Array<{
    id: string;
    prestamo_id: string;
    material_id: string;
    cantidad_solicitada: number;
    cantidad_aprobada?: number;
    cantidad_entregada?: number;
    cantidad_devuelta: number;
    precio_unitario_referencial?: number;
    valor_total?: number;
    condicion_entrega: string;
    condicion_devolucion_esperada: string;
    ubicacion_origen?: string;
    ubicacion_destino_tercero?: string;
    observaciones_detalle?: string;
    created_at: string;
    updated_at: string;
    materiales?: {
      nombre: string;
      unidad_medida: string;
      codigo: string;
    };
  }>;
}

export interface LoanDetail {
  id: string;
  prestamo_id: string;
  material_id: string;
  cantidad_solicitada: number;
  cantidad_aprobada?: number;
  cantidad_entregada?: number;
  cantidad_devuelta: number;
  precio_unitario_referencial?: number;
  valor_total?: number;
  condicion_entrega: 'nuevo' | 'usado_bueno' | 'usado_regular' | 'reparable';
  condicion_devolucion_esperada: 'mismo_estado' | 'usado_aceptable' | 'cualquier_estado';
  ubicacion_origen?: string;
  ubicacion_destino_tercero?: string;
  observaciones_detalle?: string;
  created_at: string;
  updated_at: string;
}

export interface LoanReturn {
  id: string;
  numero_devolucion: string;
  prestamo_id: string;
  tipo_devolucion: 'devolucion_parcial' | 'devolucion_total' | 'devolucion_con_reposicion';
  estado: 'recibida' | 'en_inspeccion' | 'aprobada' | 'rechazada' | 'procesada';
  fecha_devolucion: string;
  recibido_por: string;
  inspeccionado_por?: string;
  condicion_materiales?: string;
  observaciones_inspeccion?: string;
  penalidad_aplicada?: number;
  valor_penalidad?: number;
  created_at: string;
  updated_at: string;
}

export interface LoanAlert {
  id: string;
  prestamo_id: string;
  tipo_alerta: 'vencimiento_proximo' | 'prestamo_vencido' | 'devolucion_parcial' | 'condicion_inadecuada';
  mensaje: string;
  fecha_alerta: string;
  estado: 'activa' | 'notificada' | 'resuelta';
  usuario_responsable?: string;
  fecha_resolucion?: string;
  created_at: string;
}

export interface LoanSummary {
  total_prestamos: number;
  prestamos_activos: number;
  prestamos_vencidos: number;
  valor_total_prestado: number;
  prestamos_por_tipo: {
    prestamo_saliente: number;
    prestamo_entrante: number;
    intercambio: number;
  };
  prestamos_por_estado: {
    solicitado: number;
    aprobado: number;
    entregado: number;
    parcialmente_devuelto: number;
    devuelto_completo: number;
    vencido: number;
    cancelado: number;
  };
  terceros_mas_activos: Array<{
    tercero_id: string;
    razon_social: string;
    total_prestamos: number;
    valor_total: number;
  }>;
}

export class LoanService {
  /**
   * Obtener todos los terceros
   */
  static async getThirdParties(filtros?: {
    tipo_tercero?: string;
    estado?: string;
    search?: string;
  }): Promise<ThirdParty[]> {
    try {
      let query = supabase
        .from('terceros')
        .select('*');

      if (filtros?.tipo_tercero) {
        query = query.eq('tipo_tercero', filtros.tipo_tercero);
      }

      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros?.search) {
        query = query.or(`razon_social.ilike.%${filtros.search}%,ruc.ilike.%${filtros.search}%`);
      }

      const { data, error } = await query.order('razon_social');

      if (error) {
        throw new Error(`Error al obtener terceros: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting third parties:', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo tercero
   */
  static async createThirdParty(thirdParty: Omit<ThirdParty, 'id' | 'created_at' | 'updated_at'>): Promise<ThirdParty> {
    try {
      const { data, error } = await supabase
        .from('terceros')
        .insert(thirdParty)
        .select()
        .single();

      if (error) {
        throw new Error(`Error al crear tercero: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error creating third party:', error);
      throw error;
    }
  }

  /**
   * Obtener acuerdos de préstamo
   */
  static async getLoanAgreements(filtros?: {
    tercero_id?: string;
    obra_id?: string;
    estado?: string;
  }): Promise<LoanAgreement[]> {
    try {
      let query = supabase
        .from('acuerdos_prestamo')
        .select(`
          *,
          terceros(razon_social),
          obras(nombre),
          usuarios(nombre)
        `);

      if (filtros?.tercero_id) {
        query = query.eq('tercero_id', filtros.tercero_id);
      }

      if (filtros?.obra_id) {
        query = query.eq('obra_id', filtros.obra_id);
      }

      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }

      const { data, error } = await query.order('fecha_inicio', { ascending: false });

      if (error) {
        throw new Error(`Error al obtener acuerdos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting loan agreements:', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo acuerdo de préstamo
   */
  static async createLoanAgreement(agreement: Omit<LoanAgreement, 'id' | 'created_at' | 'updated_at'>): Promise<LoanAgreement> {
    try {
      // Generar número de acuerdo
      const numeroAcuerdo = await this.generateAgreementNumber(agreement.tipo_acuerdo);

      const { data, error } = await supabase
        .from('acuerdos_prestamo')
        .insert({
          ...agreement,
          numero_acuerdo: numeroAcuerdo
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Error al crear acuerdo: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error creating loan agreement:', error);
      throw error;
    }
  }

  /**
   * Obtener préstamos de materiales
   */
  static async getMaterialLoans(filtros?: {
    tercero_id?: string;
    obra_id?: string;
    tipo_prestamo?: string;
    estado?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Promise<MaterialLoan[]> {
    try {
      let query = supabase
        .from('prestamos_materiales')
        .select(`
          *,
          terceros(razon_social, contacto_principal),
          obras(nombre),
          usuarios_solicitante:usuarios!solicitado_por(nombre),
          usuarios_aprobado:usuarios!aprobado_por(nombre),
          detalle_prestamos(
            *,
            materiales(nombre, unidad_medida, codigo)
          )
        `);

      if (filtros?.tercero_id) {
        query = query.eq('tercero_id', filtros.tercero_id);
      }

      if (filtros?.obra_id) {
        query = query.eq('obra_id', filtros.obra_id);
      }

      if (filtros?.tipo_prestamo) {
        query = query.eq('tipo_prestamo', filtros.tipo_prestamo);
      }

      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_solicitud', filtros.fecha_desde);
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_solicitud', filtros.fecha_hasta);
      }

      const { data, error } = await query.order('fecha_solicitud', { ascending: false });

      if (error) {
        throw new Error(`Error al obtener préstamos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting material loans:', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo préstamo de materiales
   */
  static async createMaterialLoan(
    loan: Omit<MaterialLoan, 'id' | 'numero_prestamo' | 'created_at' | 'updated_at'>,
    details: Omit<LoanDetail, 'id' | 'prestamo_id' | 'created_at' | 'updated_at'>[]
  ): Promise<MaterialLoan> {
    try {
      // Generar número de préstamo
      const numeroPrestamo = await this.generateLoanNumber(loan.tipo_prestamo);

      // Crear el préstamo
      const { data: prestamoData, error: prestamoError } = await supabase
        .from('prestamos_materiales')
        .insert({
          ...loan,
          numero_prestamo: numeroPrestamo
        })
        .select()
        .single();

      if (prestamoError) {
        throw new Error(`Error al crear préstamo: ${prestamoError.message}`);
      }

      // Crear los detalles
      const detallesConId = details.map(detail => ({
        ...detail,
        prestamo_id: prestamoData.id
      }));

      const { error: detallesError } = await supabase
        .from('detalle_prestamos')
        .insert(detallesConId);

      if (detallesError) {
        throw new Error(`Error al crear detalles del préstamo: ${detallesError.message}`);
      }

      return prestamoData;
    } catch (error) {
      console.error('Error creating material loan:', error);
      throw error;
    }
  }

  /**
   * Aprobar un préstamo
   */
  static async approveLoan(loanId: string, approvedBy: string, observaciones?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('prestamos_materiales')
        .update({
          estado: 'aprobado',
          fecha_aprobacion: new Date().toISOString(),
          aprobado_por: approvedBy,
          observaciones: observaciones
        })
        .eq('id', loanId);

      if (error) {
        throw new Error(`Error al aprobar préstamo: ${error.message}`);
      }
    } catch (error) {
      console.error('Error approving loan:', error);
      throw error;
    }
  }

  /**
   * Entregar un préstamo
   */
  static async deliverLoan(
    loanId: string, 
    deliveredBy: string, 
    receivedBy: string,
    deliveryDetails: Array<{
      detalle_id: string;
      cantidad_entregada: number;
      condicion_entrega: string;
    }>
  ): Promise<void> {
    try {
      // Actualizar el préstamo
      const { error: loanError } = await supabase
        .from('prestamos_materiales')
        .update({
          estado: 'entregado',
          fecha_entrega: new Date().toISOString(),
          entregado_por: deliveredBy,
          recibido_por: receivedBy
        })
        .eq('id', loanId);

      if (loanError) {
        throw new Error(`Error al actualizar préstamo: ${loanError.message}`);
      }

      // Actualizar los detalles
      for (const detail of deliveryDetails) {
        const { error: detailError } = await supabase
          .from('detalle_prestamos')
          .update({
            cantidad_entregada: detail.cantidad_entregada,
            condicion_entrega: detail.condicion_entrega
          })
          .eq('id', detail.detalle_id);

        if (detailError) {
          throw new Error(`Error al actualizar detalle: ${detailError.message}`);
        }
      }
    } catch (error) {
      console.error('Error delivering loan:', error);
      throw error;
    }
  }

  /**
   * Procesar devolución de préstamo
   */
  static async processLoanReturn(
    loanId: string,
    returnData: Omit<LoanReturn, 'id' | 'numero_devolucion' | 'created_at' | 'updated_at'>,
    returnDetails: Array<{
      detalle_id: string;
      cantidad_devuelta: number;
      condicion_devolucion: string;
    }>
  ): Promise<LoanReturn> {
    try {
      // Generar número de devolución
      const numeroDevolucion = await this.generateReturnNumber();

      // Crear registro de devolución
      const { data: devolucionData, error: devolucionError } = await supabase
        .from('devoluciones_prestamos')
        .insert({
          ...returnData,
          numero_devolucion: numeroDevolucion
        })
        .select()
        .single();

      if (devolucionError) {
        throw new Error(`Error al crear devolución: ${devolucionError.message}`);
      }

      // Actualizar detalles del préstamo
      for (const detail of returnDetails) {
        const { error: detailError } = await supabase
          .from('detalle_prestamos')
          .update({
            cantidad_devuelta: detail.cantidad_devuelta
          })
          .eq('id', detail.detalle_id);

        if (detailError) {
          throw new Error(`Error al actualizar detalle: ${detailError.message}`);
        }
      }

      // Verificar si el préstamo está completamente devuelto
      await this.checkLoanCompletionStatus(loanId);

      return devolucionData;
    } catch (error) {
      console.error('Error processing loan return:', error);
      throw error;
    }
  }

  /**
   * Obtener alertas de préstamos
   */
  static async getLoanAlerts(filtros?: {
    tipo_alerta?: string;
    estado?: string;
    usuario_responsable?: string;
  }): Promise<LoanAlert[]> {
    try {
      let query = supabase
        .from('alertas_prestamos')
        .select(`
          *,
          prestamos_materiales(
            numero_prestamo,
            terceros(razon_social)
          )
        `);

      if (filtros?.tipo_alerta) {
        query = query.eq('tipo_alerta', filtros.tipo_alerta);
      }

      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros?.usuario_responsable) {
        query = query.eq('usuario_responsable', filtros.usuario_responsable);
      }

      const { data, error } = await query.order('fecha_alerta', { ascending: false });

      if (error) {
        throw new Error(`Error al obtener alertas: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting loan alerts:', error);
      throw error;
    }
  }

  /**
   * Obtener resumen de préstamos
   */
  static async getLoanSummary(filtros?: {
    fecha_desde?: string;
    fecha_hasta?: string;
    obra_id?: string;
  }): Promise<LoanSummary> {
    try {
      let query = supabase
        .from('prestamos_materiales')
        .select(`
          *,
          terceros(razon_social),
          detalle_prestamos(valor_total)
        `);

      if (filtros?.fecha_desde) {
        query = query.gte('fecha_solicitud', filtros.fecha_desde);
      }

      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_solicitud', filtros.fecha_hasta);
      }

      if (filtros?.obra_id) {
        query = query.eq('obra_id', filtros.obra_id);
      }

      const { data: prestamos, error } = await query;

      if (error) {
        throw new Error(`Error al obtener resumen: ${error.message}`);
      }

      const totalPrestamos = prestamos?.length || 0;
      const prestamosActivos = prestamos?.filter(p => ['entregado', 'parcialmente_devuelto'].includes(p.estado)).length || 0;
      const prestamosVencidos = prestamos?.filter(p => p.estado === 'vencido').length || 0;
      
      const valorTotal = prestamos?.reduce((sum, prestamo) => {
        const valorPrestamo = (prestamo.detalle_prestamos as any[])?.reduce((detailSum, detail) => 
          detailSum + (detail.valor_total || 0), 0) || 0;
        return sum + valorPrestamo;
      }, 0) || 0;

      // Calcular préstamos por tipo
      const prestamosPorTipo = {
        prestamo_saliente: prestamos?.filter(p => p.tipo_prestamo === 'prestamo_saliente').length || 0,
        prestamo_entrante: prestamos?.filter(p => p.tipo_prestamo === 'prestamo_entrante').length || 0,
        intercambio: prestamos?.filter(p => p.tipo_prestamo === 'intercambio').length || 0
      };

      // Calcular préstamos por estado
      const prestamosPorEstado = {
        solicitado: prestamos?.filter(p => p.estado === 'solicitado').length || 0,
        aprobado: prestamos?.filter(p => p.estado === 'aprobado').length || 0,
        entregado: prestamos?.filter(p => p.estado === 'entregado').length || 0,
        parcialmente_devuelto: prestamos?.filter(p => p.estado === 'parcialmente_devuelto').length || 0,
        devuelto_completo: prestamos?.filter(p => p.estado === 'devuelto_completo').length || 0,
        vencido: prestamos?.filter(p => p.estado === 'vencido').length || 0,
        cancelado: prestamos?.filter(p => p.estado === 'cancelado').length || 0
      };

      // Calcular terceros más activos
      const tercerosMap = new Map<string, {
        tercero_id: string;
        razon_social: string;
        total_prestamos: number;
        valor_total: number;
      }>();

      prestamos?.forEach(prestamo => {
        const terceroId = prestamo.tercero_id;
        const existing = tercerosMap.get(terceroId);
        const valorPrestamo = (prestamo.detalle_prestamos as any[])?.reduce((sum, detail) => 
          sum + (detail.valor_total || 0), 0) || 0;

        if (existing) {
          existing.total_prestamos += 1;
          existing.valor_total += valorPrestamo;
        } else {
          tercerosMap.set(terceroId, {
            tercero_id: terceroId,
            razon_social: (prestamo.terceros as any)?.razon_social || 'Tercero desconocido',
            total_prestamos: 1,
            valor_total: valorPrestamo
          });
        }
      });

      const tercerosMasActivos = Array.from(tercerosMap.values())
        .sort((a, b) => b.total_prestamos - a.total_prestamos)
        .slice(0, 10);

      return {
        total_prestamos: totalPrestamos,
        prestamos_activos: prestamosActivos,
        prestamos_vencidos: prestamosVencidos,
        valor_total_prestado: valorTotal,
        prestamos_por_tipo: prestamosPorTipo,
        prestamos_por_estado: prestamosPorEstado,
        terceros_mas_activos: tercerosMasActivos
      };
    } catch (error) {
      console.error('Error getting loan summary:', error);
      throw error;
    }
  }

  /**
   * Generar alertas automáticas para préstamos vencidos
   */
  static async generateOverdueAlerts(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Buscar préstamos vencidos
      const { data: prestamosVencidos, error } = await supabase
        .from('prestamos_materiales')
        .select('*')
        .eq('estado', 'entregado')
        .lt('fecha_devolucion_programada', today);

      if (error) {
        throw new Error(`Error al buscar préstamos vencidos: ${error.message}`);
      }

      // Crear alertas para préstamos vencidos
      for (const prestamo of prestamosVencidos || []) {
        // Verificar si ya existe una alerta para este préstamo
        const { data: alertaExistente } = await supabase
          .from('alertas_prestamos')
          .select('id')
          .eq('prestamo_id', prestamo.id)
          .eq('tipo_alerta', 'prestamo_vencido')
          .eq('estado', 'activa')
          .single();

        if (!alertaExistente) {
          await supabase
            .from('alertas_prestamos')
            .insert({
              prestamo_id: prestamo.id,
              tipo_alerta: 'prestamo_vencido',
              mensaje: `Préstamo ${prestamo.numero_prestamo} está vencido desde ${prestamo.fecha_devolucion_programada}`,
              fecha_alerta: new Date().toISOString(),
              estado: 'activa'
            });

          // Actualizar estado del préstamo
          await supabase
            .from('prestamos_materiales')
            .update({ estado: 'vencido' })
            .eq('id', prestamo.id);
        }
      }
    } catch (error) {
      console.error('Error generating overdue alerts:', error);
      throw error;
    }
  }

  // Métodos privados auxiliares
  private static async generateAgreementNumber(tipoAcuerdo: string): Promise<string> {
    const prefix = tipoAcuerdo === 'prestamo_saliente' ? 'AS' : 
                   tipoAcuerdo === 'prestamo_entrante' ? 'AE' : 'AI';
    const year = new Date().getFullYear();
    
    const { data, error } = await supabase
      .from('acuerdos_prestamo')
      .select('numero_acuerdo')
      .like('numero_acuerdo', `${prefix}-${year}-%`)
      .order('numero_acuerdo', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Error al generar número de acuerdo: ${error.message}`);
    }

    const lastNumber = data?.[0]?.numero_acuerdo;
    const nextNumber = lastNumber ? 
      parseInt(lastNumber.split('-')[2]) + 1 : 1;

    return `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;
  }

  private static async generateLoanNumber(tipoPrestamo: string): Promise<string> {
    const prefix = tipoPrestamo === 'prestamo_saliente' ? 'PS' : 
                   tipoPrestamo === 'prestamo_entrante' ? 'PE' : 'PI';
    const year = new Date().getFullYear();
    
    const { data, error } = await supabase
      .from('prestamos_materiales')
      .select('numero_prestamo')
      .like('numero_prestamo', `${prefix}-${year}-%`)
      .order('numero_prestamo', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Error al generar número de préstamo: ${error.message}`);
    }

    const lastNumber = data?.[0]?.numero_prestamo;
    const nextNumber = lastNumber ? 
      parseInt(lastNumber.split('-')[2]) + 1 : 1;

    return `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;
  }

  private static async generateReturnNumber(): Promise<string> {
    const year = new Date().getFullYear();
    
    const { data, error } = await supabase
      .from('devoluciones_prestamos')
      .select('numero_devolucion')
      .like('numero_devolucion', `DEV-${year}-%`)
      .order('numero_devolucion', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Error al generar número de devolución: ${error.message}`);
    }

    const lastNumber = data?.[0]?.numero_devolucion;
    const nextNumber = lastNumber ? 
      parseInt(lastNumber.split('-')[2]) + 1 : 1;

    return `DEV-${year}-${String(nextNumber).padStart(4, '0')}`;
  }

  private static async checkLoanCompletionStatus(loanId: string): Promise<void> {
    try {
      // Obtener todos los detalles del préstamo
      const { data: detalles, error } = await supabase
        .from('detalle_prestamos')
        .select('cantidad_entregada, cantidad_devuelta')
        .eq('prestamo_id', loanId);

      if (error) {
        throw new Error(`Error al verificar estado del préstamo: ${error.message}`);
      }

      // Verificar si está completamente devuelto
      const totalEntregado = detalles?.reduce((sum, d) => sum + (d.cantidad_entregada || 0), 0) || 0;
      const totalDevuelto = detalles?.reduce((sum, d) => sum + (d.cantidad_devuelta || 0), 0) || 0;

      let nuevoEstado = 'entregado';
      if (totalDevuelto === totalEntregado && totalEntregado > 0) {
        nuevoEstado = 'devuelto_completo';
      } else if (totalDevuelto > 0) {
        nuevoEstado = 'parcialmente_devuelto';
      }

      // Actualizar estado del préstamo
      await supabase
        .from('prestamos_materiales')
        .update({ 
          estado: nuevoEstado,
          fecha_devolucion_real: nuevoEstado === 'devuelto_completo' ? new Date().toISOString() : null
        })
        .eq('id', loanId);
    } catch (error) {
      console.error('Error checking loan completion status:', error);
      throw error;
    }
  }
}