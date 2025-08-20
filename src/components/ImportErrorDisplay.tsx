import React from 'react';
import { AlertCircle, AlertTriangle, Info, Download, X } from 'lucide-react';
import { ValidationError, ValidationWarning } from '../services/ImportService';

interface ImportErrorDisplayProps {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  onDownloadReport?: () => void;
  onClose?: () => void;
  maxDisplayItems?: number;
  showSummary?: boolean;
}

interface ErrorGroup {
  field: string;
  message: string;
  count: number;
  rows: number[];
  severity: 'error' | 'warning';
  examples: string[];
}

const ImportErrorDisplay: React.FC<ImportErrorDisplayProps> = ({
  errors = [],
  warnings = [],
  onDownloadReport,
  onClose,
  maxDisplayItems = 50,
  showSummary = true
}) => {
  const totalIssues = errors.length + warnings.length;

  // Agrupar errores por campo y mensaje para mejor visualización
  const groupedIssues = React.useMemo(() => {
    const groups = new Map<string, ErrorGroup>();

    [...errors, ...warnings].forEach(issue => {
      const key = `${issue.field}-${issue.message}-${issue.severity}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          field: issue.field,
          message: issue.message,
          count: 0,
          rows: [],
          severity: issue.severity,
          examples: []
        });
      }

      const group = groups.get(key)!;
      group.count++;
      group.rows.push(issue.row);
      
      // Agregar ejemplos únicos (máximo 3)
      const valueStr = String(issue.value).trim();
      if (valueStr && !group.examples.includes(valueStr) && group.examples.length < 3) {
        group.examples.push(valueStr);
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      // Ordenar por severidad (errores primero) y luego por cantidad
      if (a.severity !== b.severity) {
        return a.severity === 'error' ? -1 : 1;
      }
      return b.count - a.count;
    });
  }, [errors, warnings]);

  const getSeverityIcon = (severity: 'error' | 'warning') => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: 'error' | 'warning') => {
    switch (severity) {
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getTextColor = (severity: 'error' | 'warning') => {
    switch (severity) {
      case 'error':
        return 'text-red-900';
      case 'warning':
        return 'text-yellow-900';
      default:
        return 'text-blue-900';
    }
  };

  const formatRowNumbers = (rows: number[]) => {
    if (rows.length <= 5) {
      return rows.join(', ');
    }
    return `${rows.slice(0, 5).join(', ')} y ${rows.length - 5} más`;
  };

  if (totalIssues === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Validación Exitosa
            </h3>
            <p className="text-sm text-green-700">
              Todos los datos han pasado la validación correctamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {showSummary && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Resumen de Validación</h3>
              <p className="text-sm text-gray-600">
                Se encontraron {totalIssues} problema{totalIssues !== 1 ? 's' : ''} en los datos
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-red-900">Errores</p>
                  <p className="text-lg font-bold text-red-600">{errors.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Advertencias</p>
                  <p className="text-lg font-bold text-yellow-600">{warnings.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center">
                <Info className="w-5 h-5 text-blue-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Total</p>
                  <p className="text-lg font-bold text-blue-600">{totalIssues}</p>
                </div>
              </div>
            </div>
          </div>
          
          {onDownloadReport && totalIssues > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={onDownloadReport}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Reporte Completo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grouped Issues */}
      <div className="space-y-3">
        <h4 className="text-md font-medium text-gray-900">
          Problemas Encontrados {groupedIssues.length > maxDisplayItems && `(Mostrando ${maxDisplayItems} de ${groupedIssues.length})`}
        </h4>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {groupedIssues.slice(0, maxDisplayItems).map((group, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getSeverityColor(group.severity)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getSeverityIcon(group.severity)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className={`text-sm font-medium ${getTextColor(group.severity)}`}>
                      Campo: {group.field}
                    </h5>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      group.severity === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {group.count} ocurrencia{group.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <p className={`text-sm mt-1 ${getTextColor(group.severity)}`}>
                    {group.message}
                  </p>
                  
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Filas afectadas:</span> {formatRowNumbers(group.rows)}
                    </p>
                    
                    {group.examples.length > 0 && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Ejemplos:</span> {group.examples.join(', ')}
                        {group.examples.length === 3 && group.count > 3 && '...'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {groupedIssues.length > maxDisplayItems && (
          <div className="text-center py-3 border-t">
            <p className="text-sm text-gray-500">
              Mostrando {maxDisplayItems} de {groupedIssues.length} problemas.
              {onDownloadReport && (
                <>
                  {' '}
                  <button
                    onClick={onDownloadReport}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Descargar reporte completo
                  </button>
                  {' '}para ver todos los detalles.
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {totalIssues > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Acciones Recomendadas</h5>
          <ul className="text-sm text-gray-600 space-y-1">
            {errors.length > 0 && (
              <li>• Corrija los errores antes de proceder con la importación</li>
            )}
            {warnings.length > 0 && (
              <li>• Revise las advertencias para asegurar la calidad de los datos</li>
            )}
            <li>• Use el reporte descargable para hacer correcciones en el archivo original</li>
            <li>• Verifique el mapeo de campos si hay muchos errores de formato</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImportErrorDisplay;