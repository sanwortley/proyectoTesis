import { Link } from 'react-router-dom';
import logo from '../assets/logo.png'; // Asegurate de tener la ruta correcta
import useLogout from '../hooks/useLogout';

function HomeJugador() {
  const logout = useLogout();
  return (
    <>
      <nav className="navbar">
        <img src={logo} alt="Logo" className="navbar-logo" />
        <div className="navbar-links">
          <Link to="/torneosLlave">Torneos</Link>  
          <Link to="/inscripcion">Inscripcion</Link>
          <Link to="/ranking">Ranking</Link>
          <button className="logout-btn" onClick={logout}>Cerrar sesión</button>
        </div>
      </nav>

      {/* El resto de tu contenido */}
    </>
  );
}

export default HomeJugador;
