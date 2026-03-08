const CACHE_NAME = 'edwin-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── Push Notifications ──────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Edwin', body: event.data.text() };
  }

  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: payload.url || '/',
      tag: payload.tag || null,
    },
    vibrate: [200, 100, 200],
    tag: payload.tag || 'edwin-notification',
    renotify: true,
    requireInteraction: payload.requireInteraction || false,
  };

  // Add action buttons if provided
  if (payload.actions && payload.actions.length > 0) {
    options.actions = payload.actions;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Edwin', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const data = event.notification.data || {};

  event.notification.close();

  if (action === 'snooze') {
    // Re-show notification in 10 minutes
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(async () => {
          await self.registration.showNotification(event.notification.title, {
            body: event.notification.body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: data,
            vibrate: [200, 100, 200],
            tag: data.tag || 'edwin-notification',
            renotify: true,
            requireInteraction: true,
            actions: [
              { action: 'listen', title: 'Listen to Briefing' },
              { action: 'snooze', title: 'Snooze 10min' },
            ],
          });
          resolve();
        }, 10 * 60 * 1000); // 10 minutes
      })
    );
    return;
  }

  // Default: open/focus the app
  const url = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});
