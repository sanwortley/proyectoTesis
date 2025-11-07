// src/components/Navbar.js
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../style.css';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // ✅ Llamar SIEMPRE a useAuth (sin condicionales)
  const auth = useAuth(); // suponiendo que existe el provider en el árbol

  // Fallbacks por si tu AuthContext aún no tiene todas estas props
  const ctxUser = auth?.user ?? auth?.jugador ?? null;
  const ctxLogout = auth?.logout ?? (() => {
    localStorage.removeItem('user');
    localStorage.removeItem('jugador');
    localStorage.removeItem('token');
    navigate('/', { replace: true });
  });

  // Leer del LS si no hay user en contexto
  let stored = null;
  try {
    stored =
      JSON.parse(localStorage.getItem('user')) ??
      JSON.parse(localStorage.getItem('jugador'));
  } catch {}

  const role = String(
    ctxUser?.role ?? stored?.role ?? stored?.rol ?? 'invitado'
  ).toLowerCase();

  const isActive = (to) => (pathname === to ? 'active-link' : '');
  const goLogin = () => navigate('/', { replace: true });

  const homeByRole =
    role === 'organizador' ? '/home'
  : role === 'jugador'     ? '/home'
  : '/home';

  return (
    <nav className="navbar">
      <div className="navbar-logo-container">
        <Link to={homeByRole}>
          <img src={logo} alt="Logo" className="navbar-logo" />
        </Link>
      </div>

      <div className="navbar-links">
        {/* Comunes */}
        <Link to="/torneosllave" className={isActive('/torneosllave')}>Torneos</Link>
        <Link to="/ranking" className={isActive('/ranking')}>Ranking</Link>

        {/* Invitado */}
        {role === 'invitado' && (
          <button className="link-button" onClick={goLogin}>Volver al login</button>
        )}

        {/* Jugador */}
        {role === 'jugador' && (
          <>
            <Link to="/inscripcion" className={isActive('/inscripcion')}>Inscripción</Link>
            <button className="logout-btn" onClick={ctxLogout}>Cerrar sesión</button>
          </>
        )}

        {/* Organizador */}
        {role === 'organizador' && (
          <>
            <Link to="/crear-torneo" className={isActive('/crear-torneo')}>Crear Torneo</Link>
            <Link to="/cargar-resultado" className={isActive('/cargar-resultado')}>Resultados</Link>
            <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
            <button className="logout-btn" onClick={ctxLogout}>Cerrar sesión</button>
          </>
        )}
      </div>
    </nav>
  );
}
