import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Debug: Log environment variables on app startup
if (import.meta.env.DEV) {
  console.log('=== FishMap Environment Variables ===');
  console.log('Mode:', import.meta.env.MODE);
  console.log('Base URL:', import.meta.env.BASE_URL);
  console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL || 'NOT SET');
  console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET');
  console.log('API URL:', import.meta.env.VITE_API_URL || 'NOT SET');
  console.log('=====================================');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
