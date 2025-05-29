import { useEffect, useState } from 'react';
import axios from 'axios';
import logo from '../assets/logo.jpg';
import { Link } from 'react-router-dom';
import '../style.css';

function MisTorneosOrganizador() {
  const [torneos, setTorneos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/torneos`)
      .then(res => setTorneos(res.data))
      .catch(() => setError('Error al cargar los torneos'));
  }, []);

  return (
    <>
      <nav className="navbar">
        <Link to="/home-organizador">
          <img src={logo} alt="Logo" className="navbar-logo" />
        </Link>
      </nav>

      <div className="crear-torneo-container">
        <h2>Mis Torneos</h2>

        {error && <p className="error">{error}</p>}

        {torneos.length === 0 ? (
          <p>No hay torneos creados aún.</p>
        ) : (
          <div className="lista-torneos">
            {torneos.map((torneo) => (
              <div key={torneo.id_torneo} className="torneo-card">
                <h3>{torneo.nombre}</h3>
                <p><strong>Categoría:</strong> {torneo.categoria}</p>
                <p><strong>Inicio:</strong> {torneo.fecha_inicio}</p>
                <p><strong>Fin:</strong> {torneo.fecha_fin}</p>
                <p><strong>Cierre de inscripción:</strong> {torneo.cierre_inscripcion}</p>
                <p><strong>Máx. equipos:</strong> {torneo.cantidad_maxima_equipos}</p>
                <p><strong>Fase actual:</strong> {torneo.fase_actual}</p>

                {/* Reemplazá estas rutas por las reales si ya tenés views para grupos o fixture */}
                <div className="botones-acciones">
                  <Link to={`/torneo/${torneo.id_torneo}/grupos`} className="boton-ver">Ver Grupos</Link>
                  <Link to={`/torneo/${torneo.id_torneo}/llaves`} className="boton-ver">Ver Llaves</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default MisTorneosOrganizador;
