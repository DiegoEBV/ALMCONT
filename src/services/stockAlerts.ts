import { supabase } from '../lib/supabase'
import type { Material } from '../types'

export interface StockAlert {
  material: Material
  currentUsage: number
  maxStock: number
  usagePercentage: number
  alertLevel: 'warning' | 'critical'
}

/**
 * Calcula el porcentaje de uso del stock máximo basado en requerimientos pendientes y en proceso
 */
export const calculateStockUsage = async (materialId: string): Promise<number> => {
  try {
    // Obtener la suma de cantidades de requerimientos pendientes y en proceso para este material
    const { data: requerimientos, error } = await supabase
      .from('requerimientos')
      .select('cantidad')
      .eq('material_id', materialId)
      .in('estado', ['pendiente', 'en_proceso'])

    if (error) {
      console.error('Error al obtener requerimientos:', error)
      return 0
    }

    // Sumar todas las cantidades
    const totalUsage = requerimientos?.reduce((sum, req) => sum + (req.cantidad || 0), 0) || 0
    return totalUsage
  } catch (error) {
    console.error('Error al calcular uso de stock:', error)
    return 0
  }
}

/**
 * Verifica si un material está cerca de su límite de stock máximo
 */
export const checkStockAlert = async (material: Material): Promise<StockAlert | null> => {
  if (!material.stock_maximo || material.stock_maximo <= 0) {
    return null
  }

  const currentUsage = await calculateStockUsage(material.id!)
  const usagePercentage = (currentUsage / material.stock_maximo) * 100

  // Definir niveles de alerta
  if (usagePercentage >= 90) {
    return {
      material,
      currentUsage,
      maxStock: material.stock_maximo,
      usagePercentage,
      alertLevel: 'critical'
    }
  } else if (usagePercentage >= 80) {
    return {
      material,
      currentUsage,
      maxStock: material.stock_maximo,
      usagePercentage,
      alertLevel: 'warning'
    }
  }

  return null
}

/**
 * Obtiene todas las alertas de stock para materiales activos
 */
export const getAllStockAlerts = async (): Promise<StockAlert[]> => {
  try {
    // Obtener todos los materiales activos con stock máximo definido
    const { data: materiales, error } = await supabase
      .from('materiales')
      .select('*')
      .eq('activo', true)
      .not('stock_maximo', 'is', null)
      .gt('stock_maximo', 0)

    if (error) {
      console.error('Error al obtener materiales:', error)
      return []
    }

    const alerts: StockAlert[] = []

    // Verificar cada material
    for (const material of materiales || []) {
      const alert = await checkStockAlert(material)
      if (alert) {
        alerts.push(alert)
      }
    }

    return alerts
  } catch (error) {
    console.error('Error al obtener alertas de stock:', error)
    return []
  }
}

/**
 * Verifica si agregar una cantidad específica a un material excedería su stock máximo
 */
export const wouldExceedMaxStock = async (materialId: string, additionalQuantity: number): Promise<{
  wouldExceed: boolean
  currentUsage: number
  maxStock: number
  newUsage: number
  usagePercentage: number
}> => {
  try {
    // Obtener el material
    const { data: material, error: materialError } = await supabase
      .from('materiales')
      .select('*')
      .eq('id', materialId)
      .single()

    if (materialError || !material) {
      throw new Error('Material no encontrado')
    }

    const currentUsage = await calculateStockUsage(materialId)
    const newUsage = currentUsage + additionalQuantity
    const maxStock = material.stock_maximo || 0
    const usagePercentage = maxStock > 0 ? (newUsage / maxStock) * 100 : 0

    return {
      wouldExceed: newUsage > maxStock,
      currentUsage,
      maxStock,
      newUsage,
      usagePercentage
    }
  } catch (error) {
    console.error('Error al verificar límite de stock:', error)
    return {
      wouldExceed: false,
      currentUsage: 0,
      maxStock: 0,
      newUsage: additionalQuantity,
      usagePercentage: 0
    }
  }
}

export const stockAlertsService = {
  calculateStockUsage,
  checkStockAlert,
  getAllStockAlerts,
  wouldExceedMaxStock
}