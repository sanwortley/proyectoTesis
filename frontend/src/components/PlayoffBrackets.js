// src/components/PlayoffBrackets.js
import React, { useMemo } from "react";
import TeamAvatar from "./TeamAvatar";

// rounds prop: { OCTAVOS:[...], CUARTOS:[...], SEMIS:[...], FINAL:[...] }
export default function PlayoffBrackets({ rounds = {} }) {
  // ... (helpers)

  // ---------- Helpers ----------

  // Reordena prevRound (ej: CUARTOS) en función de nextRound (ej: SEMIS)
  // usando la relación next_match_id (quién alimenta a quién).
  function reorderByNextMatch(prevRound = [], nextRound = []) {
    if (!prevRound.length || !nextRound.length) return prevRound;

    const unused = new Set(prevRound.map((_, i) => i));
    const result = [];

    // para cada partido siguiente (semi/final), juntamos los prev que lo alimentan
    nextRound.forEach((nr) => {
      const feedersIdx = [];
      prevRound.forEach((m, idx) => {
        if (!unused.has(idx)) return;
        if (m.next_match_id === nr.id) {
          feedersIdx.push(idx);
        }
      });

      // mantenemos el orden en que aparecen
      feedersIdx.forEach((idx) => {
        if (unused.has(idx)) {
          unused.delete(idx);
          result.push(prevRound[idx]);
        }
      });
    });

    // si queda alguno suelto lo mandamos al final
    unused.forEach((idx) => {
      result.push(prevRound[idx]);
    });

    return result;
  }

  // ---------- Normalización de rondas ----------

  const normalized = useMemo(() => {
    const copy = { ...rounds };

    // 1) Ordenar CUARTOS según a qué SEMI alimentan (next_match_id)
    if (copy.CUARTOS && copy.SEMIS) {
      copy.CUARTOS = reorderByNextMatch(copy.CUARTOS, copy.SEMIS);
    }

    // 2) Ordenar OCTAVOS según a qué CUARTOS alimentan
    if (copy.OCTAVOS && copy.CUARTOS) {
      copy.OCTAVOS = reorderByNextMatch(copy.OCTAVOS, copy.CUARTOS);
    }

    // 3) Ordenar SEMIS según a qué FINAL alimentan
    if (copy.SEMIS && copy.FINAL && copy.FINAL.length > 0) {
      copy.SEMIS = reorderByNextMatch(copy.SEMIS, copy.FINAL);
    }

    return copy;
  }, [rounds]);

  // Orden lógico de columnas (izq → der) según las rondas presentes
  const ordered = useMemo(() => {
    const orderNames = ["OCTAVOS", "CUARTOS", "SEMIS", "FINAL"];
    const present = orderNames.filter((r) => normalized[r]?.length);
    return present.map((r) => ({ name: r, matches: normalized[r] || [] }));
  }, [normalized]);

  // ---------- Offsets verticales automáticos ----------
  const columnOffsets = useMemo(() => {
    if (!ordered.length) return [];

    const BASE_SLOT = 90; // altura “virtual” entre partidos
    const offsets = [];
    let prevOffset = 0;
    let prevCount = ordered[0].matches.length || 1;

    offsets[0] = 0;

    for (let i = 1; i < ordered.length; i++) {
      const count = ordered[i].matches.length || 1;

      // Mantener centro vertical entre columnas
      const extra = (prevCount / 2 - count / 2) * BASE_SLOT;
      prevOffset = prevOffset + extra;
      offsets[i] = Math.max(prevOffset, 0);

      prevCount = count;
    }

    return offsets;
  }, [ordered]);

  const soloFinal = ordered.length === 1 && ordered[0].name === "FINAL";

  if (!ordered.length) return null;

  const fmtSets = (m, side) => {
    const a = m[`set1_${side}`];
    const b = m[`set2_${side}`];
    const c = m[`set3_${side}`];
    return [a, b, c]
      .filter((v) => v !== null && v !== undefined && v !== "")
      .join(" ");
  };

  // Render de un partido individual
  const renderMatch = (m, keyExtra = "") => {
    if (!m) return null;

    const sets1 = fmtSets(m, "equipo1");
    const sets2 = fmtSets(m, "equipo2");
    const win1 = m.ganador_id && m.ganador_id === m.equipo1_id;
    const win2 = m.ganador_id && m.ganador_id === m.equipo2_id;

    return (
      <div
        key={(m.id || `${m.equipo1_nombre}-${m.equipo2_nombre}`) + keyExtra}
        className={`match ${m.estado || ""}`}
      >
        <div className={`team ${win1 ? "win" : ""}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TeamAvatar foto1={m.eq1_foto1} foto2={m.eq1_foto2} size={24} />
            <span className="name">{m.equipo1_nombre || "—"}</span>
          </div>
          <span className="score">{sets1}</span>
        </div>

        <div className="vs-badge">vs</div>

        <div className={`team ${win2 ? "win" : ""}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TeamAvatar foto1={m.eq2_foto1} foto2={m.eq2_foto2} size={24} />
            <span className="name">{m.equipo2_nombre || "—"}</span>
          </div>
          <span className="score">{sets2}</span>
        </div>
      </div>
    );
  };

  // ---------- Render ----------

  return (
    <div className={`bracket inverted ${soloFinal ? "center-single" : ""}`}>
      {ordered.map((col, colIdx) => {
        const isFinalCol = col.name === "FINAL";
        const offsetTop = columnOffsets[colIdx] || 0;

        return (
          <div
            key={col.name}
            className={`round round-${col.name.toLowerCase()}`}
          >
            <div className="round-title">{col.name}</div>

            <div className="round-grid" style={{ paddingTop: offsetTop }}>
              {isFinalCol ? (
                // FINAL: partidos sueltos, sin conectores de par
                col.matches.map((m, i) => renderMatch(m, `-final-${i}`))
              ) : (
                // Otras rondas: agrupar de a 2 dentro de .match-pair
                col.matches.reduce((blocks, _, idx, arr) => {
                  if (idx % 2 !== 0) return blocks; // solo índices pares

                  const m1 = arr[idx];
                  const m2 = arr[idx + 1];

                  blocks.push(
                    <div
                      key={`${col.name}-pair-${idx}`}
                      className="match-pair"
                    >
                      {renderMatch(m1, "-a")}
                      {m2 && renderMatch(m2, "-b")}
                    </div>
                  );
                  return blocks;
                }, [])
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
