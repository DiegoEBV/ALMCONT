import { supabase } from '../lib/supabase';
import type {
    StockAlmacenCentral,
    MovimientoAlmacenCentral,
    TransferenciaPendiente,
    EntradaMaterialDTO,
    TransferenciaMaterialDTO,
    ConfirmarTransferenciaDTO,
    MovimientoFilters,
    StockFilters
} from '../types/almacenCentral';

export const almacenCentralService = {
    // ==================== STOCK ====================

    /**
     * Get all central warehouse stock
     */
    async getStockCompleto(filters?: StockFilters): Promise<StockAlmacenCentral[]> {
        let query = supabase
            .from('stock_almacen_central')
            .select(`
        *,
        material:materiales(*)
      `)
            .order('created_at', { ascending: false });

        if (filters?.bajo_stock) {
            query = query.or('cantidad_disponible.lte.stock_minimo');
        }

        if (filters?.sin_stock) {
            query = query.eq('cantidad_disponible', 0);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching central stock:', error);
            throw new Error('Error al obtener stock del almacén central');
        }

        let result = data || [];

        // Client-side search filter
        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(item =>
                item.material?.nombre?.toLowerCase().includes(searchLower) ||
                item.material?.codigo?.toLowerCase().includes(searchLower)
            );
        }

        return result;
    },

    /**
     * Get stock for a specific material
     */
    async getStockMaterial(materialId: string): Promise<StockAlmacenCentral | null> {
        const { data, error } = await supabase
            .from('stock_almacen_central')
            .select(`
        *,
        material:materiales(*)
      `)
            .eq('material_id', materialId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            console.error('Error fetching material stock:', error);
            throw new Error('Error al obtener stock del material');
        }

        return data;
    },

    /**
     * Get materials with low stock
     */
    async getMaterialesBajoStock(): Promise<StockAlmacenCentral[]> {
        const { data, error } = await supabase
            .from('stock_almacen_central')
            .select(`
        *,
        material:materiales(*)
      `)
            .or('cantidad_disponible.lte.stock_minimo,cantidad_disponible.eq.0')
            .order('cantidad_disponible', { ascending: true });

        if (error) {
            console.error('Error fetching low stock materials:', error);
            throw new Error('Error al obtener materiales con bajo stock');
        }

        return data || [];
    },

    // ==================== MOVEMENTS ====================

    /**
     * Register material entry
     */
    async registrarEntrada(entrada: EntradaMaterialDTO): Promise<any> {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Usuario no autenticado');

        const { data, error } = await supabase.rpc('registrar_entrada_almacen_central', {
            p_material_id: entrada.material_id,
            p_cantidad: entrada.cantidad,
            p_usuario_id: userData.user.id,
            p_proveedor: entrada.proveedor || null,
            p_numero_factura: entrada.numero_factura || null,
            p_costo_unitario: entrada.costo_unitario || null,
            p_motivo: entrada.motivo || null
        });

        if (error) {
            console.error('Error registering entry:', error);
            throw new Error(error.message || 'Error al registrar entrada de material');
        }

        return data;
    },

    /**
     * Register material transfer to obra
     */
    async registrarTransferencia(transferencia: TransferenciaMaterialDTO): Promise<any> {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Usuario no autenticado');

        const { data, error } = await supabase.rpc('registrar_transferencia_obra', {
            p_material_id: transferencia.material_id,
            p_cantidad: transferencia.cantidad,
            p_obra_destino_id: transferencia.obra_destino_id,
            p_usuario_id: userData.user.id,
            p_notas: transferencia.notas || null
        });

        if (error) {
            console.error('Error registering transfer:', error);
            throw new Error(error.message || 'Error al registrar transferencia');
        }

        return data;
    },

    /**
     * Get movement history
     */
    async getMovimientos(filters?: MovimientoFilters): Promise<MovimientoAlmacenCentral[]> {
        let query = supabase
            .from('movimientos_almacen_central')
            .select(`
        *,
        material:materiales(*),
        obra_destino:obras(id, nombre),
        usuario:usuarios(id, nombre, email)
      `)
            .order('fecha', { ascending: false });

        if (filters?.material_id) {
            query = query.eq('material_id', filters.material_id);
        }

        if (filters?.tipo) {
            query = query.eq('tipo', filters.tipo);
        }

        if (filters?.obra_destino_id) {
            query = query.eq('obra_destino_id', filters.obra_destino_id);
        }

        if (filters?.fecha_desde) {
            query = query.gte('fecha', filters.fecha_desde);
        }

        if (filters?.fecha_hasta) {
            query = query.lte('fecha', filters.fecha_hasta);
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching movements:', error);
            throw new Error('Error al obtener movimientos');
        }

        return data || [];
    },

    // ==================== TRANSFERS ====================

    /**
     * Get pending transfers for an obra
     */
    async getTransferenciasPendientes(obraId?: string): Promise<TransferenciaPendiente[]> {
        let query = supabase
            .from('transferencias_pendientes')
            .select(`
        *,
        material:materiales(*),
        obra_destino:obras(id, nombre),
        usuario_envio:usuarios!transferencias_pendientes_usuario_envio_id_fkey(id, nombre),
        usuario_recepcion:usuarios!transferencias_pendientes_usuario_recepcion_id_fkey(id, nombre)
      `)
            .in('estado', ['PENDIENTE', 'AJUSTADA'])
            .order('fecha_envio', { ascending: false });

        if (obraId) {
            query = query.eq('obra_destino_id', obraId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching pending transfers:', error);
            throw new Error('Error al obtener transferencias pendientes');
        }

        return data || [];
    },

    /**
     * Confirm transfer reception
     */
    async confirmarTransferencia(confirmacion: ConfirmarTransferenciaDTO): Promise<void> {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('transferencias_pendientes')
            .update({
                cantidad_recibida: confirmacion.cantidad_recibida,
                notas_recepcion: confirmacion.notas_recepcion,
                estado: confirmacion.estado,
                usuario_recepcion_id: userData.user.id,
                fecha_recepcion: new Date().toISOString()
            })
            .eq('id', confirmacion.transferencia_id);

        if (error) {
            console.error('Error confirming transfer:', error);
            throw new Error('Error al confirmar transferencia');
        }
    },

    // ==================== STATISTICS ====================

    /**
     * Get dashboard statistics
     */
    async getEstadisticas(): Promise<{
        total_materiales: number;
        valor_total_inventario: number;
        materiales_bajo_stock: number;
        transferencias_pendientes: number;
    }> {
        const [stock, movimientos, transferencias] = await Promise.all([
            this.getStockCompleto(),
            this.getMovimientos({ limit: 1000 }),
            this.getTransferenciasPendientes()
        ]);

        const total_materiales = stock.length;
        const materiales_bajo_stock = stock.filter(s =>
            s.cantidad_disponible <= s.stock_minimo || s.cantidad_disponible === 0
        ).length;
        const transferencias_pendientes = transferencias.filter(t =>
            t.estado === 'PENDIENTE'
        ).length;

        // Calculate total inventory value from recent movements with cost
        const valor_total_inventario = movimientos
            .filter(m => m.costo_unitario && m.tipo === 'ENTRADA')
            .reduce((sum, m) => sum + (m.costo_unitario! * m.cantidad), 0);

        return {
            total_materiales,
            valor_total_inventario,
            materiales_bajo_stock,
            transferencias_pendientes
        };
    }
};
