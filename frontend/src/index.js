// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Producción: REACT_APP_API_URL = URL del BACKEND (ej: https://xxx-b7ce.up.railway.app)
// Local dev: fallback a http://localhost:3000
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* ✅ El provider envuelve al Router y a toda la app */}
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
