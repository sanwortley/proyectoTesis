import { Link } from 'react-router-dom';
import logo from '../assets/logo.jpg'; // Asegurate de tener la ruta correcta

function HomeJugador() {
  return (
    <>
      <nav className="navbar">
        <img src={logo} alt="Logo" className="navbar-logo" />
        <div className="navbar-links">
          <Link to="/torneosLlave">Torneos</Link>  
          <Link to="/inscripcion">Inscripcion</Link>
          <Link to="/ranking">Ranking</Link>
          <Link to="/multimedia">Multimedia</Link>
          <Link to="/cargar-transmision">Transmisión</Link>
        </div>
      </nav>

      {/* El resto de tu contenido */}
    </>
  );
}

export default HomeJugador;