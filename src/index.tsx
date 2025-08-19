import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// F5更新問題の潜在的原因: React.StrictModeによるuseEffect二重実行を無効化してテスト
// 本番環境では有効にして、開発環境でのみ無効化
root.render(
  process.env.NODE_ENV === 'production' ? (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ) : (
    <App />
  )
);

// Service Worker Registration - Phase 1 Offline Support
if (false && (process.env.NODE_ENV === 'production' || process.env.REACT_APP_ENABLE_SW === 'true')) {
  import('./utils/serviceWorkerManager').then(({ serviceWorkerManager }) => {
    serviceWorkerManager.register().then((registration) => {
      console.log('✅ Service Worker registered successfully:', registration.scope);
      
      // Setup update notifications
      window.addEventListener('sw-update-available', (event: any) => {
        const { detail } = event;
        console.log('🔄 Service Worker update available:', detail.message);
        
        // You can integrate this with your UI notification system
        if (window.confirm('A new version is available. Update now?')) {
          detail.action();
        }
      });
      
      // Enable background sync for offline operations
      serviceWorkerManager.registerBackgroundSync('offline-sync').catch((error) => {
        console.warn('⚠️ Background sync registration failed:', error.message);
      });
      
    }).catch((error) => {
      console.error('❌ Service Worker registration failed:', error);
    });
  });
} else {
  console.log('🔧 Service Worker disabled in development mode');
  console.log('🔧 Set REACT_APP_ENABLE_SW=true to enable in development');
}