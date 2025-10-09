import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
  showProgress?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 2000,
  showProgress = true
}) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let completeTimeout: NodeJS.Timeout;

    if (showProgress) {
      // Simular progreso de carga
      progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 100);
    }

    // Completar después de la duración especificada
    completeTimeout = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 300);
    }, duration);

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (completeTimeout) clearTimeout(completeTimeout);
    };
  }, [duration, showProgress, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center z-50">
      <div className="text-center text-white">
        {/* Logo/Icono */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <span className="text-4xl">📦</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">ALMACÉN</h1>
          <p className="text-blue-100 text-lg">Sistema de Gestión</p>
        </div>

        {/* Barra de progreso */}
        {showProgress && (
          <div className="w-64 mx-auto">
            <div className="w-full bg-white bg-opacity-20 rounded-full h-2 mb-4">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-blue-100 text-sm">
              Cargando aplicación... {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Indicador de carga sin progreso */}
        {!showProgress && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* Versión */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <p className="text-blue-200 text-sm">v2.0.0 PWA</p>
      </div>
    </div>
  );
};

// Componente para splash screen minimalista
export const MinimalSplashScreen: React.FC<{
  onComplete?: () => void;
}> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-xl flex items-center justify-center">
          <span className="text-2xl text-white">📦</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ALMACÉN</h1>
        
        {/* Spinner de carga */}
        <div className="mt-4">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    </div>
  );
};