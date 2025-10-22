// src/App.js
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import HomeJugador from './pages/HomeJugador';
import HomeOrganizador from './pages/HomeOrganizador';
import HomeInvitado from './pages/HomeInvitado';
import CrearTorneo from './pages/CrearTorneo'
import Ranking from './pages/Ranking'
import CargarResultado from './pages/CargarResultado'
import Registro from './pages/Registro';
import MisTorneosOrganizador from './pages/MisTorneosOrganizador';
import Inscripcion from './pages/Inscripcion';
import Torneos from './pages/Torneos';
import TorneosInvitados from './pages/TorneosInvitados';
import TorneosOrganizador from './pages/TorneosOrganizador';

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
      <Route path="/cargar-resultado" element={<CargarResultado />} />
      <Route path="/organizador/torneos" element={<MisTorneosOrganizador />} />
      <Route path="/inscripcion" element={<Inscripcion />} />
      <Route path="/torneosllave" element={<Torneos />} />
      <Route path="/torneosllaveinv" element={<TorneosInvitados />} />
     <Route path="/torneosllaveorg" element={<TorneosOrganizador />} />
      



    </Routes>
  );
}

export default App;
