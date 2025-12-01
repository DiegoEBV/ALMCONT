import React from 'react'
import LoadingSpinner from './LoadingSpinner'

interface LoadingOverlayProps {
  title?: string
  message?: string
  tip?: string
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  title = 'Cargando',
  message = 'Preparando datos y conexiones...',
  tip = 'Consejo: puede adjuntar sustento PDF/Excel en sus requerimientos'
}) => {
  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="flex flex-col items-center gap-4 p-6 rounded-xl shadow-sm bg-white/90 border">
        <LoadingSpinner size="xl" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 animate-[progress_1.8s_ease_infinite] rounded-full" />
        </div>
        <p className="text-xs text-gray-500">{tip}</p>
      </div>
      <style>{`
      @keyframes progress {
        0% { width: 10% }
        50% { width: 70% }
        100% { width: 90% }
      }
      `}</style>
    </div>
  )
}

export default LoadingOverlay
