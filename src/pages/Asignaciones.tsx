import React from 'react'

export default function Asignaciones() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asignaciones SC/OC</h1>
        <p className="text-gray-600">Módulo de Logística - Asignación de Solicitudes de Compra y Órdenes de Compra</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Módulo en Desarrollo</h3>
        <p className="text-gray-600">Este módulo será implementado próximamente.</p>
        <p className="text-sm text-gray-500 mt-2">Funcionalidades:</p>
        <ul className="text-sm text-gray-500 mt-2 space-y-1">
          <li>• Buscador por obra/proveedor/estado</li>
          <li>• Asignación de sc_numero, oc_numero, proveedor</li>
          <li>• Auditoría de cambios</li>
          <li>• Gestión de solicitudes de compra</li>
        </ul>
      </div>
    </div>
  )
}