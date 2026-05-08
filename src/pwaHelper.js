// Service Worker registration + PWA install prompt
// Import this in main.jsx

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered:', reg.scope);

        // Check for updates periodically
        setInterval(() => reg.update(), 1000 * 60 * 60); // hourly
      } catch (err) {
        console.warn('SW registration failed:', err);
      }
    });
  }
}

// PWA install prompt handler
let deferredPrompt = null;

export function initInstallPrompt(onCanInstall) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (onCanInstall) onCanInstall(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (onCanInstall) onCanInstall(false);
  });
}

export async function showInstallPrompt() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}

export function canInstall() {
  return deferredPrompt !== null;
}
