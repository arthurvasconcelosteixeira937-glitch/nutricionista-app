import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: registra o service worker (só no site publicado, não na pré-visualização de arquivo único).
if (import.meta.env.PROD && import.meta.env.MODE !== 'singlefile' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
