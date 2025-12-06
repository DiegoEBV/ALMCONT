// Types for Central Warehouse System

import type { Material, Obra } from './index';

export interface StockAlmacenCentral {
    id: string;
    material_id: string;
    cantidad_disponible: number;
    cantidad_reservada: number;
    stock_minimo: number;
    stock_maximo?: number;
    ubicacion?: string;
    notas?: string;
    created_at: string;
    updated_at: string;
    // Relations
    material?: Material;
}

export interface MovimientoAlmacenCentral {
    id: string;
    material_id: string;
    tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA';
    cantidad: number;
    cantidad_anterior?: number;
    cantidad_nueva?: number;
    usuario_id?: string;
    obra_destino_id?: string;
    motivo?: string;
    documento_referencia?: string;
    proveedor?: string;
    numero_factura?: string;
    costo_unitario?: number;
    metadata?: Record<string, any>;
    fecha: string;
    created_at: string;
    // Relations
    material?: Material;
    obra_destino?: Obra;
    usuario?: {
        id: string;
        nombre: string;
        email: string;
    };
}

export interface TransferenciaPendiente {
    id: string;
    movimiento_salida_id?: string;
    material_id: string;
    obra_destino_id: string;
    cantidad_enviada: number;
    cantidad_recibida?: number;
    estado: 'PENDIENTE' | 'CONFIRMADA' | 'AJUSTADA' | 'RECHAZADA';
    usuario_envio_id?: string;
    usuario_recepcion_id?: string;
    fecha_envio: string;
    fecha_recepcion?: string;
    notas_envio?: string;
    notas_recepcion?: string;
    created_at: string;
    updated_at: string;
    // Relations
    material?: Material;
    obra_destino?: Obra;
    usuario_envio?: {
        id: string;
        nombre: string;
    };
    usuario_recepcion?: {
        id: string;
        nombre: string;
    };
}

// DTOs for API requests
export interface EntradaMaterialDTO {
    material_id: string;
    cantidad: number;
    proveedor?: string;
    numero_factura?: string;
    costo_unitario?: number;
    motivo?: string;
}

export interface SalidaMaterialDTO {
    material_id: string;
    cantidad: number;
    motivo?: string;
}

export interface TransferenciaMaterialDTO {
    material_id: string;
    cantidad: number;
    obra_destino_id: string;
    notas?: string;
}

export interface ConfirmarTransferenciaDTO {
    transferencia_id: string;
    cantidad_recibida: number;
    notas_recepcion?: string;
    estado: 'CONFIRMADA' | 'AJUSTADA' | 'RECHAZADA';
}

export interface MovimientoFilters {
    material_id?: string;
    tipo?: MovimientoAlmacenCentral['tipo'];
    obra_destino_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    limit?: number;
}

export interface StockFilters {
    bajo_stock?: boolean;
    sin_stock?: boolean;
    search?: string;
}
