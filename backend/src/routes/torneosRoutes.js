// routes/torneosRoutes.js
import { Router } from "express";
import pool from "../config/db.js";

const router = Router();

/* ==========================================
   Helper de puntos según fase alcanzada (PLAN A)
   ========================================== */
function puntosPorFase(fase) {
  if (!fase) return 0;
  const f = fase.toLowerCase();

  if (f.includes("campeon") && !f.includes("sub")) return 2000; // campeón
  if (f.includes("sub")) return 1200;                            // subcampeón
  if (f.includes("semi")) return 720;                            // semis
  if (f.includes("cuart")) return 360;                           // cuartos
  if (f.includes("octav")) return 180;                           // octavos
  if (f.includes("16")) return 90;                               // 16avos
  return 0;                                                      // fase de grupos
}

/* =========================================================
   Servicio: generarRankingTorneo(client, torneoId)
   - Usa SIEMPRE el client pasado (para compartir la tx)
   - No hace BEGIN/COMMIT
   ========================================================= */
export async function generarRankingTorneo(client, torneoId) {
  const id = Number(torneoId);

  // 1) Verificar torneo (nombre + categoria)
  const tRes = await client.query(
    "SELECT nombre_torneo, categoria FROM torneo WHERE id_torneo = $1",
    [id]
  );
  if (!tRes.rowCount) throw new Error("TORNEO_NO_ENCONTRADO");
  const nombreTorneo = tRes.rows[0].nombre_torneo;
  const categoriaTorneo = tRes.rows[0].categoria; // para ranking por categoría

  // 🔒 NUEVO: evitar duplicar ranking para el mismo torneo
  const yaRes = await client.query(
    `
      SELECT COUNT(*)::int AS cant
      FROM ranking_jugador
      WHERE torneo_participado = $1
    `,
    [nombreTorneo]
  );
  if (yaRes.rows[0].cant > 0) {
    // Torneo ya fue tenido en cuenta antes → no sumo de nuevo
    return {
      ok: true,
      torneo_id: id,
      torneo: nombreTorneo,
      jugadores_procesados: 0,
      mensaje: "TORNEO_YA_PROCESADO_NO_SE_DUPLICA",
    };
  }

  // 2) Verificar que haya play-off generado
  const playoffRes = await client.query(
    "SELECT COUNT(*)::int AS cant FROM partidos_llave WHERE id_torneo = $1",
    [id]
  );
  if (playoffRes.rows[0].cant === 0) throw new Error("PLAYOFF_NO_GENERADO");

  // 3) Verificar que TODOS los partidos de llave estén finalizados
  const pendRes = await client.query(
    `
      SELECT COUNT(*)::int AS pendientes
      FROM partidos_llave
      WHERE id_torneo = $1
        AND LOWER(TRIM(estado)) <> 'finalizado'
    `,
    [id]
  );
  if (pendRes.rows[0].pendientes > 0) throw new Error("PLAYOFF_INCOMPLETO");

  // 4) Equipos que jugaron el torneo (grupos + inscripciones)
  const equiposRes = await client.query(
    `
      SELECT DISTINCT e.id_equipo,
                      e.jugador1_id,
                      e.jugador2_id
      FROM equipo e
      JOIN equipos_grupo eg ON eg.equipo_id = e.id_equipo
      JOIN grupos g ON g.id_grupo = eg.grupo_id
      WHERE g.id_torneo = $1

      UNION

      SELECT DISTINCT e2.id_equipo,
                      e2.jugador1_id,
                      e2.jugador2_id
      FROM equipo e2
      JOIN inscripcion i2 ON i2.id_equipo = e2.id_equipo
      WHERE i2.id_torneo = $1
    `,
    [id]
  );
  if (!equiposRes.rowCount) throw new Error("SIN_EQUIPOS_EN_TORNEO");
  const equipos = equiposRes.rows;

  /* ======================================================
     5) Detectar campeón y subcampeón desde la FINAL
        + chequear si el campeón ganó la final 2-0
     ====================================================== */

  function calcularSets(a1, a2, a3, b1, b2, b3) {
    let s1 = 0,
      s2 = 0;
    const sets = [
      [a1, a2],
      [b1, b2],
      [a3, b3],
    ];
    for (const [x, y] of sets) {
      if (x == null || y == null) continue;
      if (x > y) s1++;
      else if (y > x) s2++;
    }
    return { s1, s2 };
  }

  const finalRes = await client.query(
    `
      SELECT id, equipo1_id, equipo2_id, ganador_id,
             set1_equipo1, set1_equipo2,
             set2_equipo1, set2_equipo2,
             set3_equipo1, set3_equipo2
      FROM partidos_llave
      WHERE id_torneo = $1 AND ronda = 'FINAL'
      LIMIT 1
    `,
    [id]
  );

  let equipoCampeon = null;
  let equipoSubcampeon = null;
  let campeonFinal2CeroId = null; // para bonus extra

  if (finalRes.rowCount) {
    const f = finalRes.rows[0];
    equipoCampeon = f.ganador_id;
    if (equipoCampeon) {
      equipoSubcampeon =
        f.equipo1_id === equipoCampeon ? f.equipo2_id : f.equipo1_id;
    }

    // ¿ganó la final 2-0?
    if (equipoCampeon) {
      const { s1, s2 } = calcularSets(
        f.set1_equipo1,
        f.set1_equipo2,
        f.set2_equipo1,
        f.set2_equipo2,
        f.set3_equipo1,
        f.set3_equipo2
      );
      let setsCampeon = 0;
      let setsRival = 0;
      if (equipoCampeon === f.equipo1_id) {
        setsCampeon = s1;
        setsRival = s2;
      } else {
        setsCampeon = s2;
        setsRival = s1;
      }
      if (setsCampeon >= 2 && setsRival === 0) {
        campeonFinal2CeroId = equipoCampeon;
      }
    }
  }

  /* ======================================================
     6) Calcular la MÁXIMA ronda en la que apareció cada equipo
        (para fase alcanzada: octavos, cuartos, semis, final)
     ====================================================== */
  const rondasRes = await client.query(
    `
      SELECT equipo_id,
             MAX(ronda_orden) AS max_ronda
      FROM (
        SELECT equipo1_id AS equipo_id,
               CASE ronda
                 WHEN 'OCTAVOS' THEN 1
                 WHEN 'CUARTOS' THEN 2
                 WHEN 'SEMIS'   THEN 3
                 WHEN 'FINAL'   THEN 4
               END AS ronda_orden
        FROM partidos_llave
        WHERE id_torneo = $1

        UNION ALL

        SELECT equipo2_id AS equipo_id,
               CASE ronda
                 WHEN 'OCTAVOS' THEN 1
                 WHEN 'CUARTOS' THEN 2
                 WHEN 'SEMIS'   THEN 3
                 WHEN 'FINAL'   THEN 4
               END AS ronda_orden
        FROM partidos_llave
        WHERE id_torneo = $1
      ) sub
      GROUP BY equipo_id
    `,
    [id]
  );

  const mapaRonda = new Map();
  for (const row of rondasRes.rows) {
    mapaRonda.set(row.equipo_id, Number(row.max_ronda));
  }

  // Helper de fase por equipo según playoff
  function fasePorEquipo(idEquipo) {
    if (equipoCampeon && idEquipo === equipoCampeon) return "campeon";
    if (equipoSubcampeon && idEquipo === equipoSubcampeon) return "subcampeon";

    const maxRonda = mapaRonda.get(idEquipo) || 0;

    switch (maxRonda) {
      case 4:
        return "final"; // por seguridad
      case 3:
        return "semifinal";
      case 2:
        return "cuartos";
      case 1:
        return "octavos";
      default:
        return "fase de grupos";
    }
  }

  /* ======================================================
     6.1) Posiciones de grupo (para bonus 1° / 2° de zona)
     ====================================================== */
  const posRes = await client.query(
    `
      SELECT eg.equipo_id,
             g.id_grupo,
             g.nombre AS grupo_nombre,
             RANK() OVER (
               PARTITION BY g.id_grupo
               ORDER BY eg.puntos DESC,
                        (eg.sets_favor - eg.sets_contra) DESC,
                        eg.sets_favor DESC
             ) AS pos
      FROM equipos_grupo eg
      JOIN grupos g ON g.id_grupo = eg.grupo_id
      WHERE g.id_torneo = $1
    `,
    [id]
  );

  const mapaPosGrupo = new Map(); // equipo_id -> { pos, grupo_id }
  for (const row of posRes.rows) {
    mapaPosGrupo.set(row.equipo_id, {
      pos: Number(row.pos),
      grupo_id: row.id_grupo,
    });
  }

  /* ======================================================
     6.2) Estadísticas por equipo (partidos, sets, bonus)
          - Fase de grupos
          - Playoff
     ====================================================== */

  // Estructura de stats
  const stats = new Map();
  function ensureStats(equipoId) {
    if (!equipoId) return null;
    if (!stats.has(equipoId)) {
      stats.set(equipoId, {
        jugoAlgo: false,
        pjTotal: 0,
        ganadosTotal: 0,
        perdidosTotal: 0,
        setsFavor: 0,
        setsContra: 0,
        // Grupo
        pjGrupo: 0,
        perdioAlgunoGrupo: false,
        // Perfect / invicto
        perdioSet: false,
        perdioPartido: false,
        // Dif de sets por partido
        dif2Count: 0,
        dif3Count: 0,
      });
    }
    return stats.get(equipoId);
  }

  function procesarMatch(equipoId, setsGanados, setsPerdidos, esGrupo) {
    if (!equipoId) return;
    const st = ensureStats(equipoId);
    st.jugoAlgo = true;
    st.pjTotal += 1;
    st.setsFavor += setsGanados;
    st.setsContra += setsPerdidos;

    if (setsGanados > setsPerdidos) {
      st.ganadosTotal += 1;
    } else {
      st.perdidosTotal += 1;
    }

    if (esGrupo) {
      st.pjGrupo += 1;
      if (setsGanados < setsPerdidos) {
        st.perdioAlgunoGrupo = true;
      }
    }

    if (setsPerdidos > 0) st.perdioSet = true;
    if (setsGanados <= setsPerdidos) st.perdioPartido = true;

    const diff = setsGanados - setsPerdidos;
    if (diff >= 2 && diff < 3) st.dif2Count += 1;
    if (diff >= 3) st.dif3Count += 1;
  }

  // 6.2.a) Partidos de GRUPOS
  const partidosGrupoRes = await client.query(
    `
      SELECT pg.id,
             pg.grupo_id,
             pg.equipo1_id,
             pg.equipo2_id,
             pg.set1_equipo1, pg.set1_equipo2,
             pg.set2_equipo1, pg.set2_equipo2,
             pg.set3_equipo1, pg.set3_equipo2,
             pg.estado
      FROM partidos_grupo pg
      JOIN grupos g ON g.id_grupo = pg.grupo_id
      WHERE g.id_torneo = $1
        AND LOWER(TRIM(pg.estado)) = 'finalizado'
    `,
    [id]
  );

  for (const p of partidosGrupoRes.rows) {
    const { s1, s2 } = calcularSets(
      p.set1_equipo1,
      p.set1_equipo2,
      p.set2_equipo1,
      p.set2_equipo2,
      p.set3_equipo1,
      p.set3_equipo2
    );
    if (p.equipo1_id) procesarMatch(p.equipo1_id, s1, s2, true);
    if (p.equipo2_id) procesarMatch(p.equipo2_id, s2, s1, true);
  }

  // 6.2.b) Partidos de PLAYOFF
  const partidosLlaveRes = await client.query(
    `
      SELECT id,
             ronda,
             equipo1_id,
             equipo2_id,
             set1_equipo1, set1_equipo2,
             set2_equipo1, set2_equipo2,
             set3_equipo1, set3_equipo2,
             estado
      FROM partidos_llave
      WHERE id_torneo = $1
        AND LOWER(TRIM(estado)) = 'finalizado'
    `,
    [id]
  );

  for (const p of partidosLlaveRes.rows) {
    const { s1, s2 } = calcularSets(
      p.set1_equipo1,
      p.set1_equipo2,
      p.set2_equipo1,
      p.set2_equipo2,
      p.set3_equipo1,
      p.set3_equipo2
    );
    if (p.equipo1_id) procesarMatch(p.equipo1_id, s1, s2, false);
    if (p.equipo2_id) procesarMatch(p.equipo2_id, s2, s1, false);
  }

  /* ======================================================
     7) Pre-cargar datos de jugadores
     ====================================================== */
  const idsJugadoresSet = new Set();
  for (const eq of equipos) {
    if (eq.jugador1_id) idsJugadoresSet.add(eq.jugador1_id);
    if (eq.jugador2_id) idsJugadoresSet.add(eq.jugador2_id);
  }
  const idsJugadores = Array.from(idsJugadoresSet);
  if (idsJugadores.length === 0) {
    return {
      ok: true,
      torneo_id: id,
      torneo: nombreTorneo,
      jugadores_procesados: 0,
    };
  }

  const jugRes = await client.query(
    `
      SELECT id_jugador, nombre_jugador, apellido_jugador
      FROM jugador
      WHERE id_jugador = ANY($1::int[])
    `,
    [idsJugadores]
  );
  const mapaJugadores = new Map();
  for (const j of jugRes.rows) {
    mapaJugadores.set(j.id_jugador, j);
  }

  /* ======================================================
     8) Recorrer equipos y actualizar ranking_jugador
        (ACUMULATIVO y por CATEGORÍA)
     ====================================================== */
  let jugadoresProcesados = 0;

  for (const eq of equipos) {
    const fase = fasePorEquipo(eq.id_equipo);
    const puntosFase = puntosPorFase(fase);

    const st = stats.get(eq.id_equipo) || {
      jugoAlgo: false,
      pjTotal: 0,
      ganadosTotal: 0,
      perdidosTotal: 0,
      setsFavor: 0,
      setsContra: 0,
      pjGrupo: 0,
      perdioAlgunoGrupo: false,
      perdioSet: false,
      perdioPartido: false,
      dif2Count: 0,
      dif3Count: 0,
    };

    // Puntos por partidos y sets
    let puntosExtra = 0;
    puntosExtra += st.ganadosTotal * 100;
    puntosExtra += st.perdidosTotal * 25;
    puntosExtra += st.setsFavor * 15;
    puntosExtra += st.setsContra * 5;
    puntosExtra += st.dif2Count * 20;
    puntosExtra += st.dif3Count * 40;

    // Bonus por posición de grupo
    const posInfo = mapaPosGrupo.get(eq.id_equipo);
    if (posInfo) {
      if (posInfo.pos === 1) puntosExtra += 150;
      else if (posInfo.pos === 2) puntosExtra += 50;
    }

    // Bonus invicto en grupos
    if (st.pjGrupo > 0 && !st.perdioAlgunoGrupo) {
      puntosExtra += 200;
    }

    // Bonus "perfecto 2-0" en todo el torneo
    if (st.jugoAlgo && !st.perdioSet && !st.perdioPartido) {
      puntosExtra += 300;
    }

    // Bonus campeón ganó la final 2-0
    if (campeonFinal2CeroId && eq.id_equipo === campeonFinal2CeroId) {
      puntosExtra += 100;
    }

    const puntosTotalesEquipo = puntosFase + puntosExtra;

    const j1 = eq.jugador1_id ? mapaJugadores.get(eq.jugador1_id) : null;
    const j2 = eq.jugador2_id ? mapaJugadores.get(eq.jugador2_id) : null;

    // ==== jugador 1 ====
    if (j1) {
      const ultimaPareja = j2 ? j2.apellido_jugador : null;
      const r1 = await client.query(
        "SELECT id, puntos FROM ranking_jugador WHERE jugador_id = $1 AND categoria = $2",
        [eq.jugador1_id, categoriaTorneo]
      );

      if (r1.rowCount) {
        const nuevoTotal = (r1.rows[0].puntos || 0) + puntosTotalesEquipo;
        await client.query(
          `
            UPDATE ranking_jugador
            SET nombre = $1,
                apellido = $2,
                ultima_pareja = $3,
                torneo_participado = $4,
                fase_llegada = $5,
                puntos = $6,
                categoria = $7,
                updated_at = NOW()
            WHERE id = $8
          `,
          [
            j1.nombre_jugador,
            j1.apellido_jugador,
            ultimaPareja,
            nombreTorneo,
            fase,
            nuevoTotal,
            categoriaTorneo,
            r1.rows[0].id,
          ]
        );
      } else {
        await client.query(
          `
            INSERT INTO ranking_jugador
              (jugador_id, nombre, apellido, ultima_pareja,
               torneo_participado, fase_llegada, puntos, categoria)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          `,
          [
            eq.jugador1_id,
            j1.nombre_jugador,
            j1.apellido_jugador,
            ultimaPareja,
            nombreTorneo,
            fase,
            puntosTotalesEquipo,
            categoriaTorneo,
          ]
        );
      }
      jugadoresProcesados++;
    }

    // ==== jugador 2 ====
    if (j2) {
      const ultimaPareja = j1 ? j1.apellido_jugador : null;
      const r2 = await client.query(
        "SELECT id, puntos FROM ranking_jugador WHERE jugador_id = $1 AND categoria = $2",
        [eq.jugador2_id, categoriaTorneo]
      );

      if (r2.rowCount) {
        const nuevoTotal = (r2.rows[0].puntos || 0) + puntosTotalesEquipo;
        await client.query(
          `
            UPDATE ranking_jugador
            SET nombre = $1,
                apellido = $2,
                ultima_pareja = $3,
                torneo_participado = $4,
                fase_llegada = $5,
                puntos = $6,
                categoria = $7,
                updated_at = NOW()
            WHERE id = $8
          `,
          [
            j2.nombre_jugador,
            j2.apellido_jugador,
            ultimaPareja,
            nombreTorneo,
            fase,
            nuevoTotal,
            categoriaTorneo,
            r2.rows[0].id,
          ]
        );
      } else {
        await client.query(
          `
            INSERT INTO ranking_jugador
              (jugador_id, nombre, apellido, ultima_pareja,
               torneo_participado, fase_llegada, puntos, categoria)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          `,
          [
            eq.jugador2_id,
            j2.nombre_jugador,
            j2.apellido_jugador,
            ultimaPareja,
            nombreTorneo,
            fase,
            puntosTotalesEquipo,
            categoriaTorneo,
          ]
        );
      }
      jugadoresProcesados++;
    }
  }

  return {
    ok: true,
    torneo_id: id,
    torneo: nombreTorneo,
    jugadores_procesados: jugadoresProcesados,
  };
}

/* ==========================================
   POST /api/torneos/:id/generar-ranking
   ========================================== */
router.post("/torneos/:id/generar-ranking", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await generarRankingTorneo(client, id);
    await client.query("COMMIT");
    res.json(result);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[POST /torneos/:id/generar-ranking] error:", err);

    if (err.message === "TORNEO_NO_ENCONTRADO") {
      return res.status(404).json({ error: "Torneo no encontrado" });
    }
    if (err.message === "PLAYOFF_NO_GENERADO") {
      return res
        .status(400)
        .json({ error: "No hay play-off generado para este torneo" });
    }
    if (err.message === "PLAYOFF_INCOMPLETO") {
      return res
        .status(400)
        .json({ error: "Aún hay partidos de play-off sin finalizar" });
    }
    if (err.message === "SIN_EQUIPOS_EN_TORNEO") {
      return res
        .status(400)
        .json({ error: "No hay equipos participantes en este torneo" });
    }

    res
      .status(500)
      .json({ error: "No se pudo generar el ranking para este torneo" });
  } finally {
    client.release();
  }
});

/* ==========================================
   GET /api/ranking
   - Soporta ?categoria=4 para filtrar
   ========================================== */
router.get("/ranking", async (req, res) => {
  try {
    const { categoria } = req.query;

    let sql = `
      SELECT id,
             jugador_id,
             nombre,
             apellido,
             ultima_pareja,
             torneo_participado,
             fase_llegada,
             puntos,
             categoria
      FROM ranking_jugador
    `;
    const params = [];

    if (categoria) {
      sql += " WHERE categoria = $1";
      params.push(Number(categoria));
    }

    sql += " ORDER BY puntos DESC, apellido ASC, nombre ASC";

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("[GET /ranking] Error al obtener ranking:", err);
    res.status(500).json({ error: "Error al obtener ranking" });
  }
});

/* ==========================================
   DELETE /api/torneos/:id/limpiar-grupos
   - Limpia grupos + partidos de grupo + llaves
   ========================================== */
router.delete("/torneos/:id/limpiar-grupos", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Borrar partidos de play-off
    await client.query("DELETE FROM partidos_llave WHERE id_torneo = $1", [id]);

    // 2) Borrar partidos de grupos
    await client.query(
      `DELETE FROM partidos_grupo
       WHERE grupo_id IN (
         SELECT id_grupo FROM grupos WHERE id_torneo = $1
       )`,
      [id]
    );

    // 3) Borrar asignaciones de equipos a grupos
    await client.query(
      `DELETE FROM equipos_grupo
       WHERE grupo_id IN (
         SELECT id_grupo FROM grupos WHERE id_torneo = $1
       )`,
      [id]
    );

    // 4) Borrar los grupos
    await client.query("DELETE FROM grupos WHERE id_torneo = $1", [id]);

    await client.query("COMMIT");

    res.json({
      ok: true,
      mensaje: "Grupos, partidos de grupo y play-off limpiados correctamente",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[DELETE limpiar grupos] error:", err);
    res.status(500).json({ error: "No se pudieron limpiar los grupos" });
  } finally {
    client.release();
  }
});

export default router;
