import { supabase } from '../lib/supabase';

interface DashboardStats {
    totalObras: number;
    obrasActivas: number;
    totalMateriales: number;
    totalRequerimientos: number;
    requerimientosPendientes: number;
    requerimientosAprobados: number;
    requerimientosRechazados: number;
    totalStock: number;
    valorTotalStock: number;
}

interface ObraStats {
    obra_id: string;
    obra_nombre: string;
    total_requerimientos: number;
    requerimientos_pendientes: number;
    requerimientos_aprobados: number;
    total_materiales_stock: number;
    valor_stock: number;
}

export const coordinadorDashboardService = {
    /**
     * Get general dashboard statistics
     */
    async getEstadisticas(): Promise<DashboardStats> {
        try {
            // Get obras
            const { data: obras, error: obrasError } = await supabase
                .from('obras')
                .select('id, activo');

            if (obrasError) throw obrasError;

            // Get materiales
            const { data: materiales, error: materialesError } = await supabase
                .from('materiales')
                .select('id');

            if (materialesError) throw materialesError;

            // Get requerimientos
            const { data: requerimientos, error: reqError } = await supabase
                .from('requerimiento_materiales')
                .select('id, estado');

            if (reqError) throw reqError;

            // Get stock
            const { data: stock, error: stockError } = await supabase
                .from('stock_obra_material')
                .select('stock_actual, costo_promedio, material:materiales(precio_referencial)');

            if (stockError) throw stockError;

            // Calculate stats
            const totalObras = obras?.length || 0;
            const obrasActivas = obras?.filter(o => o.activo).length || 0;
            const totalMateriales = materiales?.length || 0;
            const totalRequerimientos = requerimientos?.length || 0;
            const requerimientosPendientes = requerimientos?.filter(r => r.estado === 'PENDIENTE').length || 0;
            const requerimientosAprobados = requerimientos?.filter(r => r.estado === 'APROBADO').length || 0;
            const requerimientosRechazados = requerimientos?.filter(r => r.estado === 'RECHAZADO').length || 0;

            const totalStock = stock?.reduce((sum, s) => sum + (s.stock_actual || 0), 0) || 0;
            const valorTotalStock = stock?.reduce((sum, s) => {
                const precio = s.costo_promedio || (s.material as any)?.precio_referencial || 0;
                return sum + (s.stock_actual || 0) * precio;
            }, 0) || 0;

            return {
                totalObras,
                obrasActivas,
                totalMateriales,
                totalRequerimientos,
                requerimientosPendientes,
                requerimientosAprobados,
                requerimientosRechazados,
                totalStock,
                valorTotalStock
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    },

    /**
     * Get statistics by obra
     */
    async getEstadisticasPorObra(): Promise<ObraStats[]> {
        try {
            const { data: obras, error: obrasError } = await supabase
                .from('obras')
                .select('id, nombre');

            if (obrasError) throw obrasError;

            const stats: ObraStats[] = [];

            for (const obra of obras || []) {
                // Get requerimientos for this obra
                const { data: requerimientos } = await supabase
                    .from('requerimiento_materiales')
                    .select('id, estado')
                    .eq('obra_id', obra.id);

                // Get stock for this obra
                const { data: stock } = await supabase
                    .from('stock_obra_material')
                    .select('stock_actual, costo_promedio, material:materiales(precio_referencial)')
                    .eq('obra_id', obra.id);

                const totalRequerimientos = requerimientos?.length || 0;
                const requerimientosPendientes = requerimientos?.filter(r => r.estado === 'PENDIENTE').length || 0;
                const requerimientosAprobados = requerimientos?.filter(r => r.estado === 'APROBADO').length || 0;
                const totalMaterialesStock = stock?.length || 0;
                const valorStock = stock?.reduce((sum, s) => {
                    const precio = s.costo_promedio || (s.material as any)?.precio_referencial || 0;
                    return sum + (s.stock_actual || 0) * precio;
                }, 0) || 0;

                stats.push({
                    obra_id: obra.id,
                    obra_nombre: obra.nombre,
                    total_requerimientos: totalRequerimientos,
                    requerimientos_pendientes: requerimientosPendientes,
                    requerimientos_aprobados: requerimientosAprobados,
                    total_materiales_stock: totalMaterialesStock,
                    valor_stock: valorStock
                });
            }

            return stats;
        } catch (error) {
            console.error('Error fetching obra stats:', error);
            throw error;
        }
    },

    /**
     * Get recent requirements
     */
    async getRequerimientosRecientes(limit: number = 10) {
        try {
            const { data, error } = await supabase
                .from('requerimiento_materiales')
                .select(`
          *,
          obra:obras(nombre),
          usuario:usuarios(nombre, apellido)
        `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching recent requirements:', error);
            throw error;
        }
    },

    /**
     * Get materials with low stock across all obras
     */
    async getMaterialesBajoStock() {
        try {
            const { data, error } = await supabase
                .from('stock_obra_material')
                .select(`
          *,
          material:materiales(*),
          obra:obras(nombre)
        `)
                .or('stock_actual.lte.stock_minimo,stock_actual.eq.0')
                .order('stock_actual', { ascending: true })
                .limit(20);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching low stock materials:', error);
            throw error;
        }
    }
};
