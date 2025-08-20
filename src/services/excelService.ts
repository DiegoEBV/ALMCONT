import * as XLSX from 'xlsx'

export interface ExcelData {
  [key: string]: string | number | Date | undefined
}

export interface ExcelImportResult {
  data: ExcelData[]
  headers: string[]
  totalRows: number
  errors: string[]
}

class ExcelService {
  /**
   * Lee un archivo Excel desde una URL o archivo local
   */
  async readExcelFile(file: File | string): Promise<ExcelImportResult> {
    try {
      let workbook: XLSX.WorkBook
      
      if (typeof file === 'string') {
        // Leer desde URL (archivo en assets)
        const response = await fetch(file)
        const arrayBuffer = await response.arrayBuffer()
        workbook = XLSX.read(arrayBuffer, { type: 'array' })
      } else {
        // Leer desde archivo subido por el usuario
        const arrayBuffer = await file.arrayBuffer()
        workbook = XLSX.read(arrayBuffer, { type: 'array' })
      }

      // Obtener la primera hoja
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      // Convertir a JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (jsonData.length === 0) {
        return {
          data: [],
          headers: [],
          totalRows: 0,
          errors: ['El archivo Excel está vacío']
        }
      }

      // La primera fila contiene los headers
      const headers = jsonData[0] as string[]
      const dataRows = jsonData.slice(1) as (string | number | Date | null)[][]

      // Convertir filas a objetos
      const data: ExcelData[] = dataRows
        .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map((row, index) => {
          const obj: ExcelData = {}
          headers.forEach((header, colIndex) => {
            obj[header] = row[colIndex] || ''
          })
          obj._rowIndex = index + 2 // +2 porque empezamos desde la fila 1 y saltamos el header
          return obj
        })

      return {
        data,
        headers,
        totalRows: data.length,
        errors: []
      }
    } catch (error) {
      console.error('Error al leer archivo Excel:', error)
      return {
        data: [],
        headers: [],
        totalRows: 0,
        errors: [`Error al leer el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`]
      }
    }
  }

  /**
   * Lee el archivo Excel específico de assets (reqprueb.xlsx)
   */
  async readRequirementsExcel(): Promise<ExcelImportResult> {
    try {
      // Importar el archivo desde assets
      const excelUrl = '/src/assets/reqprueb.xlsx'
      return await this.readExcelFile(excelUrl)
    } catch (error) {
      console.error('Error al leer archivo de requerimientos:', error)
      return {
        data: [],
        headers: [],
        totalRows: 0,
        errors: [`Error al cargar archivo de requerimientos: ${error instanceof Error ? error.message : 'Error desconocido'}`]
      }
    }
  }

  /**
   * Valida que los datos del Excel tengan la estructura esperada para requerimientos
   */
  validateRequirementsData(data: ExcelData[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const requiredFields = ['codigo', 'descripcion', 'cantidad', 'unidad']
    
    if (data.length === 0) {
      errors.push('No hay datos para validar')
      return { isValid: false, errors }
    }

    // Verificar que existan los campos requeridos
    const firstRow = data[0]
    const missingFields = requiredFields.filter(field => 
      !Object.keys(firstRow).some(key => 
        key.toLowerCase().includes(field.toLowerCase())
      )
    )

    if (missingFields.length > 0) {
      errors.push(`Faltan campos requeridos: ${missingFields.join(', ')}`)
    }

    // Validar cada fila
    data.forEach((row, index) => {
      const rowErrors: string[] = []
      
      // Verificar campos obligatorios
      requiredFields.forEach(field => {
        const fieldKey = Object.keys(row).find(key => 
          key.toLowerCase().includes(field.toLowerCase())
        )
        
        if (fieldKey && (!row[fieldKey] || row[fieldKey].toString().trim() === '')) {
          rowErrors.push(`${field} es requerido`)
        }
      })

      // Validar cantidad numérica
      const cantidadKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('cantidad')
      )
      if (cantidadKey && row[cantidadKey] && isNaN(Number(row[cantidadKey]))) {
        rowErrors.push('La cantidad debe ser un número')
      }

      if (rowErrors.length > 0) {
        errors.push(`Fila ${row._rowIndex || index + 1}: ${rowErrors.join(', ')}`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Convierte datos de Excel al formato de requerimientos del sistema
   */
  convertToRequirements(data: ExcelData[]): {
    codigo: string | number | undefined;
    descripcion: string | number | undefined;
    cantidad: number;
    unidad: string;
    categoria: string;
    prioridad: string;
    estado: string;
    fecha_solicitud: string;
    _originalRow: number | undefined;
  }[] {
    return data.map((row): {
      codigo: string | number;
      descripcion: string | number;
      cantidad: number;
      unidad: string;
      categoria: string;
      prioridad: string;
      estado: string;
      fecha_solicitud: string;
      _originalRow: number | undefined;
    } => {
      // Mapear campos del Excel a campos del sistema
      const codigoKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('codigo') || key.toLowerCase().includes('code')
      )
      const descripcionKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('descripcion') || key.toLowerCase().includes('description')
      )
      const cantidadKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('cantidad') || key.toLowerCase().includes('qty')
      )
      const unidadKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('unidad') || key.toLowerCase().includes('unit')
      )
      const categoriaKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('categoria') || key.toLowerCase().includes('category')
      )
      const prioridadKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('prioridad') || key.toLowerCase().includes('priority')
      )

      return {
        codigo: codigoKey ? (row[codigoKey]?.toString() || '') : '',
        descripcion: descripcionKey ? (row[descripcionKey]?.toString() || '') : '',
        cantidad: cantidadKey ? Number(row[cantidadKey]) || 0 : 0,
        unidad: unidadKey ? (row[unidadKey]?.toString() || 'UND') : 'UND',
        categoria: categoriaKey ? (row[categoriaKey]?.toString() || 'MATERIALES') : 'MATERIALES',
        prioridad: prioridadKey ? (row[prioridadKey]?.toString() || 'MEDIA') : 'MEDIA',
        estado: 'PENDIENTE',
        fecha_solicitud: new Date().toISOString(),
        _originalRow: typeof row._rowIndex === 'number' ? row._rowIndex : undefined
      }
    })
  }

  /**
   * Exporta datos a Excel
   */
  exportToExcel<T extends Record<string, unknown>>(data: T[], filename: string, sheetName: string = 'Datos'): void {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
      
      // Descargar archivo
      XLSX.writeFile(workbook, `${filename}.xlsx`)
    } catch (error) {
      console.error('Error al exportar a Excel:', error)
      throw new Error('Error al exportar archivo Excel')
    }
  }
}

export const excelService = new ExcelService()
export default excelService