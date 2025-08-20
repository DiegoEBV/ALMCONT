import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera as CameraIcon, X, RotateCcw, Download, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';

export interface CapturedPhoto {
  id: string;
  blob: Blob;
  dataUrl: string;
  timestamp: Date;
  metadata: {
    width: number;
    height: number;
    size: number;
    type: string;
  };
}

interface CameraProps {
  onCapture: (photo: CapturedPhoto) => void;
  onClose: () => void;
  maxPhotos?: number;
  quality?: number; // 0.1 - 1.0
  maxWidth?: number;
  maxHeight?: number;
  allowMultiple?: boolean;
  showPreview?: boolean;
}

export const Camera: React.FC<CameraProps> = ({
  onCapture,
  onClose,
  maxPhotos = 5,
  quality = 0.8,
  maxWidth = 1920,
  maxHeight = 1080,
  allowMultiple = true,
  showPreview = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [zoom, setZoom] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar cámara
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Detener stream anterior si existe
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: maxWidth },
          height: { ideal: maxHeight }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsStreaming(true);
        };
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
      toast.error('Error al acceder a la cámara');
    }
  }, [facingMode, maxWidth, maxHeight, zoom, stream]);

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);
    }
  }, [stream]);

  // Capturar foto
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming || isCapturing) {
      return;
    }

    if (capturedPhotos.length >= maxPhotos) {
      toast.error(`Máximo ${maxPhotos} fotos permitidas`);
      return;
    }

    try {
      setIsCapturing(true);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('No se pudo obtener el contexto del canvas');
      }

      // Configurar dimensiones del canvas
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      // Calcular dimensiones respetando los límites
      let targetWidth = videoWidth;
      let targetHeight = videoHeight;
      
      if (targetWidth > maxWidth) {
        targetHeight = (targetHeight * maxWidth) / targetWidth;
        targetWidth = maxWidth;
      }
      
      if (targetHeight > maxHeight) {
        targetWidth = (targetWidth * maxHeight) / targetHeight;
        targetHeight = maxHeight;
      }
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Dibujar el frame del video en el canvas
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      
      // Convertir a blob con compresión
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al crear blob'));
            }
          },
          'image/jpeg',
          quality
        );
      });
      
      // Crear data URL para previsualización
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      
      const photo: CapturedPhoto = {
        id: crypto.randomUUID(),
        blob,
        dataUrl,
        timestamp: new Date(),
        metadata: {
          width: targetWidth,
          height: targetHeight,
          size: blob.size,
          type: blob.type
        }
      };
      
      setCapturedPhotos(prev => [...prev, photo]);
      
      if (showPreview) {
        setSelectedPhoto(photo);
      } else {
        onCapture(photo);
      }
      
      // Efecto visual de captura
      if (videoRef.current) {
        videoRef.current.style.filter = 'brightness(1.5)';
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.style.filter = 'none';
          }
        }, 150);
      }
      
      toast.success('Foto capturada');
      
    } catch (err) {
      console.error('Error al capturar foto:', err);
      toast.error('Error al capturar la foto');
    } finally {
      setIsCapturing(false);
    }
  }, [isStreaming, isCapturing, capturedPhotos.length, maxPhotos, maxWidth, maxHeight, quality, showPreview, onCapture]);

  // Cambiar cámara (frontal/trasera)
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Controlar zoom
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? Math.min(prev + 0.5, 3) : Math.max(prev - 0.5, 1);
      return newZoom;
    });
  }, []);

  // Confirmar foto seleccionada
  const confirmPhoto = useCallback((photo: CapturedPhoto) => {
    onCapture(photo);
    if (!allowMultiple) {
      onClose();
    }
  }, [onCapture, allowMultiple, onClose]);

  // Eliminar foto
  const deletePhoto = useCallback((photoId: string) => {
    setCapturedPhotos(prev => prev.filter(p => p.id !== photoId));
    setSelectedPhoto(null);
  }, []);

  // Descargar foto
  const downloadPhoto = useCallback((photo: CapturedPhoto) => {
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = `foto_${photo.timestamp.toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Efectos
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (facingMode || zoom !== 1) {
      startCamera();
    }
  }, [facingMode, zoom, startCamera]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (selectedPhoto && showPreview) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/50 text-white">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {selectedPhoto.metadata.width}×{selectedPhoto.metadata.height}
            </span>
            <span className="text-sm">
              {(selectedPhoto.metadata.size / 1024).toFixed(1)}KB
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadPhoto(selectedPhoto)}
              className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={() => deletePhoto(selectedPhoto.id)}
              className="p-2 rounded-full bg-red-600/30 hover:bg-red-600/50 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Imagen */}
        <div className="flex-1 flex items-center justify-center p-4">
          <img
            src={selectedPhoto.dataUrl}
            alt="Foto capturada"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
        
        {/* Acciones */}
        <div className="p-4 bg-black/50">
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="flex-1 py-3 px-4 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Tomar Otra
            </button>
            <button
              onClick={() => confirmPhoto(selectedPhoto)}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Usar Esta Foto
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 text-white">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {capturedPhotos.length}/{maxPhotos} fotos
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom('out')}
            disabled={zoom <= 1}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="text-sm min-w-[3rem] text-center">{zoom}x</span>
          <button
            onClick={() => handleZoom('in')}
            disabled={zoom >= 3}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Error */}
      {error && (
        <div className="p-4 bg-red-600 text-white text-center">
          {error}
        </div>
      )}
      
      {/* Video */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        
        {/* Overlay de captura */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {/* Grid de ayuda */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full border border-white/20">
            <div className="w-full h-1/3 border-b border-white/20" />
            <div className="w-full h-1/3 border-b border-white/20" />
          </div>
          <div className="absolute inset-0">
            <div className="h-full w-1/3 border-r border-white/20" />
            <div className="absolute top-0 left-1/3 h-full w-1/3 border-r border-white/20" />
          </div>
        </div>
      </div>
      
      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Controles */}
      <div className="p-4 bg-black/50">
        <div className="flex items-center justify-center gap-8">
          {/* Cambiar cámara */}
          <button
            onClick={switchCamera}
            className="p-3 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
          >
            <RotateCcw className="h-6 w-6" />
          </button>
          
          {/* Botón de captura */}
          <button
            onClick={capturePhoto}
            disabled={!isStreaming || isCapturing || capturedPhotos.length >= maxPhotos}
            className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            <CameraIcon className="h-8 w-8 mx-auto text-gray-800" />
          </button>
          
          {/* Galería de fotos capturadas */}
          <div className="flex items-center gap-2">
            {capturedPhotos.slice(-3).map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/30 hover:border-white transition-colors"
              >
                <img
                  src={photo.dataUrl}
                  alt="Foto capturada"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            {capturedPhotos.length > 3 && (
              <div className="w-12 h-12 rounded-lg bg-black/30 flex items-center justify-center text-white text-xs">
                +{capturedPhotos.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar galería de fotos
export const PhotoGallery: React.FC<{
  photos: CapturedPhoto[];
  onDelete?: (photoId: string) => void;
  onDownload?: (photo: CapturedPhoto) => void;
  className?: string;
}> = ({ photos, onDelete, onDownload, className = '' }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);

  if (photos.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <CameraIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No hay fotos capturadas</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            <button
              onClick={() => setSelectedPhoto(photo)}
              className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
            >
              <img
                src={photo.dataUrl}
                alt={`Foto ${photo.timestamp.toLocaleString()}`}
                className="w-full h-full object-cover"
              />
            </button>
            
            {/* Acciones */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-1">
                {onDownload && (
                  <button
                    onClick={() => onDownload(photo)}
                    className="p-1 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(photo.id)}
                    className="p-1 rounded bg-red-600/50 text-white hover:bg-red-600/70 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div>{photo.timestamp.toLocaleString()}</div>
              <div>{(photo.metadata.size / 1024).toFixed(1)}KB</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Modal de foto seleccionada */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
            >
              <X className="h-6 w-6" />
            </button>
            
            <img
              src={selectedPhoto.dataUrl}
              alt="Foto ampliada"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};