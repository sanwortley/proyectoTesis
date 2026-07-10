// src/components/Navbar.js
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../style.css';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        '--navbar-height',
        `${el.getBoundingClientRect().height}px`
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const auth = useAuth();
  const ctxUser = auth?.user ?? auth?.jugador ?? null;
  const ctxLogout = auth?.logout ?? (() => {
    localStorage.removeItem('user');
    localStorage.removeItem('jugador');
    localStorage.removeItem('token');
    navigate('/', { replace: true });
  });

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

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav ref={navRef} className={`navbar${scrolled ? ' navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo-container">
          <Link to={homeByRole} onClick={closeMenu}>
            <img src={logo} alt="Logo" className="navbar-logo" />
          </Link>
        </div>

        <button
          className="navbar-hamburger"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Menú"
        >
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {/* Comunes */}
          <Link to="/torneosllave" className={`nav-link ${isActive('/torneosllave')}`} onClick={closeMenu}><span>TORNEOS</span></Link>
          <Link to="/ranking" className={`nav-link ${isActive('/ranking')}`} onClick={closeMenu}><span>RANKING</span></Link>

          {/* Invitado */}
          {role === 'invitado' && (
            <button className="nav-logout" onClick={() => { closeMenu(); goLogin(); }}>LOGIN</button>
          )}

          {/* Jugador */}
          {role === 'jugador' && (
            <>
              <Link to="/inscripcion" className={`nav-link ${isActive('/inscripcion')}`} onClick={closeMenu}><span>INSCRIPCIÓN</span></Link>
              <Link to="/perfil" className={`nav-link ${isActive('/perfil')}`} onClick={closeMenu}><span>MI PERFIL</span></Link>
              <button className="nav-logout" onClick={() => { closeMenu(); ctxLogout(); }} title="Cerrar Sesión">
                <LogOut size={20} />
              </button>
            </>
          )}

          {/* Organizador */}
          {role === 'organizador' && (
            <>
              <Link to="/crear-torneo" className={`nav-link ${isActive('/crear-torneo')}`} onClick={closeMenu}><span>CREAR TORNEO</span></Link>
              <Link to="/cargar-resultado" className={`nav-link ${isActive('/cargar-resultado')}`} onClick={closeMenu}><span>RESULTADOS</span></Link>
              <Link to="/admin/jugadores" className={`nav-link ${isActive('/admin/jugadores')}`} onClick={closeMenu}><span>JUGADORES</span></Link>
              <Link to="/admin/inscripcion" className={`nav-link ${isActive('/admin/inscripcion')}`} onClick={closeMenu}><span>INSCRIBIR</span></Link>
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`} onClick={closeMenu}><span>DASHBOARD</span></Link>
              <Link to="/perfil" className={`nav-link ${isActive('/perfil')}`} onClick={closeMenu}><span>MI PERFIL</span></Link>
              <button className="nav-logout" onClick={() => { closeMenu(); ctxLogout(); }} title="Cerrar Sesión">
                <LogOut size={20} />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
