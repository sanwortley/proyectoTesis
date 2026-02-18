// src/components/PlayoffBrackets.js
import React from "react";
import TeamAvatar from "./TeamAvatar";

export default function PlayoffBrackets({ rounds = {}, finalizado = false }) {
  const { OCTAVOS = [], CUARTOS = [], SEMIS = [], FINAL = [] } = rounds;

  // Estado para el modal
  const [selectedMatch, setSelectedMatch] = React.useState(null);

  const handleMatchClick = (m) => {
    setSelectedMatch(m);
  };

  const closeModal = () => {
    setSelectedMatch(null);
  };

  // Helper para renderizar un match
  const renderMatch = (m, keyExtra = "") => {
    if (!m) return null;

    const sets1 = fmtSets(m, "equipo1");
    const sets2 = fmtSets(m, "equipo2");
    const win1 = m.ganador_id && m.ganador_id === m.equipo1_id;
    const win2 = m.ganador_id && m.ganador_id === m.equipo2_id;

    const team1Details = m.equipo1_detalle || {};
    const team2Details = m.equipo2_detalle || {};

    // Fallback names if backend doesn't send details (or old format)
    const t1p1 = team1Details.p1 || (m.equipo1_nombre ? m.equipo1_nombre.split('/')[0] : "—");
    const t1p2 = team1Details.p2 || (m.equipo1_nombre ? m.equipo1_nombre.split('/')[1] : "");

    const t2p1 = team2Details.p1 || (m.equipo2_nombre ? m.equipo2_nombre.split('/')[0] : "—");
    const t2p2 = team2Details.p2 || (m.equipo2_nombre ? m.equipo2_nombre.split('/')[1] : "");

    return (
      <div
        key={(m.id || `${m.equipo1_nombre}-${m.equipo2_nombre}`) + keyExtra}
        className={`match ${m.estado || ""}`}
        onClick={() => handleMatchClick(m)}
        style={{ cursor: 'pointer' }}
      >
        <div className={`team ${win1 ? "win" : ""}`}>
          <div className="team-container">
            <TeamAvatar
              foto1={m.eq1_foto1}
              foto2={m.eq1_foto2}
              iniciales1={team1Details.p1_iniciales}
              iniciales2={team1Details.p2_iniciales}
              size={32}
            />
            <div className="names-col">
              <span className="name-line">{t1p1}</span>
              {t1p2 && <span className="name-line">{t1p2}</span>}
            </div>
          </div>
          <span className="score">{sets1}</span>
        </div>

        <div className="vs-badge">vs</div>

        <div className={`team ${win2 ? "win" : ""}`}>
          <div className="team-container">
            <TeamAvatar
              foto1={m.eq2_foto1}
              foto2={m.eq2_foto2}
              iniciales1={team2Details.p1_iniciales}
              iniciales2={team2Details.p2_iniciales}
              size={32}
            />
            <div className="names-col">
              <span className="name-line">{t2p1}</span>
              {t2p2 && <span className="name-line">{t2p2}</span>}
            </div>
          </div>
          <span className="score">{sets2}</span>
        </div>
      </div>
    );
  };

  const fmtSets = (m, side) => {
    const a = m[`set1_${side}`];
    const b = m[`set2_${side}`];
    const c = m[`set3_${side}`];
    return [a, b, c]
      .filter((v) => v !== null && v !== undefined && v !== "")
      .join(" ");
  };

  // División de partidos: top half / bottom half
  const octavosTop = OCTAVOS.slice(0, 4);
  const octavosBottom = OCTAVOS.slice(4, 8);

  const cuartosTop = CUARTOS.slice(0, 2);
  const cuartosBottom = CUARTOS.slice(2, 4);

  const semisTop = SEMIS[0] ? [SEMIS[0]] : [];
  const semisBottom = SEMIS[1] ? [SEMIS[1]] : [];

  const finalMatch = FINAL[0];

  if (!OCTAVOS.length && !CUARTOS.length && !SEMIS.length && !FINAL.length) {
    return <div className="no-playoff">No hay playoff generado</div>;
  }

  return (
    <div className={`bracket-symmetric ${finalizado ? 'torneo-finalizado' : ''}`}>
      {/* TOP HALF */}
      <div className="bracket-half bracket-top">
        {octavosTop.length > 0 && (
          <div className="round round-octavos">
            <div className="round-title">OCTAVOS</div>
            <div className="matches-column">
              {octavosTop.map((m, i) => (
                <div key={i} className="match-wrapper">
                  {renderMatch(m, `-oct-top-${i}`)}
                </div>
              ))}
            </div>
          </div>
        )}

        {cuartosTop.length > 0 && (
          <div className="round round-cuartos">
            <div className="round-title">CUARTOS</div>
            <div className="matches-column">
              {cuartosTop.map((m, i) => (
                <div key={i} className="match-wrapper">
                  {renderMatch(m, `-cuart-top-${i}`)}
                </div>
              ))}
            </div>
          </div>
        )}

        {semisTop.length > 0 && (
          <div className="round round-semis">
            <div className="round-title">SEMIS</div>
            <div className="matches-column">
              {semisTop.map((m, i) => (
                <div key={i} className="match-wrapper">
                  {renderMatch(m, `-semi-top-${i}`)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CENTER - FINAL */}
      {finalMatch && (
        <div className="bracket-center">
          <div className="round round-final">
            <div className="round-title">FINAL</div>
            {renderMatch(finalMatch, '-final')}
          </div>
        </div>
      )}

      {/* BOTTOM HALF */}
      <div className="bracket-half bracket-bottom">
        {semisBottom.length > 0 && (
          <div className="round round-semis">
            <div className="round-title">SEMIS</div>
            <div className="matches-column">
              {semisBottom.map((m, i) => (
                <div key={i} className="match-wrapper">
                  {renderMatch(m, `-semi-bot-${i}`)}
                </div>
              ))}
            </div>
          </div>
        )}

        {cuartosBottom.length > 0 && (
          <div className="round round-cuartos">
            <div className="round-title">CUARTOS</div>
            <div className="matches-column">
              {cuartosBottom.map((m, i) => (
                <div key={i} className="match-wrapper">
                  {renderMatch(m, `-cuart-bot-${i}`)}
                </div>
              ))}
            </div>
          </div>
        )}

        {octavosBottom.length > 0 && (
          <div className="round round-octavos">
            <div className="round-title">OCTAVOS</div>
            <div className="matches-column">
              {octavosBottom.map((m, i) => (
                <div key={i} className="match-wrapper">
                  {renderMatch(m, `-oct-bot-${i}`)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETALLE PARTIDO */}
      {selectedMatch && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle del Partido</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              {/* Equipo 1 */}
              <div className="modal-team-row">
                <TeamAvatar
                  foto1={selectedMatch.eq1_foto1}
                  foto2={selectedMatch.eq1_foto2}
                  iniciales1={selectedMatch.equipo1_detalle?.p1_iniciales}
                  iniciales2={selectedMatch.equipo1_detalle?.p2_iniciales}
                  size={50}
                />
                <div className="modal-team-names">
                  <p>{selectedMatch.equipo1_detalle?.p1_full || selectedMatch.equipo1_detalle?.p1 || 'Jugador 1'}</p>
                  <p>{selectedMatch.equipo1_detalle?.p2_full || selectedMatch.equipo1_detalle?.p2 || 'Jugador 2'}</p>
                </div>
              </div>

              {/* VS / Resultado */}
              <div className="modal-score-section">
                {selectedMatch.estado === 'finalizado' ? (
                  <div className="modal-final-score">
                    <span className="score-big">
                      {fmtSets(selectedMatch, 'equipo1')} - {fmtSets(selectedMatch, 'equipo2')}
                    </span>
                    <span className="status-badge-final">FINALIZADO</span>
                  </div>
                ) : (
                  <div className="modal-vs">
                    <span className="vs-big">VS</span>
                    <span className="status-badge-pending">
                      {selectedMatch.estado === 'no_iniciado' ? 'NO INICIADO' : 'EN JUEGO'}
                    </span>
                  </div>
                )}
              </div>

              {/* Equipo 2 */}
              <div className="modal-team-row right-aligned">
                <div className="modal-team-names">
                  <p>{selectedMatch.equipo2_detalle?.p1_full || selectedMatch.equipo2_detalle?.p1 || 'Jugador 1'}</p>
                  <p>{selectedMatch.equipo2_detalle?.p2_full || selectedMatch.equipo2_detalle?.p2 || 'Jugador 2'}</p>
                </div>
                <TeamAvatar
                  foto1={selectedMatch.eq2_foto1}
                  foto2={selectedMatch.eq2_foto2}
                  iniciales1={selectedMatch.equipo2_detalle?.p1_iniciales}
                  iniciales2={selectedMatch.equipo2_detalle?.p2_iniciales}
                  size={50}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
