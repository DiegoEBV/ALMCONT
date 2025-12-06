import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { almacenCentralService } from '../services/almacenCentralService';
import {
    CubeIcon,
    ArrowTrendingUpIcon,
    ExclamationTriangleIcon,
    TruckIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const AlmacenCentralDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        total_materiales: 0,
        valor_total_inventario: 0,
        materiales_bajo_stock: 0,
        transferencias_pendientes: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await almacenCentralService.getEstadisticas();
            setStats(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Materiales',
            value: stats.total_materiales,
            icon: CubeIcon,
            color: 'blue',
            link: '/almacen-central/inventario'
        },
        {
            title: 'Valor Inventario',
            value: `S/ ${stats.valor_total_inventario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
            icon: ChartBarIcon,
            color: 'green',
            link: '/almacen-central/inventario'
        },
        {
            title: 'Stock Bajo',
            value: stats.materiales_bajo_stock,
            icon: ExclamationTriangleIcon,
            color: 'yellow',
            link: '/almacen-central/inventario?filter=bajo_stock'
        },
        {
            title: 'Transferencias Pendientes',
            value: stats.transferencias_pendientes,
            icon: TruckIcon,
            color: 'purple',
            link: '/almacen-central/transferencias'
        }
    ];

    const getColorClasses = (color: string) => {
        const colors = {
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-green-50 text-green-600',
            yellow: 'bg-yellow-50 text-yellow-600',
            purple: 'bg-purple-50 text-purple-600'
        };
        return colors[color as keyof typeof colors] || colors.blue;
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
                <h1 className="text-3xl font-bold text-gray-900">Almacén Central</h1>
                <p className="text-gray-600 mt-1">
                    Gestión de inventario centralizado
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <Link key={stat.title} to={stat.link}>
                        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-full ${getColorClasses(stat.color)}`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link to="/almacen-central/entrada">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-green-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-50 rounded-full">
                                <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Registrar Entrada</h3>
                                <p className="text-sm text-gray-600">Ingresar material al almacén</p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link to="/almacen-central/transferencia">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-blue-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-full">
                                <TruckIcon className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Transferir a Obra</h3>
                                <p className="text-sm text-gray-600">Enviar material a obra</p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link to="/almacen-central/inventario">
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-purple-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-50 rounded-full">
                                <CubeIcon className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Ver Inventario</h3>
                                <p className="text-sm text-gray-600">Consultar stock disponible</p>
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Recent Activity Placeholder */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
                <div className="text-center py-8 text-gray-500">
                    <p>Los movimientos recientes aparecerán aquí</p>
                    <Link to="/almacen-central/movimientos" className="text-blue-600 hover:underline mt-2 inline-block">
                        Ver todos los movimientos →
                    </Link>
                </div>
            </Card>
        </div>
    );
};

export default AlmacenCentralDashboard;
