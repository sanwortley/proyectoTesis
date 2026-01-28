// src/routes/rankingRoutes.js
import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// Helper de puntos según fase
function puntosPorFase(fase) {
  if (!fase) return 0;
  const f = String(fase).toLowerCase();

  if (f.includes('campeon') && !f.includes('sub')) return 2000; // campeón
  if (f.includes('sub')) return 1000;                            // subcampeón
  if (f.includes('semi')) return 500;                             // semis
  if (f.includes('cuart')) return 200;                            // cuartos
  if (f.includes('octav')) return 100;                            // octavos
  if (f.includes('16')) return 50;                                // 16avos (si algún día)
  return 0;
}

/**
 * POST /api/torneos/:id/generar-ranking
 * Genera/actualiza el ranking de jugadores en base al resultado del play-off.
 *
 * IMPORTANTE:
 * - ranking_jugador tiene columna "categoria" (numérica) => NO "categoria_id"
 * - actualiza/crea ranking por (jugador_id + categoria)
 */
router.post('/torneos/:id/generar-ranking', async (req, res) => {
  const { id } = req.params;
  const torneoId = Number(id);
  if (Number.isNaN(torneoId)) {
    return res.status(400).json({ error: 'ID de torneo inválido' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1) Traer info del torneo (incluye tipo + categoría)
    const tRes = await client.query(
      `
      SELECT
        t.id_torneo,
        t.nombre_torneo,
        t.formato_categoria,
        t.categoria_id,
        t.suma_categoria,
        c.valor_numerico AS categoria_num
      FROM torneo t
      LEFT JOIN categoria c ON c.id_categoria = t.categoria_id
      WHERE t.id_torneo = $1
      `,
      [torneoId]
    );

    if (!tRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const torneo = tRes.rows[0];
    const nombreTorneo = torneo.nombre_torneo;

    // ✅ Categoría a guardar en ranking_jugador.categoria
    // - Si es categoría fija => 2..8 (valor_numerico)
    // - Si es SUMA => guardamos la suma (ej 12) (si preferís otra regla, lo ajustamos)
    let categoriaRanking = null;
    if (torneo.formato_categoria === 'categoria_fija') {
      categoriaRanking = torneo.categoria_num ?? null;
    } else if (torneo.formato_categoria === 'suma') {
      categoriaRanking =
        torneo.suma_categoria != null ? Number(torneo.suma_categoria) : null;
    }

    if (categoriaRanking == null || Number.isNaN(Number(categoriaRanking))) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error:
          'No se pudo determinar la categoría del ranking (torneo mal configurado)',
      });
    }

    // 2) Verificar que haya play-off generado
    const playoffRes = await client.query(
      'SELECT COUNT(*)::int AS cant FROM partidos_llave WHERE id_torneo = $1',
      [torneoId]
    );
    if ((playoffRes.rows[0]?.cant ?? 0) === 0) {
      await client.query('ROLLBACK');
      return res
        .status(400)
        .json({ error: 'No hay play-off generado para este torneo' });
    }

    // 3) Verificar que TODOS los partidos estén finalizados
    const pendRes = await client.query(
      `
      SELECT COUNT(*)::int AS pendientes
      FROM partidos_llave
      WHERE id_torneo = $1
        AND LOWER(TRIM(estado)) <> 'finalizado'
      `,
      [torneoId]
    );
    if ((pendRes.rows[0]?.pendientes ?? 0) > 0) {
      await client.query('ROLLBACK');
      return res
        .status(400)
        .json({ error: 'Aún hay partidos de play-off sin finalizar' });
    }

    // 4) Obtener equipos del torneo (por grupos + por inscripcion)
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
      [torneoId]
    );

    if (!equiposRes.rowCount) {
      await client.query('ROLLBACK');
      return res
        .status(400)
        .json({ error: 'No hay equipos inscriptos en este torneo' });
    }

    const equipos = equiposRes.rows;

    // 5) FINAL para campeón/subcampeón
    const finalRes = await client.query(
      `
      SELECT id, equipo1_id, equipo2_id, ganador_id
      FROM partidos_llave
      WHERE id_torneo = $1 AND ronda = 'FINAL'
      LIMIT 1
      `,
      [torneoId]
    );

    let equipoCampeon = null;
    let equipoSubcampeon = null;

    if (finalRes.rowCount) {
      const final = finalRes.rows[0];
      equipoCampeon = final.ganador_id;
      if (equipoCampeon) {
        equipoSubcampeon =
          final.equipo1_id === equipoCampeon ? final.equipo2_id : final.equipo1_id;
      }
    }

    // 6) Máxima ronda alcanzada por equipo
    const rondasRes = await client.query(
      `
      SELECT equipo_id, MAX(ronda_orden) AS max_ronda
      FROM (
        SELECT equipo1_id AS equipo_id,
               CASE ronda
                 WHEN 'OCTAVOS' THEN 1
                 WHEN 'CUARTOS' THEN 2
                 WHEN 'SEMIS'   THEN 3
                 WHEN 'FINAL'   THEN 4
                 ELSE 0
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
                 ELSE 0
               END AS ronda_orden
        FROM partidos_llave
        WHERE id_torneo = $1
      ) sub
      GROUP BY equipo_id
      `,
      [torneoId]
    );

    const mapaRonda = new Map();
    for (const row of rondasRes.rows) {
      mapaRonda.set(row.equipo_id, Number(row.max_ronda) || 0);
    }

    function fasePorEquipo(idEquipo) {
      if (equipoCampeon && idEquipo === equipoCampeon) return 'campeon';
      if (equipoSubcampeon && idEquipo === equipoSubcampeon) return 'subcampeon';

      const maxRonda = mapaRonda.get(idEquipo) || 0;
      switch (maxRonda) {
        case 1:
          return 'octavos';
        case 2:
          return 'cuartos';
        case 3:
          return 'semifinal';
        case 4:
          return 'final';
        default:
          return 'fase de grupos';
      }
    }

    // 7) Precargar jugadores (id/nombre/apellido)
    const idsJugadoresSet = new Set();
    for (const eq of equipos) {
      if (eq.jugador1_id) idsJugadoresSet.add(eq.jugador1_id);
      if (eq.jugador2_id) idsJugadoresSet.add(eq.jugador2_id);
    }
    const idsJugadores = Array.from(idsJugadoresSet);
    console.log('[DEBUG] idsJugadores para query:', idsJugadores);

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
      mapaJugadores.set(Number(j.id_jugador), j);
    }
    console.log('[DEBUG] Mapa jugadores keys:', Array.from(mapaJugadores.keys()));

    let jugadoresProcesados = 0;

    async function upsertRanking({
      jugadorId,
      nombre,
      apellido,
      ultimaPareja,
      fase,
      puntosAAgregar,
    }) {
      // buscar existente por jugador_id + categoria
      const r = await client.query(
        `SELECT id, puntos
         FROM ranking_jugador
         WHERE jugador_id = $1 AND categoria = $2`,
        [jugadorId, categoriaRanking]
      );

      if (r.rowCount) {
        const actual = Number(r.rows[0].puntos) || 0;
        const nuevoTotal = actual + (Number(puntosAAgregar) || 0);

        await client.query(
          `
          UPDATE ranking_jugador
          SET nombre = $1,
              apellido = $2,
              ultima_pareja = $3,
              torneo_participado = $4,
              fase_llegada = $5,
              puntos = $6,
              categoria = $7
          WHERE id = $8
          `,
          [
            nombre,
            apellido,
            ultimaPareja,
            nombreTorneo,
            fase,
            nuevoTotal,
            categoriaRanking,
            r.rows[0].id,
          ]
        );
      } else {
        await client.query(
          `
          INSERT INTO ranking_jugador
            (jugador_id, nombre, apellido, ultima_pareja, torneo_participado, fase_llegada, puntos, categoria)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          `,
          [
            jugadorId,
            nombre,
            apellido,
            ultimaPareja,
            nombreTorneo,
            fase,
            Number(puntosAAgregar) || 0,
            categoriaRanking,
          ]
        );
      }
    }

    // 8) Recorrer equipos y aplicar puntos a cada jugador
    for (const eq of equipos) {
      const fase = fasePorEquipo(eq.id_equipo);
      const puntos = puntosPorFase(fase);

      const id1 = eq.jugador1_id ? Number(eq.jugador1_id) : null;
      const id2 = eq.jugador2_id ? Number(eq.jugador2_id) : null;

      const j1 = id1 ? mapaJugadores.get(id1) : null;
      const j2 = id2 ? mapaJugadores.get(id2) : null;

      console.log(`[DEBUG] EQ ${eq.id_equipo}: ID1=${id1} found=${!!j1}, ID2=${id2} found=${!!j2}`);
      if (j2) console.log('[DEBUG] j2 object:', JSON.stringify(j2));

      if (j1) {
        const nombrePareja = j2
          ? `${j2.nombre_jugador} ${j2.apellido_jugador}`.trim()
          : '-';

        const upsertParams1 = {
          jugadorId: id1,
          nombre: j1.nombre_jugador,
          apellido: j1.apellido_jugador,
          ultimaPareja: nombrePareja,
          fase,
          puntosAAgregar: puntos,
        };
        console.log('[DEBUG] upsertRanking params (j1):', JSON.stringify(upsertParams1));
        await upsertRanking(upsertParams1);
        jugadoresProcesados++;
      }

      if (j2) {
        const nombrePareja = j1
          ? `${j1.nombre_jugador} ${j1.apellido_jugador}`.trim()
          : '-';

        const upsertParams2 = {
          jugadorId: id2,
          nombre: j2.nombre_jugador,
          apellido: j2.apellido_jugador,
          ultimaPareja: nombrePareja,
          fase,
          puntosAAgregar: puntos,
        };
        console.log('[DEBUG] upsertRanking params (j2):', JSON.stringify(upsertParams2));
        await upsertRanking(upsertParams2);
        jugadoresProcesados++;
      }
    }

    await client.query('COMMIT');

    return res.json({
      ok: true,
      torneo_id: torneoId,
      torneo: nombreTorneo,
      categoria_ranking: Number(categoriaRanking),
      jugadores_procesados: jugadoresProcesados,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /torneos/:id/generar-ranking] error:', err.message);
    console.error(err.stack);
    return res
      .status(500)
      .json({ error: 'No se pudo generar el ranking para este torneo' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/ranking?categoria=7
 * Devuelve ranking filtrado por ranking_jugador.categoria (numérica)
 */
router.get('/ranking', async (req, res) => {
  try {
    const { categoria } = req.query;

    // No mostrar nada hasta que el front elija una categoría
    if (categoria == null || String(categoria).trim() === '') {
      return res.json([]);
    }

    const catNum = Number(categoria);
    if (Number.isNaN(catNum)) {
      return res.status(400).json({ error: 'Categoría inválida' });
    }

    const result = await pool.query(
      `
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
      WHERE categoria = $1
      ORDER BY puntos DESC, apellido ASC, nombre ASC
      `,
      [catNum]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('[GET /ranking] Error al obtener ranking:', err);
    return res.status(500).json({ error: 'Error al obtener ranking' });
  }
});

export default router;
