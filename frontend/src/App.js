// src/App.js
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import HomeJugador from './pages/HomeJugador';
import HomeOrganizador from './pages/HomeOrganizador';
import HomeInvitado from './pages/HomeInvitado';
import CrearTorneo from './pages/CrearTorneo'
import Ranking from './pages/Ranking'
import SubirMultimedia from './pages/SubirMultimedia'
import CargarResultado from './pages/CargarResultado'
import CargarTransmision from './pages/CargarTransmision'
import Registro from './pages/Registro';
import MisTorneosOrganizador from './pages/MisTorneosOrganizador';
import Inscripcion from './pages/Inscripcion';
import Torneos from './pages/Torneos';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/home-jugador" element={<HomeJugador />} />
      <Route path="/home-organizador" element={<HomeOrganizador />} />
      <Route path="/home-invitado" element={<HomeInvitado />} />
      <Route path="/crear-torneo" element={<CrearTorneo />} />
      <Route path="/ranking" element={<Ranking />} />
      <Route path="/subir-multimedia" element={<SubirMultimedia />} />
      <Route path="/cargar-resultado" element={<CargarResultado />} />
      <Route path="/cargar-transmision" element={<CargarTransmision />} />
      <Route path="/organizador/torneos" element={<MisTorneosOrganizador />} />
      <Route path="/inscripcion" element={<Inscripcion />} />
      <Route path="/torneosllave" element={<Torneos />} />
      



    </Routes>
  );
}

export default App;
