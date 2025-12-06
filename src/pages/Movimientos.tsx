import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { almacenCentralService } from '../services/almacenCentralService';
import type { MovimientoAlmacenCentral } from '../types/almacenCentral';
import {
    ArrowRightOnRectangleIcon,
    ArrowLeftOnRectangleIcon,
    ArrowPathIcon,
    TruckIcon,
    FunnelIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Movimientos: React.FC = () => {
    const [movimientos, setMovimientos] = useState<MovimientoAlmacenCentral[]>([]);
    const [loading, setLoading] = useState(true);
    const [tipoFilter, setTipoFilter] = useState<string>('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    useEffect(() => {
        loadMovimientos();
    }, [tipoFilter, fechaDesde, fechaHasta]);

    const loadMovimientos = async () => {
        try {
            setLoading(true);
            const data = await almacenCentralService.getMovimientos({
                tipo: tipoFilter as any,
                fecha_desde: fechaDesde || undefined,
                fecha_hasta: fechaHasta || undefined,
                limit: 100
            });
            setMovimientos(data);
        } catch (error) {
            console.error('Error loading movements:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTipoIcon = (tipo: string) => {
        switch (tipo) {
            case 'ENTRADA':
                return ArrowRightOnRectangleIcon;
            case 'SALIDA':
                return ArrowLeftOnRectangleIcon;
            case 'TRANSFERENCIA':
                return TruckIcon;
            case 'AJUSTE':
                return ArrowPathIcon;
            default:
                return ArrowPathIcon;
        }
    };

    const getTipoColor = (tipo: string) => {
        switch (tipo) {
            case 'ENTRADA':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'SALIDA':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'TRANSFERENCIA':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'AJUSTE':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
        } catch {
            return dateString;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Movimientos</h1>
                <p className="text-gray-600 mt-1">
                    Historial de entradas, salidas y transferencias del almacén central
                </p>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <FunnelIcon className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Filtros</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Tipo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de Movimiento
                        </label>
                        <select
                            value={tipoFilter}
                            onChange={(e) => setTipoFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Todos</option>
                            <option value="ENTRADA">Entrada</option>
                            <option value="SALIDA">Salida</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                            <option value="AJUSTE">Ajuste</option>
                        </select>
                    </div>

                    {/* Fecha Desde */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Desde
                        </label>
                        <input
                            type="date"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Fecha Hasta */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Hasta
                        </label>
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                setTipoFilter('');
                                setFechaDesde('');
                                setFechaHasta('');
                            }}
                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <ArrowRightOnRectangleIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Entradas</p>
                            <p className="text-xl font-bold text-gray-900">
                                {movimientos.filter(m => m.tipo === 'ENTRADA').length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <ArrowLeftOnRectangleIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Salidas</p>
                            <p className="text-xl font-bold text-gray-900">
                                {movimientos.filter(m => m.tipo === 'SALIDA').length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <TruckIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Transferencias</p>
                            <p className="text-xl font-bold text-gray-900">
                                {movimientos.filter(m => m.tipo === 'TRANSFERENCIA').length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <ArrowPathIcon className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Ajustes</p>
                            <p className="text-xl font-bold text-gray-900">
                                {movimientos.filter(m => m.tipo === 'AJUSTE').length}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Movements List */}
            <Card>
                <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">
                        Historial de Movimientos ({movimientos.length})
                    </h3>
                </div>

                <div className="divide-y divide-gray-200">
                    {movimientos.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p>No se encontraron movimientos</p>
                        </div>
                    ) : (
                        movimientos.map((mov) => {
                            const TipoIcon = getTipoIcon(mov.tipo);

                            return (
                                <div key={mov.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`p-3 rounded-lg border ${getTipoColor(mov.tipo)}`}>
                                            <TipoIcon className="w-5 h-5" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-gray-900">
                                                        {mov.material?.nombre || 'Material desconocido'}
                                                    </h4>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {mov.material?.codigo || 'N/A'}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-gray-900">
                                                        {mov.tipo === 'ENTRADA' || mov.tipo === 'AJUSTE' ? '+' : '-'}
                                                        {mov.cantidad.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {mov.material?.unidad || ''}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <CalendarIcon className="w-4 h-4" />
                                                    <span>{formatDate(mov.fecha)}</span>
                                                </div>

                                                {mov.obra_destino && (
                                                    <div className="text-gray-600">
                                                        <span className="font-medium">Obra:</span> {mov.obra_destino.nombre}
                                                    </div>
                                                )}

                                                {mov.proveedor && (
                                                    <div className="text-gray-600">
                                                        <span className="font-medium">Proveedor:</span> {mov.proveedor}
                                                    </div>
                                                )}

                                                {mov.numero_factura && (
                                                    <div className="text-gray-600">
                                                        <span className="font-medium">Factura:</span> {mov.numero_factura}
                                                    </div>
                                                )}

                                                {mov.costo_unitario && mov.costo_unitario > 0 && (
                                                    <div className="text-gray-600">
                                                        <span className="font-medium">Costo Unit.:</span> S/ {mov.costo_unitario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                    </div>
                                                )}

                                                {mov.usuario && (
                                                    <div className="text-gray-600">
                                                        <span className="font-medium">Usuario:</span> {mov.usuario.nombre}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Stock Change */}
                                            {mov.cantidad_anterior !== null && mov.cantidad_nueva !== null && (
                                                <div className="mt-2 text-sm text-gray-500">
                                                    Stock: {mov.cantidad_anterior.toLocaleString('es-PE', { minimumFractionDigits: 2 })} → {mov.cantidad_nueva.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                </div>
                                            )}

                                            {/* Motivo */}
                                            {mov.motivo && (
                                                <div className="mt-2 text-sm text-gray-600 italic">
                                                    {mov.motivo}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Movimientos;
