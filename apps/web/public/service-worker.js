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
    // Snooze: dismiss now. Service workers can't reliably hold a 10-min timer.
    // Future: POST to /api/notifications/snooze to schedule server-side re-push.
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
