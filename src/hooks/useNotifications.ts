import { useState, useEffect, useCallback } from 'react';
import { notificationService, NotificationAlert, NotificationConfig } from '../services/notificationService';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface UseNotificationsReturn {
  // Estado
  alerts: NotificationAlert[];
  unreadCount: number;
  config: NotificationConfig | null;
  isLoading: boolean;
  hasPermission: boolean;
  
  // Acciones
  requestPermission: () => Promise<boolean>;
  subscribeToPush: () => Promise<boolean>;
  updateConfig: (config: Partial<NotificationConfig>) => Promise<void>;
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteAlert: (alertId: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  const unreadCount = alerts.filter(alert => !alert.read).length;

  // Verificar permisos de notificación
  const checkPermission = useCallback(() => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  // Solicitar permisos de notificación
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const permission = await notificationService.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      
      if (granted) {
        toast.success('Permisos de notificación concedidos');
      } else {
        toast.error('Permisos de notificación denegados');
      }
      
      return granted;
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      toast.error('Error al solicitar permisos de notificación');
      return false;
    }
  }, []);

  // Suscribirse a notificaciones push
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const subscription = await notificationService.subscribeToPush(user.id);
      if (subscription) {
        toast.success('Suscrito a notificaciones push');
        return true;
      } else {
        toast.error('Error al suscribirse a notificaciones push');
        return false;
      }
    } catch (error) {
      console.error('Error al suscribirse:', error);
      toast.error('Error al configurar notificaciones push');
      return false;
    }
  }, [user?.id]);

  // Actualizar configuración
  const updateConfig = useCallback(async (newConfig: Partial<NotificationConfig>): Promise<void> => {
    if (!user?.id) return;

    try {
      await notificationService.saveNotificationConfig({
        ...newConfig,
        userId: user.id
      });
      
      // Recargar configuración
      const updatedConfig = await notificationService.getNotificationConfig(user.id);
      setConfig(updatedConfig);
      
      toast.success('Configuración de notificaciones actualizada');
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      toast.error('Error al guardar configuración');
    }
  }, [user?.id]);

  // Marcar alerta como leída
  const markAsRead = useCallback(async (alertId: string): Promise<void> => {
    if (!user?.id) return;
    
    try {
      await notificationService.markAsRead(alertId, user.id);
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      ));
    } catch (error) {
      console.error('Error al marcar como leída:', error);
    }
  }, [user?.id]);

  // Marcar todas las alertas como leídas
  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!user?.id) return;

    try {
      await notificationService.markAllAsRead(user.id);
      setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
      toast.error('Error al actualizar notificaciones');
    }
  }, [user?.id]);

  // Eliminar alerta
  const deleteAlert = useCallback(async (alertId: string): Promise<void> => {
    if (!user?.id) return;
    
    try {
      await notificationService.deleteAlert(alertId, user.id);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast.success('Notificación eliminada');
    } catch (error) {
      console.error('Error al eliminar alerta:', error);
      toast.error('Error al eliminar notificación');
    }
  }, [user?.id]);

  // Refrescar alertas
  const refreshAlerts = useCallback(async (): Promise<void> => {
    if (!user?.id) return;

    try {
      const newAlerts = await notificationService.getAlerts(user.id);
      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error al refrescar alertas:', error);
    }
  }, [user?.id]);

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Inicializar servicio de notificaciones
        await notificationService.initialize();
        
        // Cargar configuración
        const userConfig = await notificationService.getNotificationConfig(user.id);
        setConfig(userConfig);
        
        // Cargar alertas
        const userAlerts = await notificationService.getAlerts(user.id);
        setAlerts(userAlerts);
        
        // Verificar permisos
        checkPermission();
        
      } catch (error) {
        console.error('Error al cargar datos de notificaciones:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [user?.id, checkPermission]);

  // Suscribirse a nuevas notificaciones
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = notificationService.subscribe(user.id, (newAlerts) => {
      setAlerts(newAlerts);
    });

    return unsubscribe;
  }, [user?.id]);

  // Verificar permisos cuando cambia el estado de la ventana
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkPermission();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkPermission]);

  return {
    alerts,
    unreadCount,
    config,
    isLoading,
    hasPermission,
    requestPermission,
    subscribeToPush,
    updateConfig,
    markAsRead,
    markAllAsRead,
    deleteAlert,
    refreshAlerts
  };
};

// Hook para mostrar notificaciones en tiempo real
export const useNotificationToasts = () => {
  const { user } = useAuth();
  const [lastAlertId, setLastAlertId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = notificationService.subscribe(user.id, (alerts) => {
      // Mostrar toast solo para la alerta más reciente
      const latestAlert = alerts[0];
      if (latestAlert && latestAlert.id !== lastAlertId && !latestAlert.read) {
        setLastAlertId(latestAlert.id);
        
        const toastOptions = {
          duration: latestAlert.priority === 'high' ? 10000 : 5000,
          action: {
            label: 'Ver',
            onClick: () => {
              // Aquí podrías navegar a la página correspondiente
              if (user?.id) {
                notificationService.markAsRead(latestAlert.id, user.id);
              }
            }
          }
        };

        switch (latestAlert.priority) {
          case 'high':
            toast.error(latestAlert.message, toastOptions);
            break;
          case 'medium':
            toast.warning(latestAlert.message, toastOptions);
            break;
          default:
            toast.info(latestAlert.message, toastOptions);
        }
      }
    });

    return unsubscribe;
  }, [user?.id, lastAlertId]);
};

// Hook para configuración específica de notificaciones
export const useNotificationConfig = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateConfig = useCallback(async (newConfig: Partial<NotificationConfig>): Promise<void> => {
    if (!user?.id) return;

    try {
      await notificationService.saveNotificationConfig({
        ...newConfig,
        userId: user.id
      });
      
      const updatedConfig = await notificationService.getNotificationConfig(user.id);
      setConfig(updatedConfig);
      
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      throw error;
    }
  }, [user?.id]);

  useEffect(() => {
    const loadConfig = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const userConfig = await notificationService.getNotificationConfig(user.id);
        setConfig(userConfig);
      } catch (error) {
        console.error('Error al cargar configuración:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [user?.id]);

  return {
    config,
    isLoading,
    updateConfig
  };
};