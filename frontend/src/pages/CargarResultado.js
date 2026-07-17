// src/pages/CargarResultado.js
import { useEffect, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
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
  /* const [gruposCompletos, setGruposCompletos] = useState(false); // Eliminado por no uso */

  const [rondasPO, setRondasPO] = useState({});
  const [resultadosPO, setResultadosPO] = useState({});
  const [loadingPO, setLoadingPO] = useState(false);
  const [errorPO, setErrorPO] = useState("");
  const [guardandoGrupo, setGuardandoGrupo] = useState(new Set());
  const [guardandoRonda, setGuardandoRonda] = useState(new Set());
  const [rankingAutoMsg, setRankingAutoMsg] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [fechaFiltro, setFechaFiltro] = useState(null);
  const [fechaDropdownOpen, setFechaDropdownOpen] = useState(false);

  // =======================
  // CARGA TORNEOS
  // =======================
  useEffect(() => {
    axios
      .get(`/api/torneos`)
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
      /* setGruposCompletos(false); */
      return;
    }

    // --- GRUPOS ---
    axios
      .get(`/api/torneos/${torneoId}/grupos`)
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

        /* setGruposCompletos(completos); */

        // ⭐ GENERAR PLAYOFF AUTOMÁTICO CUANDO SE COMPLETAN
        if (completos) {
          axios.post(`/api/torneos/${torneoId}/playoff`).catch(() => { });
        }
      })
      .catch(() => {
        setGrupos([]);
        setResultadosGrupos({});
        /* setGruposCompletos(false); */
      });

    // --- PLAYOFF ---
    setLoadingPO(true);
    setErrorPO("");
    axios
      .get(`/api/torneos/${torneoId}/playoff`)
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

  const guardarGrupo = async (grupo) => {
    const partidos = grupo.partidos || [];
    const key = grupo.id_grupo;

    // Validar todos los sets antes de guardar
    for (const p of partidos) {
      const data = resultadosGrupos[p.id] || {};
      const sets = [
        [n(data.set1_equipo1), n(data.set1_equipo2)],
        [n(data.set2_equipo1), n(data.set2_equipo2)],
        [n(data.set3_equipo1), n(data.set3_equipo2)]
      ];
      for (let i = 0; i < sets.length; i++) {
        if (!validarSetPadel(...sets[i])) {
          alert(`${p.equipo1} vs ${p.equipo2} — Set ${i + 1}: resultado inválido (ej: 6-4, 7-5 o 7-6).`);
          return;
        }
      }
    }

    setGuardandoGrupo((prev) => new Set(prev).add(key));
    try {
      await Promise.all(
        partidos.map((p) => {
          const data = resultadosGrupos[p.id] || {};
          return axios.put(`/api/partidos-grupo/${p.id}`, {
            set1_equipo1: n(data.set1_equipo1),
            set1_equipo2: n(data.set1_equipo2),
            set2_equipo1: n(data.set2_equipo1),
            set2_equipo2: n(data.set2_equipo2),
            set3_equipo1: n(data.set3_equipo1),
            set3_equipo2: n(data.set3_equipo2)
          });
        })
      );

      const res = await axios.get(`/api/torneos/${torneoId}/grupos`);
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

      if (completos) {
        try {
          await axios.post(`/api/torneos/${torneoId}/playoff`);
        } catch (playoffErr) {
          if (playoffErr?.response?.status !== 409) throw playoffErr;
        }
      }

      alert(`${grupo.nombre} — resultados guardados.`);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 409) {
        alert("El play-off ya fue generado");
        return;
      }
      alert("Error guardando resultados");
    } finally {
      setGuardandoGrupo((prev) => { const s = new Set(prev); s.delete(key); return s; });
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

  const guardarRonda = async (ronda, matches) => {
    // Validar todos los sets antes de guardar
    for (const m of matches) {
      const data = resultadosPO[m.id] || {};
      const sets = [
        [n(data.set1_equipo1), n(data.set1_equipo2)],
        [n(data.set2_equipo1), n(data.set2_equipo2)],
        [n(data.set3_equipo1), n(data.set3_equipo2)]
      ];
      for (let i = 0; i < sets.length; i++) {
        if (!validarSetPadel(...sets[i])) {
          alert(`${m.equipo1_nombre || "—"} vs ${m.equipo2_nombre || "—"} — Set ${i + 1}: resultado inválido (ej: 6-4, 7-5 o 7-6).`);
          return;
        }
      }
    }

    setGuardandoRonda((prev) => new Set(prev).add(ronda));
    try {
      const responses = await Promise.all(
        matches.map((m) => {
          const data = resultadosPO[m.id] || {};
          return axios.patch(`/api/partidos-llave/${m.id}/resultado`, {
            set1_equipo1: n(data.set1_equipo1),
            set1_equipo2: n(data.set1_equipo2),
            set2_equipo1: n(data.set2_equipo1),
            set2_equipo2: n(data.set2_equipo2),
            set3_equipo1: n(data.set3_equipo1),
            set3_equipo2: n(data.set3_equipo2)
          });
        })
      );

      // Si la FINAL se completó y el ranking se actualizó automáticamente, mostrar mensaje
      const esFinal = String(ronda).toUpperCase().trim() === "FINAL";
      const rankingOk = responses.some(r => r.data?.ranking_actualizado === true);
      if (esFinal && rankingOk) {
        setRankingAutoMsg("Ranking actualizado automáticamente al finalizar el torneo.");
        setTimeout(() => setRankingAutoMsg(""), 8000);
      }

      const res = await axios.get(`/api/torneos/${torneoId}/playoff`);
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

      alert(`${ronda} — resultados guardados.${esFinal && rankingOk ? " Ranking actualizado." : ""}`);
    } catch (err) {
      console.error(err);
      alert("Error guardando resultados");
    } finally {
      setGuardandoRonda((prev) => { const s = new Set(prev); s.delete(ronda); return s; });
    }
  };

  // =======================
  // RENDER
  // =======================
  /* const torneoSeleccionado = useMemo(...) eliminada por no uso */

  const busquedaLower = busqueda.toLowerCase().trim();

  const torneoActual = torneos.find((t) => String(t.id_torneo) === String(torneoId)) || null;
  const esLiga = torneoActual?.modalidad === "liga";

  const fechasDisponibles = esLiga
    ? [
        ...new Set(
          grupos
            .flatMap((g) => g.partidos || [])
            .map((p) => (p.fecha ? new Date(p.fecha).toDateString() : null))
            .filter(Boolean)
        ),
      ].sort((a, b) => new Date(a) - new Date(b))
    : [];

  const formatFecha = (dateString) => {
    const d = new Date(dateString);
    const s = d.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const gruposFiltrados = (() => {
    let base = grupos;
    if (busquedaLower) {
      base = base
        .map((g) => ({
          ...g,
          partidos: (g.partidos || []).filter(
            (p) =>
              p.equipo1?.toLowerCase().includes(busquedaLower) ||
              p.equipo2?.toLowerCase().includes(busquedaLower)
          ),
        }))
        .filter((g) => g.partidos.length > 0);
    }
    if (fechaFiltro) {
      base = base
        .map((g) => ({
          ...g,
          partidos: (g.partidos || []).filter(
            (p) => p.fecha && new Date(p.fecha).toDateString() === fechaFiltro
          ),
        }))
        .filter((g) => g.partidos.length > 0);
    }
    return base;
  })();

  const rondasFiltradas = busquedaLower
    ? Object.fromEntries(
        Object.entries(rondasPO)
          .map(([ronda, matches]) => [
            ronda,
            matches.filter(
              (m) =>
                m.equipo1_nombre?.toLowerCase().includes(busquedaLower) ||
                m.equipo2_nombre?.toLowerCase().includes(busquedaLower)
            ),
          ])
          .filter(([, matches]) => matches.length > 0)
      )
    : rondasPO;

  return (
    <div className="cargar-resultado-container">
      <h2 className="titulo">Cargar Resultados</h2>

      <label className="inscripcion-label">Seleccioná torneo:</label>
      <select
        className="inscripcion-select"
        value={torneoId}
        onChange={(e) => { setTorneoId(e.target.value); setBusqueda(""); setFechaFiltro(null); }}
      >
        <option value="">-- Seleccioná --</option>
        {torneos.map((t) => (
          <option key={t.id_torneo} value={t.id_torneo}>
            {t.nombre_torneo}
          </option>
        ))}
      </select>

      <div className="botones-fase-container">
        <div className="botones-fase-toggle">
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
        </div>

        {torneoId && (
          <button
            className="boton-ranking-emergencia"
            title="Usá este botón solo si el ranking no se actualizó automáticamente al finalizar la Final"
            onClick={async () => {
              try {
                const res = await axios.post(`/api/torneos/${torneoId}/generar-ranking`);
                alert(`Ranking forzado: ${res.data.jugadores_procesados} jugadores procesados.`);
              } catch (err) {
                console.error(err);
                alert(err.response?.data?.error || "Error al generar el ranking.");
              }
            }}
          >
            ⚠ Forzar Ranking (emergencia)
          </button>
        )}

        {rankingAutoMsg && (
          <div className="ranking-auto-ok">
            ✔ {rankingAutoMsg}
          </div>
        )}
      </div>

      {torneoId && modo === "grupos" && (
        <div className="busqueda-container">
          <Search size={16} className="busqueda-icon" />
          <input
            className="busqueda-input"
            type="text"
            placeholder="Buscar por equipo o jugador..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className="busqueda-clear" onClick={() => setBusqueda("")}>✕</button>
          )}
        </div>
      )}

      {esLiga && modo === "grupos" && fechasDisponibles.length > 0 && (
        <div className="fechas-filtro">
          <label className="inscripcion-label">Fecha:</label>
          <div className="fecha-select-wrapper">
            <button
              className="fecha-select-trigger"
              onClick={() => setFechaDropdownOpen((o) => !o)}
            >
              <span>{fechaFiltro ? formatFecha(fechaFiltro) : "Todas las fechas"}</span>
              <ChevronDown size={16} className={`fecha-chevron${fechaDropdownOpen ? " abierto" : ""}`} />
            </button>
            {fechaDropdownOpen && (
              <>
                <div className="fecha-select-overlay" onClick={() => setFechaDropdownOpen(false)} />
                <div className="fecha-select-menu">
                  <button
                    className={`fecha-select-option${fechaFiltro === null ? " activo" : ""}`}
                    onClick={() => { setFechaFiltro(null); setFechaDropdownOpen(false); }}
                  >
                    Todas las fechas
                  </button>
                  {fechasDisponibles.map((fecha) => (
                    <button
                      key={fecha}
                      className={`fecha-select-option${fechaFiltro === fecha ? " activo" : ""}`}
                      onClick={() => { setFechaFiltro(fecha); setFechaDropdownOpen(false); }}
                    >
                      {formatFecha(fecha)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
          ) : gruposFiltrados.length === 0 ? (
            <div className="mensaje-sin-grupos">
              No se encontraron partidos con "{busqueda}".
            </div>
          ) : (
            <div className="grupos-grid">
              {gruposFiltrados.map((grupo) => (
                <div key={grupo.id_grupo} className="grupo-tarjeta">
                  <div className="grupo-header">
                    <h3 className="grupo-titulo">{grupo.nombre}</h3>
                    <button
                      className="btn-icon-guardar"
                      onClick={() => guardarGrupo(grupo)}
                      disabled={guardandoGrupo.has(grupo.id_grupo)}
                    >
                      {guardandoGrupo.has(grupo.id_grupo) ? "Guardando..." : `Guardar ${grupo.nombre}`}
                    </button>
                  </div>

                  <div className="table-responsive">
                    <table className="tabla-resultados">
                      <thead>
                        <tr>
                          <th className="col-partido">Partido</th>
                          <th className="col-set">Set 1</th>
                          <th className="col-set">Set 2</th>
                          <th className="col-set">Set 3</th>
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
          ) : Object.keys(rondasFiltradas).length === 0 ? (
            <div className="mensaje-playoff">
              No se encontraron cruces con "{busqueda}".
            </div>
          ) : (
            <div className="playoff-editor">
              {RONDAS_ORDENADAS.filter((r) => rondasFiltradas[r]?.length).map(
                (ronda) => (
                  <div key={ronda} className="grupo-tarjeta">
                    <div className="grupo-header">
                      <h3 className="grupo-titulo">{ronda}</h3>
                      <button
                        className="btn-icon-guardar"
                        onClick={() => guardarRonda(ronda, rondasFiltradas[ronda])}
                        disabled={guardandoRonda.has(ronda)}
                      >
                        {guardandoRonda.has(ronda) ? "Guardando..." : `Guardar ${ronda}`}
                      </button>
                    </div>

                    <div className="table-responsive">
                      <table className="tabla-resultados">
                        <thead>
                          <tr>
                            <th className="col-partido">Cruce</th>
                            <th className="col-set">Set 1</th>
                            <th className="col-set">Set 2</th>
                            <th className="col-set">Set 3</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rondasFiltradas[ronda].map((m) => {
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
