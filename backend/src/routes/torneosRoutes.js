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

  // 1) Verificar torneo (nombre + categoria_id + formato)
  const tRes = await client.query(
    "SELECT nombre_torneo, categoria_id, formato_categoria FROM torneo WHERE id_torneo = $1",
    [id]
  );
  if (!tRes.rowCount) throw new Error("TORNEO_NO_ENCONTRADO");

  const nombreTorneo = tRes.rows[0].nombre_torneo;
  const categoriaTorneoId = tRes.rows[0].categoria_id; // FK a categoria
  const formatoTorneo = tRes.rows[0].formato_categoria;

  // 🔒 Solo generamos ranking para torneos de CATEGORÍA FIJA
  if (!categoriaTorneoId || formatoTorneo !== "categoria_fija") {
    throw new Error("TORNEO_SIN_CATEGORIA_PARA_RANKING");
  }

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
    let s1 = 0, s2 = 0;
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
  let campeonFinal2CeroId = null;

  if (finalRes.rowCount) {
    const f = finalRes.rows[0];
    equipoCampeon = f.ganador_id;
    if (equipoCampeon) {
      equipoSubcampeon =
        f.equipo1_id === equipoCampeon ? f.equipo2_id : f.equipo1_id;
    }

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
     6) Máxima ronda alcanzada
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

  function fasePorEquipo(idEquipo) {
    if (equipoCampeon && idEquipo === equipoCampeon) return "campeon";
    if (equipoSubcampeon && idEquipo === equipoSubcampeon) return "subcampeon";

    const maxRonda = mapaRonda.get(idEquipo) || 0;
    switch (maxRonda) {
      case 4: return "final";
      case 3: return "semifinal";
      case 2: return "cuartos";
      case 1: return "octavos";
      default: return "fase de grupos";
    }
  }

  /* ======================================================
     7) Jugadores
     ====================================================== */
  const idsJugadoresSet = new Set();
  for (const eq of equipos) {
    if (eq.jugador1_id) idsJugadoresSet.add(eq.jugador1_id);
    if (eq.jugador2_id) idsJugadoresSet.add(eq.jugador2_id);
  }
  const idsJugadores = Array.from(idsJugadoresSet);

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
     8) Ranking (SOLO cambio categoria_id → categoria)
     ====================================================== */
  let jugadoresProcesados = 0;

  for (const eq of equipos) {
    const fase = fasePorEquipo(eq.id_equipo);
    const puntosTotalesEquipo = puntosPorFase(fase);

    const j1 = eq.jugador1_id ? mapaJugadores.get(eq.jugador1_id) : null;
    const j2 = eq.jugador2_id ? mapaJugadores.get(eq.jugador2_id) : null;

    if (j1) {
      const r1 = await client.query(
        "SELECT id, puntos FROM ranking_jugador WHERE jugador_id = $1 AND categoria = $2",
        [eq.jugador1_id, categoriaTorneoId]
      );

      if (r1.rowCount) {
        await client.query(
          `
          UPDATE ranking_jugador
          SET puntos = puntos + $1,
              updated_at = NOW()
          WHERE id = $2
          `,
          [puntosTotalesEquipo, r1.rows[0].id]
        );
      } else {
        await client.query(
          `
          INSERT INTO ranking_jugador
            (jugador_id, nombre, apellido, torneo_participado, fase_llegada, puntos, categoria)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          `,
          [
            eq.jugador1_id,
            j1.nombre_jugador,
            j1.apellido_jugador,
            nombreTorneo,
            fase,
            puntosTotalesEquipo,
            categoriaTorneoId,
          ]
        );
      }
      jugadoresProcesados++;
    }

    if (j2) {
      const r2 = await client.query(
        "SELECT id, puntos FROM ranking_jugador WHERE jugador_id = $1 AND categoria = $2",
        [eq.jugador2_id, categoriaTorneoId]
      );

      if (r2.rowCount) {
        await client.query(
          `
          UPDATE ranking_jugador
          SET puntos = puntos + $1,
              updated_at = NOW()
          WHERE id = $2
          `,
          [puntosTotalesEquipo, r2.rows[0].id]
        );
      } else {
        await client.query(
          `
          INSERT INTO ranking_jugador
            (jugador_id, nombre, apellido, torneo_participado, fase_llegada, puntos, categoria)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          `,
          [
            eq.jugador2_id,
            j2.nombre_jugador,
            j2.apellido_jugador,
            nombreTorneo,
            fase,
            puntosTotalesEquipo,
            categoriaTorneoId,
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
    if (err.message === "TORNEO_SIN_CATEGORIA_PARA_RANKING") {
      return res
        .status(400)
        .json({ error: "El ranking solo está definido para torneos de categoría fija" });
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
   - Soporta ?categoria=4 para filtrar (id_categoria)
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
             categoria_id AS categoria
      FROM ranking_jugador
    `;
    const params = [];

    if (categoria) {
      sql += " WHERE categoria_id = $1";
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
