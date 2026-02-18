// src/components/Navbar.js
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../style.css';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

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
  } catch { }

  const role = String(
    ctxUser?.role ?? stored?.role ?? stored?.rol ?? 'invitado'
  ).toLowerCase();

  const isActive = (to) => (pathname === to ? 'active-link' : '');
  const goLogin = () => navigate('/', { replace: true });

  const homeByRole =
    role === 'organizador' ? '/home'
      : role === 'jugador' ? '/home'
        : '/home';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo-container">
          <Link to={homeByRole}>
            <img src={logo} alt="Logo" className="navbar-logo" />
          </Link>
        </div>

        <div className="navbar-links">
          {/* Comunes */}
          <Link to="/torneosllave" className={`nav-link ${isActive('/torneosllave')}`}><span>TORNEOS</span></Link>
          <Link to="/ranking" className={`nav-link ${isActive('/ranking')}`}><span>RANKING</span></Link>

          {/* Invitado */}
          {role === 'invitado' && (
            <button className="nav-logout" onClick={goLogin}>LOGIN</button>
          )}

          {/* Jugador */}
          {role === 'jugador' && (
            <>
              <Link to="/inscripcion" className={`nav-link ${isActive('/inscripcion')}`}><span>INSCRIPCIÓN</span></Link>
              <Link to="/perfil" className={`nav-link ${isActive('/perfil')}`}><span>MI PERFIL</span></Link>
              <button className="nav-logout" onClick={ctxLogout} title="Cerrar Sesión">
                <LogOut size={20} />
              </button>
            </>
          )}

          {/* Organizador */}
          {role === 'organizador' && (
            <>
              <Link to="/crear-torneo" className={`nav-link ${isActive('/crear-torneo')}`}><span>CREAR TORNEO</span></Link>
              <Link to="/cargar-resultado" className={`nav-link ${isActive('/cargar-resultado')}`}><span>RESULTADOS</span></Link>
              <Link to="/admin/jugadores" className={`nav-link ${isActive('/admin/jugadores')}`}><span>JUGADORES</span></Link>
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}><span>DASHBOARD</span></Link>
              <Link to="/perfil" className={`nav-link ${isActive('/perfil')}`}><span>MI PERFIL</span></Link>
              <button className="nav-logout" onClick={ctxLogout} title="Cerrar Sesión">
                <LogOut size={20} />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
