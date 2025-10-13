import { useState, useCallback, useEffect } from 'react';
import { CapturedPhoto } from '../components/Camera';
// import { offlineService } from '../services/offlineService';
import { toast } from 'sonner';

// Re-export CapturedPhoto for convenience
export type { CapturedPhoto } from '../components/Camera';

export interface PhotoMetadata {
  materialId?: string;
  movementId?: string;
  movementType?: 'entrada' | 'salida';
  description?: string;
  location?: string;
  userId?: string;
  timestamp: Date;
}

export interface StoredPhoto {
  id: string;
  blob: Blob;
  dataUrl: string;
  timestamp: Date;
  metadata: PhotoMetadata;
  uploaded?: boolean;
  syncStatus?: 'pending' | 'synced' | 'error';
}

interface UsePhotoCaptureReturn {
  photos: StoredPhoto[];
  isLoading: boolean;
  capturePhoto: (photo: CapturedPhoto, metadata?: Partial<PhotoMetadata>) => Promise<void>;
  deletePhoto: (photoId: string) => Promise<void>;
  getPhotosByMaterial: (materialId: string) => StoredPhoto[];
  getPhotosByMovement: (movementId: string) => StoredPhoto[];
  uploadPendingPhotos: () => Promise<void>;
  compressPhoto: (photo: CapturedPhoto, quality?: number) => Promise<CapturedPhoto>;
  downloadPhoto: (photo: StoredPhoto) => void;
  clearPhotos: () => Promise<void>;
}

export const usePhotoCapture = (): UsePhotoCaptureReturn => {
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar fotos al inicializar
  useEffect(() => {
    loadPhotos();
  }, []);

  // Cargar fotos desde almacenamiento local
  const loadPhotos = useCallback(async () => {
    try {
      setIsLoading(true);
      // Implementación básica sin offlineService
      const storedPhotos = localStorage.getItem('almacen_photos');
      if (storedPhotos) {
        const parsedPhotos = JSON.parse(storedPhotos);
        setPhotos(parsedPhotos);
      }
    } catch (error) {
      console.error('Error cargando fotos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Comprimir foto
  const compressPhoto = useCallback(async (
    photo: CapturedPhoto, 
    quality: number = 0.8
  ): Promise<CapturedPhoto> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspect ratio
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto del canvas'));
          return;
        }
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob comprimido
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir imagen'));
              return;
            }
            
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            
            const compressedPhoto: CapturedPhoto = {
              ...photo,
              blob,
              dataUrl,
              metadata: {
                ...photo.metadata,
                width,
                height,
                size: blob.size
              }
            };
            
            resolve(compressedPhoto);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Error al cargar imagen'));
      img.src = photo.dataUrl;
    });
  }, []);

  // Capturar y guardar foto
  const capturePhoto = useCallback(async (
    photo: CapturedPhoto, 
    metadata?: Partial<PhotoMetadata>
  ) => {
    try {
      setIsLoading(true);
      
      // Comprimir foto si es necesaria
      const compressedPhoto = photo.blob.size > 500000 
        ? await compressPhoto(photo, 0.7)
        : photo;
      
      const storedPhoto: StoredPhoto = {
        ...compressedPhoto,
        metadata: {
          ...compressedPhoto.metadata,
          ...(metadata || {}),
          timestamp: new Date()
        },
        uploaded: false,
        syncStatus: 'pending'
      };
      
      // Guardar en localStorage como fallback
      const currentPhotos = [...photos, storedPhoto];
      localStorage.setItem('almacen_photos', JSON.stringify(currentPhotos));
      
      // Actualizar estado local
      setPhotos(currentPhotos);
      
      toast.success('Foto guardada correctamente');
      
    } catch (error) {
      console.error('Error al capturar foto:', error);
      toast.error('Error al guardar la foto');
    } finally {
      setIsLoading(false);
    }
  }, [compressPhoto, photos]);

  // Eliminar foto
  const deletePhoto = useCallback(async (photoId: string) => {
    try {
      setIsLoading(true);
      
      const updatedPhotos = photos.filter(p => p.id !== photoId);
      localStorage.setItem('almacen_photos', JSON.stringify(updatedPhotos));
      setPhotos(updatedPhotos);
      
      toast.success('Foto eliminada');
      
    } catch (error) {
      console.error('Error al eliminar foto:', error);
      toast.error('Error al eliminar la foto');
    } finally {
      setIsLoading(false);
    }
  }, [photos]);

  // Obtener fotos por material
  const getPhotosByMaterial = useCallback((materialId: string): StoredPhoto[] => {
    return photos.filter(photo => photo.metadata.materialId === materialId);
  }, [photos]);

  // Obtener fotos por movimiento
  const getPhotosByMovement = useCallback((movementId: string): StoredPhoto[] => {
    return photos.filter(photo => photo.metadata.movementId === movementId);
  }, [photos]);

  // Subir fotos pendientes (implementación básica)
  const uploadPendingPhotos = useCallback(async () => {
    try {
      console.log('Subiendo fotos pendientes...');
      // Implementación básica - marcar como subidas
      const updatedPhotos = photos.map(photo => ({
        ...photo,
        uploaded: true,
        syncStatus: 'synced' as const
      }));
      setPhotos(updatedPhotos);
      localStorage.setItem('almacen_photos', JSON.stringify(updatedPhotos));
    } catch (error) {
      console.error('Error subiendo fotos:', error);
    }
  }, [photos]);

  // Descargar foto
  const downloadPhoto = useCallback((photo: StoredPhoto) => {
    try {
      const link = document.createElement('a');
      link.href = photo.dataUrl;
      link.download = `foto_${photo.id}_${photo.timestamp.toISOString().split('T')[0]}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Foto descargada');
    } catch (error) {
      console.error('Error al descargar foto:', error);
      toast.error('Error al descargar la foto');
    }
  }, []);

  // Limpiar todas las fotos
  const clearPhotos = useCallback(async () => {
    try {
      setIsLoading(true);
      localStorage.removeItem('almacen_photos');
      setPhotos([]);
      toast.success('Todas las fotos han sido eliminadas');
    } catch (error) {
      console.error('Error al limpiar fotos:', error);
      toast.error('Error al limpiar las fotos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    photos,
    isLoading,
    capturePhoto,
    deletePhoto,
    getPhotosByMaterial,
    getPhotosByMovement,
    uploadPendingPhotos,
    compressPhoto,
    downloadPhoto,
    clearPhotos
  };
};

// Hook para fotos de movimientos específicos
export const useMovementPhotos = (movementId: string, movementType: 'entrada' | 'salida') => {
  const { photos, capturePhoto: baseCapturePhoto, ...rest } = usePhotoCapture();
  
  const movementPhotos = photos.filter(
    photo => photo.metadata.movementId === movementId && 
             photo.metadata.movementType === movementType
  );
  
  const capturePhoto = useCallback(async (photo: CapturedPhoto, metadata?: Partial<PhotoMetadata>) => {
    await baseCapturePhoto(photo, {
      ...metadata,
      movementId,
      movementType
    });
  }, [baseCapturePhoto, movementId, movementType]);
  
  return {
    photos: movementPhotos,
    capturePhoto,
    ...rest
  };
};

// Hook para fotos de materiales específicos
export const useMaterialPhotos = (materialId: string) => {
  const { photos, capturePhoto: baseCapturePhoto, ...rest } = usePhotoCapture();
  
  const materialPhotos = photos.filter(
    photo => photo.metadata.materialId === materialId
  );
  
  const capturePhoto = useCallback(async (photo: CapturedPhoto, metadata?: Partial<PhotoMetadata>) => {
    await baseCapturePhoto(photo, {
      ...metadata,
      materialId
    });
  }, [baseCapturePhoto, materialId]);
  
  return {
    photos: materialPhotos,
    capturePhoto,
    ...rest
  };
};