import React, { useState, useEffect } from 'react';
import { Search, Package, User, FileText, AlertCircle, CheckCircle, Camera as CameraIcon, Image, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { almacenService, type StockMaterial, type SalidaAlmacen } from '../services/almacenService';
import { requerimientosService } from '../services/requerimientos';
import { useAuth } from '../hooks/useAuth';
import { Camera } from '../components/Camera';
import { PhotoGallery, type GalleryPhoto } from '../components/PhotoGallery';
import { usePhotoCapture } from '../hooks/usePhotoCapture';
import type { CapturedPhoto } from '../hooks/usePhotoCapture';

const Salidas: React.FC = () => {
  const { user } = useAuth();
  const [filtros, setFiltros] = useState({
    solicitante: '',
    numeroRequerimiento: '',
    material: ''
  });
  const [stockDisponible, setStockDisponible] = useState<StockMaterial[]>([]);
  const [materialesDisponibles, setMaterialesDisponibles] = useState<StockMaterial[]>([]);
  const [materialSeleccionado, setMaterialSeleccionado] = useState<StockMaterial | null>(null);
  const [cantidadSalida, setCantidadSalida] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [solicitantes, setSolicitantes] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<StockMaterial | null>(null);
  const [showPhotos, setShowPhotos] = useState<string | null>(null);
  
  // Hook para manejo de fotos
  const movementId = `salida-${Date.now()}`;
  const { photos, capturePhoto, deletePhoto, downloadPhoto } = usePhotoCapture();

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      const [stock, requerimientos] = await Promise.all([
        almacenService.getMaterialesDisponibles(),
        requerimientosService.getAll()
      ]);
      
      setStockDisponible(stock);
      setMaterialesDisponibles(stock);
      
      // Extraer solicitantes únicos
      const solicitantesUnicos = [...new Set(requerimientos.map(r => r.solicitante).filter(Boolean))] as string[]
      setSolicitantes(solicitantesUnicos);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar los datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let materialesFiltrados = stockDisponible;

    if (filtros.material) {
      materialesFiltrados = materialesFiltrados.filter(m => 
        m.descripcion.toLowerCase().includes(filtros.material.toLowerCase()) ||
        m.codigo.toLowerCase().includes(filtros.material.toLowerCase())
      );
    }

    setMaterialesDisponibles(materialesFiltrados);
  };

  const seleccionarMaterial = (material: StockMaterial) => {
    setMaterialSeleccionado(material);
    setCantidadSalida('');
    setObservaciones('');
  };

  // Funciones para manejo de fotos
  const handleCapturePhoto = (material: StockMaterial) => {
    setSelectedMaterial(material);
    setShowCamera(true);
  };

  const handlePhotoCapture = async (photo: CapturedPhoto) => {
    if (selectedMaterial) {
      await capturePhoto(photo, {
        materialId: selectedMaterial.codigo,
        movementType: 'salida',
        description: `Salida de ${selectedMaterial.descripcion}`,
        timestamp: new Date()
      });
      toast.success('Foto capturada correctamente');
    }
    setShowCamera(false);
    setSelectedMaterial(null);
  };

  const getMaterialPhotos = (materialCode: string) => {
    return photos.filter(photo => photo.metadata.materialId === materialCode);
  };

  // Adaptador para convertir StoredPhoto a GalleryPhoto
  const adaptPhotosForGallery = (materialCode: string): GalleryPhoto[] => {
    return getMaterialPhotos(materialCode).map(photo => ({
      id: photo.id,
      dataUrl: photo.dataUrl,
      timestamp: photo.timestamp
    }));
  };

  const registrarSalida = async () => {
    if (!materialSeleccionado || !filtros.solicitante || !cantidadSalida) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    const cantidad = parseFloat(cantidadSalida);
    if (isNaN(cantidad) || cantidad <= 0) {
      toast.error('Ingrese una cantidad válida');
      return;
    }

    if (cantidad > materialSeleccionado.stockActual) {
      toast.error(`Stock insuficiente. Disponible: ${materialSeleccionado.stockActual} ${materialSeleccionado.unidad}`);
      return;
    }

    try {
      setLoading(true);
      
      const salida: Omit<SalidaAlmacen, 'id'> = {
        materialId: materialSeleccionado.materialId,
        codigoMaterial: materialSeleccionado.codigo,
        descripcionMaterial: materialSeleccionado.descripcion,
        cantidad: cantidad,
        unidad: materialSeleccionado.unidad,
        solicitante: filtros.solicitante,
        numeroRequerimiento: filtros.numeroRequerimiento || undefined,
        observaciones: observaciones || undefined,
        fechaSalida: new Date().toISOString(),
        registradoPor: user?.email || 'Sistema'
      };

      await almacenService.registrarSalida(salida);
      
      // Actualizar stock
      await cargarDatosIniciales();
      
      // Mostrar información sobre fotos capturadas
      const materialPhotos = getMaterialPhotos(materialSeleccionado.codigo);
      if (materialPhotos.length > 0) {
        toast.success(`Salida registrada correctamente. Se capturaron ${materialPhotos.length} foto(s) del material.`);
      } else {
        toast.success('Salida registrada correctamente');
      }
      
      // Limpiar formulario
      setMaterialSeleccionado(null);
      setCantidadSalida('');
      setObservaciones('');
    } catch (error) {
      console.error('Error al registrar salida:', error);
      toast.error('Error al registrar la salida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Package className="h-6 w-6" />
          Salidas de Almacén
        </h1>
        
        {/* Filtros */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Filtros de Búsqueda</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Solicitante *
              </label>
              <select
                value={filtros.solicitante}
                onChange={(e) => setFiltros(prev => ({ ...prev, solicitante: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar solicitante</option>
                {solicitantes.map(solicitante => (
                  <option key={solicitante} value={solicitante}>{solicitante}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="inline h-4 w-4 mr-1" />
                Número de Requerimiento
              </label>
              <input
                type="text"
                value={filtros.numeroRequerimiento}
                onChange={(e) => setFiltros(prev => ({ ...prev, numeroRequerimiento: e.target.value }))}
                placeholder="RQ-2024-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="inline h-4 w-4 mr-1" />
                Buscar Material
              </label>
              <input
                type="text"
                value={filtros.material}
                onChange={(e) => setFiltros(prev => ({ ...prev, material: e.target.value }))}
                placeholder="Código o descripción"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyUp={aplicarFiltros}
              />
            </div>
          </div>
        </div>

        {/* Stock Disponible */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Stock Disponible</h2>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Cargando stock...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Actual</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fotos</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {materialesDisponibles.map((material) => (
                    <tr key={material.materialId} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {material.codigo}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {material.descripcion}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`font-semibold ${
                          material.stockActual > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {material.stockActual}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {material.unidad}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {material.stockActual > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Disponible
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Sin Stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleCapturePhoto(material)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                            title="Capturar foto del material"
                          >
                            <CameraIcon className="h-4 w-4" />
                          </button>
                          {getMaterialPhotos(material.codigo).length > 0 && (
                            <button
                              onClick={() => setShowPhotos(showPhotos === material.codigo ? null : material.codigo)}
                              className="flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
                              title="Ver fotos capturadas"
                            >
                              <Image className="h-3 w-3 mr-1" />
                              {getMaterialPhotos(material.codigo).length}
                            </button>
                          )}
                        </div>
                        {showPhotos === material.codigo && (
                          <div className="mt-2">
                            <PhotoGallery
                              photos={adaptPhotosForGallery(material.codigo)}
                              onDelete={deletePhoto}
                              onDownload={(photo) => downloadPhoto(getMaterialPhotos(material.codigo).find(p => p.id === photo.id)!)}
                              className="max-w-md"
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => seleccionarMaterial(material)}
                          disabled={material.stockActual <= 0 || !filtros.solicitante}
                          className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          Seleccionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {materialesDisponibles.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No se encontraron materiales con stock disponible</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Formulario de Salida */}
        {materialSeleccionado && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">Registrar Salida</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Material Seleccionado</label>
                <div className="bg-white p-3 rounded border">
                  <p className="font-medium">{materialSeleccionado.codigo}</p>
                  <p className="text-sm text-gray-600">{materialSeleccionado.descripcion}</p>
                  <p className="text-sm text-green-600">Stock disponible: {materialSeleccionado.stockActual} {materialSeleccionado.unidad}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad a Entregar *</label>
                <input
                  type="number"
                  value={cantidadSalida}
                  onChange={(e) => setCantidadSalida(e.target.value)}
                  max={materialSeleccionado.stockActual}
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Motivo de la salida, destino, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={registrarSalida}
                disabled={loading || !cantidadSalida || parseFloat(cantidadSalida) <= 0}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Registrar Salida
              </button>
              
              <button
                onClick={() => setMaterialSeleccionado(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Componente de Cámara */}
      {showCamera && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Capturar foto - {selectedMaterial.descripcion}
              </h3>
              <button
                onClick={() => {
                  setShowCamera(false);
                  setSelectedMaterial(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <Camera
              onCapture={handlePhotoCapture}
              onClose={() => {
                setShowCamera(false);
                setSelectedMaterial(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Salidas;