import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { 
  Package, 
  Search, 
  Plus, 
  Eye, 
  Check, 
  X, 
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  Handshake,
  Clock,
  ArrowUpDown,
  Building,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Bell
} from 'lucide-react';
import { LoanService, MaterialLoan, ThirdParty, LoanSummary, LoanAgreement } from '../services/loanService';
import LoanAlertDashboard from './LoanAlertDashboard';

type TabType = 'loans' | 'third-parties' | 'agreements' | 'alerts' | 'reports';

interface LoanFormData {
  tercero_id: string;
  obra_id: string;
  tipo_prestamo: 'prestamo_saliente' | 'prestamo_entrante' | 'intercambio';
  motivo: string;
  fecha_devolucion_programada: string;
  condiciones_devolucion: string;
  observaciones: string;
  detalles: Array<{
    material_id: string;
    cantidad_solicitada: number;
    condicion_entrega: 'nuevo' | 'usado_bueno' | 'usado_regular' | 'reparable';
    condicion_devolucion_esperada: 'mismo_estado' | 'usado_aceptable' | 'cualquier_estado';
    cantidad_devuelta: number;
    observaciones_detalle: string;
  }>;
}

interface ThirdPartyFormData {
  razon_social: string;
  ruc: string;
  tipo_tercero: 'contratista' | 'subcontratista' | 'proveedor' | 'cliente';
  contacto_principal: string;
  telefono: string;
  email: string;
  direccion: string;
  observaciones: string;
}

const LoanManagement: React.FC = () => {
  // Estados principales
  const [activeTab, setActiveTab] = useState<TabType>('loans');
  const [loans, setLoans] = useState<MaterialLoan[]>([]);
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);
  const [agreements, setAgreements] = useState<LoanAgreement[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<MaterialLoan | null>(null);
  const [selectedThirdParty, setSelectedThirdParty] = useState<ThirdParty | null>(null);
  const [loanSummary, setLoanSummary] = useState<LoanSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para modales
  const [showLoanDetailModal, setShowLoanDetailModal] = useState(false);
  const [showCreateLoanModal, setShowCreateLoanModal] = useState(false);
  const [showThirdPartyDetailModal, setShowThirdPartyDetailModal] = useState(false);
  const [showCreateThirdPartyModal, setShowCreateThirdPartyModal] = useState(false);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>('all');
  const [thirdPartyFilter, setThirdPartyFilter] = useState<string>('all');

  // Cargar datos
  const loadLoans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = {};
      if (loanTypeFilter !== 'all') {
        filters.tipo_prestamo = loanTypeFilter;
      }
      if (statusFilter !== 'all') {
        filters.estado = statusFilter;
      }
      if (thirdPartyFilter !== 'all') {
        filters.tercero_id = thirdPartyFilter;
      }

      const response = await LoanService.getMaterialLoans(filters);
      setLoans(response);
    } catch (error) {
      console.error('Error loading loans:', error);
      setError('Error al cargar los préstamos');
    } finally {
      setLoading(false);
    }
  };

  const loadThirdParties = async () => {
    try {
      const response = await LoanService.getThirdParties({ estado: 'activo' });
      setThirdParties(response);
    } catch (error) {
      console.error('Error loading third parties:', error);
      setError('Error al cargar los terceros');
    }
  };

  const loadAgreements = async () => {
    try {
      const response = await LoanService.getLoanAgreements();
      setAgreements(response);
    } catch (error) {
      console.error('Error loading agreements:', error);
      setError('Error al cargar los acuerdos');
    }
  };

  const loadLoanSummary = async () => {
    try {
      const data = await LoanService.getLoanSummary();
      setLoanSummary(data);
    } catch (err) {
      console.error('Error loading loan summary:', err);
    }
  };

  // Cargar datos según la pestaña activa
  useEffect(() => {
    if (activeTab === 'loans' || activeTab === 'reports') {
      loadLoans();
      loadLoanSummary();
      loadThirdParties();
    } else if (activeTab === 'third-parties') {
      loadThirdParties();
    } else if (activeTab === 'agreements') {
      loadAgreements();
      loadThirdParties();
    }
  }, [activeTab, statusFilter, loanTypeFilter, thirdPartyFilter]);

  // Handlers
  const handleViewLoanDetails = async (loan: MaterialLoan) => {
    setSelectedLoan(loan);
    setShowLoanDetailModal(true);
  };

  const handleViewThirdPartyDetails = async (thirdParty: ThirdParty) => {
    setSelectedThirdParty(thirdParty);
    setShowThirdPartyDetailModal(true);
  };

  const handleApproveLoan = async (loanId: string) => {
    try {
      await LoanService.approveLoan(loanId, 'current-user-id', 'Aprobado desde interfaz');
      await loadLoans();
      await loadLoanSummary();
      setShowLoanDetailModal(false);
    } catch (err) {
      console.error('Error approving loan:', err);
      setError('Error al aprobar el préstamo');
    }
  };

  const handleCreateLoan = async (formData: LoanFormData) => {
    try {
      const loanData = {
        tercero_id: formData.tercero_id,
        obra_id: formData.obra_id,
        tipo_prestamo: formData.tipo_prestamo,
        estado: 'solicitado' as const,
        motivo: formData.motivo,
        fecha_solicitud: new Date().toISOString(),
        fecha_devolucion_programada: formData.fecha_devolucion_programada,
        condiciones_devolucion: formData.condiciones_devolucion,
        observaciones: formData.observaciones,
        solicitado_por: 'current-user-id'
      };

      // Agregar propiedades faltantes a los detalles
      const detallesCompletos = formData.detalles.map(detalle => ({
        ...detalle,
        cantidad_devuelta: detalle.cantidad_devuelta || 0,
        condicion_devolucion_esperada: detalle.condicion_devolucion_esperada || 'mismo_estado'
      }));

      await LoanService.createMaterialLoan(loanData, detallesCompletos);
      await loadLoans();
      await loadLoanSummary();
      setShowCreateLoanModal(false);
    } catch (err) {
      console.error('Error creating loan:', err);
      setError('Error al crear el préstamo');
    }
  };

  const handleCreateThirdParty = async (formData: ThirdPartyFormData) => {
    try {
      await LoanService.createThirdParty({
        ...formData,
        estado: 'activo'
      });
      await loadThirdParties();
      setShowCreateThirdPartyModal(false);
    } catch (err) {
      console.error('Error creating third party:', err);
      setError('Error al crear el tercero');
    }
  };

  // Vista de Préstamos
  const LoansView: React.FC = () => {
    const filteredLoans = loans.filter(loan => {
      const matchesSearch = loan.numero_prestamo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           loan.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (loan.terceros as any)?.razon_social?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    return (
      <div className="space-y-6">
        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar préstamos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={loanTypeFilter}
            onChange={(e) => setLoanTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los tipos</option>
            <option value="prestamo_saliente">Préstamos Salientes</option>
            <option value="prestamo_entrante">Préstamos Entrantes</option>
            <option value="intercambio">Intercambios</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            <option value="solicitado">Solicitado</option>
            <option value="aprobado">Aprobado</option>
            <option value="entregado">Entregado</option>
            <option value="vencido">Vencido</option>
            <option value="devuelto_completo">Devuelto</option>
          </select>

          <Button onClick={() => setShowCreateLoanModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Préstamo
          </Button>
        </div>

        {/* Resumen de préstamos */}
        {loanSummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Préstamos Activos</p>
                  <p className="text-2xl font-bold text-blue-600">{loanSummary.prestamos_activos}</p>
                </div>
                <Handshake className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Préstamos Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">{loanSummary.prestamos_vencidos}</p>
                </div>
                <Clock className="w-8 h-8 text-red-600" />
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valor Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${loanSummary.valor_total_prestado.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Préstamos</p>
                  <p className="text-2xl font-bold text-gray-600">{loanSummary.total_prestamos}</p>
                </div>
                <Package className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </div>
        )}

        {/* Tabla de préstamos */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Cargando préstamos...</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tercero
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Entrega
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimiento
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{loan.numero_prestamo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{(loan.terceros as any)?.razon_social || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          loan.tipo_prestamo === 'prestamo_saliente' ? 'bg-red-100 text-red-800' :
                          loan.tipo_prestamo === 'prestamo_entrante' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {loan.tipo_prestamo === 'prestamo_saliente' ? 'Saliente' :
                           loan.tipo_prestamo === 'prestamo_entrante' ? 'Entrante' : 'Intercambio'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          loan.estado === 'solicitado' ? 'bg-yellow-100 text-yellow-800' :
                          loan.estado === 'aprobado' ? 'bg-blue-100 text-blue-800' :
                          loan.estado === 'entregado' ? 'bg-green-100 text-green-800' :
                          loan.estado === 'vencido' ? 'bg-red-100 text-red-800' :
                          loan.estado === 'devuelto_completo' ? 'bg-gray-100 text-gray-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {loan.estado.charAt(0).toUpperCase() + loan.estado.slice(1).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {loan.fecha_entrega ? new Date(loan.fecha_entrega).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {loan.fecha_devolucion_programada ? new Date(loan.fecha_devolucion_programada).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewLoanDetails(loan)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Vista de Terceros
  const ThirdPartiesView: React.FC = () => {
    const filteredThirdParties = thirdParties.filter(thirdParty => {
      const matchesSearch = thirdParty.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           thirdParty.ruc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           thirdParty.contacto_principal.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    return (
      <div className="space-y-6">
        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar terceros..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <Button onClick={() => setShowCreateThirdPartyModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Tercero
          </Button>
        </div>

        {/* Tabla de terceros */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Razón Social
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RUC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredThirdParties.map((thirdParty) => (
                  <tr key={thirdParty.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{thirdParty.razon_social}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {thirdParty.ruc}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        thirdParty.tipo_tercero === 'contratista' ? 'bg-blue-100 text-blue-800' :
                        thirdParty.tipo_tercero === 'subcontratista' ? 'bg-green-100 text-green-800' :
                        thirdParty.tipo_tercero === 'proveedor' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {thirdParty.tipo_tercero.charAt(0).toUpperCase() + thirdParty.tipo_tercero.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{thirdParty.contacto_principal}</div>
                      <div className="text-sm text-gray-500">{thirdParty.telefono}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        thirdParty.estado === 'activo' ? 'bg-green-100 text-green-800' :
                        thirdParty.estado === 'inactivo' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {thirdParty.estado.charAt(0).toUpperCase() + thirdParty.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewThirdPartyDetails(thirdParty)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Vista de Reportes
  const ReportsView: React.FC = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Préstamos Activos</p>
                <p className="text-2xl font-bold text-blue-600">{loanSummary?.prestamos_activos || 0}</p>
              </div>
              <Handshake className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Préstamos Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{loanSummary?.prestamos_vencidos || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Terceros Activos</p>
                <p className="text-2xl font-bold text-green-600">{thirdParties.length}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${(loanSummary?.valor_total_prestado || 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
        
        {/* Terceros más activos */}
        {loanSummary?.terceros_mas_activos && loanSummary.terceros_mas_activos.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Terceros Más Activos</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tercero
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Préstamos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loanSummary.terceros_mas_activos.map((tercero, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tercero.razon_social}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tercero.total_prestamos}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${tercero.valor_total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Componente Principal
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Préstamos</h1>
          <p className="text-gray-600">Administra préstamos de materiales con terceros</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { id: 'loans', label: 'Préstamos', icon: Handshake },
            { id: 'third-parties', label: 'Terceros', icon: Users },
            { id: 'agreements', label: 'Acuerdos', icon: FileText },
            { id: 'alerts', label: 'Alertas', icon: Bell },
            { id: 'reports', label: 'Reportes', icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'loans' && <LoansView />}
        {activeTab === 'third-parties' && <ThirdPartiesView />}
        {activeTab === 'alerts' && <LoanAlertDashboard />}
        {activeTab === 'reports' && <ReportsView />}
      </div>

      {/* Modal de Detalle de Préstamo */}
      {showLoanDetailModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalle del Préstamo {selectedLoan.numero_prestamo}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLoanDetailModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <span className="text-gray-600">Tercero:</span>
                  <div className="font-medium">{(selectedLoan.terceros as any)?.razon_social || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Estado:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${
                    selectedLoan.estado === 'solicitado' ? 'bg-yellow-100 text-yellow-800' :
                    selectedLoan.estado === 'aprobado' ? 'bg-blue-100 text-blue-800' :
                    selectedLoan.estado === 'entregado' ? 'bg-green-100 text-green-800' :
                    selectedLoan.estado === 'vencido' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedLoan.estado.charAt(0).toUpperCase() + selectedLoan.estado.slice(1).replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Tipo:</span>
                  <div className="font-medium">
                    {selectedLoan.tipo_prestamo === 'prestamo_saliente' ? 'Préstamo Saliente' :
                     selectedLoan.tipo_prestamo === 'prestamo_entrante' ? 'Préstamo Entrante' : 'Intercambio'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Valor Estimado:</span>
                  <div className="font-medium">
                    ${(selectedLoan.valor_total_estimado || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Motivo</h3>
                <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{selectedLoan.motivo}</p>
              </div>

              {selectedLoan.estado === 'solicitado' && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleApproveLoan(selectedLoan.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Aprobar
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Rechazar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Tercero */}
      {showThirdPartyDetailModal && selectedThirdParty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalle del Tercero
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowThirdPartyDetailModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Razón Social</label>
                    <p className="text-gray-900 font-medium">{selectedThirdParty.razon_social}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">RUC</label>
                    <p className="text-gray-900">{selectedThirdParty.ruc}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tipo</label>
                    <p className="text-gray-900">{selectedThirdParty.tipo_tercero}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Estado</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedThirdParty.estado === 'activo' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedThirdParty.estado}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Contacto Principal</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{selectedThirdParty.contacto_principal}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Teléfono</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{selectedThirdParty.telefono}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{selectedThirdParty.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {selectedThirdParty.direccion && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Dirección</label>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-900">{selectedThirdParty.direccion}</p>
                    </div>
                  </div>
                )}

                {selectedThirdParty.observaciones && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Observaciones</label>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-3 mt-1">{selectedThirdParty.observaciones}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManagement;