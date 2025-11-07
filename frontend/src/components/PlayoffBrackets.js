// src/components/PlayoffBrackets.js
import React, { useMemo } from "react";

// rounds prop: { CUARTOS:[{...}], SEMIS:[{...}], FINAL:[{...}] }
export default function PlayoffBrackets({ rounds = {} }) {
  // Orden lógico de columnas (izq → centro → der)
  const ordered = useMemo(() => {
    const order = ["CUARTOS", "SEMIS", "FINAL"];
    const present = order.filter((r) => rounds[r]?.length);
    return present.map((r) => ({ name: r, matches: rounds[r] || [] }));
  }, [rounds]);

  if (!ordered.length) return null;

  const soloFinal = ordered.length === 1 && ordered[0].name === "FINAL";
  const isRightCol = (idx) => ordered.length > 2 && idx === ordered.length - 1;

  const fmtSets = (m, side) => {
    const a = m[`set1_${side}`];
    const b = m[`set2_${side}`];
    const c = m[`set3_${side}`];
    return [a, b, c].filter((v) => v !== null && v !== undefined).join(" ");
  };

  return (
    <div className={`bracket inverted ${soloFinal ? "center-single" : ""}`}>
      {ordered.map((col, colIdx) => (
        <div key={col.name} className="round">
          <div className="round-title">{col.name}</div>

          {/* grid vertical de partidos */}
          <div
            className="round-grid"
            style={{
              gridAutoRows:
                col.name === "FINAL"
                  ? "minmax(72px, auto)"
                  : "minmax(88px, auto)",
            }}
          >
            {col.matches.map((m, i) => {
              const sets1 = fmtSets(m, "equipo1");
              const sets2 = fmtSets(m, "equipo2");
              const win1 = m.ganador_id && m.ganador_id === m.equipo1_id;
              const win2 = m.ganador_id && m.ganador_id === m.equipo2_id;

              // Conector: solo si NO es la última columna de la izquierda
              // (en la última columna el conector se espeja con CSS)
              const showConnector =
                ordered.length > 1 &&
                colIdx !== ordered.length - 1 &&
                col.name !== "FINAL";

              // altura de conector: visual, empareja i con i+1
              const connectHalf = (i % 2 === 0) ? "down" : "up";

              return (
                <div key={m.id || `${col.name}-${i}`} className={`match ${m.estado || ""}`}>
                  <div className={`team ${win1 ? "win" : ""}`}>
                    <span className="name">{m.equipo1_nombre || "—"}</span>
                    <span className="score">{sets1}</span>
                  </div>

                  <div className="vs-badge">vs</div>

                  <div className={`team ${win2 ? "win" : ""}`}>
                    <span className="name">{m.equipo2_nombre || "—"}</span>
                    <span className="score">{sets2}</span>
                  </div>

                  {showConnector && (
                    <div
                      className="connector"
                      style={isRightCol(colIdx) ? { left: -14, right: "auto" } : undefined}
                    >
                      <span className="h-line" />
                      <span className={`v-line ${connectHalf}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
