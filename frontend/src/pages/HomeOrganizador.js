import { Link } from 'react-router-dom';
import logo from '../assets/logo.png'; // Asegurate de tener la ruta correcta
import useLogout from '../hooks/useLogout';

function HomeOrganizador() {
  const logout = useLogout();
  return (
    <>
      <nav className="navbar">
        <img src={logo} alt="Logo" className="navbar-logo" />
        <div className="navbar-links">
          <Link to="/crear-torneo">Crear Torneo</Link>
          <Link to="/torneosllave">Torneos</Link>
          <Link to="/ranking">Ranking</Link>
          <Link to="/cargar-resultado">Resultados</Link>
          <button className="logout-btn" onClick={logout}>Cerrar sesión</button>
        </div>
      </nav>

      {/* El resto de tu contenido */}
    </>
  );
}

export default HomeOrganizador;