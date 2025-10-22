import { Link } from 'react-router-dom';
import logo from '../assets/logo.png'; // Asegurate de tener la ruta correcta

function HomeInvitado() {
  return (
    <>
      <nav className="navbar">
        <img src={logo} alt="Logo" className="navbar-logo" />
        <div className="navbar-links">
          <Link to="/torneosLlave">Torneos</Link>  
          <Link to="/ranking">Ranking</Link>
        </div>
      </nav>

      {/* El resto de tu contenido */}
    </>
  );
}

export default HomeInvitado;
