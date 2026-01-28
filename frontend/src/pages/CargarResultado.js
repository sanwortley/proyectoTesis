// src/pages/CargarResultado.js
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "../cargarResultado.css";

/** ✅ Valida un set de pádel:
 * - Gana quien llega al menos a 6
 * - Si gana con 6: el otro tiene entre 0 y 4 (6–0 a 6–4)
 * - Si gana con 7: solo se acepta 7–5 o 7–6
 * - No se permiten negativos, ni > 7
 * - Ambos vacíos (null) => se ignora ese set
 */
function validarSetPadel(a, b) {
  // Ambos vacíos → set no jugado, se permite
  if (a == null && b == null) return true;

  // Uno solo cargado → no permitimos
  if (a == null || b == null) return false;

  const na = Number(a);
  const nb = Number(b);

  if (!Number.isFinite(na) || !Number.isFinite(nb)) return false;
  if (na < 0 || nb < 0) return false;

  const max = Math.max(na, nb);
  const min = Math.min(na, nb);

  // El ganador tiene que llegar al menos a 6
  if (max < 6) return false;

  if (max === 6) {
    // 6–0 a 6–4
    return min >= 0 && min <= 4;
  }

  if (max === 7) {
    // Solo 7–5 o 7–6
    return min === 5 || min === 6;
  }

  // Nada > 7
  return false;
}

function n(v) {
  return v === "" || v == null ? null : Number(v);
}

const RONDAS_ORDENADAS = ["OCTAVOS", "CUARTOS", "SEMIS", "FINAL"];

export default function CargarResultado() {
  const API = process.env.REACT_APP_API_URL || "";

  const [torneos, setTorneos] = useState([]);
  const [torneoId, setTorneoId] = useState("");
  const [modo, setModo] = useState("grupos");

  const [grupos, setGrupos] = useState([]);
  const [resultadosGrupos, setResultadosGrupos] = useState({});
  const [gruposCompletos, setGruposCompletos] = useState(false);

  const [rondasPO, setRondasPO] = useState({});
  const [resultadosPO, setResultadosPO] = useState({});
  const [loadingPO, setLoadingPO] = useState(false);
  const [errorPO, setErrorPO] = useState("");

  // =======================
  // CARGA TORNEOS
  // =======================
  useEffect(() => {
    axios
      .get(`${API}/torneos`)
      .then((res) => setTorneos(res.data || []))
      .catch(() => setTorneos([]));
  }, [API]);

  // =======================
  // CARGAR GRUPOS Y PLAYOFF
  // =======================
  useEffect(() => {
    if (!torneoId) {
      setGrupos([]);
      setRondasPO({});
      setResultadosGrupos({});
      setResultadosPO({});
      setGruposCompletos(false);
      return;
    }

    // --- GRUPOS ---
    axios
      .get(`${API}/torneos/${torneoId}/grupos`)
      .then((res) => {
        const data = res.data?.grupos || [];
        setGrupos(data);

        const next = {};
        data.forEach((g) => {
          g.partidos?.forEach((p) => {
            next[p.id] = {
              set1_equipo1: p.set1_equipo1 ?? "",
              set1_equipo2: p.set1_equipo2 ?? "",
              set2_equipo1: p.set2_equipo1 ?? "",
              set2_equipo2: p.set2_equipo2 ?? "",
              set3_equipo1: p.set3_equipo1 ?? "",
              set3_equipo2: p.set3_equipo2 ?? ""
            };
          });
        });
        setResultadosGrupos(next);

        const completos =
          data.length > 0 &&
          data.every(
            (g) =>
              (g.partidos?.length ?? 0) > 0 &&
              g.partidos.every((p) => p.estado === "finalizado")
          );

        setGruposCompletos(completos);

        // ⭐ GENERAR PLAYOFF AUTOMÁTICO CUANDO SE COMPLETAN
        if (completos) {
          axios.post(`${API}/torneos/${torneoId}/playoff`).catch(() => { });
        }
      })
      .catch(() => {
        setGrupos([]);
        setResultadosGrupos({});
        setGruposCompletos(false);
      });

    // --- PLAYOFF ---
    setLoadingPO(true);
    setErrorPO("");
    axios
      .get(`${API}/torneos/${torneoId}/playoff`)
      .then((res) => {
        const r = res.data?.rondas || {};
        setRondasPO(r);

        const nextPO = {};
        Object.values(r).forEach((arr) =>
          arr.forEach((m) => {
            nextPO[m.id] = {
              set1_equipo1: m.set1_equipo1 ?? "",
              set1_equipo2: m.set1_equipo2 ?? "",
              set2_equipo1: m.set2_equipo1 ?? "",
              set2_equipo2: m.set2_equipo2 ?? "",
              set3_equipo1: m.set3_equipo1 ?? "",
              set3_equipo2: m.set3_equipo2 ?? ""
            };
          })
        );
        setResultadosPO(nextPO);
      })
      .catch(() => {
        setRondasPO({});
        setResultadosPO({});
        setErrorPO("No se pudieron cargar las llaves");
      })
      .finally(() => setLoadingPO(false));
  }, [API, torneoId]);

  // =======================
  // HANDLER GRUPOS
  // =======================
  const handleInputGrupo = (id, campo, valor) => {
    setResultadosGrupos((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [campo]: valor }
    }));
  };

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

    // ✅ Validar sets con reglas de pádel
    const sets = [
      [payload.set1_equipo1, payload.set1_equipo2],
      [payload.set2_equipo1, payload.set2_equipo2],
      [payload.set3_equipo1, payload.set3_equipo2]
    ];

    for (let i = 0; i < sets.length; i++) {
      const [a, b] = sets[i];
      if (!validarSetPadel(a, b)) {
        alert(
          `Set ${i + 1}: poné bien el resultado (ej: 6-4, 7-5 o 7-6, sin negativos ni 6-5).`
        );
        return;
      }
    }

    try {
      await axios.put(`${API}/partidos-grupo/${partido.id}`, payload);

      const res = await axios.get(`${API}/torneos/${torneoId}/grupos`);
      const dataG = res.data?.grupos || [];
      setGrupos(dataG);

      const next = {};
      dataG.forEach((g) =>
        g.partidos?.forEach((p) => {
          next[p.id] = {
            set1_equipo1: p.set1_equipo1 ?? "",
            set1_equipo2: p.set1_equipo2 ?? "",
            set2_equipo1: p.set2_equipo1 ?? "",
            set2_equipo2: p.set2_equipo2 ?? "",
            set3_equipo1: p.set3_equipo1 ?? "",
            set3_equipo2: p.set3_equipo2 ?? ""
          };
        })
      );
      setResultadosGrupos(next);

      const completos =
        dataG.length > 0 &&
        dataG.every(
          (g) =>
            (g.partidos?.length ?? 0) > 0 &&
            g.partidos.every((p) => p.estado === "finalizado")
        );

      setGruposCompletos(completos);

      // ⭐ SI SE COMPLETÓ TODO → GENERAR PLAYOFF SOLO
      if (completos) {
        await axios.post(`${API}/torneos/${torneoId}/playoff`);
      }

      alert("Resultado guardado");
    } catch (err) {
      console.error(err);
      alert("Error guardando resultado");
    }
  };

  // =======================
  // HANDLER PLAYOFF
  // =======================
  const handleInputPO = (id, campo, valor) => {
    setResultadosPO((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [campo]: valor }
    }));
  };

  const guardarResultadoPO = async (match) => {
    const data = resultadosPO[match.id] || {};
    const payload = {
      set1_equipo1: n(data.set1_equipo1),
      set1_equipo2: n(data.set1_equipo2),
      set2_equipo1: n(data.set2_equipo1),
      set2_equipo2: n(data.set2_equipo2),
      set3_equipo1: n(data.set3_equipo1),
      set3_equipo2: n(data.set3_equipo2)
    };

    // ✅ Validar sets con reglas de pádel
    const sets = [
      [payload.set1_equipo1, payload.set1_equipo2],
      [payload.set2_equipo1, payload.set2_equipo2],
      [payload.set3_equipo1, payload.set3_equipo2]
    ];

    for (let i = 0; i < sets.length; i++) {
      const [a, b] = sets[i];
      if (!validarSetPadel(a, b)) {
        alert(
          `Set ${i + 1}: poné bien el resultado (ej: 6-4, 7-5 o 7-6, sin negativos ni 6-5).`
        );
        return;
      }
    }

    try {
      // ⭐ RUTA CORRECTA (usa PATCH del backend)
      await axios.patch(`${API}/partidos-llave/${match.id}/resultado`, payload);

      const res = await axios.get(`${API}/torneos/${torneoId}/playoff`);
      const r = res.data?.rondas || {};
      setRondasPO(r);

      const nextPO = {};
      Object.values(r).forEach((arr) =>
        arr.forEach((m) => {
          nextPO[m.id] = {
            set1_equipo1: m.set1_equipo1 ?? "",
            set1_equipo2: m.set1_equipo2 ?? "",
            set2_equipo1: m.set2_equipo1 ?? "",
            set2_equipo2: m.set2_equipo2 ?? "",
            set3_equipo1: m.set3_equipo1 ?? "",
            set3_equipo2: m.set3_equipo2 ?? ""
          };
        })
      );
      setResultadosPO(nextPO);

      alert("Resultado guardado (play-off)");
    } catch (err) {
      console.error(err);
      alert("Error guardando resultado");
    }
  };

  // =======================
  // RENDER
  // =======================
  const torneoSeleccionado = useMemo(
    () => torneos.find((t) => String(t.id_torneo) === String(torneoId)) || null,
    [torneos, torneoId]
  );

  return (
    <div className="cargar-resultado-container">
      <h2 className="titulo">Cargar Resultados</h2>

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

      <div style={{ marginTop: 12, marginBottom: 20, display: "flex", gap: 12, alignItems: 'center' }}>
        <button
          className={modo === "grupos" ? "boton-fase activo" : "boton-fase"}
          onClick={() => setModo("grupos")}
        >
          Fase de grupos
        </button>
        <button
          className={modo === "playoff" ? "boton-fase activo" : "boton-fase"}
          onClick={() => setModo("playoff")}
        >
          Play-off
        </button>

        {torneoId && (
          <button
            className="boton-generar-ranking"
            style={{ marginLeft: 'auto', backgroundColor: '#28a745', color: 'white' }}
            onClick={async () => {
              try {
                const res = await axios.post(`${API}/torneos/${torneoId}/generar-ranking`);
                alert(`Ranking actualizado: ${res.data.jugadores_procesados} jugadores procesados.`);
              } catch (err) {
                console.error(err);
                alert(err.response?.data?.error || "Error al generar el ranking.");
              }
            }}
          >
            Actualizar Ranking del Torneo
          </button>
        )}
      </div>

      {/* ======================= */}
      {/* FASE DE GRUPOS */}
      {/* ======================= */}
      {modo === "grupos" && (
        <>
          {!torneoId ? (
            <div className="mensaje-sin-grupos">
              Elegí un torneo para cargar resultados.
            </div>
          ) : grupos.length === 0 ? (
            <div className="mensaje-sin-grupos">
              Este torneo no tiene grupos generados.
            </div>
          ) : (
            <div className="grupos-grid">
              {grupos.map((grupo) => (
                <div key={grupo.id_grupo} className="grupo-tarjeta">
                  <h3 className="grupo-titulo">{grupo.nombre}</h3>

                  <div className="table-responsive">
                    <table className="tabla-resultados">
                      <thead>
                        <tr>
                          <th className="col-partido">Partido</th>
                          <th className="col-set">Set 1</th>
                          <th className="col-set">Set 2</th>
                          <th className="col-set">Set 3</th>
                          <th className="col-accion"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.partidos.map((p) => {
                          const val = resultadosGrupos[p.id] || {};
                          return (
                            <tr key={p.id}>
                              <td className="col-partido">
                                {p.equipo1} <span className="separador-vs">vs</span> {p.equipo2}
                              </td>
                              <td className="col-set">
                                <input
                                  className="tabla-input"
                                  type="text"
                                  placeholder="-"
                                  value={val.set1_equipo1 ?? ""}
                                  onChange={(e) => handleInputGrupo(p.id, "set1_equipo1", e.target.value)}
                                />
                                -
                                <input
                                  className="tabla-input"
                                  type="text"
                                  placeholder="-"
                                  value={val.set1_equipo2 ?? ""}
                                  onChange={(e) => handleInputGrupo(p.id, "set1_equipo2", e.target.value)}
                                />
                              </td>
                              <td className="col-set">
                                <input
                                  className="tabla-input"
                                  type="text"
                                  placeholder="-"
                                  value={val.set2_equipo1 ?? ""}
                                  onChange={(e) => handleInputGrupo(p.id, "set2_equipo1", e.target.value)}
                                />
                                -
                                <input
                                  className="tabla-input"
                                  type="text"
                                  placeholder="-"
                                  value={val.set2_equipo2 ?? ""}
                                  onChange={(e) => handleInputGrupo(p.id, "set2_equipo2", e.target.value)}
                                />
                              </td>
                              <td className="col-set">
                                <input
                                  className="tabla-input"
                                  type="text"
                                  placeholder="-"
                                  value={val.set3_equipo1 ?? ""}
                                  onChange={(e) => handleInputGrupo(p.id, "set3_equipo1", e.target.value)}
                                />
                                -
                                <input
                                  className="tabla-input"
                                  type="text"
                                  placeholder="-"
                                  value={val.set3_equipo2 ?? ""}
                                  onChange={(e) => handleInputGrupo(p.id, "set3_equipo2", e.target.value)}
                                />
                              </td>
                              <td className="col-accion">
                                <button
                                  className="btn-icon-guardar"
                                  title="Guardar resultado"
                                  onClick={() => guardarResultadoGrupo(p)}
                                >
                                  Guardar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ======================= */}
      {/* PLAYOFF */}
      {/* ======================= */}
      {modo === "playoff" && (
        <>
          {!torneoId ? (
            <div className="mensaje-playoff">
              Elegí un torneo para cargar play-off.
            </div>
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
              {RONDAS_ORDENADAS.filter((r) => rondasPO[r]?.length).map(
                (ronda) => (
                  <div key={ronda} className="grupo-tarjeta">
                    <h3 className="grupo-titulo">{ronda}</h3>

                    <div className="table-responsive">
                      <table className="tabla-resultados">
                        <thead>
                          <tr>
                            <th className="col-partido">Cruce</th>
                            <th className="col-set">Set 1</th>
                            <th className="col-set">Set 2</th>
                            <th className="col-set">Set 3</th>
                            <th className="col-accion"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rondasPO[ronda].map((m) => {
                            const val = resultadosPO[m.id] || {};
                            return (
                              <tr key={m.id}>
                                <td className="col-partido">
                                  {m.equipo1_nombre || "—"} <span className="separador-vs">vs</span> {m.equipo2_nombre || "—"}
                                </td>
                                <td className="col-set">
                                  <input
                                    className="tabla-input"
                                    type="text"
                                    placeholder="-"
                                    value={val.set1_equipo1 ?? ""}
                                    onChange={(e) => handleInputPO(m.id, "set1_equipo1", e.target.value)}
                                  />
                                  -
                                  <input
                                    className="tabla-input"
                                    type="text"
                                    placeholder="-"
                                    value={val.set1_equipo2 ?? ""}
                                    onChange={(e) => handleInputPO(m.id, "set1_equipo2", e.target.value)}
                                  />
                                </td>
                                <td className="col-set">
                                  <input
                                    className="tabla-input"
                                    type="text"
                                    placeholder="-"
                                    value={val.set2_equipo1 ?? ""}
                                    onChange={(e) => handleInputPO(m.id, "set2_equipo1", e.target.value)}
                                  />
                                  -
                                  <input
                                    className="tabla-input"
                                    type="text"
                                    placeholder="-"
                                    value={val.set2_equipo2 ?? ""}
                                    onChange={(e) => handleInputPO(m.id, "set2_equipo2", e.target.value)}
                                  />
                                </td>
                                <td className="col-set">
                                  <input
                                    className="tabla-input"
                                    type="text"
                                    placeholder="-"
                                    value={val.set3_equipo1 ?? ""}
                                    onChange={(e) => handleInputPO(m.id, "set3_equipo1", e.target.value)}
                                  />
                                  -
                                  <input
                                    className="tabla-input"
                                    type="text"
                                    placeholder="-"
                                    value={val.set3_equipo2 ?? ""}
                                    onChange={(e) => handleInputPO(m.id, "set3_equipo2", e.target.value)}
                                  />
                                </td>
                                <td className="col-accion">
                                  <button
                                    className="btn-icon-guardar"
                                    title="Guardar resultado"
                                    onClick={() => guardarResultadoPO(m)}
                                  >
                                    Guardar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
