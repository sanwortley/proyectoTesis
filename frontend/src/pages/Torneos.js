// src/pages/Torneos.js  (ÚNICA PÁGINA)
/* eslint-disable no-unused-vars */

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import '../style.css';

// ⬇️ Bracket invertido (archivo y estilos del componente)
import PlayoffBrackets from '../components/PlayoffBrackets';
import '../components/playoff.css';

import TeamAvatar from '../components/TeamAvatar';

const PERMISSIONS = {
  organizador: ['playoff.generar', 'torneos.crear'],
  jugador: [],
  invitado: []
};
const can = (role, perm) => PERMISSIONS[role]?.includes(perm);

// ⚠️ Fuente de verdad del ROL:
function getRole() {
  return localStorage.getItem('role') || 'jugador';
}

// Helper para mostrar nombre de categoría
function getCategoriaNombre(categorias, idCat) {
  if (!idCat) return '';
  const cat = categorias.find((c) => c.id_categoria === idCat);
  return cat ? cat.nombre : `Cat ${idCat}`;
}

export default function Torneos() {
  const role = getRole();

  const [categorias, setCategorias] = useState([]);
  /**
   * categoriaSeleccionada puede ser:
   *  - ''              → todas
   *  - 'SUMA'          → todos los torneos suma
   *  - 'SUMA_9'        → solo SUMA 9
   *  - 'SUMA_12'       → solo SUMA 12
   *  - nombre de cat.  → 4ta, 5ta, etc. (categoría fija)
   */
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [torneos, setTorneos] = useState([]);
  const [fase, setFase] = useState('grupos'); // 'grupos' | 'playoffs'
  const [grupos, setGrupos] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());


  // Playoff
  const [playoff, setPlayoff] = useState(null);
  const [loadingPlayoff, setLoadingPlayoff] = useState(false);
  const [errorPlayoff, setErrorPlayoff] = useState('');
  const [gruposCompletos, setGruposCompletos] = useState(false);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState(
    new Date().getFullYear()
  );


  // Base URL de axios (local dev)
  useEffect(() => {
    if (!axios.defaults.baseURL) {
      axios.defaults.baseURL = 'http://localhost:3000';
    }
  }, []);

  // Cargar categorías y torneos
  useEffect(() => {
    axios
      .get('/api/categorias')
      .then((r) => setCategorias(r.data))
      .catch(console.error);

    axios
      .get('/api/torneos/anios')
      .then((r) => {
        const currentYear = new Date().getFullYear();
        // Unir los años de la BD con el año actual, eliminando duplicados
        const yearsSet = new Set([...r.data, currentYear]);
        // Convertir a array y ordenar descendente
        const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

        setAniosDisponibles(sortedYears);

        // Si el año seleccionado (por defecto el actual) no está en la lista (raro porque lo acabamos de agregar), fallback
        if (!sortedYears.includes(anioSeleccionado)) {
          setAnioSeleccionado(sortedYears[0]);
        }
      })
      .catch(console.error);
  }, []);


  useEffect(() => {
    axios
      .get(`/api/torneos?anio=${anioSeleccionado}`)
      .then((r) => setTorneos(r.data))
      .catch(console.error);
  }, [anioSeleccionado]);


  // Opciones dinámicas de SUMA (9, 12, etc.), según lo que haya en la BD
  const sumaOptions = useMemo(() => {
    const set = new Set();
    torneos.forEach((t) => {
      if (t.formato_categoria === 'suma' && t.suma_categoria != null) {
        set.add(t.suma_categoria);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [torneos]);

  // Flags útiles para saber qué se eligió
  const isFiltroSumaGeneral = categoriaSeleccionada === 'SUMA';
  const isFiltroSumaEspecifico = categoriaSeleccionada.startsWith('SUMA_');
  const sumaValorSeleccionado = useMemo(() => {
    if (!isFiltroSumaEspecifico) return null;
    const [, valor] = categoriaSeleccionada.split('_');
    return Number(valor);
  }, [categoriaSeleccionada, isFiltroSumaEspecifico]);

  // Resolver id de categoría fija seleccionada
  const categoriaId = useMemo(() => {
    if (!categoriaSeleccionada || isFiltroSumaGeneral || isFiltroSumaEspecifico) {
      return null;
    }
    return (
      categorias.find((c) => c.nombre === categoriaSeleccionada)?.id_categoria ??
      null
    );
  }, [categorias, categoriaSeleccionada, isFiltroSumaGeneral, isFiltroSumaEspecifico]);

  // Filtrar torneos por mes + formato
  const torneosFiltrados = useMemo(() => {
    return torneos.filter((t) => {
      const mismoMes =
        new Date(t.fecha_inicio).getMonth() === mesSeleccionado;

      if (!mismoMes) return false;

      // Sin filtro → todos los torneos del mes
      if (!categoriaSeleccionada) return true;

      // Filtro general: "todos los torneos SUMA"
      if (isFiltroSumaGeneral) {
        return t.formato_categoria === 'suma';
      }

      // Filtro "SUMA_X" → SUMA 9, SUMA 12, etc.
      if (isFiltroSumaEspecifico) {
        return (
          t.formato_categoria === 'suma' &&
          t.suma_categoria === sumaValorSeleccionado
        );
      }

      // Filtro de categoría fija
      if (!categoriaId) return false;
      return (
        t.formato_categoria === 'categoria_fija' &&
        t.categoria_id === categoriaId
      );
    });
  }, [
    torneos,
    mesSeleccionado,
    categoriaSeleccionada,
    categoriaId,
    isFiltroSumaGeneral,
    isFiltroSumaEspecifico,
    sumaValorSeleccionado
  ]);

  // Ordenar torneos filtrados por fecha (descendente)
  const torneosOrdenados = useMemo(() => {
    return [...torneosFiltrados].sort(
      (a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio)
    );
  }, [torneosFiltrados]);

  // Estado para seleccionar torneo específico (si hay varios)
  const [selectedTorneoId, setSelectedTorneoId] = useState(null);

  // Efecto para autoseleccionar el primero al cambiar la lista
  useEffect(() => {
    if (torneosOrdenados.length > 0) {
      // Si no hay seleccionado, o el seleccionado ya no está en la lista filter, elegir el primero
      if (!selectedTorneoId || !torneosOrdenados.find(t => t.id_torneo === selectedTorneoId)) {
        setSelectedTorneoId(torneosOrdenados[0].id_torneo);
      }
    } else {
      setSelectedTorneoId(null);
    }
  }, [torneosOrdenados, selectedTorneoId]);

  // Torneo actual derivado del seleccionado
  const torneoActual = useMemo(() => {
    return torneosOrdenados.find(t => t.id_torneo === selectedTorneoId) || null;
  }, [torneosOrdenados, selectedTorneoId]);
  const hayTorneo = Boolean(torneoActual);


  const torneoFinalizado = torneoActual
    ? new Date(torneoActual.fecha_fin) < new Date()
    : false;

  // Cargar grupos del torneo actual
  useEffect(() => {
    // Resetear estados al cambiar de torneo
    setGrupos([]);
    setPlayoff(null);
    setErrorPlayoff('');

    if (!torneoActual) return;

    axios
      .get(`/api/torneos/${torneoActual.id_torneo}/grupos`)
      .then((res) => setGrupos(res.data.grupos || []))
      .catch(() => setGrupos([]));
  }, [torneoActual]);

  // Detectar si todos los partidos de grupos están finalizados
  useEffect(() => {
    const completos =
      grupos.length > 0 &&
      grupos.every(
        (g) =>
          (g.partidos?.length ?? 0) > 0 &&
          g.partidos.every((p) => p.estado === 'finalizado')
      );
    setGruposCompletos(completos);
  }, [grupos]);

  // (Efecto de limpieza eliminado para evitar race conditions con la carga de datos)

  // Leer/Generar playoff (estrategia unificada)
  useEffect(() => {
    const run = async () => {
      if (fase !== 'playoffs' || !torneoActual) {
        setPlayoff(null);
        return;
      }
      try {
        setLoadingPlayoff(true);
        setErrorPlayoff('');

        const url = `/api/torneos/${torneoActual.id_torneo}/playoff`;
        const r1 = await axios.get(url);
        const hay = r1?.data?.rondas && Object.keys(r1.data.rondas).length > 0;
        if (hay) {
          setPlayoff(r1.data.rondas);
          return;
        }

        // Solo organizador intenta generar
        if (can(role, 'playoff.generar')) {
          await axios.post(url);
          const r2 = await axios.get(url);
          setPlayoff(r2.data.rondas || {});
        } else {
          setPlayoff(null);
        }
      } catch (e) {
        const msg =
          e?.response?.data?.error || 'No se pudo cargar el play-off';
        setErrorPlayoff(msg);
        setPlayoff(null);
      } finally {
        setLoadingPlayoff(false);
      }
    };
    run();
  }, [fase, torneoActual, role]);

  // Acción manual de generación (botón SOLO organizador)
  async function generarPlayoff() {
    if (!torneoActual) return;
    try {
      setLoadingPlayoff(true);
      setErrorPlayoff('');
      await axios.post(`/api/torneos/${torneoActual.id_torneo}/playoff`);
      const { data } = await axios.get(
        `/api/torneos/${torneoActual.id_torneo}/playoff`
      );
      setPlayoff(data.rondas || {});
    } catch (e) {
      const msg =
        e?.response?.data?.error || 'No se pudo generar el play-off';
      setErrorPlayoff(msg);
    } finally {
      setLoadingPlayoff(false);
    }
  }

  return (
    <>

      <div className="anios-selector">
        {aniosDisponibles.map((anio) => (
          <button
            key={anio}
            className={Number(anio) === Number(anioSeleccionado) ? 'anio-activo' : ''}
            onClick={() => setAnioSeleccionado(Number(anio))}
            type="button"
          >
            {anio}
          </button>
        ))}
      </div>


      {/* Selector de mes */}
      <div className="meses-scroll">
        {Array.from({ length: 12 }, (_, i) => (
          <button
            key={i}
            className={i === mesSeleccionado ? 'mes-activo' : ''}
            onClick={() => setMesSeleccionado(i)}
          >
            {new Date(0, i)
              .toLocaleString('es-ES', { month: 'long' })
              .toUpperCase()}
          </button>
        ))}
      </div>

      <div className="torneo-categorias-container">
        <h2 className="torneo-categorias-titulo">Torneos por categoría</h2>

        <div className="torneo-selector-container">
          <div className={`torneo-selector ${torneoActual ? 'has-torneo' : 'no-torneo'}`}>

            {/* Fila superior: Categoría y Selector de Torneos */}
            <div className="tournament-controls-row" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <select
                value={categoriaSeleccionada}
                onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                style={{ margin: 0 }} /* Override default margin if any */
              >
                <option value="">Todas las categorías</option>
                {sumaOptions.length > 0 && <option value="SUMA">Todos los torneos SUMA</option>}
                {sumaOptions.map((suma) => (
                  <option key={suma} value={`SUMA_${suma}`}>SUMA {suma}</option>
                ))}
                {categorias.map((cat) => (
                  <option key={cat.id_categoria} value={cat.nombre}>{cat.nombre}</option>
                ))}
              </select>

              {/* Selector de Torneos (si hay varios) */}
              {categoriaSeleccionada && torneosOrdenados.length > 1 && (
                <div className="multi-tournament-selector" style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '20px' }}>
                  {torneosOrdenados.map(t => (
                    <button
                      key={t.id_torneo}
                      onClick={() => setSelectedTorneoId(t.id_torneo)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '16px',
                        border: 'none',
                        background: selectedTorneoId === t.id_torneo ? '#ffd700' : 'transparent',
                        color: selectedTorneoId === t.id_torneo ? '#000' : '#888',
                        fontWeight: selectedTorneoId === t.id_torneo ? 'bold' : 'normal',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {t.modalidad === 'liga' ? '🏆 LIGA' : '⚡ FINDE'} {new Date(t.fecha_inicio).getDate()}/{new Date(t.fecha_inicio).getMonth() + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SI NO HAY CATEGORÍA SELECCIONADA, SOLICITARLO */}
            {!categoriaSeleccionada ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888', fontStyle: 'italic' }}>
                Seleccione una categoría para ver los torneos disponibles.
              </div>
            ) : (
              <>
                {/* Info del torneo actual */}
                <div className={`torneo-info-header ${torneoActual ? '' : 'is-empty'}`} style={{ maxWidth: '600px', margin: '0 auto 20px auto' }}>
                  {torneoActual && (
                    <>
                      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        {torneoActual.modalidad === 'liga' ? (
                          <span className="badge-modality badge-liga">LIGA</span>
                        ) : (
                          <span className="badge-modality badge-weekend">FIN DE SEMANA</span>
                        )}
                      </div>

                      <p className="fecha-torneo-info" style={{ fontSize: '1.1rem' }}>
                        <strong>
                          {new Date(torneoActual.fecha_inicio).toLocaleDateString()}
                        </strong>{' '}
                        al{' '}
                        <strong>
                          {torneoActual.fecha_fin ? new Date(torneoActual.fecha_fin).toLocaleDateString() : '???'}
                        </strong>
                      </p>

                      <p className="formato-torneo-info" style={{ fontSize: '1rem', color: '#eaebec' }}>
                        {torneoActual.formato_categoria === 'suma'
                          ? `Formato: SUMA ${torneoActual.suma_categoria}`
                          : `Categoría: ${getCategoriaNombre(categorias, torneoActual.categoria_id)}`}
                      </p>

                      {torneoActual.modalidad === 'liga' && torneoActual.dias_juego && (
                        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#ffd700', marginTop: '5px' }}>
                          📅 Días: {torneoActual.dias_juego}
                        </p>
                      )}
                    </>
                  )}
                </div>


                {/* Selectores de Fase (Tabs) */}
                <div className="phase-selector-container" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                  <button
                    className={`boton-fase ${fase === 'grupos' ? 'activo' : ''}`}
                    onClick={() => hayTorneo && setFase('grupos')}
                    disabled={!hayTorneo}
                    style={{
                      flex: '0 1 auto',
                      minWidth: '150px',
                      borderRadius: '8px',
                      background: fase === 'grupos' ? '#ffd700' : '#222',
                      color: fase === 'grupos' ? '#000' : '#888',
                      border: fase === 'grupos' ? 'none' : '1px solid #444',
                      opacity: !hayTorneo ? 0.5 : 1
                    }}
                  >
                    Fase de grupos
                  </button>

                  <button
                    className={`boton-fase ${fase === 'playoffs' ? 'activo' : ''}`}
                    onClick={() => hayTorneo && setFase('playoffs')}
                    disabled={!hayTorneo}
                    style={{
                      flex: '0 1 auto',
                      minWidth: '150px',
                      borderRadius: '8px',
                      background: fase === 'playoffs' ? '#ffd700' : '#222',
                      color: fase === 'playoffs' ? '#000' : '#888',
                      border: fase === 'playoffs' ? 'none' : '1px solid #444',
                      opacity: !hayTorneo ? 0.5 : 1
                    }}
                  >
                    Play-offs
                  </button>
                </div>
              </>
            )}

          </div>
        </div>

        {/* ===== FASE DE GRUPOS ===== */}
        {categoriaSeleccionada && (fase === 'grupos' ? (
          !torneoActual ? (
            <div className="mensaje-sin-grupos">
              No hay torneos para la selección actual.
            </div>
          ) : grupos.length === 0 ? (
            <div className="mensaje-sin-grupos">
              No hay grupos generados para este torneo.
            </div>
          ) : (
            <>
              {!gruposCompletos && (
                <div className="banner-aviso">
                  🕒 Esperando resultados de la fase de grupos
                </div>
              )}
              <div className="grupos-grid">
                {grupos.map((grupo) => (
                  <div
                    key={grupo.id_grupo}
                    className={`grupo-tarjeta ${torneoFinalizado ? 'grupo-finalizado' : ''
                      }`}
                  >
                    <h3 className="grupo-titulo">{grupo.nombre}</h3>
                    <table className="grupo-tabla">
                      <thead>
                        <tr className="grupo-tabla-encabezado">
                          <th title="Posición">Pos</th>
                          <th title="Equipo">Equipo</th>
                          <th title="Puntos">Pts</th>
                          <th title="Partidos Jugados">J</th>
                          <th title="Sets a Favor">F</th>
                          <th title="Sets en Contra">C</th>
                          <th title="Diferencia de Sets">DS</th>
                          <th title="Games a Favor">GF</th>
                          <th title="Games en Contra">GC</th>
                          <th title="Diferencia de Games">DG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.equipos.map((e, i) => (
                          <tr
                            key={e.equipo_id}
                            className="grupo-tabla-fila"
                          >
                            <td><span className={`pos-rank pos-${i + 1}`}>{i + 1}</span></td>
                            <td className="grupo-equipo-nombre" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <TeamAvatar foto1={e.foto1} foto2={e.foto2} />
                              <span>{e.nombre_equipo}</span>
                            </td>
                            <td><strong>{e.puntos}</strong></td>
                            <td>{e.partidos_jugados}</td>
                            <td>{e.sets_favor}</td>
                            <td>{e.sets_contra}</td>
                            <td>{e.sets_favor - e.sets_contra}</td>
                            <td>{e.games_favor ?? 0}</td>
                            <td>{e.games_contra ?? 0}</td>
                            <td>{(e.games_favor ?? 0) - (e.games_contra ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <h4 className="grupo-subtitulo">Partidos</h4>
                    <div className="grupo-partidos">
                      {grupo.partidos.map((p) => {
                        let estadoClass = 'partido-finalizado';
                        if (p.estado === 'iniciado')
                          estadoClass = 'partido-iniciado';
                        if (p.estado === 'no_iniciado')
                          estadoClass = 'partido-no-iniciado';
                        const setsCargados =
                          p.set1_equipo1 !== null &&
                          p.set1_equipo2 !== null;

                        // Buscar datos de los equipos para las fotos
                        const eq1 = grupo.equipos.find(t => t.equipo_id === p.equipo1_id);
                        const eq2 = grupo.equipos.find(t => t.equipo_id === p.equipo2_id);

                        return (
                          <div
                            key={p.id}
                            className={`grupo-partido-card ${estadoClass}`}
                          >
                            <div className="grupo-partido-detalle">
                              {p.fecha && (
                                <div style={{ fontSize: '0.8rem', color: '#ffd700', marginBottom: '4px', textAlign: 'center' }}>
                                  {new Date(p.fecha).toLocaleDateString()}
                                </div>
                              )}
                              <div className="grupo-equipos">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <TeamAvatar foto1={eq1?.foto1} foto2={eq1?.foto2} size={28} />
                                  {p.equipo1}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <TeamAvatar foto1={eq2?.foto1} foto2={eq2?.foto2} size={28} />
                                  {p.equipo2}
                                </div>
                              </div>
                              {setsCargados ? (
                                <div className="grupo-sets">
                                  <div>
                                    {p.set1_equipo1}{' '}
                                    {p.set2_equipo1}{' '}
                                    {p.set3_equipo1 ?? '-'}
                                  </div>
                                  <div>
                                    {p.set1_equipo2}{' '}
                                    {p.set2_equipo2}{' '}
                                    {p.set3_equipo2 ?? '-'}
                                  </div>
                                </div>
                              ) : (
                                <div className="grupo-estado">
                                  {p.estado.replace('_', ' ')}
                                </div>
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
              <div className="mensaje-playoff">
                No hay torneo para la selección actual.
              </div>
            ) : (
              <>
                {/* Botón manual SOLO ORGANIZADOR */}
                {can(role, 'playoff.generar') && (
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
                )}

                {errorPlayoff && (
                  <div className="error">{errorPlayoff}</div>
                )}

                {loadingPlayoff ? (
                  <div className="mensaje-playoff">
                    Cargando play-off…
                  </div>
                ) : playoff && Object.keys(playoff).length > 0 ? (
                  <PlayoffBrackets rounds={playoff} />
                ) : (
                  <>
                    {!gruposCompletos && (
                      <div className="banner-aviso">
                        🕒 Esperando resultados de la fase de grupos
                      </div>
                    )}
                    <div className="mensaje-playoff">
                      {can(role, 'playoff.generar')
                        ? 'No hay llaves generadas todavía. Hacé clic en “Generar Play-off”.'
                        : 'Las llaves se generarán cuando el organizador cierre la fase de grupos.'}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div >
    </>
  );
}
