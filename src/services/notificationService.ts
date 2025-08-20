import { localDB } from '../lib/localDB';
import { stockService } from './stock';
import { requerimientosService } from './requerimientos';
import { solicitudesCompraService } from './solicitudesCompra';
import { ordenesCompraService } from './ordenesCompra';

export interface NotificationConfig {
  id: string;
  userId: string;
  stockBajo: boolean;
  nuevosRequerimientos: boolean;
  aprobacionesPendientes: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  stockMinimo: number;
  horariosActivos: {
    inicio: string;
    fin: string;
    diasSemana: number[]; // 0-6 (domingo-sábado)
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationAlert {
  id: string;
  type: 'stock_bajo' | 'nuevo_requerimiento' | 'aprobacion_pendiente';
  title: string;
  message: string;
  data: any;
  userId: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  expiresAt?: Date;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  createdAt: Date;
}

class NotificationService {
  private checkInterval: NodeJS.Timeout | null = null;
  private subscribers: Map<string, (notifications: NotificationAlert[]) => void> = new Map();
  private vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLrubHLRkPiIncgHjLQS6lbqWYkTBaFXC9c5v_--gZbUIsjuxcJxkGc';

  async initialize(): Promise<void> {
    // Verificar soporte para notificaciones
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return;
    }

    // Verificar soporte para Service Worker
    if (!('serviceWorker' in navigator)) {
      console.warn('Este navegador no soporta Service Workers');
      return;
    }

    // Inicializar base de datos para notificaciones
    await this.initializeDatabase();

    // Iniciar verificaciones periódicas
    this.startPeriodicChecks();
  }

  private async initializeDatabase(): Promise<void> {
    // Inicializar localDB
    await localDB.get('usuarios'); // Esto asegura que esté inicializado
    
    // Las tablas de notificaciones se manejarán en localStorage directamente
    // ya que localDB no soporta SQL
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notificaciones no soportadas');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      throw new Error('Permisos de notificación denegados');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  async subscribeToPush(userId: string): Promise<PushSubscription | null> {
    try {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permisos de notificación no concedidos');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      const pushSub: PushSubscription = {
        id: crypto.randomUUID(),
        userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        },
        userAgent: navigator.userAgent,
        createdAt: new Date()
      };

      await this.savePushSubscription(pushSub);
      return pushSub;
    } catch (error) {
      console.error('Error al suscribirse a push notifications:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  async getNotificationConfig(userId: string): Promise<NotificationConfig | null> {
    const configKey = `notification_config_${userId}`;
    const stored = localStorage.getItem(configKey);

    if (!stored) return null;

    const result = JSON.parse(stored);
    return {
      ...result,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt)
    };
  }

  async saveNotificationConfig(config: Partial<NotificationConfig> & { userId: string }): Promise<void> {
    const existing = await this.getNotificationConfig(config.userId);
    const now = new Date().toISOString();

    const fullConfig: NotificationConfig = {
      id: existing?.id || crypto.randomUUID(),
      userId: config.userId,
      stockBajo: config.stockBajo ?? existing?.stockBajo ?? true,
      nuevosRequerimientos: config.nuevosRequerimientos ?? existing?.nuevosRequerimientos ?? true,
      aprobacionesPendientes: config.aprobacionesPendientes ?? existing?.aprobacionesPendientes ?? true,
      emailNotifications: config.emailNotifications ?? existing?.emailNotifications ?? false,
      pushNotifications: config.pushNotifications ?? existing?.pushNotifications ?? true,
      stockMinimo: config.stockMinimo ?? existing?.stockMinimo ?? 10,
      horariosActivos: config.horariosActivos ?? existing?.horariosActivos ?? {
        inicio: '08:00',
        fin: '18:00',
        diasSemana: [1, 2, 3, 4, 5]
      },
      createdAt: existing?.createdAt || new Date(now),
      updatedAt: new Date(now)
    };

    const configKey = `notification_config_${config.userId}`;
    localStorage.setItem(configKey, JSON.stringify(fullConfig));
  }

  async updateConfig(config: NotificationConfig): Promise<void> {
    const configKey = `notification_config_${config.userId}`;
    const updatedConfig = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(configKey, JSON.stringify(updatedConfig));
  }

  private async savePushSubscription(subscription: PushSubscription): Promise<void> {
    const subscriptionKey = `push_subscription_${subscription.userId}`;
    const subscriptionData = {
      id: subscription.id,
      userId: subscription.userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent: subscription.userAgent,
      createdAt: subscription.createdAt.toISOString()
    };
    
    localStorage.setItem(subscriptionKey, JSON.stringify(subscriptionData));
  }

  async createAlert(alert: Omit<NotificationAlert, 'id' | 'createdAt'>): Promise<void> {
    const alertsKey = `notification_alerts_${alert.userId}`;
    const stored = localStorage.getItem(alertsKey);
    const alerts: NotificationAlert[] = stored ? JSON.parse(stored) : [];
    
    const fullAlert: NotificationAlert = {
      ...alert,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };
    
    alerts.unshift(fullAlert);
    
    // Mantener solo los últimos 100 alertas
    if (alerts.length > 100) {
      alerts.splice(100);
    }
    
    localStorage.setItem(alertsKey, JSON.stringify(alerts));

    // Mostrar notificación si está habilitada
    await this.showNotification(fullAlert);

    // Notificar a suscriptores
    this.notifySubscribers(fullAlert.userId);
  }

  async addAlert(alert: Omit<NotificationAlert, 'id' | 'createdAt'>): Promise<void> {
    const alertsKey = `notification_alerts_${alert.userId}`;
    const stored = localStorage.getItem(alertsKey);
    const alerts: NotificationAlert[] = stored ? JSON.parse(stored) : [];
    
    const newAlert: NotificationAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };
    
    alerts.unshift(newAlert);
    
    // Mantener solo los últimos 100 alertas
    if (alerts.length > 100) {
      alerts.splice(100);
    }
    
    localStorage.setItem(alertsKey, JSON.stringify(alerts));
  }

  private async showNotification(alert: NotificationAlert): Promise<void> {
    const config = await this.getNotificationConfig(alert.userId);
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

  private isWithinActiveHours(horarios: NotificationConfig['horariosActivos']): boolean {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 100 + now.getMinutes();

    // Verificar día de la semana
    if (!horarios.diasSemana.includes(currentDay)) return false;

    // Convertir horarios a números
    const [inicioHora, inicioMin] = horarios.inicio.split(':').map(Number);
    const [finHora, finMin] = horarios.fin.split(':').map(Number);
    const inicioTime = inicioHora * 100 + inicioMin;
    const finTime = finHora * 100 + finMin;

    return currentTime >= inicioTime && currentTime <= finTime;
  }

  async getAlerts(userId: string, unreadOnly = false): Promise<NotificationAlert[]> {
    const alertsKey = `notification_alerts_${userId}`;
    const stored = localStorage.getItem(alertsKey);
    let alerts: NotificationAlert[] = stored ? JSON.parse(stored) : [];

    if (unreadOnly) {
      alerts = alerts.filter(alert => !alert.read);
    }

    // Ordenar por fecha de creación descendente y limitar a 50
    return alerts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);
  }

  async markAsRead(alertId: string, userId: string): Promise<void> {
    const alertsKey = `notification_alerts_${userId}`;
    const stored = localStorage.getItem(alertsKey);
    if (!stored) return;
    
    const alerts: NotificationAlert[] = JSON.parse(stored);
    const alertIndex = alerts.findIndex(alert => alert.id === alertId);
    
    if (alertIndex !== -1) {
      alerts[alertIndex].read = true;
      localStorage.setItem(alertsKey, JSON.stringify(alerts));
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    const alertsKey = `notification_alerts_${userId}`;
    const stored = localStorage.getItem(alertsKey);
    if (!stored) return;
    
    const alerts: NotificationAlert[] = JSON.parse(stored);
    const updatedAlerts = alerts.map(alert => ({ ...alert, read: true }));
    localStorage.setItem(alertsKey, JSON.stringify(updatedAlerts));
  }

  async deleteAlert(alertId: string, userId: string): Promise<void> {
    const alertsKey = `notification_alerts_${userId}`;
    const stored = localStorage.getItem(alertsKey);
    if (!stored) return;
    
    const alerts: NotificationAlert[] = JSON.parse(stored);
    const filteredAlerts = alerts.filter(alert => alert.id !== alertId);
    localStorage.setItem(alertsKey, JSON.stringify(filteredAlerts));
  }

  private startPeriodicChecks(): void {
    // Verificar cada 5 minutos
    this.checkInterval = setInterval(() => {
      this.checkForAlerts();
    }, 5 * 60 * 1000);

    // Verificación inicial
    setTimeout(() => this.checkForAlerts(), 1000);
  }

  private async checkForAlerts(): Promise<void> {
    try {
      await Promise.all([
        this.checkStockBajo(),
        this.checkNuevosRequerimientos(),
        this.checkAprobacionesPendientes()
      ]);
    } catch (error) {
      console.error('Error al verificar alertas:', error);
    }
  }

  private async checkStockBajo(): Promise<void> {
    try {
      const stock = await stockService.getAll();
      const usuarios = await this.getActiveUsers();

      for (const usuario of usuarios) {
        const config = await this.getNotificationConfig(usuario.id);
        if (!config?.stockBajo) continue;

        const stockBajo = stock.filter(item => 
          typeof item.cantidad === 'number' && 
          typeof config.stockMinimo === 'number' && 
          item.cantidad <= config.stockMinimo
        );
        
        for (const item of stockBajo) {
          // Verificar si ya se envió alerta reciente
          const existingAlert = await this.hasRecentAlert(
            usuario.id,
            'stock_bajo',
            String(item.materialId)
          );
          
          if (!existingAlert) {
            await this.createAlert({
              type: 'stock_bajo',
              title: 'Stock Bajo',
              message: `${item.material} tiene solo ${item.cantidad} unidades disponibles`,
              data: { materialId: String(item.materialId), cantidad: item.cantidad },
              userId: usuario.id,
              read: false,
              priority: item.cantidad === 0 ? 'high' : 'medium'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error al verificar stock bajo:', error);
    }
  }

  private async checkNuevosRequerimientos(): Promise<void> {
    try {
      const usuarios = await this.getActiveUsers();
      
      for (const usuario of usuarios) {
        const config = await this.getNotificationConfig(usuario.id);
        if (!config?.nuevosRequerimientos) continue;

        // Solo notificar a supervisores y administradores
        if (!['supervisor', 'administrador'].includes(usuario.rol)) continue;

        const requerimientos = await requerimientosService.getAll();
        const nuevos = requerimientos.filter(req => 
          req.estado === 'PENDIENTE' && 
          req.fechaCreacion && new Date(req.fechaCreacion as string).getTime() > Date.now() - 24 * 60 * 60 * 1000 // Últimas 24 horas
        );

        for (const req of nuevos) {
          const existingAlert = await this.hasRecentAlert(
            usuario.id,
            'nuevo_requerimiento',
            req.id
          );

          if (!existingAlert) {
            await this.createAlert({
              type: 'nuevo_requerimiento',
              title: 'Nuevo Requerimiento',
              message: `Nuevo requerimiento de ${req.obra} requiere aprobación`,
              data: { requerimientoId: req.id, obra: req.obra },
              userId: usuario.id,
              read: false,
              priority: 'medium'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error al verificar nuevos requerimientos:', error);
    }
  }

  private async checkAprobacionesPendientes(): Promise<void> {
    try {
      const usuarios = await this.getActiveUsers();
      
      for (const usuario of usuarios) {
        const config = await this.getNotificationConfig(usuario.id);
        if (!config?.aprobacionesPendientes) continue;

        // Solo notificar a supervisores y administradores
        if (!['supervisor', 'administrador'].includes(usuario.rol)) continue;

        // Verificar solicitudes de compra pendientes
        const solicitudes = await solicitudesCompraService.getAll();
        const pendientes = solicitudes.filter(sol => sol.estado === 'PENDIENTE');

        for (const sol of pendientes) {
          const existingAlert = await this.hasRecentAlert(
            usuario.id,
            'aprobacion_pendiente',
            sol.id
          );

          if (!existingAlert) {
            await this.createAlert({
              type: 'aprobacion_pendiente',
              title: 'Aprobación Pendiente',
              message: `Solicitud de compra #${sol.numero} requiere aprobación`,
              data: { solicitudId: sol.id, numero: sol.numero },
              userId: usuario.id,
              read: false,
              priority: 'high'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error al verificar aprobaciones pendientes:', error);
    }
  }

  private async hasRecentAlert(
    userId: string,
    type: string,
    dataId: string
  ): Promise<boolean> {
    const alertsKey = `alerts_${userId}`;
    const alertsData = localStorage.getItem(alertsKey);
    
    if (!alertsData) return false;
    
    const alerts: NotificationAlert[] = JSON.parse(alertsData);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    return alerts.some(alert => 
      alert.type === type &&
      new Date(alert.createdAt).getTime() > oneHourAgo &&
      (
        (alert.data as any)?.materialId === dataId ||
        (alert.data as any)?.requerimientoId === dataId ||
        (alert.data as any)?.solicitudId === dataId
      )
    );
  }

  private async getActiveUsers(): Promise<Array<{ id: string; rol: string }>> {
    // Esto debería obtener usuarios activos del sistema
    // Por ahora retornamos un array vacío, se implementará cuando se integre
    return [];
  }

  subscribe(userId: string, callback: (notifications: NotificationAlert[]) => void): () => void {
    this.subscribers.set(userId, callback);
    
    // Enviar notificaciones actuales
    this.getAlerts(userId, true).then(callback);
    
    return () => {
      this.subscribers.delete(userId);
    };
  }

  private async notifySubscribers(userId: string): Promise<void> {
    const callback = this.subscribers.get(userId);
    if (callback) {
      const alerts = await this.getAlerts(userId, true);
      callback(alerts);
    }
  }

  async cleanup(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Limpiar alertas expiradas y antiguas de todos los usuarios
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    // Obtener todas las claves de alertas
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('alerts_')) {
        const alertsData = localStorage.getItem(key);
        if (alertsData) {
          const alerts: NotificationAlert[] = JSON.parse(alertsData);
          const filteredAlerts = alerts.filter(alert => 
             new Date(alert.createdAt).getTime() > thirtyDaysAgo &&
             (!alert.expiresAt || new Date(alert.expiresAt).getTime() > now)
           );
          
          if (filteredAlerts.length !== alerts.length) {
            localStorage.setItem(key, JSON.stringify(filteredAlerts));
          }
        }
      }
    }
  }
}

export const notificationService = new NotificationService();