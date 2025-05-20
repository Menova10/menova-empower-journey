// Service Worker for handling push notifications
// This file must be placed in the public directory at the root level

// Cache name for offline functionality
const CACHE_NAME = 'menova-cache-v1';

// URLs to cache for offline usage
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache resources for offline use
self.addEventListener('install', event => {
  console.log('Service Worker installing');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  // Cache files for offline use
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating');
  
  // Claim clients to ensure the service worker controls all clients immediately
  self.clients.claim();
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', event => {
  console.log('Push event received:', event);
  
  if (event.data) {
    try {
      // Parse the data from the push event
      const data = event.data.json();
      console.log('Push data:', data);
      
      // Options for the notification
      const options = {
        body: data.body || 'Check in with your symptoms today!',
        icon: data.icon || '/logo192.png',
        badge: '/badge.png',
        data: {
          url: data.url || '/',
          timestamp: new Date().getTime()
        },
        actions: data.actions || [
          {
            action: 'view',
            title: 'View Details'
          }
        ],
        vibrate: [100, 50, 100],
        timestamp: data.timestamp || Date.now()
      };
      
      // Show the notification
      event.waitUntil(
        self.registration.showNotification(
          data.title || 'MeNova Health Check-in',
          options
        )
      );
    } catch (error) {
      console.error('Error showing notification:', error);
      // Fallback notification if parsing fails
      event.waitUntil(
        self.registration.showNotification('MeNova Reminder', {
          body: 'Time to check in with your symptoms!',
          icon: '/logo192.png'
        })
      );
    }
  }
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  // Close the notification
  event.notification.close();
  
  // Get the URL to open from the notification data
  const urlToOpen = event.notification.data?.url || '/';
  
  // Open or focus the window with the specified URL
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(clientsList => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientsList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Fetch event - handle offline requests
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if available
        if (response) {
          return response;
        }
        
        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();
            
            // Cache the response for future offline use
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
      })
  );
}); 