import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Mount React root immediately so the UI is visible right away
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

// Safely register service worker with auto-update for installed Android & iOS phones
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Periodically check for new updates
        reg.update();

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                // New version is installed and ready, reload to display fresh layout
                console.log('New roster version installed, applying update...');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('Service worker note:', err);
      });
  });
}
