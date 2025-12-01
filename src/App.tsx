import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Suspense, lazy } from 'react'
import LoadingOverlay from './components/ui/LoadingOverlay'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Login from './components/auth/Login'
import Layout from './components/layout/Layout'
import './App.css'

// Loading component
const LoadingSpinner = () => (<LoadingOverlay title="Cargando módulo" />)

// Lazy load pages

const RoleBasedDashboard = lazy(() => import('./components/RoleBasedDashboard'))
const Requerimientos = lazy(() => import('./pages/Requerimientos'))
const SolicitudesCompra = lazy(() => import('./pages/SolicitudesCompra'))
const OrdenesCompra = lazy(() => import('./pages/OrdenesCompra'))
const Entradas = lazy(() => import('./pages/Entradas'))
const Salidas = lazy(() => import('./pages/Salidas'))
const Stock = lazy(() => import('./pages/Stock'))
const Reportes = lazy(() => import('./pages/Reportes'))
const ApprovalWorkflowPage = lazy(() => import('./pages/ApprovalWorkflow'))
const ReorderConfigurationPage = lazy(() => import('./pages/ReorderConfiguration'))
const LocationManagerPage = lazy(() => import('./pages/LocationManager'))
const CyclicInventoryPage = lazy(() => import('./pages/CyclicInventory'))
const ReturnManagementPage = lazy(() => import('./pages/ReturnManagement'))
const LoanManagementPage = lazy(() => import('./pages/LoanManagement'))
const Templates = lazy(() => import('./pages/Templates'))
const CoordinationDashboard = lazy(() => import('./pages/CoordinationDashboard'))
const LogisticsDashboard = lazy(() => import('./pages/LogisticsDashboard'))
const WarehouseDashboard = lazy(() => import('./pages/WarehouseDashboard'))
const AdvancedAnalytics = lazy(() => import('./pages/AdvancedAnalytics'))
const GPSManagement = lazy(() => import('./pages/GPSManagement'))
const Perfil = lazy(() => import('./pages/Perfil'))
const AdminObras = lazy(() => import('./pages/AdminObras'))
const AdminUsuarios = lazy(() => import('./pages/AdminUsuarios'))
const ProductionDashboard = lazy(() => import('./pages/ProductionDashboard'))
const ResidentDashboard = lazy(() => import('./pages/ResidentDashboard'))
const CreateRequirement = lazy(() => import('./pages/CreateRequirement'))
const RequirementsTracking = lazy(() => import('./pages/RequirementsTracking'))
const Materiales = lazy(() => import('./pages/Materiales'))


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
              {/* Dashboard principal - Redirige automáticamente según el rol */}
              <Route index element={
                <Suspense fallback={<LoadingSpinner />}>
                  <RoleBasedDashboard />
                </Suspense>
              } />
              
              {/* Módulo Oficina - Solo COORDINACION */}
              <Route
                path="oficina/requerimientos"
                element={
                  <ProtectedRoute allowedRoles={['COORDINACION']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Requerimientos />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="oficina/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['COORDINACION']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <CoordinationDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              
              {/* Gestión de Materiales - Solo COORDINACION */}
              <Route
                path="materiales"
                element={
                  <ProtectedRoute allowedRoles={['COORDINACION']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Materiales />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              
              {/* Solicitudes de Compra - Accesible para COORDINACION y LOGISTICA */}
              <Route
                path="solicitudes-compra"
                element={
                  <ProtectedRoute allowedRoles={['COORDINACION', 'LOGISTICA']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <SolicitudesCompra />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              
              {/* Módulo Logística - Solo LOGISTICA */}
              <Route
                path="logistica/solicitudes-compra"
                element={
                  <ProtectedRoute allowedRoles={['COORDINACION','LOGISTICA']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <SolicitudesCompra />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="logistica/ordenes-compra"
                element={
                  <ProtectedRoute allowedRoles={['LOGISTICA']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <OrdenesCompra />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="logistica/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['LOGISTICA']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <LogisticsDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="logistica/gps-tracking"
                element={
                  <ProtectedRoute allowedRoles={['LOGISTICA']}>
                    <GPSManagement />
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
              
              {/* Módulo Producción - Solo PRODUCCION */}
              <Route
                path="produccion/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['PRODUCCION']}>
                    <ProductionDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="produccion/crear-requerimiento"
                element={
                  <ProtectedRoute allowedRoles={['PRODUCCION']}>
                    <CreateRequirement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="produccion/seguimiento"
                element={
                  <ProtectedRoute allowedRoles={['PRODUCCION']}>
                    <RequirementsTracking />
                  </ProtectedRoute>
                }
              />
              {/* Módulo Residente - Solo RESIDENTE */}
              <Route
                path="residente/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['RESIDENTE']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <ResidentDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              
              {/* Stock/Kardex - Todos los roles */}
              <Route path="stock/kardex" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Stock />
                </Suspense>
              } />
              
              {/* Funcionalidades Avanzadas */}
              <Route
                path="advanced/approvals"
                element={
                  <ProtectedRoute allowedRoles={['COORDINACION', 'LOGISTICA']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <ApprovalWorkflowPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="advanced/reorder"
                element={
                  <ProtectedRoute allowedRoles={['LOGISTICA', 'ALMACENERO']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <ReorderConfigurationPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="advanced/locations"
                element={
                  <ProtectedRoute allowedRoles={['ALMACENERO']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <LocationManagerPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="advanced/cyclic-inventory"
                element={
                  <ProtectedRoute allowedRoles={['ALMACENERO']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <CyclicInventoryPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="advanced/returns"
                element={
                  <ProtectedRoute allowedRoles={['ALMACENERO', 'LOGISTICA']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <ReturnManagementPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              
              {/* Gestión de Préstamos - ALMACENERO, LOGISTICA, COORDINACION */}
              <Route
                path="advanced/loans"
                element={
                  <ProtectedRoute allowedRoles={['ALMACENERO', 'LOGISTICA', 'COORDINACION']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <LoanManagementPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              
              {/* Reportes - Todos los roles */}
              <Route path="reportes" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Reportes />
                </Suspense>
              } />
              
              {/* Analytics Avanzado - Todos los roles */}
              <Route path="analytics" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <AdvancedAnalytics />
                </Suspense>
              } />
              
              {/* Templates - Todos los roles */}
              <Route path="templates" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Templates />
                </Suspense>
              } />
              
              {/* Perfil - Todos los roles */}
              <Route path="perfil" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Perfil />
                </Suspense>
              } />
              
              {/* Administración - Solo COORDINACION */}
              <Route
                path="admin/obras"
                element={
                  <ProtectedRoute allowedRoles={['COORDINACION']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <AdminObras />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/usuarios"
                element={
                  <ProtectedRoute allowedRoles={['COORDINACION']}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <AdminUsuarios />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
            </Route>
            
            {/* Redirigir rutas no encontradas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Toaster 
          position="top-right" 
          richColors 
          closeButton 
          duration={4000}
        />
    </AuthProvider>
  )
}

export default App
