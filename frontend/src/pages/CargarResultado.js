import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';
import '../style.css';

function CargarResultado() {
  const [torneos, setTorneos] = useState([]);
  const [torneoId, setTorneoId] = useState('');
  const [grupos, setGrupos] = useState([]);
  const [resultados, setResultados] = useState({});
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/torneos`)
      .then(res => setTorneos(res.data))
      .catch(() => console.error('Error al cargar torneos'));
  }, []);

  useEffect(() => {
    if (!torneoId) return;

    axios.get(`${process.env.REACT_APP_API_URL}/torneos/${torneoId}/grupos`)
      .then(res => setGrupos(res.data.grupos || []))
      .catch(err => {
        console.error('Error al obtener grupos', err);
        setGrupos([]);
      });
  }, [torneoId]);

  const handleInputChange = (partidoId, campo, valor) => {
    setResultados(prev => ({
      ...prev,
      [partidoId]: {
        ...prev[partidoId],
        [campo]: valor
      }
    }));
  };

  const guardarResultado = async (partido) => {
    const data = resultados[partido.id];
    if (!data) return;

    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/partidos/${partido.id}/resultado`, data);
      alert('Resultado guardado');
    } catch (err) {
      console.error('Error al guardar resultado:', err);
      alert('Error al guardar resultado');
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo-container">
          <Link to="/home-organizador">
            <img src={logo} alt="Logo" className="navbar-logo" />
          </Link>
        </div>

        <div className="navbar-links">
          <Link to="/crear-torneo">Crear Torneo</Link>
          <Link to="/ranking">Ranking</Link>
          <Link to="/subir-multimedia">Multimedia</Link>
          <Link to="/cargar-resultado" className={isActive('/crear-torneo') ? 'active-link' : ''}>
            Resultados
          </Link>
          <Link to="/cargar-transmision">Transmisión</Link>
        </div>
      </nav>

      <div className="cargar-resultado-container">
        <h2 className="titulo">Cargar Resultados - Fase de Grupos</h2>

        <label className="inscripcion-label">Seleccioná torneo:</label>
        <select className="inscripcion-select" value={torneoId} onChange={e => setTorneoId(e.target.value)}>
          <option value="">-- Seleccioná --</option>
          {torneos.map(t => (
            <option key={t.id_torneo} value={t.id_torneo}>{t.nombre_torneo}</option>
          ))}
        </select>

        {Array.isArray(grupos) && grupos.map((grupo, index) => (
          <div key={index} className="grupo-tarjeta">
            <h3 className="grupo-titulo">{grupo.nombre}</h3>

            {grupo.partidos.map(partido => {
              let estadoClass = 'partido-finalizado';
              if (partido.estado === 'iniciado') estadoClass = 'partido-iniciado';
              if (partido.estado === 'no_iniciado') estadoClass = 'partido-no-iniciado';

              return (
                <div key={partido.id} className={`partido-card ${estadoClass}`}>
                  <h4 className="partido-vs">{partido.equipo1} vs {partido.equipo2}</h4>

                  <div className="inputs-sets">
                    <div>
                      <label>Sets {partido.equipo1}</label>
                      <input type="number" onChange={e => handleInputChange(partido.id, 'set1_equipo1', e.target.value)} />
                      <input type="number" onChange={e => handleInputChange(partido.id, 'set2_equipo1', e.target.value)} />
                      <input type="number" onChange={e => handleInputChange(partido.id, 'set3_equipo1', e.target.value)} />
                    </div>
                    <div>
                      <label>Sets {partido.equipo2}</label>
                      <input type="number" onChange={e => handleInputChange(partido.id, 'set1_equipo2', e.target.value)} />
                      <input type="number" onChange={e => handleInputChange(partido.id, 'set2_equipo2', e.target.value)} />
                      <input type="number" onChange={e => handleInputChange(partido.id, 'set3_equipo2', e.target.value)} />
                    </div>
                  </div>

                  <button className="btn-guardar" onClick={() => guardarResultado(partido)}>Guardar</button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

export default CargarResultado;
