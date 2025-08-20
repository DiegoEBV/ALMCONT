import React from 'react';
import { Download, Trash2, Image as ImageIcon } from 'lucide-react';
import type { CapturedPhoto } from './Camera';

// Tipo unificado para fotos en la galería
export type GalleryPhoto = {
  id: string;
  dataUrl: string;
  timestamp: Date;
};

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  onDelete?: (photoId: string) => void;
  onDownload?: (photo: GalleryPhoto) => void;
  className?: string;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onDelete,
  onDownload,
  className = ''
}) => {
  if (photos.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No hay fotos capturadas</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {photos.map((photo) => (
        <div key={photo.id} className="relative group">
          <img
            src={photo.dataUrl}
            alt={`Foto ${photo.id}`}
            className="w-full h-24 object-cover rounded-lg border border-gray-200"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex space-x-2">
              {onDownload && (
                <button
                  onClick={() => onDownload(photo)}
                  className="p-1 bg-white rounded-full text-blue-600 hover:text-blue-800 transition-colors"
                  title="Descargar foto"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(photo.id)}
                  className="p-1 bg-white rounded-full text-red-600 hover:text-red-800 transition-colors"
                  title="Eliminar foto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
            {new Date(photo.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
};