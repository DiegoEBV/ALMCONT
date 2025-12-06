import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { almacenCentralService } from '../services/almacenCentralService';
import type { StockAlmacenCentral } from '../types/almacenCentral';
import {
    CubeIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

const InventarioCentral: React.FC = () => {
    const [stock, setStock] = useState<StockAlmacenCentral[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBajoStock, setFilterBajoStock] = useState(false);

    useEffect(() => {
        loadStock();
    }, [filterBajoStock]);

    const loadStock = async () => {
        try {
            setLoading(true);
            const data = await almacenCentralService.getStockCompleto({
                bajo_stock: filterBajoStock,
                search: searchTerm
            });
            setStock(data);
        } catch (error) {
            console.error('Error loading stock:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStock = stock.filter(item =>
        !searchTerm ||
        item.material?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.material?.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStockStatus = (item: StockAlmacenCentral) => {
        if (item.cantidad_disponible === 0) {
            return { color: 'red', label: 'Sin stock', icon: ExclamationTriangleIcon };
        }
        if (item.cantidad_disponible <= item.stock_minimo) {
            return { color: 'yellow', label: 'Stock bajo', icon: ExclamationTriangleIcon };
        }
        return { color: 'green', label: 'Stock OK', icon: CheckCircleIcon };
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
                <h1 className="text-3xl font-bold text-gray-900">Inventario Central</h1>
                <p className="text-gray-600 mt-1">
                    Gestión de stock del almacén central
                </p>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Filter buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilterBajoStock(!filterBajoStock)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterBajoStock
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Stock Bajo
                        </button>
                        <button
                            onClick={loadStock}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Actualizar
                        </button>
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Materiales</p>
                            <p className="text-2xl font-bold text-gray-900">{stock.length}</p>
                        </div>
                        <CubeIcon className="w-8 h-8 text-blue-500" />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Stock Bajo</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {stock.filter(s => s.cantidad_disponible <= s.stock_minimo && s.cantidad_disponible > 0).length}
                            </p>
                        </div>
                        <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Sin Stock</p>
                            <p className="text-2xl font-bold text-red-600">
                                {stock.filter(s => s.cantidad_disponible === 0).length}
                            </p>
                        </div>
                        <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                    </div>
                </Card>
            </div>

            {/* Stock Table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Material
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Código
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Disponible
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reservado
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Stock Mínimo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ubicación
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStock.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No se encontraron materiales
                                    </td>
                                </tr>
                            ) : (
                                filteredStock.map((item) => {
                                    const status = getStockStatus(item);
                                    const StatusIcon = status.icon;

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {item.material?.nombre || 'N/A'}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {item.material?.unidad || ''}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.material?.codigo || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {item.cantidad_disponible.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                                {item.cantidad_reservada.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                                {item.stock_minimo.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.ubicacion || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color === 'green' ? 'bg-green-100 text-green-800' :
                                                        status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                    }`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {status.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default InventarioCentral;
