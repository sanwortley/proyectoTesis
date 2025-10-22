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

  // Playoff
  const [playoff, setPlayoff] = useState(null);
  const [loadingPlayoff, setLoadingPlayoff] = useState(false);
  const [errorPlayoff, setErrorPlayoff] = useState('');
  const [gruposCompletos, setGruposCompletos] = useState(false);

  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // Cargar categorías
  useEffect(() => {
    axios.get('http://localhost:3000/api/categorias')
      .then(res => setCategorias(res.data))
      .catch(err => console.error('Error al obtener categorías:', err));
  }, []);

  // Cargar torneos
  useEffect(() => {
    axios.get('http://localhost:3000/api/torneos')
      .then(res => setTorneos(res.data))
      .catch(err => console.error('Error al obtener torneos:', err));
  }, []);

  // Torneos filtrados por mes + categoría (para header y selección)
  // Filtrar por mes + categoría
const torneosFiltrados = torneos.filter(t => {
  const fecha = new Date(t.fecha_inicio);
  const coincideMes = fecha.getMonth() === mesSeleccionado;
  const catObj = categorias.find(c => c.nombre === categoriaSeleccionada);
  const coincideCategoria = catObj ? t.categoria === catObj.id_categoria : true;
  return coincideMes && coincideCategoria;
});

// 🔧 Ordená por fecha_inicio DESC y tomá el más reciente
const torneoActual = [...torneosFiltrados]
  .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio))[0];

const torneoFinalizado = torneoActual ? new Date(torneoActual.fecha_fin) < new Date() : false;


  // Cargar grupos del torneo seleccionado
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
      .then(res => setGrupos(res.data.grupos || []))
      .catch(err => {
        console.error('Error al obtener grupos:', err);
        setGrupos([]);
      });
  }, [categoriaSeleccionada, torneos, categorias, mesSeleccionado]);

  // Detectar si todos los partidos de grupos están finalizados
  useEffect(() => {
    const completos = grupos.length > 0 && grupos.every(g =>
      (g.partidos?.length ?? 0) > 0 &&
      g.partidos.every(p => p.estado === 'finalizado')
    );
    setGruposCompletos(completos);
  }, [grupos]);

  // Cargar Play-off cuando: fase === 'playoffs' && gruposCompletos && hay torneoActual
 useEffect(() => {
}, [torneoActual]);

useEffect(() => {
  const run = async () => {
    if (fase !== 'playoffs' || !torneoActual) { setPlayoff(null); return; }
    try {
      setLoadingPlayoff(true);
      setErrorPlayoff('');
      const url = `http://localhost:3000/api/torneos/${torneoActual.id_torneo}/playoff`;
      console.log('[UI] GET', url);
      const r1 = await axios.get(url);
      console.log('[UI] GET data', r1.data);
      const hay = r1?.data?.rondas && Object.keys(r1.data.rondas).length > 0;
      if (hay) { setPlayoff(r1.data.rondas); return; }
      // … (el resto igual)
    } catch (e) {
      // …
    } finally {
      setLoadingPlayoff(false);
    }
  };
  run();
}, [fase, torneoActual]);



  // Generar Play-off (si no existe)
  async function generarPlayoff() {
    if (!torneoActual) return;
    try {
      setLoadingPlayoff(true);
      setErrorPlayoff('');
      await axios.post(`http://localhost:3000/api/torneos/${torneoActual.id_torneo}/playoff`);
      const { data } = await axios.get(`http://localhost:3000/api/torneos/${torneoActual.id_torneo}/playoff`);
      setPlayoff(data.rondas || {});
    } catch (e) {
      console.error('Error al generar play-off:', e);
      const msg = e?.response?.data?.error || 'No se pudo generar el play-off';
      setErrorPlayoff(msg);
    } finally {
      setLoadingPlayoff(false);
    }
  }

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

      {/* ===== FASE DE GRUPOS ===== */}
      {fase === 'grupos' ? (
        grupos.length === 0 ? (
          <div className="mensaje-sin-grupos">
            No hay grupos generados para esta categoría.
          </div>
        ) : (
          <>
            {!gruposCompletos && (
              <div className="banner-aviso">🕒 Esperando resultados de la fase de grupos</div>
            )}
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
          </>
        )
      ) : (
        /* ===== PLAY-OFFS ===== */
<div className="playoff-wrapper">
  {!torneoActual ? (
    <div className="mensaje-playoff">Elegí una categoría y mes.</div>
  ) : (
    <>
      <div className="playoff-header">
        <h3>
          Llaves — {categoriaSeleccionada || 'Categoría'}
          {' '}
          <small style={{ opacity: 0.6 }}>ID torneo: {torneoActual?.id_torneo}</small>
          {' '}| {new Date(torneoActual.fecha_inicio).toLocaleDateString()} → {new Date(torneoActual.fecha_fin).toLocaleDateString()}
        </h3>

        <div className="playoff-actions">
          <button
            onClick={generarPlayoff}
            disabled={loadingPlayoff}
            className="boton-fase"
            title="Generar cruces de play-off"
          >
            {loadingPlayoff ? 'Generando…' : 'Generar Play-off'}
          </button>
        </div>
      </div>

      {errorPlayoff && <div className="error">{errorPlayoff}</div>}

      {loadingPlayoff ? (
        <div className="mensaje-playoff">Cargando play-off…</div>
      ) : playoff && Object.keys(playoff).length > 0 ? (
        // ======= NUEVA VISTA TIPO LLAVES OPUESTAS =======
        <div className="bracket-container">
          {['OCTAVOS', 'CUARTOS', 'SEMIS', 'FINAL']
            .filter(r => playoff[r]?.length)
            .map(ronda => (
              <div key={ronda} className="bracket-round">
                <h4 className="bracket-round-title">{ronda}</h4>
                <div className="bracket-matches">
                  {playoff[ronda].map(match => (
                    <div key={match.id} className={`match-card ${match.estado}`}>
                      <div className="match-team team1">
                        <span className="team-name">{match.equipo1_nombre || '—'}</span>
                        <span className="team-score">
                          {[match.set1_equipo1, match.set2_equipo1, match.set3_equipo1]
                            .filter(v => v !== null && v !== undefined)
                            .join(' ')}
                        </span>
                      </div>

                      <div className="match-vs">vs</div>

                      <div className="match-team team2">
                        <span className="team-name">{match.equipo2_nombre || '—'}</span>
                        <span className="team-score">
                          {[match.set1_equipo2, match.set2_equipo2, match.set3_equipo2]
                            .filter(v => v !== null && v !== undefined)
                            .join(' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
        // ================================================
      ) : (
        <>
          {!gruposCompletos && (
            <div className="banner-aviso">🕒 Esperando resultados de la fase de grupos</div>
          )}
          <div className="mensaje-playoff">
            No hay llaves generadas todavía. Hacé clic en <b>Generar Play-off</b>.
          </div>
        </>
      )}
    </>
  )}
</div>

      )}
    </div>
  </>
);

}

export default Torneos;
