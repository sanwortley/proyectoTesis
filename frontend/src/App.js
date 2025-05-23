// src/App.js
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import HomeJugador from './pages/HomeJugador';
import HomeOrganizador from './pages/HomeOrganizador';
import HomeInvitado from './pages/HomeInvitado';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home-jugador" element={<HomeJugador />} />
      <Route path="/home-organizador" element={<HomeOrganizador />} />
      <Route path="/home-invitado" element={<HomeInvitado />} />
    </Routes>
  );
}

export default App;
