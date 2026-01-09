import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SupabaseProvider } from './contexts/SupabaseProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SupabaseProvider>
        <App />
      </SupabaseProvider>
    </BrowserRouter>
  </StrictMode>,
)
