import React, { useState, useEffect } from 'react'
import { Search, Package, CheckCircle, XCircle, Save, AlertTriangle, Camera as CameraIcon, Image } from 'lucide-react'
import { entradasService } from '../services/entradas'
import { solicitudesCompraService } from '../services/solicitudesCompra'
import { materialesService } from '../services/materiales'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { Camera } from '../components/Camera';
import { PhotoGallery, type GalleryPhoto } from '../components/PhotoGallery';
import { usePhotoCapture, type CapturedPhoto } from '../hooks/usePhotoCapture';
import { useAuth } from '../hooks/useAuth';
import { mapLocalIdToUUID } from '../utils/idMapper'


interface LineaSCParaEntrada {
  codigoMaterial: string
  nombreMaterial: string
  cantidadPedida: number
  cantidadAtendida: number
  atendido: boolean
  solicitante: string
  numeroRQ: string
  unidad: string
  proveedor?: string
}

export default function Entradas() {
  const { user } = useAuth()
  const [numeroSC, setNumeroSC] = useState('SC-01')
  const [lineasSC, setLineasSC] = useState<LineaSCParaEntrada[]>([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<LineaSCParaEntrada | null>(null)
  const [showPhotos, setShowPhotos] = useState<string | null>(null)
  const [obraSeleccionada, setObraSeleccionada] = useState('')
  const [fechaEntrada, setFechaEntrada] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')
  
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
       if (solicitud && solicitud.requerimientos && solicitud.requerimientos.length > 0) {
         const lineas = solicitud.requerimientos.map(req => ({
           codigoMaterial: req.material?.codigo || req.material_id || '',
           nombreMaterial: req.material?.nombre || req.descripcion || '',
           cantidadPedida: req.cantidad || 0,
           cantidadAtendida: 0,
           atendido: false,
           solicitante: req.solicitante || '',
           numeroRQ: req.numero_rq || '',
           unidad: req.material?.unidad || req.unidad || ''
         }))
         setLineasSC(lineas)
         toast.success(`Se encontraron ${lineas.length} requerimientos para SC: ${numeroSC}`)
       } else {
         setLineasSC([])
         toast.warning(`No se encontraron requerimientos para la SC: ${numeroSC}`)
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
    try {
      setGuardando(true)
      
      // Verificar que el usuario tenga obra asignada
      if (!user?.obra_id) {
        toast.error('No tienes una obra asignada. Contacta al coordinador para que te asigne una obra.')
        return
      }

      // Validaciones
      if (!obraSeleccionada.trim()) {
        toast.error('Debe seleccionar una obra')
        return
      }

      // Verificar que la obra seleccionada coincida con la obra asignada al usuario
      if (obraSeleccionada !== user.obra_id) {
        toast.error('Solo puedes registrar entradas para la obra que tienes asignada.')
        return
      }
      
      if (!fechaEntrada) {
        toast.error('Debe seleccionar una fecha de entrada')
        return
      }
      
      // Filtrar solo las líneas que tienen cantidad atendida
      const lineasConCantidad = lineasSC.filter(linea => linea.cantidadAtendida > 0)
      
      if (lineasConCantidad.length === 0) {
        toast.error('Debe ingresar al menos una cantidad atendida')
        return
      }

      // Generar número de entrada único
      const numeroEntrada = `ENT-${Date.now()}`
      
      // Función para verificar si un string es un UUID válido
      const isValidUUID = (str: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        return uuidRegex.test(str)
      }

      // Mapear IDs locales a UUIDs de Supabase (solo si no son UUIDs válidos)
      let obraUUID: string
      let usuarioUUID: string

      if (isValidUUID(obraSeleccionada)) {
        obraUUID = obraSeleccionada
      } else {
        const mappedObraUUID = await mapLocalIdToUUID(obraSeleccionada, 'obra')
        if (!mappedObraUUID) {
          throw new Error(`No se pudo mapear la obra con ID: ${obraSeleccionada}`)
        }
        obraUUID = mappedObraUUID
      }

      if (isValidUUID(user?.id || '')) {
        usuarioUUID = user?.id || ''
      } else {
        const mappedUsuarioUUID = await mapLocalIdToUUID(user?.id || '', 'usuario')
        if (!mappedUsuarioUUID) {
          throw new Error(`No se pudo mapear el usuario con ID: ${user?.id}`)
        }
        usuarioUUID = mappedUsuarioUUID
      }

      // Crear la entrada principal (cabecera)
       const nuevaEntrada = {
         numero_entrada: numeroEntrada,
         obra_id: obraUUID,
         fecha_entrada: fechaEntrada,
         proveedor: lineasConCantidad[0]?.proveedor || '',
         documento_referencia: numeroSC,
         observaciones: observaciones,
         estado: 'PENDIENTE',
         recibido_por: usuarioUUID
       }

      const entradaCreada = await entradasService.create(nuevaEntrada)
      
      if (!entradaCreada?.id) {
        throw new Error('No se pudo crear la entrada principal')
      }

      // Crear los items de entrada
      for (const linea of lineasConCantidad) {
        // Resolver material por código o por UUID
        let material = null as Awaited<ReturnType<typeof materialesService.getById>> | Awaited<ReturnType<typeof materialesService.getByCodigo>>
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (uuidRegex.test(linea.codigoMaterial)) {
          material = await materialesService.getById(linea.codigoMaterial)
        } else {
          material = await materialesService.getByCodigo(linea.codigoMaterial)
          if (!material && linea.nombreMaterial) {
            // Fallback: buscar por nombre con patrón
            const { data: mats } = await supabase
              .from('materiales')
              .select('*')
              .ilike('nombre', `%${linea.nombreMaterial}%`)
              .limit(1)
            material = mats?.[0] || null
          }
        }
        if (!material) {
          // Crear material mínimo si no existe
          const codigoGenerado = uuidRegex.test(linea.codigoMaterial)
            ? `AUTO-${Date.now()}`
            : (linea.codigoMaterial || `AUTO-${Date.now()}`)
          material = await materialesService.create({
            codigo: codigoGenerado,
            nombre: linea.nombreMaterial || codigoGenerado,
            descripcion: linea.nombreMaterial || undefined,
            categoria: 'Otros',
            unidad: linea.unidad || 'UND',
            precio_unitario: 0,
            activo: true
          })
        }

        const entradaItem = {
          entrada_id: entradaCreada.id,
          material_id: material.id, // Usar el UUID del material
          cantidad_recibida: linea.cantidadAtendida,
          cantidad_aceptada: linea.cantidadAtendida,
          precio_unitario: 0,
          estado: 'RECIBIDO'
        }

        // Crear el item en entrada_items
        const { error: itemError } = await supabase
          .from('entrada_items')
          .insert(entradaItem)
        
        if (itemError) {
          console.error('Error al crear item de entrada:', itemError)
          throw itemError
        }
      }

      toast.success('Entradas guardadas correctamente')
      
      // Mostrar resumen de fotos capturadas
      const totalPhotos = movementPhotos.length
      if (totalPhotos > 0) {
        toast.success(`Se capturaron ${totalPhotos} fotos del proceso de entrada`)
      }
      
      // Limpiar formulario
      setLineasSC([])
      setNumeroSC('')
      // Solo limpiar obra seleccionada si el usuario no tiene una obra asignada
      if (!user?.obra_id) {
        setObraSeleccionada('')
      }
      setObservaciones('')
      
    } catch (error) {
      console.error('Error al guardar entradas:', error)
      toast.error('Error al guardar entradas')
    } finally {
      setGuardando(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      buscarSC()
    }
  }

  // Efecto para pre-llenar la obra asignada al usuario
  useEffect(() => {
    if (user?.obra_id && !obraSeleccionada) {
      setObraSeleccionada(user.obra_id);
    }
  }, [user, obraSeleccionada]);

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

      {/* Información adicional de entrada */}
      {lineasSC.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información de Entrada</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Obra *
              </label>
              {user?.obra_id && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    <Package className="inline w-4 h-4 mr-1" />
                    Obra asignada: {user.obra_id}
                  </p>
                </div>
              )}
              <input
                type="text"
                value={obraSeleccionada}
                onChange={(e) => setObraSeleccionada(e.target.value)}
                disabled={!!user?.obra_id}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  user?.obra_id ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder={user?.obra_id ? 'Obra asignada automáticamente' : 'Código o nombre de obra'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Entrada *
              </label>
              <input
                type="date"
                value={fechaEntrada}
                onChange={(e) => setFechaEntrada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones adicionales"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

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
                  <tr key={`${linea.numeroRQ || 'rq'}-${linea.codigoMaterial || 'mat'}-${index}`} className="hover:bg-gray-50">
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
