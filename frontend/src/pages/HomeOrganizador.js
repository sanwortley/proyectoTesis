import { Link } from 'react-router-dom';
import logo from '../assets/logo.png'; // Asegurate de tener la ruta correcta

function HomeOrganizador() {
  return (
    <>
      <nav className="navbar">
        <img src={logo} alt="Logo" className="navbar-logo" />
        <div className="navbar-links">
          <Link to="/crear-torneo">Crear Torneo</Link>
          <Link to="/ranking">Ranking</Link>
          <Link to="/subir-multimedia">Multimedia</Link>
          <Link to="/cargar-resultado">Resultados</Link>
          <Link to="/cargar-transmision">Transmisión</Link>
        </div>
      </nav>

      {/* El resto de tu contenido */}
    </>
  );
}

export default HomeOrganizador;