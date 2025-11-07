// src/pages/CargarResultado.js
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../style.css';

function n(v) {
  return v === '' || v == null ? null : Number(v);
}

const RONDAS_ORDENADAS = ['OCTAVOS', 'CUARTOS', 'SEMIS', 'FINAL'];

export default function CargarResultado() {
  const API = process.env.REACT_APP_API_URL || '';

  const [torneos, setTorneos] = useState([]);
  const [torneoId, setTorneoId] = useState('');
  const [modo, setModo] = useState('grupos'); // 'grupos' | 'playoff'

  // ======== GRUPOS ========
  const [grupos, setGrupos] = useState([]);
  // valores de inputs (fase grupos)
  const [resultadosGrupos, setResultadosGrupos] = useState({});

  // Flag: ¿todos los partidos de grupos finalizados?
  const [gruposCompletos, setGruposCompletos] = useState(false);

  // ======== PLAY-OFFS ========
  // rondas: { CUARTOS: [...], SEMIS: [...], FINAL: [...] }
  const [rondasPO, setRondasPO] = useState({});
  // valores de inputs (play-off)
  const [resultadosPO, setResultadosPO] = useState({});
  const [loadingPO, setLoadingPO] = useState(false);
  const [errorPO, setErrorPO] = useState('');

  // ---------------------------
  // CARGA INICIAL: TORNEOS
  // ---------------------------
  useEffect(() => {
    axios
      .get(`${API}/torneos`)
      .then((res) => setTorneos(res.data || []))
      .catch((err) => {
        console.error('Error al cargar torneos', err);
        setTorneos([]);
      });
  }, [API]);

  // ---------------------------
  // CARGA DE GRUPOS + PLAYOFF AL CAMBIAR TORNEO
  // ---------------------------
  useEffect(() => {
    if (!torneoId) {
      setGrupos([]);
      setRondasPO({});
      setResultadosGrupos({});
      setResultadosPO({});
      setGruposCompletos(false);
      return;
    }

    // Grupos
    axios
      .get(`${API}/torneos/${torneoId}/grupos`)
      .then((res) => {
        const data = res.data?.grupos || [];
        setGrupos(data);

        // Pre-cargar los inputs con los sets ya guardados
        const next = {};
        data.forEach((g) => {
          (g.partidos || []).forEach((p) => {
            next[p.id] = {
              set1_equipo1: p.set1_equipo1 ?? '',
              set1_equipo2: p.set1_equipo2 ?? '',
              set2_equipo1: p.set2_equipo1 ?? '',
              set2_equipo2: p.set2_equipo2 ?? '',
              set3_equipo1: p.set3_equipo1 ?? '',
              set3_equipo2: p.set3_equipo2 ?? ''
            };
          });
        });
        setResultadosGrupos(next);

        // Calcular si están completos
        const completos =
          data.length > 0 &&
          data.every(
            (g) =>
              (g.partidos?.length ?? 0) > 0 &&
              g.partidos.every((p) => p.estado === 'finalizado')
          );
        setGruposCompletos(completos);
      })
      .catch((err) => {
        console.error('Error al obtener grupos', err);
        setGrupos([]);
        setResultadosGrupos({});
        setGruposCompletos(false);
      });

    // Play-offs
    setLoadingPO(true);
    setErrorPO('');
    axios
      .get(`${API}/torneos/${torneoId}/playoff`)
      .then((res) => {
        const r = res.data?.rondas || {};
        setRondasPO(r);

        // Pre-cargar inputs con lo guardado
        const nextPO = {};
        Object.values(r).forEach((arr) => {
          arr.forEach((m) => {
            nextPO[m.id] = {
              set1_equipo1: m.set1_equipo1 ?? '',
              set1_equipo2: m.set1_equipo2 ?? '',
              set2_equipo1: m.set2_equipo1 ?? '',
              set2_equipo2: m.set2_equipo2 ?? '',
              set3_equipo1: m.set3_equipo1 ?? '',
              set3_equipo2: m.set3_equipo2 ?? ''
            };
          });
        });
        setResultadosPO(nextPO);
      })
      .catch((err) => {
        console.error('Error al obtener play-off', err);
        setRondasPO({});
        setResultadosPO({});
        setErrorPO('No se pudieron cargar las llaves');
      })
      .finally(() => setLoadingPO(false));
  }, [API, torneoId]);

  // ---------------------------
  // HANDLERS: INPUTS
  // ---------------------------
  const handleInputGrupo = (partidoId, campo, valor) => {
    setResultadosGrupos((prev) => ({
      ...prev,
      [partidoId]: {
        ...(prev[partidoId] || {}),
        [campo]: valor
      }
    }));
  };

  const handleInputPO = (partidoId, campo, valor) => {
    setResultadosPO((prev) => ({
      ...prev,
      [partidoId]: {
        ...(prev[partidoId] || {}),
        [campo]: valor
      }
    }));
  };

  // ---------------------------
  // GUARDAR: GRUPOS
  // ---------------------------
  const guardarResultadoGrupo = async (partido) => {
    const data = resultadosGrupos[partido.id] || {};
    const payload = {
      set1_equipo1: n(data.set1_equipo1),
      set1_equipo2: n(data.set1_equipo2),
      set2_equipo1: n(data.set2_equipo1),
      set2_equipo2: n(data.set2_equipo2),
      set3_equipo1: n(data.set3_equipo1),
      set3_equipo2: n(data.set3_equipo2)
    };

    try {
      await axios.put(`${API}/partidos-grupo/${partido.id}`, payload);
      // refrescar grupos
      const res = await axios.get(`${API}/torneos/${torneoId}/grupos`);
      const dataG = res.data?.grupos || [];
      setGrupos(dataG);

      // rehidratar inputs con valores guardados
      const next = {};
      dataG.forEach((g) => {
        (g.partidos || []).forEach((p) => {
          next[p.id] = {
            set1_equipo1: p.set1_equipo1 ?? '',
            set1_equipo2: p.set1_equipo2 ?? '',
            set2_equipo1: p.set2_equipo1 ?? '',
            set2_equipo2: p.set2_equipo2 ?? '',
            set3_equipo1: p.set3_equipo1 ?? '',
            set3_equipo2: p.set3_equipo2 ?? ''
          };
        });
      });
      setResultadosGrupos(next);

      // recalcular completos
      const completos =
        dataG.length > 0 &&
        dataG.every(
          (g) =>
            (g.partidos?.length ?? 0) > 0 &&
            g.partidos.every((p) => p.estado === 'finalizado')
        );
      setGruposCompletos(completos);

      alert('Resultado guardado (grupos)');
    } catch (err) {
      console.error('Error al guardar resultado de grupo:', err);
      alert('Error al guardar resultado');
    }
  };

  // ---------------------------
  // GUARDAR: PLAY-OFF
  // ---------------------------
  const guardarResultadoPO = async (match) => {
    if (!torneoId) return;
    const data = resultadosPO[match.id] || {};
    const payload = {
      set1_equipo1: n(data.set1_equipo1),
      set1_equipo2: n(data.set1_equipo2),
      set2_equipo1: n(data.set2_equipo1),
      set2_equipo2: n(data.set2_equipo2),
      set3_equipo1: n(data.set3_equipo1),
      set3_equipo2: n(data.set3_equipo2)
    };

    try {
      await axios.put(
        `${API}/torneos/${torneoId}/playoff/partidos/${match.id}`,
        payload
      );

      // refrescar play-off
      const res = await axios.get(`${API}/torneos/${torneoId}/playoff`);
      const r = res.data?.rondas || {};
      setRondasPO(r);

      // rehidratar inputs con valores guardados
      const nextPO = {};
      Object.values(r).forEach((arr) => {
        arr.forEach((m) => {
          nextPO[m.id] = {
            set1_equipo1: m.set1_equipo1 ?? '',
            set1_equipo2: m.set1_equipo2 ?? '',
            set2_equipo1: m.set2_equipo1 ?? '',
            set2_equipo2: m.set2_equipo2 ?? '',
            set3_equipo1: m.set3_equipo1 ?? '',
            set3_equipo2: m.set3_equipo2 ?? ''
          };
        });
      });
      setResultadosPO(nextPO);

      alert('Resultado guardado (play-off)');
    } catch (err) {
      console.error('Error al guardar resultado de play-off:', err);
      alert('Error al guardar resultado de play-off');
    }
  };

  // ---------------------------
  // GENERAR PLAY-OFF (BOTÓN)
  // ---------------------------
  const generarPlayoff = async () => {
    if (!torneoId) return;
    try {
      await axios.post(`${API}/torneos/${torneoId}/playoff`);
      // recargar llaves
      const res = await axios.get(`${API}/torneos/${torneoId}/playoff`);
      const r = res.data?.rondas || {};
      setRondasPO(r);

      // precargar inputs de PO
      const nextPO = {};
      Object.values(r).forEach((arr) => {
        arr.forEach((m) => {
          nextPO[m.id] = {
            set1_equipo1: m.set1_equipo1 ?? '',
            set1_equipo2: m.set1_equipo2 ?? '',
            set2_equipo1: m.set2_equipo1 ?? '',
            set2_equipo2: m.set2_equipo2 ?? '',
            set3_equipo1: m.set3_equipo1 ?? '',
            set3_equipo2: m.set3_equipo2 ?? ''
          };
        });
      });
      setResultadosPO(nextPO);

      // cambiar a pestaña Play-off para verlo
      setModo('playoff');
      alert('Play-off generado');
    } catch (err) {
      console.error('Error al generar play-off:', err?.response?.data || err);
      alert(err?.response?.data?.error || 'No se pudo generar el play-off');
    }
  };

  // ---------------------------
  // DERIVADOS
  // ---------------------------
  const torneoSeleccionado = useMemo(
    () => torneos.find((t) => String(t.id_torneo) === String(torneoId)) || null,
    [torneos, torneoId]
  );

  return (
    <div className="cargar-resultado-container">
      <h2 className="titulo">Cargar Resultados</h2>

      {/* Selección de Torneo */}
      <label className="inscripcion-label">Seleccioná torneo:</label>
      <select
        className="inscripcion-select"
        value={torneoId}
        onChange={(e) => setTorneoId(e.target.value)}
      >
        <option value="">-- Seleccioná --</option>
        {torneos.map((t) => (
          <option key={t.id_torneo} value={t.id_torneo}>
            {t.nombre_torneo}
          </option>
        ))}
      </select>

      {/* Toggle modo */}
      <div style={{ marginTop: 12, marginBottom: 20, display: 'flex', gap: 8 }}>
        <button
          className={modo === 'grupos' ? 'boton-fase activo' : 'boton-fase'}
          onClick={() => setModo('grupos')}
        >
          Fase de grupos
        </button>
        <button
          className={modo === 'playoff' ? 'boton-fase activo' : 'boton-fase'}
          onClick={() => setModo('playoff')}
        >
          Play-off
        </button>
      </div>

      {/* ======================= */}
      {/*     FASE DE GRUPOS      */}
      {/* ======================= */}
      {modo === 'grupos' && (
        <>
          {/* Aviso + botón de generar play-off */}
          {torneoId && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              {!gruposCompletos ? (
                <div className="banner-aviso">🕒 Cargá todos los resultados para habilitar el play-off.</div>
              ) : (
                <div className="banner-aviso" style={{ background: '#0c5' }}>
                  ✅ Todos los partidos de grupos están finalizados.
                </div>
              )}
              <button
                className="boton-fase"
                onClick={generarPlayoff}
                disabled={!gruposCompletos}
                title={!gruposCompletos ? 'Faltan cerrar partidos de grupos' : 'Generar Play-off'}
              >
                Generar Play-off
              </button>
            </div>
          )}

          {!torneoId ? (
            <div className="mensaje-sin-grupos">Elegí un torneo para cargar resultados.</div>
          ) : grupos.length === 0 ? (
            <div className="mensaje-sin-grupos">
              Este torneo no tiene grupos generados.
            </div>
          ) : (
            <div className="grupos-grid">
              {grupos.map((grupo) => (
                <div key={grupo.id_grupo} className="grupo-tarjeta">
                  <h3 className="grupo-titulo">{grupo.nombre}</h3>

                  <h4 className="grupo-subtitulo">Partidos</h4>
                  <div className="grupo-partidos">
                    {grupo.partidos.map((p) => {
                      const val = resultadosGrupos[p.id] || {};
                      return (
                        <div key={p.id} className={`partido-card ${p.estado}`}>
                          <h4 className="partido-vs">{p.equipo1} vs {p.equipo2}</h4>

                          <div className="inputs-sets">
                            <div>
                              <label>Sets {p.equipo1}</label>
                              <input
                                type="number"
                                value={val.set1_equipo1 ?? ''}
                                onChange={(e) =>
                                  handleInputGrupo(p.id, 'set1_equipo1', e.target.value)
                                }
                              />
                              <input
                                type="number"
                                value={val.set2_equipo1 ?? ''}
                                onChange={(e) =>
                                  handleInputGrupo(p.id, 'set2_equipo1', e.target.value)
                                }
                              />
                              <input
                                type="number"
                                value={val.set3_equipo1 ?? ''}
                                onChange={(e) =>
                                  handleInputGrupo(p.id, 'set3_equipo1', e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <label>Sets {p.equipo2}</label>
                              <input
                                type="number"
                                value={val.set1_equipo2 ?? ''}
                                onChange={(e) =>
                                  handleInputGrupo(p.id, 'set1_equipo2', e.target.value)
                                }
                              />
                              <input
                                type="number"
                                value={val.set2_equipo2 ?? ''}
                                onChange={(e) =>
                                  handleInputGrupo(p.id, 'set2_equipo2', e.target.value)
                                }
                              />
                              <input
                                type="number"
                                value={val.set3_equipo2 ?? ''}
                                onChange={(e) =>
                                  handleInputGrupo(p.id, 'set3_equipo2', e.target.value)
                                }
                              />
                            </div>
                          </div>

                          <button
                            className="btn-guardar"
                            onClick={() => guardarResultadoGrupo(p)}
                          >
                            Guardar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ======================= */}
      {/*        PLAY-OFFS        */}
      {/* ======================= */}
      {modo === 'playoff' && (
        <>
          {!torneoId ? (
            <div className="mensaje-playoff">Elegí un torneo para cargar play-off.</div>
          ) : loadingPO ? (
            <div className="mensaje-playoff">Cargando llaves…</div>
          ) : errorPO ? (
            <div className="error">{errorPO}</div>
          ) : Object.keys(rondasPO).length === 0 ? (
            <div className="mensaje-playoff">
              No hay llaves generadas aún para este torneo.
            </div>
          ) : (
            <div className="playoff-editor">
              {RONDAS_ORDENADAS.filter((r) => rondasPO[r]?.length).map((ronda) => (
                <div key={ronda} className="grupo-tarjeta">
                  <h3 className="grupo-titulo">{ronda}</h3>

                  <div className="grupo-partidos">
                    {rondasPO[ronda].map((m) => {
                      const val = resultadosPO[m.id] || {};
                      return (
                        <div key={m.id} className={`partido-card ${m.estado}`}>
                          <h4 className="partido-vs">
                            {m.equipo1_nombre || '—'} <span style={{ opacity: 0.6 }}>vs</span> {m.equipo2_nombre || '—'}
                          </h4>

                          <div className="inputs-sets">
                            <div>
                              <label>Sets {m.equipo1_nombre || '—'}</label>
                              <input
                                type="number"
                                value={val.set1_equipo1 ?? ''}
                                onChange={(e) =>
                                  handleInputPO(m.id, 'set1_equipo1', e.target.value)
                                }
                              />
                              <input
                                type="number"
                                value={val.set2_equipo1 ?? ''}
                                onChange={(e) =>
                                  handleInputPO(m.id, 'set2_equipo1', e.target.value)
                                }
                              />
                              <input
                                type="number"
                                value={val.set3_equipo1 ?? ''}
                                onChange={(e) =>
                                  handleInputPO(m.id, 'set3_equipo1', e.target.value)
                                }
                              />
                            </div>

                            <div>
                              <label>Sets {m.equipo2_nombre || '—'}</label>
                              <input
                                type="number"
                                value={val.set1_equipo2 ?? ''}
                                onChange={(e) =>
                                  handleInputPO(m.id, 'set1_equipo2', e.target.value)
                                }
                              />
                              <input
                                type="number"
                                value={val.set2_equipo2 ?? ''}
                                onChange={(e) =>
                                  handleInputPO(m.id, 'set2_equipo2', e.target.value)
                                }
                              />
                              <input
                                type="number"
                                value={val.set3_equipo2 ?? ''}
                                onChange={(e) =>
                                  handleInputPO(m.id, 'set3_equipo2', e.target.value)
                                }
                              />
                            </div>
                          </div>

                          <button
                            className="btn-guardar"
                            onClick={() => guardarResultadoPO(m)}
                          >
                            Guardar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
