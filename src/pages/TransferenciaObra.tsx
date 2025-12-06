import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { almacenCentralService } from '../services/almacenCentralService';
import { supabase } from '../lib/supabase';
import type { Material, Obra } from '../types';
import type { TransferenciaMaterialDTO } from '../types/almacenCentral';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
    PlusCircleIcon,
    TrashIcon,
    PaperAirplaneIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

interface MaterialEnCarrito {
    material_id: string;
    material?: Material;
    cantidad: number;
    stock_disponible: number;
}

const TransferenciaObra: React.FC = () => {
    const navigate = useNavigate();
    const [materiales, setMateriales] = useState<Material[]>([]);
    const [obras, setObras] = useState<Obra[]>([]);
    const [loading, setLoading] = useState(false);
    const [obraSeleccionada, setObraSeleccionada] = useState('');
    const [notasGenerales, setNotasGenerales] = useState('');

    // Carrito de materiales
    const [carrito, setCarrito] = useState<MaterialEnCarrito[]>([]);

    // Formulario temporal para agregar material
    const [materialTemp, setMaterialTemp] = useState('');
    const [cantidadTemp, setCantidadTemp] = useState(0);
    const [stockDisponible, setStockDisponible] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (materialTemp) {
            loadStockDisponible(materialTemp);
        } else {
            setStockDisponible(0);
        }
    }, [materialTemp]);

    const loadData = async () => {
        try {
            const [materialesRes, obrasRes] = await Promise.all([
                supabase.from('materiales').select('*').order('nombre'),
                supabase.from('obras').select('*').order('nombre')
            ]);
            setMateriales(materialesRes.data || []);
            setObras(obrasRes.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const loadStockDisponible = async (materialId: string) => {
        try {
            const stock = await almacenCentralService.getStockMaterial(materialId);
            setStockDisponible(stock?.cantidad_disponible || 0);
        } catch (error) {
            console.error('Error loading stock:', error);
            setStockDisponible(0);
        }
    };

    const agregarAlCarrito = () => {
        if (!materialTemp || cantidadTemp <= 0) {
            toast.error('Seleccione un material y cantidad válida');
            return;
        }

        if (cantidadTemp > stockDisponible) {
            toast.error(`Stock insuficiente. Disponible: ${stockDisponible}`);
            return;
        }

        // Verificar si el material ya está en el carrito
        const yaExiste = carrito.find(item => item.material_id === materialTemp);
        if (yaExiste) {
            toast.error('Este material ya está en el carrito');
            return;
        }

        const material = materiales.find(m => m.id === materialTemp);

        setCarrito([...carrito, {
            material_id: materialTemp,
            material,
            cantidad: cantidadTemp,
            stock_disponible: stockDisponible
        }]);

        // Limpiar formulario temporal
        setMaterialTemp('');
        setCantidadTemp(0);
        setStockDisponible(0);

        toast.success('Material agregado al carrito');
    };

    const eliminarDelCarrito = (materialId: string) => {
        setCarrito(carrito.filter(item => item.material_id !== materialId));
        toast.info('Material eliminado del carrito');
    };

    const actualizarCantidad = (materialId: string, nuevaCantidad: number) => {
        const item = carrito.find(i => i.material_id === materialId);
        if (!item) return;

        if (nuevaCantidad > item.stock_disponible) {
            toast.error(`Stock insuficiente. Disponible: ${item.stock_disponible}`);
            return;
        }

        setCarrito(carrito.map(item =>
            item.material_id === materialId
                ? { ...item, cantidad: nuevaCantidad }
                : item
        ));
    };

    const enviarTransferencias = async () => {
        if (!obraSeleccionada) {
            toast.error('Seleccione una obra destino');
            return;
        }

        if (carrito.length === 0) {
            toast.error('Agregue al menos un material al carrito');
            return;
        }

        try {
            setLoading(true);

            // Enviar cada material del carrito
            for (const item of carrito) {
                await almacenCentralService.registrarTransferencia({
                    material_id: item.material_id,
                    cantidad: item.cantidad,
                    obra_destino_id: obraSeleccionada,
                    notas: notasGenerales
                });
            }

            toast.success(`${carrito.length} transferencia(s) registrada(s) exitosamente`);

            // Limpiar todo
            setCarrito([]);
            setObraSeleccionada('');
            setNotasGenerales('');

            setTimeout(() => navigate('/almacen-central/dashboard'), 1000);
        } catch (error: any) {
            toast.error(error.message || 'Error al registrar transferencias');
        } finally {
            setLoading(false);
        }
    };

    const totalMateriales = carrito.length;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Transferencia a Obra</h1>
                <p className="text-gray-600 mt-1">Enviar materiales del almacén central a una obra</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulario para agregar materiales */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Obra Destino */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Obra Destino</h3>
                        <select
                            value={obraSeleccionada}
                            onChange={(e) => setObraSeleccionada(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Seleccione una obra</option>
                            {obras.map((obra) => (
                                <option key={obra.id} value={obra.id}>
                                    {obra.nombre}
                                </option>
                            ))}
                        </select>
                    </Card>

                    {/* Agregar Material */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Agregar Material</h3>

                        <div className="space-y-4">
                            {/* Material */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Material
                                </label>
                                <select
                                    value={materialTemp}
                                    onChange={(e) => setMaterialTemp(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Seleccione un material</option>
                                    {materiales
                                        .filter(m => !carrito.find(c => c.material_id === m.id))
                                        .map((mat) => (
                                            <option key={mat.id} value={mat.id}>
                                                {mat.codigo} - {mat.nombre} ({mat.unidad})
                                            </option>
                                        ))}
                                </select>
                                {materialTemp && (
                                    <p className="mt-2 text-sm text-gray-600">
                                        Stock disponible: <span className="font-semibold text-blue-600">
                                            {stockDisponible.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </span>
                                    </p>
                                )}
                            </div>

                            {/* Cantidad */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cantidad
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={stockDisponible}
                                    value={cantidadTemp}
                                    onChange={(e) => setCantidadTemp(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Botón Agregar */}
                            <button
                                type="button"
                                onClick={agregarAlCarrito}
                                disabled={!materialTemp || cantidadTemp <= 0 || stockDisponible === 0}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                <PlusCircleIcon className="w-5 h-5" />
                                Agregar al Carrito
                            </button>
                        </div>
                    </Card>

                    {/* Notas Generales */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Notas / Observaciones</h3>
                        <textarea
                            value={notasGenerales}
                            onChange={(e) => setNotasGenerales(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Información adicional sobre la transferencia"
                        />
                    </Card>
                </div>

                {/* Carrito de Materiales */}
                <div className="lg:col-span-1">
                    <Card className="p-6 sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Carrito</h3>
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {totalMateriales} {totalMateriales === 1 ? 'material' : 'materiales'}
                            </span>
                        </div>

                        {carrito.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p className="text-sm">No hay materiales en el carrito</p>
                            </div>
                        ) : (
                            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                                {carrito.map((item) => (
                                    <div key={item.material_id} className="border border-gray-200 rounded-lg p-3">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {item.material?.nombre}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {item.material?.codigo}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => eliminarDelCarrito(item.material_id)}
                                                className="text-red-600 hover:text-red-700 p-1"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                max={item.stock_disponible}
                                                value={item.cantidad}
                                                onChange={(e) => actualizarCantidad(item.material_id, parseFloat(e.target.value) || 0)}
                                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                            <span className="text-xs text-gray-500">
                                                {item.material?.unidad}
                                            </span>
                                        </div>

                                        <p className="text-xs text-gray-500 mt-1">
                                            Disp: {item.stock_disponible.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Alert */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <p className="text-xs text-blue-800">
                                <strong>Nota:</strong> Se crearán pre-registros que el almacenero de la obra deberá confirmar.
                            </p>
                        </div>

                        {/* Botones */}
                        <div className="space-y-2">
                            <button
                                onClick={enviarTransferencias}
                                disabled={loading || carrito.length === 0 || !obraSeleccionada}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                            >
                                <PaperAirplaneIcon className="w-5 h-5" />
                                {loading ? 'Enviando...' : `Enviar ${totalMateriales} Material(es)`}
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/almacen-central/dashboard')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                                Cancelar
                            </button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TransferenciaObra;
