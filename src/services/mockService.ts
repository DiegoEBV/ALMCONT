import { DashboardStats } from './dashboardService';
import { Requerimiento } from '../types';

// Datos mock para el dashboard
export const mockDashboardStats: DashboardStats = {
  requerimientosPendientes: 12,
  stockBajo: 8,
  entradasMes: 45,
  salidasMes: 38
};

// Actividad reciente mock
export const mockRecentActivity = {
  requerimientos: [
    {
      id: '1',
      obra_id: 'obra-1',
      numero_rq: 'RQ-2024-001',
      fecha_solicitud: '2024-01-15',
      fecha_requerimiento: '2024-01-20',
      descripcion_actividad: 'Cemento Portland para cimentación',
      solicitante: 'Juan Pérez',
      area_solicitante: 'Construcción',
      material_id: 'mat-1',
      cantidad_solicitada: 50,
      unidad: 'sacos',
      especificaciones_tecnicas: 'Cemento Portland tipo I',
      justificacion: 'Requerido para cimentación',
      fecha_necesidad: '2024-01-25',
      prioridad: 'ALTA' as const,
      presupuesto_referencial: 2500,
      codigo_presupuesto: 'PRES-001',
      observaciones: 'Urgente para cronograma',
      estado: 'PENDIENTE' as const,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      created_by: 'user-1',
      actividad_descripcion: 'Cimentación edificio principal'
    },
    {
      id: '2',
      obra_id: 'obra-1',
      numero_rq: 'RQ-2024-002',
      fecha_solicitud: '2024-01-14',
      fecha_requerimiento: '2024-01-19',
      descripcion_actividad: 'Acero de refuerzo #4',
      solicitante: 'María García',
      area_solicitante: 'Estructura',
      material_id: 'mat-2',
      cantidad_solicitada: 100,
      unidad: 'varillas',
      especificaciones_tecnicas: 'Acero corrugado #4',
      justificacion: 'Para estructura de columnas',
      fecha_necesidad: '2024-01-24',
      prioridad: 'MEDIA' as const,
      presupuesto_referencial: 5000,
      codigo_presupuesto: 'PRES-002',
      observaciones: 'Verificar calidad',
      estado: 'ASIGNADO' as const,
      created_at: '2024-01-14T09:00:00Z',
      updated_at: '2024-01-14T09:00:00Z',
      created_by: 'user-2',
      actividad_descripcion: 'Estructura de columnas'
    },
    {
      id: '3',
      obra_id: 'obra-1',
      numero_rq: 'RQ-2024-003',
      fecha_solicitud: '2024-01-13',
      fecha_requerimiento: '2024-01-18',
      descripcion_actividad: 'Agregados para concreto',
      solicitante: 'Carlos López',
      area_solicitante: 'Concreto',
      material_id: 'mat-3',
      cantidad_solicitada: 20,
      unidad: 'm3',
      especificaciones_tecnicas: 'Agregado grueso y fino',
      justificacion: 'Para mezcla de concreto',
      fecha_necesidad: '2024-01-23',
      prioridad: 'BAJA' as const,
      presupuesto_referencial: 1500,
      codigo_presupuesto: 'PRES-003',
      observaciones: 'Coordinar entrega',
      estado: 'PENDIENTE' as const,
      created_at: '2024-01-13T08:00:00Z',
      updated_at: '2024-01-13T08:00:00Z',
      created_by: 'user-3',
      actividad_descripcion: 'Preparación de concreto'
    }
  ] as Requerimiento[],
  entradas: [
    {
      id: 'entry-1',
      numero_entrada: 'ENT-2024-001',
      fecha_entrada: new Date('2024-01-15').toISOString(),
      proveedor: 'Distribuidora Central',
      total_items: 25,
      usuario_responsable: {
        nombre_completo: 'Ana Martínez',
        email: 'ana.martinez@obra.com'
      }
    },
    {
      id: 'entry-2',
      numero_entrada: 'ENT-2024-002', 
      fecha_entrada: new Date('2024-01-14').toISOString(),
      proveedor: 'Ferretería Industrial',
      total_items: 18,
      usuario_responsable: {
        nombre_completo: 'Roberto Silva',
        email: 'roberto.silva@obra.com'
      }
    },
    {
      id: 'entry-3',
      numero_entrada: 'ENT-2024-003',
      fecha_entrada: new Date('2024-01-13').toISOString(), 
      proveedor: 'Materiales del Norte',
      total_items: 32,
      usuario_responsable: {
        nombre_completo: 'Luis Rodríguez',
        email: 'luis.rodriguez@obra.com'
      }
    }
  ]
};

// Usuario mock para autenticación
export const mockUser = {
  id: 'mock-user-1',
  email: 'coordinador@obra.com',
  nombre: 'Juan Carlos Coordinador',
  rol: 'COORDINACION' as const,
  obra_id: 'obra-1'
};

// Servicio de datos locales para el sistema de almacén
export const mockService = {
  // Simular obtención de estadísticas del dashboard
  async getStats(): Promise<DashboardStats> {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockDashboardStats;
  },

  // Simular obtención de actividad reciente
  async getRecentActivity() {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockRecentActivity;
  },

  // Simular autenticación de usuario
  async signIn(email: string, password: string) {
    // Simular delay de autenticación
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Validar credenciales mock
    const validCredentials = [
      { email: 'coordinador@obra.com', password: '123456' },
      { email: 'logistica@obra.com', password: '123456' },
      { email: 'almacenero@obra.com', password: '123456' }
    ];
    
    const isValid = validCredentials.some(
      cred => cred.email === email && cred.password === password
    );
    
    if (!isValid) {
      throw new Error('Credenciales inválidas');
    }
    
    return {
      user: {
        id: mockUser.id,
        email: email,
        user_metadata: {}
      },
      session: {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token'
      }
    };
  },

  // Simular obtención de datos del usuario
  async getUserData(userId: string) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      ...mockUser,
      email: userId === 'logistica@obra.com' ? 'logistica@obra.com' : 
             userId === 'almacenero@obra.com' ? 'almacenero@obra.com' : 
             mockUser.email,
      nombre: userId === 'logistica@obra.com' ? 'María Logística' :
              userId === 'almacenero@obra.com' ? 'Carlos Almacenero' :
              'Juan Carlos Coordinador',
      rol: userId === 'logistica@obra.com' ? 'LOGISTICA' as const :
           userId === 'almacenero@obra.com' ? 'ALMACENERO' as const :
           'COORDINACION' as const
    };
  }
};

// Flag para indicar si se están usando datos mock
export const isUsingMockData = true;