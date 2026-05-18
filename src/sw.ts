/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// Unified Service Worker for WillFlow
// - Workbox precaching (PWA / offline) via injectManifest
// - Push notifications (background + foreground)
// Replaces the legacy public/sw-push.js + auto-generated workbox SW.

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// === Precache (manifest injected at build time) ===
precacheAndRoute(self.__WB_MANIFEST || []);

// === Runtime caching for Google Fonts ===
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({ cacheName: 'google-fonts-stylesheets' }),
);
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
);

// === Lifecycle ===
// We do NOT call skipWaiting()/clientsClaim() automatically — the app shows
// a toast and only activates the new SW when the user clicks "Atualizar".
self.addEventListener('install', () => {
  // intentionally empty: waiting for SKIP_WAITING message
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// === Push notifications ===
self.addEventListener('push', (event) => {
  let data: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
  } = {
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
    } catch {
      data.body = event.data.text();
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || '/pwa-icon.png',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'willflow-notification',
    data: data.data || {},
    requireInteraction: true,
    // @ts-expect-error vibrate is non-standard in lib but supported
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Fechar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  let targetUrl = '/app/dashboard';
  const data = event.notification.data as { type?: string; entityId?: string } | undefined;
  if (data) {
    switch (data.type) {
      case 'project':
        targetUrl = `/app/projetos?project=${data.entityId}`;
        break;
      case 'task':
        targetUrl = `/app/projetos?task=${data.entityId}`;
        break;
      case 'message':
        targetUrl = `/app/chat?conversation=${data.entityId}`;
        break;
      case 'event':
        targetUrl = '/app/calendario';
        break;
      case 'payment':
        targetUrl = '/app/pagamentos';
        break;
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/app') && 'focus' in client) {
          (client as WindowClient).navigate(targetUrl);
          return (client as WindowClient).focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});

self.addEventListener('pushsubscriptionchange', (event: any) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
      });
    }),
  );
});

export {};
