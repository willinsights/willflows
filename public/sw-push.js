// WillFlow Service Worker for Push Notifications
// This runs in the background even when the app is closed

self.addEventListener('install', (event) => {
  console.log('[SW Push] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW Push] Activating...');
  event.waitUntil(self.clients.claim());
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW Push] Push received:', event);

  let data = {
    title: 'WillFlow',
    body: 'Nova notificação',
    icon: '/pwa-icon.png',
    badge: '/favicon.ico',
    tag: 'willflow-notification',
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW Push] Error parsing push data:', e);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-icon.png',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'willflow-notification',
    data: data.data || {},
    vibrate: [100, 50, 100],
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Fechar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Push] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Get the URL to open based on notification data
  let targetUrl = '/app/dashboard';
  
  if (event.notification.data) {
    const { type, entityId } = event.notification.data;
    
    switch (type) {
      case 'project':
        targetUrl = `/app/projetos?project=${entityId}`;
        break;
      case 'task':
        targetUrl = `/app/projetos?task=${entityId}`;
        break;
      case 'message':
        targetUrl = `/app/chat?conversation=${entityId}`;
        break;
      case 'event':
        targetUrl = '/app/calendario';
        break;
      case 'payment':
        targetUrl = '/app/pagamentos';
        break;
      default:
        targetUrl = '/app/dashboard';
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes('/app') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW Push] Subscription changed');
  
  // The subscription has expired or been revoked
  // Notify the main app to re-subscribe
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'PUSH_SUBSCRIPTION_CHANGED',
        });
      });
    })
  );
});
