import React from 'react';
import { CheckCircle, AlertCircle, Clock, Loader2, Download, Eye } from 'lucide-react';
import { ImportJob } from '../services/ImportService';

interface ImportProgressProps {
  job: ImportJob;
  onViewDetails?: () => void;
  onDownloadReport?: () => void;
  showDetailedStats?: boolean;
  refreshInterval?: number;
}

interface ProgressStats {
  processed: number;
  total: number;
  successful: number;
  failed: number;
  warnings: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

const ImportProgress: React.FC<ImportProgressProps> = ({
  job,
  onViewDetails,
  onDownloadReport,
  showDetailedStats = true,
  refreshInterval = 1000
}) => {
  const [currentTime, setCurrentTime] = React.useState(Date.now());

  // Actualizar tiempo actual para cálculos de duración
  React.useEffect(() => {
    if (job.status === 'processing') {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [job.status, refreshInterval]);

  const getProgressStats = (): ProgressStats => {
    const processed = (job.processed_records || 0);
    const total = job.total_records || 1;
    const successful = (job.successful_records || 0);
    const failed = (job.failed_records || 0);
    const warnings = (job.warning_records || 0);
    const percentage = Math.round((processed / total) * 100);

    let estimatedTimeRemaining: number | undefined;
    if (job.status === 'processing' && processed > 0) {
      const startTime = new Date(job.created_at).getTime();
      const elapsed = currentTime - startTime;
      const rate = processed / elapsed; // records per ms
      const remaining = total - processed;
      estimatedTimeRemaining = remaining / rate;
    }

    return {
      processed,
      total,
      successful,
      failed,
      warnings,
      percentage,
      estimatedTimeRemaining
    };
  };

  const stats = getProgressStats();

  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return 'border-yellow-200 bg-yellow-50';
      case 'processing':
        return 'border-blue-200 bg-blue-50';
      case 'completed':
        return stats.failed > 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'pending':
        return 'Pendiente';
      case 'processing':
        return 'Procesando';
      case 'completed':
        return stats.failed > 0 ? 'Completado con errores' : 'Completado exitosamente';
      case 'failed':
        return 'Falló';
      default:
        return 'Desconocido';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getElapsedTime = () => {
    const startTime = new Date(job.created_at).getTime();
    const endTime = job.completed_at ? new Date(job.completed_at).getTime() : currentTime;
    return endTime - startTime;
  };

  const getProgressBarColor = () => {
    if (job.status === 'failed') return 'bg-red-500';
    if (job.status === 'completed' && stats.failed > 0) return 'bg-orange-500';
    if (job.status === 'completed') return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <div className={`border rounded-lg p-6 ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Importación: {job.file_name}
            </h3>
            <p className="text-sm text-gray-600">
              {getStatusText()} • Tabla: {job.target_table}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver Detalles
            </button>
          )}
          
          {onDownloadReport && (job.status === 'completed' || job.status === 'failed') && (
            <button
              onClick={onDownloadReport}
              className="flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-1" />
              Reporte
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progreso: {stats.processed.toLocaleString()} de {stats.total.toLocaleString()} registros
          </span>
          <span className="text-sm font-medium text-gray-700">
            {stats.percentage}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${stats.percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Detailed Stats */}
      {showDetailedStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Exitosos</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-lg font-bold text-green-600">
              {stats.successful.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Fallidos</span>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-lg font-bold text-red-600">
              {stats.failed.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Advertencias</span>
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            </div>
            <p className="text-lg font-bold text-yellow-600">
              {stats.warnings.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tiempo</span>
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-lg font-bold text-gray-700">
              {formatDuration(getElapsedTime())}
            </p>
          </div>
        </div>
      )}

      {/* Status-specific Information */}
      {job.status === 'processing' && stats.estimatedTimeRemaining && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Tiempo estimado restante:</span>{' '}
            {formatDuration(stats.estimatedTimeRemaining)}
          </p>
        </div>
      )}

      {job.status === 'failed' && job.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800">
            <span className="font-medium">Error:</span> {job.error_message}
          </p>
        </div>
      )}

      {job.status === 'completed' && (
        <div className={`border rounded-lg p-3 ${
          stats.failed > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
        }`}>
          <p className={`text-sm ${
            stats.failed > 0 ? 'text-orange-800' : 'text-green-800'
          }`}>
            <span className="font-medium">Resultado:</span>{' '}
            {stats.successful > 0 && `${stats.successful.toLocaleString()} registros importados exitosamente`}
            {stats.failed > 0 && (
              <>
                {stats.successful > 0 && ', '}
                {stats.failed.toLocaleString()} registros fallaron
              </>
            )}
            {stats.warnings > 0 && (
              <>
                {(stats.successful > 0 || stats.failed > 0) && ', '}
                {stats.warnings.toLocaleString()} advertencias
              </>
            )}
            .
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">Iniciado:</span>{' '}
            {new Date(job.created_at).toLocaleString()}
          </div>
          {job.completed_at && (
            <div>
              <span className="font-medium">Completado:</span>{' '}
              {new Date(job.completed_at).toLocaleString()}
            </div>
          )}
          <div>
            <span className="font-medium">Formato:</span> {job.file_type.toUpperCase()}
          </div>
          <div>
            <span className="font-medium">ID del trabajo:</span> {job.id}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportProgress;