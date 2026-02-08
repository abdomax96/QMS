/// <reference lib="webworker" />

const CACHE_NAME = 'qms-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Activate immediately
    (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    // Take control immediately
    (self as unknown as ServiceWorkerGlobalScope).clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event: FetchEvent) => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip external requests
    if (!request.url.startsWith(self.location.origin)) return;

    // Skip Firebase requests (need real-time data)
    if (request.url.includes('firestore') || request.url.includes('firebase')) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                // Clone response for caching
                const responseClone = response.clone();

                // Cache successful responses
                if (response.ok) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }

                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // Fallback for navigation requests
                    if (request.mode === 'navigate') {
                        return caches.match('/');
                    }

                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event: SyncEvent) => {
    if (event.tag === 'sync-ncr') {
        event.waitUntil(syncNcrData());
    }
});

async function syncNcrData() {
    // Sync offline NCR data when back online
    console.log('Syncing NCR data...');
}

// Push notifications
self.addEventListener('push', (event: PushEvent) => {
    const data = event.data?.json() || {};

    const options: NotificationOptions = {
        body: data.body || 'إشعار جديد',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        dir: 'rtl',
        lang: 'ar',
        tag: data.tag || 'default',
        data: data.data
    };

    event.waitUntil(
        (self as unknown as ServiceWorkerGlobalScope).registration.showNotification(
            data.title || 'نظام الجودة',
            options
        )
    );
});

// Notification click
self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        (self as unknown as ServiceWorkerGlobalScope).clients.openWindow(url)
    );
});

export { };
