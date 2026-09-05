/**
 * Service Worker Registration for PWA support
 */
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for service worker updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.info('New PWA version available. Reload to update.');
                } else {
                  console.info('PWA content is cached for offline use.');
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error);
        });
    });
  }
}
