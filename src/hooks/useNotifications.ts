import { useState, useEffect, useCallback } from 'react';

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  actions?: NotificationActions[];
}

interface PushSubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationState {
  permission: NotificationPermission;
  isSupported: boolean;
  isPushSupported: boolean;
  subscription: PushSubscription | null;
  subscriptionInfo: PushSubscriptionInfo | null;
}

interface NotificationActions {
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (options: NotificationOptions) => Promise<void>;
  subscribeToPush: () => Promise<PushSubscription | null>;
  unsubscribeFromPush: () => Promise<boolean>;
  sendTestNotification: () => Promise<void>;
}

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f7LE4F7qBYVRtjHOu1fJ1wJgLkPTBHm4gcNJoDc9VQHyOfhBGBc'; // Reemplazar con tu clave VAPID pública

export const useNotifications = (): NotificationState & NotificationActions => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<PushSubscriptionInfo | null>(null);

  // Verificar soporte y permisos
  useEffect(() => {
    const checkSupport = () => {
      const notificationSupported = 'Notification' in window;
      const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      
      setIsSupported(notificationSupported);
      setIsPushSupported(pushSupported);
      
      if (notificationSupported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Obtener suscripción existente
  useEffect(() => {
    const getExistingSubscription = async () => {
      if (!isPushSupported) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        
        if (existingSubscription) {
          setSubscription(existingSubscription);
          setSubscriptionInfo(extractSubscriptionInfo(existingSubscription));
        }
      } catch (error) {
        console.error('Error getting existing subscription:', error);
      }
    };

    if (isPushSupported) {
      getExistingSubscription();
    }
  }, [isPushSupported]);

  // Extraer información de la suscripción
  const extractSubscriptionInfo = (sub: PushSubscription): PushSubscriptionInfo => {
    const keys = sub.getKey ? {
      p256dh: arrayBufferToBase64(sub.getKey('p256dh')!),
      auth: arrayBufferToBase64(sub.getKey('auth')!)
    } : { p256dh: '', auth: '' };

    return {
      endpoint: sub.endpoint,
      keys
    };
  };

  // Convertir ArrayBuffer a Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Convertir Base64 a Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Solicitar permisos
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Notifications are not supported');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }, [isSupported]);

  // Mostrar notificación
  const showNotification = useCallback(async (options: NotificationOptions): Promise<void> => {
    if (!isSupported) {
      throw new Error('Notifications are not supported');
    }

    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      // Si hay Service Worker, usar showNotification
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          badge: options.badge || '/icons/icon-72x72.png',
          // image: options.image, // Comentado porque no está soportado en NotificationOptions
          tag: options.tag,
          data: options.data,
          requireInteraction: options.requireInteraction,
          silent: options.silent,
          // vibrate: options.vibrate // Comentado porque no está soportado en NotificationOptions,
          // actions: options.actions // Comentado porque no está soportado en NotificationOptions
        });
      } else {
        // Fallback a Notification API básica
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          tag: options.tag,
          data: options.data,
          requireInteraction: options.requireInteraction,
          silent: options.silent
          // vibrate: options.vibrate // Comentado porque no está soportado en NotificationOptions
        });
      }
    } catch (error) {
      console.error('Error showing notification:', error);
      throw error;
    }
  }, [isSupported, permission]);

  // Suscribirse a push notifications
  const subscribeToPush = useCallback(async (): Promise<PushSubscription | null> => {
    if (!isPushSupported) {
      throw new Error('Push notifications are not supported');
    }

    if (permission !== 'granted') {
      const newPermission = await requestPermission();
      if (newPermission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      setSubscription(newSubscription);
      const info = extractSubscriptionInfo(newSubscription);
      setSubscriptionInfo(info);

      // Enviar suscripción al servidor
      await sendSubscriptionToServer(info);

      return newSubscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      throw error;
    }
  }, [isPushSupported, permission, requestPermission]);

  // Desuscribirse de push notifications
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      return true;
    }

    try {
      const success = await subscription.unsubscribe();
      
      if (success) {
        setSubscription(null);
        setSubscriptionInfo(null);
        
        // Notificar al servidor
        await removeSubscriptionFromServer();
      }

      return success;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      throw error;
    }
  }, [subscription]);

  // Enviar suscripción al servidor
  const sendSubscriptionToServer = async (subscriptionInfo: PushSubscriptionInfo): Promise<void> => {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionInfo)
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }
    } catch (error) {
      console.error('Error sending subscription to server:', error);
      // No lanzar error para no interrumpir la suscripción local
    }
  };

  // Remover suscripción del servidor
  const removeSubscriptionFromServer = async (): Promise<void> => {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint: subscription?.endpoint })
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
      }
    } catch (error) {
      console.error('Error removing subscription from server:', error);
      // No lanzar error para no interrumpir la desuscripción local
    }
  };

  // Enviar notificación de prueba
  const sendTestNotification = useCallback(async (): Promise<void> => {
    await showNotification({
      title: '¡Notificación de Prueba!',
      body: 'Las notificaciones están funcionando correctamente en ALMACEN.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'test-notification',
      requireInteraction: false,
      vibrate: [200, 100, 200],
      // actions: [
      //   {
      //     action: 'view',
      //     title: 'Ver App',
      //     icon: '/icons/icon-72x72.png'
      //   },
      //   {
      //     action: 'close',
      //     title: 'Cerrar',
      //     icon: '/icons/icon-72x72.png'
      //   }
      // ] // Comentado porque no está soportado en NotificationOptions
    });
  }, [showNotification]);

  return {
    // Estado
    permission,
    isSupported,
    isPushSupported,
    subscription,
    subscriptionInfo,
    
    // Acciones
    requestPermission,
    showNotification,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification
  };
};