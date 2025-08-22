import React, { useState } from 'react'
import { Search, Package, CheckCircle, XCircle, Save, AlertTriangle, Camera as CameraIcon, Image } from 'lucide-react'
import { entradasService } from '../services/entradas'
import { solicitudesCompraService } from '../services/solicitudesCompra'
import { toast } from 'sonner'
import { Camera } from '../components/Camera';
import { PhotoGallery, type GalleryPhoto } from '../components/PhotoGallery';
import { usePhotoCapture, type CapturedPhoto } from '../hooks/usePhotoCapture';
import type { SolicitudCompra } from '../types';

interface LineaSCParaEntrada {
  codigoMaterial: string
  nombreMaterial: string
  cantidadPedida: number
  cantidadAtendida: number
  atendido: boolean
  solicitante: string
  numeroRQ: string
  unidad: string
}

export default function Entradas() {
  const [numeroSC, setNumeroSC] = useState('SC-01')
  const [lineasSC, setLineasSC] = useState<LineaSCParaEntrada[]>([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<LineaSCParaEntrada | null>(null)
  const [showPhotos, setShowPhotos] = useState<string | null>(null)
  
  // Hook para gestionar fotos del movimiento de entrada
  const { photos: movementPhotos, capturePhoto, deletePhoto, downloadPhoto } = usePhotoCapture()

  const buscarSC = async () => {
    if (!numeroSC.trim()) {
      toast.error('Ingrese un número de Solicitud de Compra')
      return
    }

    setLoading(true)
    try {
      const solicitudes = await solicitudesCompraService.searchByNumeroSC(numeroSC.trim())
      const solicitud = solicitudes.length > 0 ? solicitudes[0] : null
       if (solicitud && solicitud.requerimientos) {
         const lineas = solicitud.requerimientos.map(req => ({
           codigoMaterial: req.material?.codigo || '',
           nombreMaterial: req.material?.nombre || '',
           cantidadPedida: req.cantidad_solicitada || 0,
           cantidadAtendida: 0,
           atendido: false,
           solicitante: req.solicitante || '',
           numeroRQ: req.numero_rq || '',
           unidad: req.material?.unidad || ''
         }))
         setLineasSC(lineas)
         if (lineas.length === 0) {
           toast.warning('No se encontraron requerimientos para esta SC')
         } else {
           toast.success(`Se encontraron ${lineas.length} requerimientos`)
         }
       } else {
         setLineasSC([])
         toast.warning('No se encontraron requerimientos para esta SC')
       }
    } catch (error) {
      console.error('Error al buscar SC:', error)
      toast.error(error instanceof Error ? error.message : 'Error al buscar la SC')
      setLineasSC([])
    } finally {
      setLoading(false)
    }
  }

  const actualizarLinea = (index: number, campo: 'cantidadAtendida' | 'atendido', valor: number | boolean) => {
    const nuevasLineas = [...lineasSC]
    if (campo === 'cantidadAtendida') {
      const cantidad = valor as number
      if (cantidad < 0) return
      if (cantidad > nuevasLineas[index].cantidadPedida) {
        toast.error('La cantidad atendida no puede ser mayor a la cantidad pedida')
        return
      }
      nuevasLineas[index].cantidadAtendida = cantidad
      nuevasLineas[index].atendido = cantidad > 0
    } else {
      nuevasLineas[index].atendido = valor as boolean
      if (!valor) {
        nuevasLineas[index].cantidadAtendida = 0
      }
    }
    setLineasSC(nuevasLineas)
  }

  const guardarEntradas = async () => {
    const lineasConEntrada = lineasSC.filter(l => l.cantidadAtendida > 0)
    
    if (lineasConEntrada.length === 0) {
      toast.error('Debe registrar al menos una entrada con cantidad mayor a 0')
      return
    }

    setGuardando(true)
    try {
      // Filtrar líneas con cantidad > 0
      const lineasConEntrada = lineasSC.filter(l => l.cantidadAtendida > 0)
      
      // Crear entradas para cada línea con cantidad > 0
      for (const linea of lineasConEntrada) {
        await entradasService.create({
          obra_id: 'obra-1', // TODO: obtener obra_id del contexto
          material_id: linea.codigoMaterial,
          cantidad_recibida: linea.cantidadAtendida,
          cantidad_atendida: linea.cantidadAtendida,
          fecha_recepcion: new Date().toISOString().split('T')[0],
          fecha_entrada: new Date().toISOString().split('T')[0],
          numero_sc: numeroSC,
          proveedor: 'Por definir',
          recibido_por: 'Usuario actual', // TODO: obtener del contexto de usuario
          observaciones: 'Entrada registrada desde módulo de entradas',
          usuario_id: 'user-1'
        })
      }
      toast.success(`Se registraron ${lineasConEntrada.length} entradas correctamente`)
      
      // Mostrar resumen de fotos capturadas
      const totalPhotos = movementPhotos.length
      if (totalPhotos > 0) {
        toast.success(`Se capturaron ${totalPhotos} fotos del proceso de entrada`)
      }
      
      // Limpiar formulario
      setNumeroSC('')
      setLineasSC([])
    } catch (error) {
      console.error('Error al guardar entradas:', error)
      toast.error('Error al guardar las entradas')
    } finally {
      setGuardando(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      buscarSC()
    }
  }

  // Funciones para manejo de fotos
  const handleCapturePhoto = (material: LineaSCParaEntrada) => {
    setSelectedMaterial(material)
    setShowCamera(true)
  }

  const handlePhotoCapture = async (photo: CapturedPhoto) => {
    if (!selectedMaterial) return
    
    try {
      await capturePhoto(photo, {
        materialId: selectedMaterial.codigoMaterial,
        description: `Entrada de ${selectedMaterial.nombreMaterial} - SC: ${numeroSC}`,
        movementType: 'entrada'
      })
      setShowCamera(false)
      setSelectedMaterial(null)
    } catch (error) {
      console.error('Error al capturar foto:', error)
      toast.error('Error al guardar la foto')
    }
  }

  const getMaterialPhotos = (codigoMaterial: string) => {
    return movementPhotos.filter(photo => photo.metadata.materialId === codigoMaterial)
  }

  // Adaptador para convertir StoredPhoto a GalleryPhoto
  const adaptPhotosForGallery = (materialId: string): GalleryPhoto[] => {
    return getMaterialPhotos(materialId).map(photo => ({
      id: photo.id,
      dataUrl: photo.dataUrl,
      timestamp: photo.timestamp
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Entradas de Almacén</h1>
        <p className="text-gray-600">Registro de entradas de materiales por Solicitud de Compra</p>
      </div>

      {/* Búsqueda por SC */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Search className="h-5 w-5 mr-2" />
          Buscar Solicitud de Compra
        </h3>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Solicitud de Compra
            </label>
            <input
              type="text"
              value={numeroSC}
              onChange={(e) => setNumeroSC(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ej: SC-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={buscarSC}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de materiales */}
      {lineasSC.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Materiales de la SC: {numeroSC}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {lineasSC.length} materiales encontrados
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° RQ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solicitante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cant. Pedida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cant. Atendida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fotos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lineasSC.map((linea, index) => (
                  <tr key={`${linea.numeroRQ}-${linea.codigoMaterial}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {linea.codigoMaterial}
                        </div>
                        <div className="text-sm text-gray-500">
                          {linea.nombreMaterial}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {linea.numeroRQ}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {linea.solicitante}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {linea.cantidadPedida.toLocaleString()} {linea.unidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        max={linea.cantidadPedida}
                        step="0.01"
                        value={linea.cantidadAtendida}
                        onChange={(e) => actualizarLinea(index, 'cantidadAtendida', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-500">{linea.unidad}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => actualizarLinea(index, 'atendido', !linea.atendido)}
                          className={`flex items-center px-2 py-1 rounded text-xs font-medium ${
                            linea.atendido
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {linea.atendido ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {linea.atendido ? 'Atendido' : 'No Atendido'}
                        </button>
                        {linea.cantidadAtendida > linea.cantidadPedida && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleCapturePhoto(linea)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                          title="Capturar foto del material"
                        >
                          <CameraIcon className="h-4 w-4" />
                        </button>
                        {getMaterialPhotos(linea.codigoMaterial).length > 0 && (
                          <button
                            onClick={() => setShowPhotos(showPhotos === linea.codigoMaterial ? null : linea.codigoMaterial)}
                            className="flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
                            title="Ver fotos capturadas"
                          >
                            <Image className="h-3 w-3 mr-1" />
                            {getMaterialPhotos(linea.codigoMaterial).length}
                          </button>
                        )}
                      </div>
                      {showPhotos === linea.codigoMaterial && (
                        <div className="mt-2">
                          <PhotoGallery
                            photos={adaptPhotosForGallery(linea.codigoMaterial)}
                            onDelete={deletePhoto}
                            onDownload={(photo) => downloadPhoto(getMaterialPhotos(linea.codigoMaterial).find(p => p.id === photo.id)!)}
                            className="max-w-md"
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {lineasSC.filter(l => l.cantidadAtendida > 0).length} de {lineasSC.length} materiales con entrada registrada
              </div>
              <button
                onClick={guardarEntradas}
                disabled={guardando || lineasSC.filter(l => l.cantidadAtendida > 0).length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {guardando ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Entradas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!loading && lineasSC.length === 0 && numeroSC && (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron materiales</h3>
          <p className="text-gray-600">Verifique el número de Solicitud de Compra e intente nuevamente.</p>
        </div>
      )}

      {/* Componente de Cámara */}
      {showCamera && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Capturar foto - {selectedMaterial.nombreMaterial}
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
  )
}