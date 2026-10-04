import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './utils/registerServiceWorker';
import { initGlobalClickTracking } from './services/analytics';

// Register Service Worker for PWA / Chrome installability
registerServiceWorker();

// Initialize global analytics click tracking
initGlobalClickTracking();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

