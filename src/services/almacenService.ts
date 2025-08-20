import { solicitudesCompraService, RqScService } from './solicitudesCompra'
import { materialesService } from './materiales'

export interface EntradaAlmacen {
  id: string
  numeroSC: string
  numeroRQ: string
  codigoMaterial: string
  nombreMaterial: string
  solicitante: string
  cantidadPedida: number
  cantidadAtendida: number
  atendido: boolean
  fechaEntrada: string
  observaciones?: string
}

export interface SalidaAlmacen {
  id: string
  materialId: string
  codigoMaterial: string
  descripcionMaterial: string
  cantidad: number
  unidad: string
  solicitante: string
  numeroRequerimiento?: string
  observaciones?: string
  fechaSalida: string
  registradoPor: string
}

export interface StockMaterial {
  materialId: string
  codigo: string
  descripcion: string
  totalEntradas: number
  totalSalidas: number
  stockActual: number
  unidad: string
}

export interface LineaSCParaEntrada {
  numeroRQ: string
  codigoMaterial: string
  nombreMaterial: string
  solicitante: string
  cantidadPedida: number
  cantidadAtendida: number
  atendido: boolean
  unidad: string
}

class AlmacenService {
  private readonly ENTRADAS_KEY = 'almacen_entradas'
  private readonly SALIDAS_KEY = 'almacen_salidas'

  // Obtener entradas del localStorage
  private getEntradas(): EntradaAlmacen[] {
    const data = localStorage.getItem(this.ENTRADAS_KEY)
    return data ? JSON.parse(data) : []
  }

  // Obtener salidas del localStorage
  private getSalidas(): SalidaAlmacen[] {
    const data = localStorage.getItem(this.SALIDAS_KEY)
    return data ? JSON.parse(data) : []
  }

  // Guardar entradas en localStorage
  private saveEntradas(entradas: EntradaAlmacen[]): void {
    localStorage.setItem(this.ENTRADAS_KEY, JSON.stringify(entradas))
  }

  // Guardar salidas en localStorage
  private saveSalidas(salidas: SalidaAlmacen[]): void {
    localStorage.setItem(this.SALIDAS_KEY, JSON.stringify(salidas))
  }

  // Buscar líneas de una SC para entrada
  async buscarLineasSC(numeroSC: string): Promise<LineaSCParaEntrada[]> {
    try {
      // Buscar la solicitud de compra
      const solicitudesCompra = await solicitudesCompraService.getAll()
      console.log('Total solicitudes encontradas:', solicitudesCompra.length)
      console.log('Buscando SC:', numeroSC)
      console.log('Primeras 3 SCs:', solicitudesCompra.slice(0, 3).map(s => ({ id: s.id, sc_numero: s.sc_numero })))
      
      const sc = solicitudesCompra.find(s => s.sc_numero === numeroSC)
      console.log('SC encontrada:', sc)
      
      if (!sc) {
        throw new Error(`No se encontró la Solicitud de Compra ${numeroSC}`)
      }

      // Obtener los requerimientos asociados a esta SC
      const requerimientosSC = await RqScService.getRequerimientosBySC(sc.id)
      const materiales = await materialesService.getAll()
      
      const lineas: LineaSCParaEntrada[] = []
      
      for (const reqSC of requerimientosSC) {
        const material = materiales.find(m => m.codigo === reqSC.codigoMaterial)
        if (material) {
          lineas.push({
            numeroRQ: reqSC.numero_rq,
            codigoMaterial: material?.codigo || '',
            nombreMaterial: material.descripcion,
            solicitante: reqSC.solicitante,
            cantidadPedida: reqSC.cantidad_solicitada,
            cantidadAtendida: 0,
            atendido: false,
            unidad: material.unidad
          })
        }
      }
      
      return lineas
    } catch (error) {
      console.error('Error al buscar líneas de SC:', error)
      throw error
    }
  }

  // Registrar entradas de materiales
  async registrarEntradas(numeroSC: string, lineas: LineaSCParaEntrada[]): Promise<void> {
    try {
      const entradas = this.getEntradas()
      const fechaActual = new Date().toISOString()
      
      for (const linea of lineas) {
        if (linea.cantidadAtendida > 0) {
          const entrada: EntradaAlmacen = {
            id: `ENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            numeroSC,
            numeroRQ: linea.numeroRQ,
            codigoMaterial: linea.codigoMaterial,
            nombreMaterial: linea.nombreMaterial,
            solicitante: linea.solicitante,
            cantidadPedida: linea.cantidadPedida,
            cantidadAtendida: linea.cantidadAtendida,
            atendido: linea.atendido,
            fechaEntrada: fechaActual
          }
          entradas.push(entrada)
        }
      }
      
      this.saveEntradas(entradas)
    } catch (error) {
      console.error('Error al registrar entradas:', error)
      throw error
    }
  }

  // Obtener stock disponible por material
  async getStockPorMaterial(): Promise<StockMaterial[]> {
    try {
      const entradas = this.getEntradas()
      const salidas = this.getSalidas()
      const materiales = await materialesService.getAll()
      
      const stockMap = new Map<string, StockMaterial>()
      
      // Procesar entradas
      for (const entrada of entradas) {
        if (!stockMap.has(entrada.codigoMaterial)) {
          const material = materiales.find(m => m.codigo === entrada.codigoMaterial)
          stockMap.set(entrada.codigoMaterial, {
          materialId: material?.id || entrada.codigoMaterial,
          codigo: entrada.codigoMaterial,
          descripcion: entrada.nombreMaterial,
          totalEntradas: 0,
          totalSalidas: 0,
          stockActual: 0,
          unidad: material?.unidad || 'UND'
        })
        }
        
        const stock = stockMap.get(entrada.codigoMaterial)!
        stock.totalEntradas += entrada.cantidadAtendida
      }
      
      // Procesar salidas
      for (const salida of salidas) {
        if (stockMap.has(salida.codigoMaterial)) {
          const stock = stockMap.get(salida.codigoMaterial)!
          stock.totalSalidas += salida.cantidad
        }
      }
      
      // Calcular stock actual
      for (const stock of stockMap.values()) {
        stock.stockActual = stock.totalEntradas - stock.totalSalidas
      }
      
      return Array.from(stockMap.values()).filter(s => s.totalEntradas > 0)
    } catch (error) {
      console.error('Error al obtener stock:', error)
      throw error
    }
  }

  // Obtener materiales disponibles para salida (con stock > 0)
  async getMaterialesDisponibles(): Promise<StockMaterial[]> {
    const stock = await this.getStockPorMaterial()
    return stock.filter(s => s.stockActual > 0)
  }

  // Registrar salida de material
  async registrarSalida(salida: Omit<SalidaAlmacen, 'id' | 'fechaSalida'>): Promise<void> {
    try {
      // Verificar stock disponible
      const stock = await this.getStockPorMaterial()
      const stockMaterial = stock.find(s => s.codigo === salida.codigoMaterial)
      
      if (!stockMaterial || stockMaterial.stockActual < salida.cantidad) {
        throw new Error(`Stock insuficiente para el material ${salida.codigoMaterial}. Stock disponible: ${stockMaterial?.stockActual || 0}`)
      }
      
      const salidas = this.getSalidas()
      const nuevaSalida: SalidaAlmacen = {
        ...salida,
        id: `SAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fechaSalida: new Date().toISOString()
      }
      
      salidas.push(nuevaSalida)
      this.saveSalidas(salidas)
    } catch (error) {
      console.error('Error al registrar salida:', error)
      throw error
    }
  }

  // Obtener historial de entradas
  async getHistorialEntradas(): Promise<EntradaAlmacen[]> {
    return this.getEntradas().sort((a, b) => new Date(b.fechaEntrada).getTime() - new Date(a.fechaEntrada).getTime())
  }

  // Obtener historial de salidas
  async getHistorialSalidas(): Promise<SalidaAlmacen[]> {
    return this.getSalidas().sort((a, b) => new Date(b.fechaSalida).getTime() - new Date(a.fechaSalida).getTime())
  }

  // Buscar entradas por solicitante
  async buscarEntradasPorSolicitante(solicitante: string): Promise<EntradaAlmacen[]> {
    const entradas = this.getEntradas()
    return entradas.filter(e => e.solicitante.toLowerCase().includes(solicitante.toLowerCase()))
  }

  // Buscar entradas por número de requerimiento
  async buscarEntradasPorRQ(numeroRQ: string): Promise<EntradaAlmacen[]> {
    const entradas = this.getEntradas()
    return entradas.filter(e => e.numeroRQ === numeroRQ)
  }
}

export const almacenService = new AlmacenService()