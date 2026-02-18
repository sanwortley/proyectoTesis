// src/pages/MisTorneosOrganizador.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../style.css';

function MisTorneosOrganizador() {
  const [torneos, setTorneos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState('');

  // Cargar torneos + categorías
  useEffect(() => {
    (async () => {
      try {
        const [resT, resC] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/torneos`),
          axios.get(`${process.env.REACT_APP_API_URL}/categorias`)
        ]);

        setTorneos(resT.data || []);
        setCategorias(resC.data || []);
      } catch (err) {
        setError('Error al cargar los torneos');
      }
    })();
  }, []);

  // Helper: obtener nombre de categoría por ID
  const getCategoriaNombre = (idCat) => {
    if (!idCat) return '';
    const cat = categorias.find(c => c.id_categoria === idCat);
    return cat ? cat.nombre : `Cat ${idCat}`;
  };

  return (
    <>
      <div className="crear-torneo-container">
        <h2>Mis Torneos</h2>

        {error && <p className="error">{error}</p>}

        {torneos.length === 0 ? (
          <p>No hay torneos creados aún.</p>
        ) : (
          <div className="lista-torneos">
            {torneos.map((torneo) => (
              <div key={torneo.id_torneo} className="torneo-card">

                <h3>{torneo.nombre_torneo}</h3>

                {/* FORMATO DEL TORNEO */}
                {torneo.formato_categoria === 'categoria_fija' ? (
                  <p><strong>Categoría:</strong> {getCategoriaNombre(torneo.categoria_id)}</p>
                ) : (
                  <p><strong>Formato:</strong> SUMA {torneo.suma_categoria}</p>
                )}

                <p><strong>Inicio:</strong> {new Date(torneo.fecha_inicio).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</p>
                <p><strong>Fin:</strong> {new Date(torneo.fecha_fin).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</p>
                <p><strong>Cierre de inscripción:</strong> {new Date(torneo.fecha_cierre_inscripcion).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</p>
                <p><strong>Máx. equipos:</strong> {torneo.max_equipos}</p>

                <div className="botones-acciones">
                  <Link to={`/torneo/${torneo.id_torneo}/grupos`} className="boton-ver">
                    Ver Grupos
                  </Link>
                  <Link to={`/torneo/${torneo.id_torneo}/llaves`} className="boton-ver">
                    Ver Llaves
                  </Link>
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
