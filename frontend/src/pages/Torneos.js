import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';
import '../style.css';

function Torneos() {
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [torneos, setTorneos] = useState([]);
  const [fase, setFase] = useState('grupos');
  const [grupos, setGrupos] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());


  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    axios.get('http://localhost:3000/api/categorias')
      .then(res => setCategorias(res.data))
      .catch(err => console.error('Error al obtener categorías:', err));
  }, []);

  useEffect(() => {
    axios.get('http://localhost:3000/api/torneos')
      .then(res => setTorneos(res.data))
      .catch(err => console.error('Error al obtener torneos:', err));
  }, []);

  // useEffect para cargar grupos
  useEffect(() => {
    const filtrados = torneos.filter(t => {
      const fecha = new Date(t.fecha_inicio);
      const coincideMes = fecha.getMonth() === mesSeleccionado;
      const categoriaObj = categorias.find(c => c.nombre === categoriaSeleccionada);
      const coincideCategoria = categoriaObj ? t.categoria === categoriaObj.id_categoria : true;
      return coincideMes && coincideCategoria;
    });

    if (filtrados.length === 0) {
      setGrupos([]);
      return;
    }

    const torneo = filtrados[0];
    axios.get(`http://localhost:3000/api/torneos/${torneo.id_torneo}/grupos`)
      .then(res => setGrupos(res.data.grupos))
      .catch(err => console.error('Error al obtener grupos:', err));
  }, [categoriaSeleccionada, torneos, categorias, mesSeleccionado]);

  // Lógica para mostrar torneo actual en el header
  const torneosFiltrados = torneos.filter(t => {
    const fecha = new Date(t.fecha_inicio);
    const coincideMes = fecha.getMonth() === mesSeleccionado;
    const categoriaObj = categorias.find(c => c.nombre === categoriaSeleccionada);
    const coincideCategoria = categoriaObj ? t.categoria === categoriaObj.id_categoria : true;
    return coincideMes && coincideCategoria;
  });

  const torneoActual = torneosFiltrados[0];
  const torneoFinalizado = torneoActual ? new Date(torneoActual.fecha_fin) < new Date() : false;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo-container">
          <Link to="/home-jugador">
            <img src={logo} alt="Logo" className="navbar-logo" />
          </Link>
        </div>

        <div className="navbar-links">
          <Link to="/torneosllave" className={isActive('/torneosllave') ? 'active-link' : ''}>Torneos</Link>
          <Link to="/inscripcion">Inscripción</Link>
          <Link to="/ranking">Ranking</Link>
          <Link to="/multimedia">Multimedia</Link>
          <Link to="/transmision">Transmisión</Link>
        </div>
      </nav>

      <div className="meses-scroll">
        {Array.from({ length: 12 }, (_, i) => (
          <button
            key={i}
            className={i === mesSeleccionado ? 'mes-activo' : ''}
            onClick={() => setMesSeleccionado(i)}
          >
            {new Date(0, i).toLocaleString('es-ES', { month: 'long' }).toUpperCase()}
          </button>
        ))}
      </div>

      <div className="torneo-categorias-container">
        <h2 className="torneo-categorias-titulo">Torneos por categoría</h2>

        <div className="torneo-selector-container">
          <div className="torneo-selector">
            <select
              value={categoriaSeleccionada}
              onChange={e => setCategoriaSeleccionada(e.target.value)}
            >
              <option value="">Seleccioná una categoría</option>
              {categorias.map(cat => (
                <option key={cat.id_categoria} value={cat.nombre}>{cat.nombre}</option>
              ))}
            </select>

            {torneosFiltrados.length > 0 && categoriaSeleccionada && (() => {
              const torneo = torneosFiltrados[0];
              return (
                <p className="fecha-torneo-info">
                  <strong>{new Date(torneo.fecha_inicio).toLocaleDateString()}</strong> al <strong>{new Date(torneo.fecha_fin).toLocaleDateString()}</strong>
                </p>
              );
            })()}

            <button
              className={fase === 'grupos' ? 'boton-fase activo' : 'boton-fase'}
              onClick={() => setFase('grupos')}
            >
              Fase de grupos
            </button>
            <button
              className={fase === 'playoffs' ? 'boton-fase activo' : 'boton-fase'}
              onClick={() => setFase('playoffs')}
            >
              Play-offs
            </button>
          </div>
        </div>

        {fase === 'grupos' ? (
          grupos.length === 0 ? (
            <div className="mensaje-sin-grupos">
              No hay grupos generados para esta categoría.
            </div>
          ) : (
            <div className="grupos-grid">
              {grupos.map(grupo => (
                <div
                key={grupo.id_grupo}
                className={`grupo-tarjeta ${torneoFinalizado ? 'grupo-finalizado' : ''}`}
              >              
                  <h3 className="grupo-titulo">{grupo.nombre}</h3>
                  <table className="grupo-tabla">
                    <thead>
                      <tr className="grupo-tabla-encabezado">
                        <th>#</th>
                        <th>Equipo</th>
                        <th>PJ</th>
                        <th>PTS</th>
                        <th>Sets +</th>
                        <th>Sets -</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.equipos.map((e, i) => (
                        <tr key={e.equipo_id} className="grupo-tabla-fila">
                          <td>{i + 1}</td>
                          <td className="grupo-equipo-nombre">{e.nombre_equipo}</td>
                          <td>{e.partidos_jugados}</td>
                          <td>{e.puntos}</td>
                          <td>{e.sets_favor}</td>
                          <td>{e.sets_contra}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h4 className="grupo-subtitulo">Partidos</h4>
                  <div className="grupo-partidos">
                    {grupo.partidos.map(p => {
                      let estadoClass = 'partido-finalizado';
                      if (p.estado === 'iniciado') estadoClass = 'partido-iniciado';
                      if (p.estado === 'no_iniciado') estadoClass = 'partido-no-iniciado';
                      const setsCargados = p.set1_equipo1 !== null && p.set1_equipo2 !== null;
                      return (
                        <div key={p.id} className={`grupo-partido-card ${estadoClass}`}>
                          <div className="grupo-partido-detalle">
                            <div className="grupo-equipos">
                              <div>{p.equipo1}</div>
                              <div>{p.equipo2}</div>
                            </div>
                            {setsCargados ? (
                              <div className="grupo-sets">
                                <div>{p.set1_equipo1} {p.set2_equipo1} {p.set3_equipo1 ?? '-'}</div>
                                <div>{p.set1_equipo2} {p.set2_equipo2} {p.set3_equipo2 ?? '-'}</div>
                              </div>
                            ) : (
                              <div className="grupo-estado">{p.estado.replace('_', ' ')}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="mensaje-playoff">
            <p>Mostrando las llaves del torneo para <strong>{categoriaSeleccionada}</strong></p>
            <p className="mt-2">Próximamente: vista gráfica estilo playoffs</p>
          </div>
        )}
      </div>
    </>
  );
}

export default Torneos;
