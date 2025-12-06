import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { almacenCentralService } from '../services/almacenCentralService';
import { supabase } from '../lib/supabase';
import type { Material } from '../types';
import type { EntradaMaterialDTO } from '../types/almacenCentral';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const EntradaMaterial: React.FC = () => {
    const navigate = useNavigate();
    const [materiales, setMateriales] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<EntradaMaterialDTO>({
        material_id: '',
        cantidad: 0,
        proveedor: '',
        numero_factura: '',
        costo_unitario: 0,
        motivo: ''
    });

    useEffect(() => {
        loadMateriales();
    }, []);

    const loadMateriales = async () => {
        try {
            const { data } = await supabase
                .from('materiales')
                .select('*')
                .order('nombre');
            setMateriales(data || []);
        } catch (error) {
            console.error('Error loading materials:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.material_id || formData.cantidad <= 0) {
            toast.error('Por favor complete los campos requeridos');
            return;
        }

        try {
            setLoading(true);
            await almacenCentralService.registrarEntrada(formData);
            toast.success('Entrada registrada exitosamente');

            // Reset form
            setFormData({
                material_id: '',
                cantidad: 0,
                proveedor: '',
                numero_factura: '',
                costo_unitario: 0,
                motivo: ''
            });

            // Navigate to inventory
            setTimeout(() => navigate('/almacen-central/inventario'), 1000);
        } catch (error: any) {
            toast.error(error.message || 'Error al registrar entrada');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Entrada de Material</h1>
                <p className="text-gray-600 mt-1">Registrar ingreso de material al almacén central</p>
            </div>

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Material */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Material <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.material_id}
                            onChange={(e) => setFormData({ ...formData, material_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Seleccione un material</option>
                            {materiales.map((mat) => (
                                <option key={mat.id} value={mat.id}>
                                    {mat.codigo} - {mat.nombre} ({mat.unidad})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Cantidad */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cantidad <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={formData.cantidad}
                            onChange={(e) => setFormData({ ...formData, cantidad: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Proveedor */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Proveedor
                        </label>
                        <input
                            type="text"
                            value={formData.proveedor}
                            onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Nombre del proveedor"
                        />
                    </div>

                    {/* Número de Factura */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Número de Factura
                        </label>
                        <input
                            type="text"
                            value={formData.numero_factura}
                            onChange={(e) => setFormData({ ...formData, numero_factura: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="F001-00001234"
                        />
                    </div>

                    {/* Costo Unitario */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Costo Unitario (S/)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.costo_unitario}
                            onChange={(e) => setFormData({ ...formData, costo_unitario: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                        />
                    </div>

                    {/* Motivo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Motivo / Observaciones
                        </label>
                        <textarea
                            value={formData.motivo}
                            onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Compra, donación, devolución, etc."
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                            {loading ? 'Registrando...' : 'Registrar Entrada'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/almacen-central/dashboard')}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default EntradaMaterial;
