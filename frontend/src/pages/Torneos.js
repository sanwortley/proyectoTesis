// src/pages/Torneos.js  (ÚNICA PÁGINA)
/* eslint-disable no-unused-vars */

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import '../style.css';

// ⬇️ Bracket invertido (archivo y estilos del componente)
import PlayoffBrackets from '../components/PlayoffBrackets';
import '../components/playoff.css';

const PERMISSIONS = {
  organizador: ['playoff.generar', 'torneos.crear'],
  jugador: [],
  invitado: []
};
const can = (role, perm) => PERMISSIONS[role]?.includes(perm);

// ⚠️ Fuente de verdad del ROL:
// 1) Si tenés contexto de auth, reemplazá este getRole por useAuth().user.role
// 2) Si no, podés guardar el rol en localStorage ('organizador' | 'jugador' | 'invitado')
function getRole() {
  return localStorage.getItem('role') || 'jugador';
}

export default function Torneos() {
  const role = getRole();

  const [categorias, setCategorias] = useState([]);
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

  // Base URL de axios (evitás repetir localhost)
  useEffect(() => {
    if (!axios.defaults.baseURL) {
      axios.defaults.baseURL = 'http://localhost:3000';
    }
  }, []);

  // Cargar categorías y torneos
  useEffect(() => {
    axios.get('/api/categorias').then(r => setCategorias(r.data)).catch(console.error);
    axios.get('/api/torneos').then(r => setTorneos(r.data)).catch(console.error);
  }, []);

  // Resolver id de categoría seleccionada
  const categoriaId = useMemo(() => {
    return categorias.find(c => c.nombre === categoriaSeleccionada)?.id_categoria ?? null;
  }, [categorias, categoriaSeleccionada]);

  // Filtrados y torneo actual
  const torneosFiltrados = useMemo(() => {
    if (categoriaId === null) return [];
    return torneos.filter(t =>
      new Date(t.fecha_inicio).getMonth() === mesSeleccionado &&
      t.categoria === categoriaId
    );
  }, [torneos, mesSeleccionado, categoriaId]);

  const torneoActual = useMemo(() => {
    if (!torneosFiltrados.length) return null;
    return [...torneosFiltrados].sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio))[0];
  }, [torneosFiltrados]);

  const torneoFinalizado = torneoActual ? new Date(torneoActual.fecha_fin) < new Date() : false;

  // Cargar grupos del torneo seleccionado
  useEffect(() => {
    if (!categoriaId) { setGrupos([]); return; }
    const filtrados = torneos.filter(t =>
      new Date(t.fecha_inicio).getMonth() === mesSeleccionado &&
      t.categoria === categoriaId
    );
    if (!filtrados.length) { setGrupos([]); return; }

    const torneo = filtrados[0];
    axios.get(`/api/torneos/${torneo.id_torneo}/grupos`)
      .then(res => setGrupos(res.data.grupos || []))
      .catch(() => setGrupos([]));
  }, [categoriaId, mesSeleccionado, torneos]);

  // Detectar si todos los partidos de grupos están finalizados
  useEffect(() => {
    const completos = grupos.length > 0 && grupos.every(g =>
      (g.partidos?.length ?? 0) > 0 &&
      g.partidos.every(p => p.estado === 'finalizado')
    );
    setGruposCompletos(completos);
  }, [grupos]);

  // Limpiar cuando cambia categoría o mes
  useEffect(() => {
    setGrupos([]);
    setPlayoff(null);
    setErrorPlayoff('');
  }, [categoriaSeleccionada, mesSeleccionado]);

  // Leer/Generar playoff (estrategia unificada):
  // - Siempre 1° intentá GET
  // - Si no hay y el usuario es ORGANIZADOR -> POST para generar (backend valida grupos completos)
  useEffect(() => {
    const run = async () => {
      if (fase !== 'playoffs' || !torneoActual || !categoriaId) { setPlayoff(null); return; }
      try {
        setLoadingPlayoff(true);
        setErrorPlayoff('');

        const url = `/api/torneos/${torneoActual.id_torneo}/playoff`;
        const r1 = await axios.get(url);
        const hay = r1?.data?.rondas && Object.keys(r1.data.rondas).length > 0;
        if (hay) { setPlayoff(r1.data.rondas); return; }

        // Solo organizador intenta generar
        if (can(role, 'playoff.generar')) {
          await axios.post(url);
          const r2 = await axios.get(url);
          setPlayoff(r2.data.rondas || {});
        } else {
          setPlayoff(null);
        }
      } catch (e) {
        const msg = e?.response?.data?.error || 'No se pudo cargar el play-off';
        setErrorPlayoff(msg);
        setPlayoff(null);
      } finally {
        setLoadingPlayoff(false);
      }
    };
    run();
  }, [fase, torneoActual, categoriaId, role]);

  // Acción manual de generación (botón SOLO organizador)
  async function generarPlayoff() {
    if (!torneoActual) return;
    try {
      setLoadingPlayoff(true);
      setErrorPlayoff('');
      await axios.post(`/api/torneos/${torneoActual.id_torneo}/playoff`);
      const { data } = await axios.get(`/api/torneos/${torneoActual.id_torneo}/playoff`);
      setPlayoff(data.rondas || {});
    } catch (e) {
      const msg = e?.response?.data?.error || 'No se pudo generar el play-off';
      setErrorPlayoff(msg);
    } finally {
      setLoadingPlayoff(false);
    }
  }

  return (
    <>
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

            {torneoActual && categoriaSeleccionada && (
              <p className="fecha-torneo-info">
                <strong>{new Date(torneoActual.fecha_inicio).toLocaleDateString()}</strong> al <strong>{new Date(torneoActual.fecha_fin).toLocaleDateString()}</strong>
              </p>
            )}

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
          !categoriaSeleccionada ? (
            <div className="mensaje-sin-grupos">
              Seleccioná una categoría para ver los torneos disponibles.
            </div>
          ) : grupos.length === 0 ? (
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
            {!categoriaSeleccionada ? (
              <div className="mensaje-playoff">Seleccioná una categoría para ver las llaves.</div>
            ) : !torneoActual ? (
              <div className="mensaje-playoff">No hay torneo para la selección actual.</div>
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

                {errorPlayoff && <div className="error">{errorPlayoff}</div>}

                {loadingPlayoff ? (
                  <div className="mensaje-playoff">Cargando play-off…</div>
                ) : playoff && Object.keys(playoff).length > 0 ? (
                  // ⬇️ usamos el componente de llaves invertidas con “vs” centrado
                  <PlayoffBrackets rounds={playoff} />
                ) : (
                  <>
                    {!gruposCompletos && (
                      <div className="banner-aviso">🕒 Esperando resultados de la fase de grupos</div>
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
        )}
      </div>
    </>
  );
}
