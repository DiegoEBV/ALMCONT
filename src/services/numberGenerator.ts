import { localDB } from '../lib/localDB'

/**
 * Servicio para generar números automáticos para documentos
 * Formato: TIPO-YYYY-NNNN (ej: RQ-2024-0001)
 */
export class NumberGeneratorService {
  
  /**
   * Genera el siguiente número para requerimientos (RQ)
   */
  static async generateRQNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `RQ-${year}-`
    
    try {
      const requerimientos = await localDB.get('requerimientos')
      
      // Filtrar requerimientos del año actual
      const currentYearReqs = requerimientos.filter(req => 
        req.numero_rq?.startsWith(prefix)
      )
      
      // Encontrar el número más alto
      let maxNumber = 0
      currentYearReqs.forEach(req => {
        const match = req.numero_rq?.match(/RQ-\d{4}-(\d{4})$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      })
      
      // Generar siguiente número
      const nextNumber = maxNumber + 1
      return `${prefix}${nextNumber.toString().padStart(4, '0')}`
      
    } catch (error) {
      console.error('Error generando número RQ:', error)
      return `${prefix}0001`
    }
  }
  
  /**
   * Genera el siguiente número para solicitudes de compra (SC)
   */
  static async generateSCNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `SC-${year}-`
    
    try {
      const solicitudes = await localDB.get('solicitudes_compra')
      
      // Filtrar solicitudes del año actual
      const currentYearSCs = solicitudes.filter(sc => 
        sc.sc_numero?.startsWith(prefix)
      )
      
      // Encontrar el número más alto
      let maxNumber = 0
      currentYearSCs.forEach(sc => {
        const match = sc.sc_numero?.match(/SC-\d{4}-(\d{4})$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      })
      
      // Generar siguiente número
      const nextNumber = maxNumber + 1
      return `${prefix}${nextNumber.toString().padStart(4, '0')}`
      
    } catch (error) {
      console.error('Error generando número SC:', error)
      return `${prefix}0001`
    }
  }
  
  /**
   * Genera el siguiente número para órdenes de compra (OC)
   */
  static async generateOCNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `OC-${year}-`
    
    try {
      const ordenes = await localDB.get('ordenes_compra')
      
      // Filtrar órdenes del año actual
      const currentYearOCs = ordenes.filter(oc => 
        oc.oc_numero?.startsWith(prefix)
      )
      
      // Encontrar el número más alto
      let maxNumber = 0
      currentYearOCs.forEach(oc => {
        const match = oc.oc_numero?.match(/OC-\d{4}-(\d{4})$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      })
      
      // Generar siguiente número
      const nextNumber = maxNumber + 1
      return `${prefix}${nextNumber.toString().padStart(4, '0')}`
      
    } catch (error) {
      console.error('Error generando número OC:', error)
      return `${prefix}0001`
    }
  }
  
  /**
   * Verifica si un número ya existe para evitar duplicados
   */
  static async checkNumberExists(type: 'RQ' | 'SC' | 'OC', number: string): Promise<boolean> {
    try {
      switch (type) {
        case 'RQ': {
          const requerimientos = await localDB.get('requerimientos')
          return requerimientos.some(req => req.numero_rq === number)
        }
        case 'SC': {
          const solicitudes = await localDB.get('solicitudes_compra')
          return solicitudes.some(sc => sc.sc_numero === number)
        }
        case 'OC': {
          const ordenes = await localDB.get('ordenes_compra')
          return ordenes.some(oc => oc.oc_numero === number)
        }
        default:
          return false
      }
    } catch (error) {
      console.error('Error verificando número existente:', error)
      return false
    }
  }
  
  /**
   * Genera un número único garantizado (con reintentos si hay duplicados)
   */
  static async generateUniqueNumber(type: 'RQ' | 'SC' | 'OC'): Promise<string> {
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      let number: string
      
      switch (type) {
        case 'RQ':
          number = await this.generateRQNumber()
          break
        case 'SC':
          number = await this.generateSCNumber()
          break
        case 'OC':
          number = await this.generateOCNumber()
          break
        default:
          throw new Error(`Tipo de documento no válido: ${type}`)
      }
      
      const exists = await this.checkNumberExists(type, number)
      if (!exists) {
        return number
      }
      
      attempts++
    }
    
    throw new Error(`No se pudo generar un número único para ${type} después de ${maxAttempts} intentos`)
  }
}