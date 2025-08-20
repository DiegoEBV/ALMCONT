import React, { useState, useRef } from 'react'
import { DocumentArrowUpIcon, DocumentCheckIcon, ExclamationTriangleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { excelService, ExcelImportResult, ExcelData } from '../services/excelService'
import { Button } from './ui/button'
import LoadingSpinner from './ui/LoadingSpinner'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table'
import { TableColumn } from '../types'

interface ExcelImportProps {
  onDataImported?: (data: ExcelData[]) => void
  onError?: (error: string) => void
  showPreview?: boolean
  allowFileUpload?: boolean
  title?: string
}

export default function ExcelImport({
  onDataImported,
  onError,
  showPreview = true,
  allowFileUpload = true,
  title = 'Importar datos desde Excel'
}: ExcelImportProps) {
  const [loading, setLoading] = useState(false)
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [convertedData, setConvertedData] = useState<ExcelData[]>([])
  const [showValidation, setShowValidation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLoadFromAssets = async () => {
    setLoading(true)
    setImportResult(null)
    setValidationErrors([])
    setConvertedData([])
    setShowValidation(false)

    try {
      const result = await excelService.readRequirementsExcel()
      setImportResult(result)

      if (result.errors.length > 0) {
        setValidationErrors(result.errors)
        onError?.(result.errors.join(', '))
      } else if (result.data.length > 0) {
        // Validar datos
        const validation = excelService.validateRequirementsData(result.data)
        if (!validation.isValid) {
          setValidationErrors(validation.errors)
          setShowValidation(true)
        } else {
          // Convertir datos al formato del sistema
          const converted = excelService.convertToRequirements(result.data)
          setConvertedData(converted)
          setShowValidation(true)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setValidationErrors([errorMessage])
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setImportResult(null)
    setValidationErrors([])
    setConvertedData([])
    setShowValidation(false)

    try {
      const result = await excelService.readExcelFile(file)
      setImportResult(result)

      if (result.errors.length > 0) {
        setValidationErrors(result.errors)
        onError?.(result.errors.join(', '))
      } else if (result.data.length > 0) {
        // Validar datos
        const validation = excelService.validateRequirementsData(result.data)
        if (!validation.isValid) {
          setValidationErrors(validation.errors)
          setShowValidation(true)
        } else {
          // Convertir datos al formato del sistema
          const converted = excelService.convertToRequirements(result.data)
          setConvertedData(converted)
          setShowValidation(true)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setValidationErrors([errorMessage])
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImportData = () => {
    if (convertedData.length > 0) {
      onDataImported?.(convertedData)
    }
  }

  const handleExportSample = () => {
    const sampleData = [
      {
        codigo: 'MAT-001',
        descripcion: 'Cemento Portland Tipo I',
        cantidad: 50,
        unidad: 'BOL',
        categoria: 'MATERIALES',
        prioridad: 'ALTA'
      },
      {
        codigo: 'HER-001',
        descripcion: 'Martillo de Acero',
        cantidad: 2,
        unidad: 'UND',
        categoria: 'HERRAMIENTAS',
        prioridad: 'MEDIA'
      }
    ]
    
    excelService.exportToExcel(sampleData, 'plantilla_requerimientos', 'Requerimientos')
  }

  // Columnas para mostrar datos originales del Excel
  const originalColumns: TableColumn<ExcelData>[] = importResult?.headers.map(header => ({
    key: header,
    title: header,
    dataIndex: header as keyof ExcelData,
    render: (value: string | number | Date) => value?.toString() || ''
  })) || []

  // Columnas para mostrar datos convertidos
  const convertedColumns: TableColumn<ExcelData>[] = [
    {
      key: 'codigo',
      title: 'Código',
      dataIndex: 'codigo'
    },
    {
      key: 'descripcion',
      title: 'Descripción',
      dataIndex: 'descripcion'
    },
    {
      key: 'cantidad',
      title: 'Cantidad',
      dataIndex: 'cantidad',
      render: (value: number) => value.toLocaleString()
    },
    {
      key: 'unidad',
      title: 'Unidad',
      dataIndex: 'unidad'
    },
    {
      key: 'categoria',
      title: 'Categoría',
      dataIndex: 'categoria'
    },
    {
      key: 'prioridad',
      title: 'Prioridad',
      dataIndex: 'prioridad'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportSample}
          leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
        >
          Descargar Plantilla
        </Button>
      </div>

      {/* Controles de importación */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="space-y-4">
          {/* Cargar desde assets */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Cargar archivo de requerimientos
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Cargar datos desde el archivo reqprueb.xlsx ubicado en assets
            </p>
            <Button
              onClick={handleLoadFromAssets}
              disabled={loading}
              leftIcon={<DocumentCheckIcon className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              {loading ? 'Cargando...' : 'Cargar desde Assets'}
            </Button>
          </div>

          {/* Separador */}
          {allowFileUpload && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">o</span>
              </div>
            </div>
          )}

          {/* Upload de archivo */}
          {allowFileUpload && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Subir archivo Excel
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Selecciona un archivo Excel (.xlsx) con los datos a importar
              </p>
              <div className="flex items-center space-x-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                  Seleccionar Archivo
                </label>
                {loading && <LoadingSpinner size="sm" />}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Errores de validación */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Errores de validación
              </h3>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Resultados de importación */}
      {importResult && showPreview && (
        <div className="space-y-4">
          {/* Información del archivo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Información del archivo
            </h3>
            <div className="text-sm text-blue-700">
              <p>Total de filas: {importResult.totalRows}</p>
              <p>Columnas encontradas: {importResult.headers.join(', ')}</p>
            </div>
          </div>

          {/* Vista previa de datos originales */}
          {importResult.data.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Vista previa - Datos originales
              </h3>
              <Table
                columns={originalColumns}
                data={importResult.data.slice(0, 10)} // Mostrar solo las primeras 10 filas
                loading={false}
                emptyText="No hay datos para mostrar"
              />
              {importResult.data.length > 10 && (
                <p className="text-sm text-gray-600 mt-2">
                  Mostrando 10 de {importResult.data.length} filas
                </p>
              )}
            </div>
          )}

          {/* Vista previa de datos convertidos */}
          {convertedData.length > 0 && showValidation && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Vista previa - Datos convertidos
              </h3>
              <Table
                columns={convertedColumns}
                data={convertedData.slice(0, 10)} // Mostrar solo las primeras 10 filas
                loading={false}
                emptyText="No hay datos convertidos"
              />
              {convertedData.length > 10 && (
                <p className="text-sm text-gray-600 mt-2">
                  Mostrando 10 de {convertedData.length} filas convertidas
                </p>
              )}
              
              {/* Botón para importar */}
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleImportData}
                  variant="default"
                  leftIcon={<DocumentCheckIcon className="h-4 w-4" />}
                >
                  Importar {convertedData.length} registros
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}