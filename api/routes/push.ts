import { Router } from 'express';
import webpush from 'web-push';
import { body, validationResult } from 'express-validator';

const router = Router();

// Configurar VAPID keys (estas deberían estar en variables de entorno)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f7LE4F7qBYVRtjHOu1fJ1wJgLkPTBHm4gcNJoDc9VQHyOfhBGBc';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'your-vapid-private-key-here';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@almacen.com';

// Configurar web-push
webpush.setVapidDetails(
  VAPID_EMAIL,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Almacenamiento temporal de suscripciones (en producción usar base de datos)
const subscriptions = new Map<string, any>();

// Obtener clave pública VAPID
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Suscribirse a notificaciones push
router.post('/subscribe', [
  body('endpoint').isURL().withMessage('Endpoint debe ser una URL válida'),
  body('keys.p256dh').notEmpty().withMessage('Clave p256dh es requerida'),
  body('keys.auth').notEmpty().withMessage('Clave auth es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { endpoint, keys } = req.body;
    const subscriptionId = Buffer.from(endpoint).toString('base64');
    
    // Guardar suscripción
    subscriptions.set(subscriptionId, {
      endpoint,
      keys,
      subscribedAt: new Date(),
      userId: req.body.userId || null
    });

    console.log('Nueva suscripción push registrada:', subscriptionId);

    // Enviar notificación de bienvenida
    try {
      await webpush.sendNotification({
        endpoint,
        keys
      }, JSON.stringify({
        title: '¡Notificaciones Activadas!',
        body: 'Ahora recibirás notificaciones importantes de ALMACEN.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'welcome-notification',
        data: {
          type: 'welcome',
          timestamp: Date.now()
        }
      }));
    } catch (welcomeError) {
      console.error('Error enviando notificación de bienvenida:', welcomeError);
    }

    res.json({ 
      success: true, 
      message: 'Suscripción registrada exitosamente',
      subscriptionId 
    });
  } catch (error) {
    console.error('Error registrando suscripción push:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Desuscribirse de notificaciones push
router.post('/unsubscribe', [
  body('endpoint').isURL().withMessage('Endpoint debe ser una URL válida')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { endpoint } = req.body;
    const subscriptionId = Buffer.from(endpoint).toString('base64');
    
    const deleted = subscriptions.delete(subscriptionId);
    
    if (deleted) {
      console.log('Suscripción push eliminada:', subscriptionId);
      res.json({ 
        success: true, 
        message: 'Suscripción eliminada exitosamente' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Suscripción no encontrada' 
      });
    }
  } catch (error) {
    console.error('Error eliminando suscripción push:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Enviar notificación a todas las suscripciones
router.post('/send-notification', [
  body('title').notEmpty().withMessage('Título es requerido'),
  body('body').optional().isString(),
  body('icon').optional().isURL(),
  body('data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { title, body, icon, badge, tag, data, requireInteraction } = req.body;
    
    const payload = JSON.stringify({
      title,
      body: body || '',
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-72x72.png',
      tag: tag || `notification-${Date.now()}`,
      data: {
        ...data,
        timestamp: Date.now()
      },
      requireInteraction: requireInteraction || false
    });

    const results = [];
    const failedSubscriptions = [];

    // Enviar a todas las suscripciones
    for (const [subscriptionId, subscription] of subscriptions.entries()) {
      try {
        await webpush.sendNotification(subscription, payload);
        results.push({ subscriptionId, status: 'sent' });
      } catch (error) {
        console.error(`Error enviando notificación a ${subscriptionId}:`, error);
        results.push({ subscriptionId, status: 'failed', error: error.message });
        
        // Si la suscripción es inválida, eliminarla
        if (error.statusCode === 410 || error.statusCode === 404) {
          subscriptions.delete(subscriptionId);
          failedSubscriptions.push(subscriptionId);
        }
      }
    }

    console.log(`Notificación enviada a ${results.filter(r => r.status === 'sent').length} suscripciones`);
    
    if (failedSubscriptions.length > 0) {
      console.log(`Eliminadas ${failedSubscriptions.length} suscripciones inválidas`);
    }

    res.json({
      success: true,
      message: 'Notificación procesada',
      results: {
        total: results.length,
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        removedInvalid: failedSubscriptions.length
      }
    });
  } catch (error) {
    console.error('Error enviando notificaciones:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Enviar notificación a suscripción específica
router.post('/send-to-user', [
  body('userId').notEmpty().withMessage('ID de usuario es requerido'),
  body('title').notEmpty().withMessage('Título es requerido'),
  body('body').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { userId, title, body, icon, badge, tag, data } = req.body;
    
    // Buscar suscripciones del usuario
    const userSubscriptions = Array.from(subscriptions.entries())
      .filter(([_, sub]) => sub.userId === userId);

    if (userSubscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron suscripciones para el usuario'
      });
    }

    const payload = JSON.stringify({
      title,
      body: body || '',
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-72x72.png',
      tag: tag || `user-notification-${Date.now()}`,
      data: {
        ...data,
        userId,
        timestamp: Date.now()
      }
    });

    const results = [];

    for (const [subscriptionId, subscription] of userSubscriptions) {
      try {
        await webpush.sendNotification(subscription, payload);
        results.push({ subscriptionId, status: 'sent' });
      } catch (error) {
        console.error(`Error enviando notificación a usuario ${userId}:`, error);
        results.push({ subscriptionId, status: 'failed', error: error.message });
        
        // Si la suscripción es inválida, eliminarla
        if (error.statusCode === 410 || error.statusCode === 404) {
          subscriptions.delete(subscriptionId);
        }
      }
    }

    res.json({
      success: true,
      message: `Notificación enviada al usuario ${userId}`,
      results: {
        total: results.length,
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length
      }
    });
  } catch (error) {
    console.error('Error enviando notificación a usuario:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Obtener estadísticas de suscripciones
router.get('/stats', (req, res) => {
  const stats = {
    totalSubscriptions: subscriptions.size,
    subscriptionsByDate: {},
    activeSubscriptions: 0
  };

  // Agrupar por fecha de suscripción
  for (const [_, subscription] of subscriptions.entries()) {
    const date = subscription.subscribedAt.toISOString().split('T')[0];
    stats.subscriptionsByDate[date] = (stats.subscriptionsByDate[date] || 0) + 1;
    stats.activeSubscriptions++;
  }

  res.json({
    success: true,
    stats
  });
});

export default router;