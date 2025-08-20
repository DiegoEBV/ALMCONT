import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Login from './components/auth/Login'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Requerimientos from './pages/Requerimientos'
import SolicitudesCompra from './pages/SolicitudesCompra'
import OrdenesCompra from './pages/OrdenesCompra'
import Entradas from './pages/Entradas'
import Salidas from './pages/Salidas'
import Stock from './pages/Stock'
import Reportes from './pages/Reportes'
import ApprovalWorkflowPage from './pages/ApprovalWorkflow'
import ReorderConfigurationPage from './pages/ReorderConfiguration'
import LocationManagerPage from './pages/LocationManager'
import CyclicInventoryPage from './pages/CyclicInventory'
import ReturnManagementPage from './pages/ReturnManagement'
import Templates from './pages/Templates'
import CoordinationDashboard from './pages/CoordinationDashboard'
import LogisticsDashboard from './pages/LogisticsDashboard'
import WarehouseDashboard from './pages/WarehouseDashboard'
import AdvancedAnalytics from './pages/AdvancedAnalytics'
import Perfil from './pages/Perfil'
import AdminObras from './pages/AdminObras'
import AdminUsuarios from './pages/AdminUsuarios'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Ruta de login */}
          <Route path="/login" element={<Login />} />
          
          {/* Rutas protegidas con layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard principal */}
            <Route index element={<Dashboard />} />
            
            {/* Módulo Oficina - Solo COORDINACION */}
            <Route
              path="oficina/requerimientos"
              element={
                <ProtectedRoute allowedRoles={['COORDINACION']}>
                  <Requerimientos />
                </ProtectedRoute>
              }
            />
            <Route
              path="oficina/dashboard"
              element={
                <ProtectedRoute allowedRoles={['COORDINACION']}>
                  <CoordinationDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Módulo Logística - Solo LOGISTICA */}
            <Route
              path="logistica/solicitudes-compra"
              element={
                <ProtectedRoute allowedRoles={['LOGISTICA']}>
                  <SolicitudesCompra />
                </ProtectedRoute>
              }
            />
            <Route
              path="logistica/ordenes-compra"
              element={
                <ProtectedRoute allowedRoles={['LOGISTICA']}>
                  <OrdenesCompra />
                </ProtectedRoute>
              }
            />
            <Route
              path="logistica/dashboard"
              element={
                <ProtectedRoute allowedRoles={['LOGISTICA']}>
                  <LogisticsDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Módulo Almacén - Solo ALMACENERO */}
            <Route
              path="almacen/entradas"
              element={
                <ProtectedRoute allowedRoles={['ALMACENERO']}>
                  <Entradas />
                </ProtectedRoute>
              }
            />
            <Route
              path="almacen/salidas"
              element={
                <ProtectedRoute allowedRoles={['ALMACENERO']}>
                  <Salidas />
                </ProtectedRoute>
              }
            />
            <Route
              path="almacen/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ALMACENERO']}>
                  <WarehouseDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Stock/Kardex - Todos los roles */}
            <Route path="stock/kardex" element={<Stock />} />
            
            {/* Funcionalidades Avanzadas */}
            <Route
              path="advanced/approvals"
              element={
                <ProtectedRoute allowedRoles={['COORDINACION', 'LOGISTICA']}>
                  <ApprovalWorkflowPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="advanced/reorder"
              element={
                <ProtectedRoute allowedRoles={['LOGISTICA', 'ALMACENERO']}>
                  <ReorderConfigurationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="advanced/locations"
              element={
                <ProtectedRoute allowedRoles={['ALMACENERO']}>
                  <LocationManagerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="advanced/cyclic-inventory"
              element={
                <ProtectedRoute allowedRoles={['ALMACENERO']}>
                  <CyclicInventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="advanced/returns"
              element={
                <ProtectedRoute allowedRoles={['ALMACENERO', 'LOGISTICA']}>
                  <ReturnManagementPage />
                </ProtectedRoute>
              }
            />
            
            {/* Reportes - Todos los roles */}
            <Route path="reportes" element={<Reportes />} />
            
            {/* Analytics Avanzado - Todos los roles */}
            <Route path="analytics" element={<AdvancedAnalytics />} />
            
            {/* Templates - Todos los roles */}
            <Route path="templates" element={<Templates />} />
            
            {/* Perfil - Todos los roles */}
            <Route path="perfil" element={<Perfil />} />
            
            {/* Administración - Solo COORDINACION */}
            <Route
              path="admin/obras"
              element={
                <ProtectedRoute allowedRoles={['COORDINACION']}>
                  <AdminObras />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/usuarios"
              element={
                <ProtectedRoute allowedRoles={['COORDINACION']}>
                  <AdminUsuarios />
                </ProtectedRoute>
              }
            />
          </Route>
          
          {/* Redirigir rutas no encontradas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
