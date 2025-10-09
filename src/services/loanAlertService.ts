import { supabase } from '../lib/supabase';
import { LoanService, LoanAlert } from './loanService';
import { notificationService } from './notificationService';

export interface LoanAlertConfig {
  id: string;
  userId: string;
  alertasVencimiento: boolean;
  diasAnticipacion: number;
  alertasPrestamosVencidos: boolean;
  alertasDevolucionesParciales: boolean;
  alertasCondicionInadecuada: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  horariosActivos: {
    inicio: string;
    fin: string;
    diasSemana: number[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanNotificationAlert {
  id: string;
  type: 'vencimiento_proximo' | 'prestamo_vencido' | 'devolucion_parcial' | 'condicion_inadecuada';
  title: string;
  message: string;
  data: {
    prestamoId: string;
    numeroPrestamo: string;
    terceroNombre: string;
    fechaVencimiento?: string;
    diasVencido?: number;
  };
  userId: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  expiresAt?: Date;
}

class LoanAlertService {
  private checkInterval: NodeJS.Timeout | null = null;
  private subscribers = new Map<string, (alerts: LoanNotificationAlert[]) => void>();

  // Inicializar el servicio de alertas
  async initialize(): Promise<void> {
    // Verificar alertas cada 30 minutos
    this.checkInterval = setInterval(() => {
      this.checkAllLoanAlerts();
    }, 30 * 60 * 1000);

    // Verificar inmediatamente al inicializar
    await this.checkAllLoanAlerts();
  }

  // Obtener configuración de alertas para un usuario
  async getAlertConfig(userId: string): Promise<LoanAlertConfig | null> {
    const configKey = `loan_alert_config_${userId}`;
    const stored = localStorage.getItem(configKey);
    
    if (!stored) return null;
    
    const config = JSON.parse(stored);
    return {
      ...config,
      createdAt: new Date(config.createdAt),
      updatedAt: new Date(config.updatedAt)
    };
  }

  // Guardar configuración de alertas
  async saveAlertConfig(config: Partial<LoanAlertConfig> & { userId: string }): Promise<void> {
    const existing = await this.getAlertConfig(config.userId);
    const now = new Date().toISOString();

    const fullConfig: LoanAlertConfig = {
      id: existing?.id || crypto.randomUUID(),
      userId: config.userId,
      alertasVencimiento: config.alertasVencimiento ?? existing?.alertasVencimiento ?? true,
      diasAnticipacion: config.diasAnticipacion ?? existing?.diasAnticipacion ?? 3,
      alertasPrestamosVencidos: config.alertasPrestamosVencidos ?? existing?.alertasPrestamosVencidos ?? true,
      alertasDevolucionesParciales: config.alertasDevolucionesParciales ?? existing?.alertasDevolucionesParciales ?? true,
      alertasCondicionInadecuada: config.alertasCondicionInadecuada ?? existing?.alertasCondicionInadecuada ?? true,
      emailNotifications: config.emailNotifications ?? existing?.emailNotifications ?? false,
      pushNotifications: config.pushNotifications ?? existing?.pushNotifications ?? true,
      horariosActivos: config.horariosActivos ?? existing?.horariosActivos ?? {
        inicio: '08:00',
        fin: '18:00',
        diasSemana: [1, 2, 3, 4, 5]
      },
      createdAt: existing?.createdAt || new Date(now),
      updatedAt: new Date(now)
    };

    const configKey = `loan_alert_config_${config.userId}`;
    localStorage.setItem(configKey, JSON.stringify(fullConfig));
  }

  // Obtener alertas de préstamos para un usuario
  async getLoanAlerts(userId: string, unreadOnly: boolean = false): Promise<LoanNotificationAlert[]> {
    const alertsKey = `loan_alerts_${userId}`;
    const stored = localStorage.getItem(alertsKey);
    
    if (!stored) return [];
    
    const alerts: LoanNotificationAlert[] = JSON.parse(stored);
    
    // Filtrar alertas expiradas
    const now = new Date();
    const validAlerts = alerts.filter(alert => 
      !alert.expiresAt || new Date(alert.expiresAt) > now
    );
    
    // Actualizar localStorage si se filtraron alertas
    if (validAlerts.length !== alerts.length) {
      localStorage.setItem(alertsKey, JSON.stringify(validAlerts));
    }
    
    return unreadOnly ? validAlerts.filter(alert => !alert.read) : validAlerts;
  }

  // Crear nueva alerta de préstamo
  async createLoanAlert(alert: Omit<LoanNotificationAlert, 'id' | 'createdAt'>): Promise<void> {
    const alertsKey = `loan_alerts_${alert.userId}`;
    const stored = localStorage.getItem(alertsKey);
    const alerts: LoanNotificationAlert[] = stored ? JSON.parse(stored) : [];
    
    const fullAlert: LoanNotificationAlert = {
      ...alert,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };
    
    alerts.unshift(fullAlert);
    
    // Mantener solo las últimas 50 alertas de préstamos
    if (alerts.length > 50) {
      alerts.splice(50);
    }
    
    localStorage.setItem(alertsKey, JSON.stringify(alerts));

    // Mostrar notificación si está habilitada
    await this.showLoanNotification(fullAlert);

    // Notificar a suscriptores
    this.notifySubscribers(alert.userId);
  }

  // Marcar alerta como leída
  async markAsRead(alertId: string, userId: string): Promise<void> {
    const alertsKey = `loan_alerts_${userId}`;
    const stored = localStorage.getItem(alertsKey);
    
    if (!stored) return;
    
    const alerts: LoanNotificationAlert[] = JSON.parse(stored);
    const updatedAlerts = alerts.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    );
    
    localStorage.setItem(alertsKey, JSON.stringify(updatedAlerts));
    this.notifySubscribers(userId);
  }

  // Marcar todas las alertas como leídas
  async markAllAsRead(userId: string): Promise<void> {
    const alertsKey = `loan_alerts_${userId}`;
    const stored = localStorage.getItem(alertsKey);
    
    if (!stored) return;
    
    const alerts: LoanNotificationAlert[] = JSON.parse(stored);
    const updatedAlerts = alerts.map(alert => ({ ...alert, read: true }));
    
    localStorage.setItem(alertsKey, JSON.stringify(updatedAlerts));
    this.notifySubscribers(userId);
  }

  // Contar alertas no leídas
  async countUnreadAlerts(userId: string): Promise<number> {
    const alerts = await this.getLoanAlerts(userId, true);
    return alerts.length;
  }

  // Suscribirse a cambios de alertas
  subscribe(userId: string, callback: (alerts: LoanNotificationAlert[]) => void): () => void {
    this.subscribers.set(userId, callback);
    
    // Enviar alertas actuales inmediatamente
    this.getLoanAlerts(userId).then(callback);
    
    return () => {
      this.subscribers.delete(userId);
    };
  }

  // Verificar todas las alertas de préstamos
  private async checkAllLoanAlerts(): Promise<void> {
    try {
      // Obtener usuarios activos (simplificado para el ejemplo)
      const activeUsers = await this.getActiveUsers();
      
      for (const user of activeUsers) {
        const config = await this.getAlertConfig(user.id);
        if (!config) continue;

        // Verificar alertas de vencimiento próximo
        if (config.alertasVencimiento) {
          await this.checkUpcomingDueDates(user.id, config.diasAnticipacion);
        }

        // Verificar préstamos vencidos
        if (config.alertasPrestamosVencidos) {
          await this.checkOverdueLoans(user.id);
        }

        // Verificar devoluciones parciales
        if (config.alertasDevolucionesParciales) {
          await this.checkPartialReturns(user.id);
        }
      }
    } catch (error) {
      console.error('Error checking loan alerts:', error);
    }
  }

  // Verificar préstamos con vencimiento próximo
  private async checkUpcomingDueDates(userId: string, diasAnticipacion: number): Promise<void> {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);
      
      const { data: prestamos, error } = await supabase
        .from('prestamos_materiales')
        .select(`
          id,
          numero_prestamo,
          fecha_devolucion_programada,
          terceros!inner(razon_social)
        `)
        .eq('estado', 'entregado')
        .lte('fecha_devolucion_programada', fechaLimite.toISOString().split('T')[0]);

      if (error) {
        console.error('Error checking upcoming due dates:', error);
        return;
      }

      for (const prestamo of prestamos || []) {
        // Verificar si ya existe una alerta reciente
        const existingAlert = await this.hasRecentAlert(
          userId,
          'vencimiento_proximo',
          prestamo.id
        );

        if (!existingAlert) {
          const diasRestantes = Math.ceil(
            (new Date(prestamo.fecha_devolucion_programada).getTime() - new Date().getTime()) / 
            (1000 * 60 * 60 * 24)
          );

          await this.createLoanAlert({
            type: 'vencimiento_proximo',
            title: 'Préstamo próximo a vencer',
            message: `El préstamo ${prestamo.numero_prestamo} vence en ${diasRestantes} días`,
            data: {
              prestamoId: prestamo.id,
              numeroPrestamo: prestamo.numero_prestamo,
              terceroNombre: (prestamo.terceros as any)?.razon_social || 'Tercero desconocido',
              fechaVencimiento: prestamo.fecha_devolucion_programada
            },
            userId,
            read: false,
            priority: diasRestantes <= 1 ? 'high' : 'medium'
          });
        }
      }
    } catch (error) {
      console.error('Error checking upcoming due dates:', error);
    }
  }

  // Verificar préstamos vencidos
  private async checkOverdueLoans(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: prestamos, error } = await supabase
        .from('prestamos_materiales')
        .select(`
          id,
          numero_prestamo,
          fecha_devolucion_programada,
          terceros!inner(razon_social)
        `)
        .eq('estado', 'entregado')
        .lt('fecha_devolucion_programada', today);

      if (error) {
        console.error('Error checking overdue loans:', error);
        return;
      }

      for (const prestamo of prestamos || []) {
        // Verificar si ya existe una alerta reciente
        const existingAlert = await this.hasRecentAlert(
          userId,
          'prestamo_vencido',
          prestamo.id
        );

        if (!existingAlert) {
          const diasVencido = Math.ceil(
            (new Date().getTime() - new Date(prestamo.fecha_devolucion_programada).getTime()) / 
            (1000 * 60 * 60 * 24)
          );

          await this.createLoanAlert({
            type: 'prestamo_vencido',
            title: 'Préstamo vencido',
            message: `El préstamo ${prestamo.numero_prestamo} está vencido desde hace ${diasVencido} días`,
            data: {
              prestamoId: prestamo.id,
              numeroPrestamo: prestamo.numero_prestamo,
              terceroNombre: (prestamo.terceros as any)?.razon_social || 'Tercero desconocido',
              diasVencido
            },
            userId,
            read: false,
            priority: 'high'
          });
        }
      }
    } catch (error) {
      console.error('Error checking overdue loans:', error);
    }
  }

  // Verificar devoluciones parciales
  private async checkPartialReturns(userId: string): Promise<void> {
    try {
      const { data: prestamos, error } = await supabase
        .from('prestamos_materiales')
        .select(`
          id,
          numero_prestamo,
          terceros!inner(razon_social)
        `)
        .eq('estado', 'parcialmente_devuelto');

      if (error) {
        console.error('Error checking partial returns:', error);
        return;
      }

      for (const prestamo of prestamos || []) {
        // Verificar si ya existe una alerta reciente
        const existingAlert = await this.hasRecentAlert(
          userId,
          'devolucion_parcial',
          prestamo.id
        );

        if (!existingAlert) {
          await this.createLoanAlert({
            type: 'devolucion_parcial',
            title: 'Devolución parcial pendiente',
            message: `El préstamo ${prestamo.numero_prestamo} tiene devolución parcial pendiente`,
            data: {
              prestamoId: prestamo.id,
              numeroPrestamo: prestamo.numero_prestamo,
              terceroNombre: (prestamo.terceros as any)?.razon_social || 'Tercero desconocido'
            },
            userId,
            read: false,
            priority: 'medium'
          });
        }
      }
    } catch (error) {
      console.error('Error checking partial returns:', error);
    }
  }

  // Mostrar notificación del navegador
  private async showLoanNotification(alert: LoanNotificationAlert): Promise<void> {
    const config = await this.getAlertConfig(alert.userId);
    if (!config?.pushNotifications) return;

    // Verificar horarios activos
    if (!this.isWithinActiveHours(config.horariosActivos)) return;

    // Verificar permisos
    if (Notification.permission !== 'granted') return;

    // Crear notificación
    const notification = new Notification(alert.title, {
      body: alert.message,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: alert.type,
      data: alert.data,
      requireInteraction: alert.priority === 'high'
    });

    notification.onclick = () => {
      window.focus();
      this.markAsRead(alert.id, alert.userId);
      notification.close();
    };
  }

  // Verificar si está dentro de horarios activos
  private isWithinActiveHours(horariosActivos: LoanAlertConfig['horariosActivos']): boolean {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    // Verificar día de la semana
    if (!horariosActivos.diasSemana.includes(currentDay)) {
      return false;
    }
    
    // Convertir horarios a números
    const [inicioHora, inicioMin] = horariosActivos.inicio.split(':').map(Number);
    const [finHora, finMin] = horariosActivos.fin.split(':').map(Number);
    const inicioTime = inicioHora * 100 + inicioMin;
    const finTime = finHora * 100 + finMin;
    
    return currentTime >= inicioTime && currentTime <= finTime;
  }

  // Verificar si existe una alerta reciente
  private async hasRecentAlert(
    userId: string,
    type: string,
    prestamoId: string
  ): Promise<boolean> {
    const alerts = await this.getLoanAlerts(userId);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    return alerts.some(alert => 
      alert.type === type &&
      new Date(alert.createdAt).getTime() > oneHourAgo &&
      alert.data.prestamoId === prestamoId
    );
  }

  // Obtener usuarios activos (simplificado)
  private async getActiveUsers(): Promise<Array<{ id: string }>> {
    // En una implementación real, esto vendría de la base de datos
    // Por ahora, devolvemos usuarios que tienen configuración de alertas
    const users: Array<{ id: string }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('loan_alert_config_')) {
        const userId = key.replace('loan_alert_config_', '');
        users.push({ id: userId });
      }
    }
    
    return users;
  }

  // Notificar a suscriptores
  private notifySubscribers(userId: string): void {
    const callback = this.subscribers.get(userId);
    if (callback) {
      this.getLoanAlerts(userId).then(callback);
    }
  }

  // Limpiar recursos
  async cleanup(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Limpiar alertas antiguas
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('loan_alerts_')) {
        const alertsData = localStorage.getItem(key);
        if (alertsData) {
          const alerts: LoanNotificationAlert[] = JSON.parse(alertsData);
          const filteredAlerts = alerts.filter(alert => 
            new Date(alert.createdAt).getTime() > thirtyDaysAgo
          );
          
          if (filteredAlerts.length !== alerts.length) {
            localStorage.setItem(key, JSON.stringify(filteredAlerts));
          }
        }
      }
    }
  }
}

export const loanAlertService = new LoanAlertService();