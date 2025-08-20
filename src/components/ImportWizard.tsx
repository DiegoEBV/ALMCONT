import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, Save, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { importService, ParsedData, ValidationResult, ImportJob, ImportTemplate } from '../services/ImportService';
import useImportValidation from '../hooks/useImportValidation';
import ImportErrorDisplay from './ImportErrorDisplay';
import ImportProgress from './ImportProgress';
import LoadingSpinner from './ui/LoadingSpinner';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  targetTable?: string;
  onImportComplete?: (job: ImportJob) => void;
}

interface Step {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

const SUPPORTED_FORMATS = {
  'text/csv': 'CSV',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/json': 'JSON',
  'text/xml': 'XML',
  'application/xml': 'XML'
};

const TARGET_TABLES = [
  { value: 'productos', label: 'Productos', fields: ['nombre', 'descripcion', 'precio', 'stock_minimo', 'categoria_id'] },
  { value: 'proveedores', label: 'Proveedores', fields: ['nombre', 'contacto', 'telefono', 'email', 'direccion'] },
  { value: 'categorias', label: 'Categorías', fields: ['nombre', 'descripcion'] },
  { value: 'ubicaciones', label: 'Ubicaciones', fields: ['codigo', 'nombre', 'tipo', 'capacidad_maxima'] },
  { value: 'movimientos', label: 'Movimientos', fields: ['producto_id', 'tipo', 'cantidad', 'ubicacion_origen', 'ubicacion_destino'] }
];

const ImportWizard: React.FC<ImportWizardProps> = ({
  isOpen,
  onClose,
  targetTable = 'productos',
  onImportComplete
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [selectedTable, setSelectedTable] = useState(targetTable);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [showJobProgress, setShowJobProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Hook de validación personalizado
  const { validateAllData, validateFieldRealTime } = useImportValidation({
    data: parsedData,
    fieldMapping,
    targetTable: selectedTable
  });

  const steps: Step[] = [
    { id: 1, title: 'Seleccionar Archivo', description: 'Sube tu archivo de datos', completed: !!file },
    { id: 2, title: 'Mapear Campos', description: 'Relaciona los campos del archivo', completed: Object.keys(fieldMapping).length > 0 },
    { id: 3, title: 'Validar Datos', description: 'Revisa y corrige errores', completed: validationResult?.isValid || false },
    { id: 4, title: 'Importar', description: 'Procesa los datos', completed: false }
  ];

  // Cargar plantillas al abrir
  React.useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const userTemplates = await importService.getUserTemplates();
      setTemplates(userTemplates.filter(t => t.target_table === selectedTable));
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // Manejo de drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile) return;

    // Validar tipo de archivo
    const fileType = selectedFile.type || `application/${selectedFile.name.split('.').pop()}`;
    if (!Object.keys(SUPPORTED_FORMATS).some(format => fileType.includes(format.split('/')[1]))) {
      toast.error('Formato de archivo no soportado. Use CSV, Excel, JSON o XML.');
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 10MB.');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const parsed = await importService.parseFile(selectedFile);
      setParsedData(parsed);
      
      // Auto-mapear campos si hay una plantilla seleccionada
      if (selectedTemplate) {
        const template = templates.find(t => t.id === selectedTemplate);
        if (template) {
          setFieldMapping(template.field_mapping);
        }
      } else {
        // Auto-mapear campos básicos
        const autoMapping: Record<string, string> = {};
        const targetFields = TARGET_TABLES.find(t => t.value === selectedTable)?.fields || [];
        
        parsed.headers.forEach(header => {
          const normalizedHeader = header.toLowerCase().trim();
          const matchedField = targetFields.find(field => 
            field.toLowerCase().includes(normalizedHeader) || 
            normalizedHeader.includes(field.toLowerCase())
          );
          if (matchedField) {
            autoMapping[header] = matchedField;
          }
        });
        
        setFieldMapping(autoMapping);
      }
      
      setCurrentStep(2);
      toast.success(`Archivo procesado: ${parsed.totalRows} registros encontrados`);
    } catch (error) {
      toast.error(`Error procesando archivo: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidation = async () => {
    if (!parsedData) return;

    setIsProcessing(true);
    try {
      const result = await validateAllData();
      setValidationResult(result);
      
      if (result.isValid) {
        toast.success('Validación completada sin errores');
        setCurrentStep(4);
      } else {
        toast.warning(`Validación completada con ${result.errors.length} errores`);
        setCurrentStep(3);
      }
    } catch (error) {
      toast.error('Error al validar los datos');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !parsedData) return;

    setIsProcessing(true);
    
    try {
      const job = await importService.createImportJob(
        file,
        selectedTable,
        fieldMapping
      );

      setShowJobProgress(true);
      
      // Procesar importación
      await importService.processImport(job.id, parsedData.data, fieldMapping);
      
      toast.success('Importación completada exitosamente');
      onImportComplete?.(job);
      handleClose();
    } catch (error) {
      toast.error(`Error en la importación: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || Object.keys(fieldMapping).length === 0) {
      toast.error('Ingrese un nombre para la plantilla y configure el mapeo de campos');
      return;
    }

    try {
      await importService.saveTemplate({
        name: templateName,
        description: templateDescription,
        target_table: selectedTable,
        field_mapping: fieldMapping,
        is_public: false,
        usage_count: 0
      });
      
      toast.success('Plantilla guardada exitosamente');
      setShowTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
      loadTemplates();
    } catch (error) {
      toast.error(`Error guardando plantilla: ${error}`);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFile(null);
    setParsedData(null);
    setFieldMapping({});
    setValidationResult(null);
    setSelectedTemplate('');
    setIsProcessing(false);
    setShowJobProgress(false);
    onClose();
  };

  const downloadErrorReport = () => {
    if (!validationResult) return;

    const errorData = validationResult.errors.map(error => ({
      Fila: error.row,
      Campo: error.field,
      Error: error.message,
      Valor: error.value
    }));

    const csv = [
      Object.keys(errorData[0]).join(','),
      ...errorData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'errores_importacion.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Asistente de Importación</h2>
            <p className="text-gray-600">Importa datos desde archivos CSV, Excel, JSON o XML</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step.completed ? 'bg-green-500 text-white' :
                  currentStep === step.id ? 'bg-blue-500 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {step.completed ? <CheckCircle className="w-5 h-5" /> : step.id}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep === step.id ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    step.completed ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: File Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Table Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tabla de destino
                </label>
                <select
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value);
                    loadTemplates();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TARGET_TABLES.map(table => (
                    <option key={table.value} value={table.value}>
                      {table.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Selection */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plantilla (opcional)
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar plantilla...</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Arrastra tu archivo aquí o haz clic para seleccionar
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Formatos soportados: CSV, Excel (.xlsx, .xls), JSON, XML
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Tamaño máximo: 10MB
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Seleccionar Archivo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.json,.xml"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>

              {file && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <p className="font-medium text-green-900">{file.name}</p>
                      <p className="text-sm text-green-700">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Field Mapping */}
          {currentStep === 2 && parsedData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Mapeo de Campos</h3>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar como Plantilla
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Source Fields */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Campos del Archivo</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {parsedData.headers.map(header => (
                      <div key={header} className="p-2 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">{header}</span>
                        <p className="text-xs text-gray-500">
                          Ejemplo: {parsedData.preview[0]?.[header] || 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Target Fields Mapping */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Mapeo a Campos de Destino</h4>
                  <div className="space-y-3">
                    {parsedData.headers.map(header => (
                      <div key={header} className="flex items-center space-x-2">
                        <span className="text-sm font-medium w-24 truncate" title={header}>
                          {header}
                        </span>
                        <span className="text-gray-400">→</span>
                        <select
                          value={fieldMapping[header] || ''}
                          onChange={(e) => setFieldMapping(prev => ({
                            ...prev,
                            [header]: e.target.value
                          }))}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">No mapear</option>
                          {TARGET_TABLES.find(t => t.value === selectedTable)?.fields.map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data Preview */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Vista Previa de Datos</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.entries(fieldMapping)
                          .filter(([, target]) => target)
                          .map(([source, target]) => (
                            <th key={source} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              {target}
                              <br />
                              <span className="text-gray-400 normal-case">({source})</span>
                            </th>
                          ))
                        }
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.preview.slice(0, 5).map((row, index) => (
                        <tr key={index} className="border-t">
                          {Object.entries(fieldMapping)
                            .filter(([, target]) => target)
                            .map(([source]) => (
                              <td key={source} className="px-4 py-2 text-sm text-gray-900">
                                {row[source] || '-'}
                              </td>
                            ))
                          }
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Validation Results */}
          {currentStep === 3 && validationResult && (
            <div className="space-y-6">
              <ImportErrorDisplay
                errors={validationResult.errors}
                warnings={validationResult.warnings}
                onDownloadReport={() => {
                  // Implementar descarga de reporte
                  const reportData = {
                    errors: validationResult.errors,
                    warnings: validationResult.warnings,
                    summary: {
                      totalRecords: parsedData?.totalRows || 0,
                      validRecords: (parsedData?.totalRows || 0) - validationResult.errors.length,
                      errorRecords: validationResult.errors.length,
                      warningRecords: validationResult.warnings.length
                    }
                  };
                  
                  const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                    type: 'application/json'
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `validation-report-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                maxDisplayItems={20}
                showSummary={true}
              />
            </div>
          )}

          {/* Step 4: Import */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {showJobProgress ? (
                <ImportProgress
                  job={null}
                  onViewDetails={() => {
                    toast.info('Mostrando detalles del trabajo de importación');
                  }}
                  onDownloadReport={() => {
                    const reportData = {
                      timestamp: new Date().toISOString(),
                      summary: {
                        totalRecords: parsedData?.totalRows || 0,
                        targetTable: selectedTable,
                        fieldMapping: fieldMapping
                      }
                    };
                    
                    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                      type: 'application/json'
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `import-report-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  showDetailedStats={true}
                />
              ) : (
                <div className="text-center space-y-6">
                  <div>
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Listo para Importar</h3>
                    <p className="text-gray-600">
                      Se procesarán {parsedData?.totalRows || 0} registros en la tabla {selectedTable}
                    </p>
                  </div>
                  
                  {validationResult && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Resumen</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>• Total de registros: {parsedData?.totalRows || 0}</p>
                        <p>• Campos mapeados: {Object.keys(fieldMapping).filter(k => fieldMapping[k]).length}</p>
                        <p>• Errores de validación: {validationResult.errors.length}</p>
                        <p>• Advertencias: {validationResult.warnings.length}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isProcessing}
              >
                Anterior
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isProcessing}
            >
              Cancelar
            </button>
            
            {currentStep === 2 && (
              <button
                onClick={handleValidation}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                disabled={Object.keys(fieldMapping).filter(k => fieldMapping[k]).length === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Validando...
                  </>
                ) : (
                  'Validar Datos'
                )}
              </button>
            )}
            
            {currentStep === 3 && (
              <button
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                disabled={isProcessing}
              >
                Continuar
              </button>
            )}
            
            {currentStep === 4 && (
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Importando...
                  </>
                ) : (
                  'Iniciar Importación'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Template Save Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Guardar Plantilla</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la plantilla
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Importación de productos"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Describe el propósito de esta plantilla..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-gray-600">Procesando archivo...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportWizard;