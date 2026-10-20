import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AvisoConexion from './components/AvisoConexion.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AvisoConexion />
  </StrictMode>,
)
