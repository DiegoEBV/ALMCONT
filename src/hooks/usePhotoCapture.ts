import { useState, useCallback, useEffect } from 'react';
import { CapturedPhoto } from '../components/Camera';
import { offlineService } from '../services/offlineService';
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

  // Cargar fotos desde el almacenamiento local
  const loadPhotos = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedPhotos = await offlineService.getOfflinePhotos();
      const photosWithMetadata: StoredPhoto[] = storedPhotos.map(photo => ({
        ...photo,
        syncStatus: photo.uploaded ? 'synced' : 'pending'
      }));
      setPhotos(photosWithMetadata);
    } catch (error) {
      console.error('Error al cargar fotos:', error);
      toast.error('Error al cargar las fotos');
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

  // Capturar y almacenar foto
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
      
      // Guardar en almacenamiento local
      await offlineService.saveOfflinePhotoObject({
        id: storedPhoto.id,
        blob: storedPhoto.blob,
        dataUrl: storedPhoto.dataUrl,
        timestamp: storedPhoto.timestamp,
        metadata: storedPhoto.metadata,
        uploaded: false,
        synced: false
      });
      
      // Actualizar estado local
      setPhotos(prev => [...prev, storedPhoto]);
      
      toast.success('Foto guardada correctamente');
      
      // Intentar subir inmediatamente si hay conexión
      if (navigator.onLine) {
        uploadPendingPhotos();
      }
      
    } catch (error) {
      console.error('Error al capturar foto:', error);
      toast.error('Error al guardar la foto');
    } finally {
      setIsLoading(false);
    }
  }, [compressPhoto]);

  // Eliminar foto
  const deletePhoto = useCallback(async (photoId: string) => {
    try {
      setIsLoading(true);
      
      // Eliminar del almacenamiento local
      const allPhotos = await offlineService.getOfflinePhotos();
      const updatedPhotos = allPhotos.filter(p => p.id !== photoId);
      
      // Guardar lista actualizada
      await Promise.all(
        updatedPhotos.map(photo => 
          offlineService.saveOfflinePhotoObject(photo)
        )
      );
      
      // Actualizar estado local
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      
      toast.success('Foto eliminada');
      
    } catch (error) {
      console.error('Error al eliminar foto:', error);
      toast.error('Error al eliminar la foto');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Obtener fotos por material
  const getPhotosByMaterial = useCallback((materialId: string): StoredPhoto[] => {
    return photos.filter(photo => photo.metadata.materialId === materialId);
  }, [photos]);

  // Obtener fotos por movimiento
  const getPhotosByMovement = useCallback((movementId: string): StoredPhoto[] => {
    return photos.filter(photo => photo.metadata.movementId === movementId);
  }, [photos]);

  // Subir fotos pendientes
  const uploadPendingPhotos = useCallback(async () => {
    try {
      const pendingPhotos = photos.filter(p => p.syncStatus === 'pending');
      
      if (pendingPhotos.length === 0) {
        return;
      }
      
      setIsLoading(true);
      
      for (const photo of pendingPhotos) {
        try {
          // Simular subida a servidor (aquí iría la lógica real de subida)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Marcar como subida
          const updatedPhoto = {
            ...photo,
            uploaded: true,
            syncStatus: 'synced' as const
          };
          
          // Actualizar en almacenamiento local
          await offlineService.saveOfflinePhotoObject({
            id: updatedPhoto.id,
            blob: updatedPhoto.blob,
            dataUrl: updatedPhoto.dataUrl,
            timestamp: updatedPhoto.timestamp,
            metadata: {
              ...updatedPhoto.metadata,
              timestamp: updatedPhoto.timestamp
            },
            uploaded: true
          });
          
          // Actualizar estado local
          setPhotos(prev => 
            prev.map(p => p.id === photo.id ? updatedPhoto : p)
          );
          
        } catch (error) {
          console.error(`Error al subir foto ${photo.id}:`, error);
          
          // Marcar como error
          setPhotos(prev => 
            prev.map(p => 
              p.id === photo.id 
                ? { ...p, syncStatus: 'error' as const }
                : p
            )
          );
        }
      }
      
      const successCount = photos.filter(p => p.syncStatus === 'synced').length;
      const errorCount = photos.filter(p => p.syncStatus === 'error').length;
      
      if (successCount > 0) {
        toast.success(`${successCount} fotos sincronizadas`);
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} fotos con errores de sincronización`);
      }
      
    } catch (error) {
      console.error('Error al subir fotos:', error);
      toast.error('Error al sincronizar fotos');
    } finally {
      setIsLoading(false);
    }
  }, [photos]);

  // Descargar foto
  const downloadPhoto = useCallback((photo: StoredPhoto) => {
    try {
      const link = document.createElement('a');
      link.href = photo.dataUrl;
      
      // Crear nombre descriptivo
      const timestamp = photo.timestamp.toISOString().slice(0, 19).replace(/:/g, '-');
      const material = photo.metadata.materialId ? `_${photo.metadata.materialId}` : '';
      const movement = photo.metadata.movementType ? `_${photo.metadata.movementType}` : '';
      
      link.download = `foto${material}${movement}_${timestamp}.jpg`;
      
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
      
      // Limpiar almacenamiento local
      const allPhotos = await offlineService.getOfflinePhotos();
      await Promise.all(
        allPhotos.map(photo => 
          offlineService.deleteOfflinePhoto(photo.id)
        )
      );
      
      // Limpiar estado local
      setPhotos([]);
      
      toast.success('Todas las fotos eliminadas');
      
    } catch (error) {
      console.error('Error al limpiar fotos:', error);
      toast.error('Error al limpiar las fotos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar fotos al inicializar
  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

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

// Hook para gestionar fotos en un contexto específico (entrada/salida)
export const useMovementPhotos = (movementId: string, movementType: 'entrada' | 'salida') => {
  const photoCapture = usePhotoCapture();
  
  const captureMovementPhoto = useCallback(async (
    photo: CapturedPhoto,
    materialId: string,
    description?: string
  ) => {
    const metadata: PhotoMetadata = {
      materialId,
      movementId,
      movementType,
      description,
      timestamp: new Date()
    };
    
    await photoCapture.capturePhoto(photo, metadata);
  }, [photoCapture, movementId, movementType]);
  
  const movementPhotos = photoCapture.getPhotosByMovement(movementId);
  
  return {
    ...photoCapture,
    captureMovementPhoto,
    movementPhotos
  };
};

// Hook para gestionar fotos de un material específico
export const useMaterialPhotos = (materialId: string) => {
  const photoCapture = usePhotoCapture();
  
  const captureMaterialPhoto = useCallback(async (
    photo: CapturedPhoto,
    movementId?: string,
    movementType?: 'entrada' | 'salida',
    description?: string
  ) => {
    const metadata: PhotoMetadata = {
      materialId,
      movementId,
      movementType,
      description,
      timestamp: new Date()
    };
    
    await photoCapture.capturePhoto(photo, metadata);
  }, [photoCapture, materialId]);
  
  const materialPhotos = photoCapture.getPhotosByMaterial(materialId);
  
  return {
    ...photoCapture,
    captureMaterialPhoto,
    materialPhotos
  };
};