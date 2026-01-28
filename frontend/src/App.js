// src/App.js
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import CrearTorneo from './pages/CrearTorneo'
import Ranking from './pages/Ranking'
import CargarResultado from './pages/CargarResultado'
import Registro from './pages/Registro';
import RegistroOrganizador from './pages/RegistroOrganizador'; // 👈 import
import MisTorneosOrganizador from './pages/MisTorneosOrganizador';
import Inscripcion from './pages/Inscripcion';
import Torneos from './pages/Torneos';
import Dashboard from './pages/Dashboard';           // 👈 nuevo
import AdminJugadores from './pages/AdminJugadores'; // 👈 nuevo
import Perfil from './pages/Perfil';                 // 👈 nuevo
import LayoutBase from './layout/LayoutBase';         // 👈 layout
import axios from 'axios';

// axios (igual que ya tenías)
axios.defaults.baseURL = 'http://localhost:3000';
axios.interceptors.request.use((config) => {
  const raw = localStorage.getItem('user');
  const token = raw ? JSON.parse(raw).token : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
axios.interceptors.response.use(
  r => r,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) alert('Acceso denegado: iniciá sesión.');
    if (status === 403) alert('Acceso denegado: no tenés permisos.');
    return Promise.reject(error);
  }
);

// helpers (igual que ya tenías)
function getStoredUser() {
  try { const raw = localStorage.getItem('user'); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function getRole() {
  const u = getStoredUser();
  const r = (u?.role ?? u?.rol ?? 'invitado');
  return typeof r === 'string' ? r.toLowerCase() : 'invitado';
}
function homeByRole(role) {
  return role === 'organizador' ? '/home-organizador'
    : role === 'jugador' ? '/home-jugador'
      : '/home-invitado';
}
function ProtectedRoute({ allow = [], children }) {
  const user = getStoredUser();
  const role = getRole();

  if (!user) {
    // Si no hay usuario logueado, mandar al login
    return <Navigate to="/" replace />;
  }

  if (allow.length && !allow.map(r => r.toLowerCase()).includes(role)) {
    alert('Acceso denegado');
    return <Navigate to={homeByRole(role)} replace />;
  }
  return children;
}

function App() {
  return (
    <LayoutBase>
      <Routes>

        {/* públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/registro-admin" element={<RegistroOrganizador />} /> {/* 👈 RUTA SECRETA */}

        {/* =========================================================
            RUTAS PROTEGIDAS (Requieren Login)
           ========================================================= */}

        {/* 1. Rutas accesibles para CUALQUIER rol (organizador, jugador, invitado)
               pero que requieren estar logueado (no acceso por URL directa). */}
        <Route path="/ranking" element={
          <ProtectedRoute allow={['organizador', 'jugador', 'invitado']}><Ranking /></ProtectedRoute>
        } />
        <Route path="/torneosllave" element={
          <ProtectedRoute allow={['organizador', 'jugador', 'invitado']}><Torneos /></ProtectedRoute>
        } />


        {/* 2. Homes Específicos por Rol */}
        <Route path="/home" element={
          // Un /home genérico podría redirigir según rol o mostrar algo común
          <ProtectedRoute allow={['organizador', 'jugador', 'invitado']}><Home /></ProtectedRoute>
        } />
        <Route path="/home-organizador" element={
          <ProtectedRoute allow={['organizador']}><Home /></ProtectedRoute>
        } />
        <Route path="/home-jugador" element={
          <ProtectedRoute allow={['jugador']}><Home /></ProtectedRoute>
        } />
        <Route path="/home-invitado" element={
          <ProtectedRoute allow={['invitado']}><Home /></ProtectedRoute>
        } />

        {/* 3. Rutas de ORGANIZADOR */}
        <Route path="/crear-torneo" element={
          <ProtectedRoute allow={['organizador']}><CrearTorneo /></ProtectedRoute>
        } />
        <Route path="/cargar-resultado" element={
          <ProtectedRoute allow={['organizador']}><CargarResultado /></ProtectedRoute>
        } />
        <Route path="/organizador/torneos" element={
          <ProtectedRoute allow={['organizador']}><MisTorneosOrganizador /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute allow={['organizador']}><Dashboard /></ProtectedRoute>
        } />
        <Route path="/admin/jugadores" element={
          <ProtectedRoute allow={['organizador']}><AdminJugadores /></ProtectedRoute>
        } />

        {/* 4. Rutas de JUGADOR */}
        <Route path="/inscripcion" element={
          <ProtectedRoute allow={['jugador']}><Inscripcion /></ProtectedRoute>
        } />
        <Route path="/perfil" element={
          <ProtectedRoute allow={['organizador', 'jugador']}><Perfil /></ProtectedRoute>
        } />
      </Routes>
    </LayoutBase>
  );
}

export default App;
