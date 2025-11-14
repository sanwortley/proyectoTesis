// routes/torneosRoutes.js (o donde tengas las rutas de torneos)
import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// Helper de puntos según fase
function puntosPorFase(fase) {
  if (!fase) return 0;
  const f = fase.toLowerCase();

  if (f.includes('campeon') && !f.includes('sub')) return 2000; // campeón
  if (f.includes('sub')) return 1000;                            // subcampeón
  if (f.includes('semi')) return 500;                            // semis
  if (f.includes('cuart')) return 200;                           // cuartos
  if (f.includes('octav')) return 100;                           // octavos
  if (f.includes('16')) return 50;                               // 16avos si algún día los usás
  return 0;                                                      // fase de grupos u otra cosa
}

/**
 * POST /api/torneos/:id/generar-ranking
 * Genera/actualiza el ranking de jugadores en base al resultado del play-off.
 */
router.post('/torneos/:id/generar-ranking', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1) Verificar que exista el torneo
    const tRes = await client.query(
      'SELECT nombre_torneo FROM torneo WHERE id_torneo = $1',
      [id]
    );
    if (!tRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }
    const nombreTorneo = tRes.rows[0].nombre_torneo;

    // 2) Verificar que haya play-off generado
    const playoffRes = await client.query(
      'SELECT COUNT(*)::int AS cant FROM partidos_llave WHERE id_torneo = $1',
      [id]
    );
    if (playoffRes.rows[0].cant === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No hay play-off generado para este torneo' });
    }

    // 3) Verificar que TODOS los partidos de llave estén finalizados
    const pendRes = await client.query(
      `SELECT COUNT(*)::int AS pendientes
       FROM partidos_llave
       WHERE id_torneo = $1
         AND LOWER(TRIM(estado)) <> 'finalizado'`,
      [id]
    );
    if (pendRes.rows[0].pendientes > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Aún hay partidos de play-off sin finalizar' });
    }

    // 4) Obtener todos los equipos inscriptos al torneo
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
    if (!equiposRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No hay equipos inscriptos en este torneo' });
    }
    const equipos = equiposRes.rows;

    // 5) Buscar el partido FINAL para identificar campeón y subcampeón
    const finalRes = await client.query(
      `SELECT id, equipo1_id, equipo2_id, ganador_id
       FROM partidos_llave
       WHERE id_torneo = $1 AND ronda = 'FINAL'
       LIMIT 1`,
      [id]
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

    // 6) Calcular la máxima ronda alcanzada por cada equipo (OCTAVOS, CUARTOS, SEMIS, FINAL)
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
      mapaRonda.set(row.equipo_id, row.max_ronda);
    }

    // Helper para obtener la "fase_llegada" textual
    function fasePorEquipo(idEquipo) {
      if (equipoCampeon && idEquipo === equipoCampeon) return 'campeon';
      if (equipoSubcampeon && idEquipo === equipoSubcampeon) return 'subcampeon';

      const maxRonda = mapaRonda.get(idEquipo) || 0;

      switch (maxRonda) {
        case 1: return 'octavos';
        case 2: return 'cuartos';
        case 3: return 'semifinal';
        case 4: return 'final'; // caso raro si no detectáramos campeón/sub
        default: return 'fase de grupos';
      }
    }

    // 7) Pre-cargar datos de jugadores para no pegarle mil veces a la BD
    const idsJugadoresSet = new Set();
    for (const eq of equipos) {
      if (eq.jugador1_id) idsJugadoresSet.add(eq.jugador1_id);
      if (eq.jugador2_id) idsJugadoresSet.add(eq.jugador2_id);
    }
    const idsJugadores = Array.from(idsJugadoresSet);
    const jugRes = await client.query(
      `SELECT id_jugador, nombre_jugador, apellido_jugador
       FROM jugador
       WHERE id_jugador = ANY($1::int[])`,
      [idsJugadores]
    );
    const mapaJugadores = new Map();
    for (const j of jugRes.rows) {
      mapaJugadores.set(j.id_jugador, j);
    }

    let jugadoresProcesados = 0;

    // 8) Recorrer equipos y actualizar ranking_jugador para cada jugador
    for (const eq of equipos) {
      const fase = fasePorEquipo(eq.id_equipo);
      const puntos = puntosPorFase(fase);

      const j1 = eq.jugador1_id ? mapaJugadores.get(eq.jugador1_id) : null;
      const j2 = eq.jugador2_id ? mapaJugadores.get(eq.jugador2_id) : null;

      // jugador 1
      if (j1) {
        const ultimaPareja = j2 ? j2.apellido_jugador : null;
        const puntosJugador = puntos;

        // Ver si ya existe en ranking_jugador
        const r1 = await client.query(
          'SELECT id, puntos FROM ranking_jugador WHERE jugador_id = $1',
          [eq.jugador1_id]
        );

        if (r1.rowCount) {
          const nuevoTotal = (r1.rows[0].puntos || 0) + puntosJugador;
          await client.query(
            `UPDATE ranking_jugador
             SET nombre = $1,
                 apellido = $2,
                 ultima_pareja = $3,
                 torneo_participado = $4,
                 fase_llegada = $5,
                 puntos = $6,
                 updated_at = NOW()
             WHERE id = $7`,
            [
              j1.nombre_jugador,
              j1.apellido_jugador,
              ultimaPareja,
              nombreTorneo,
              fase,
              nuevoTotal,
              r1.rows[0].id
            ]
          );
        } else {
          await client.query(
            `INSERT INTO ranking_jugador
              (jugador_id, nombre, apellido, ultima_pareja, torneo_participado, fase_llegada, puntos)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              eq.jugador1_id,
              j1.nombre_jugador,
              j1.apellido_jugador,
              ultimaPareja,
              nombreTorneo,
              fase,
              puntosJugador
            ]
          );
        }
        jugadoresProcesados++;
      }

      // jugador 2
      if (j2) {
        const ultimaPareja = j1 ? j1.apellido_jugador : null;
        const puntosJugador = puntos;

        const r2 = await client.query(
          'SELECT id, puntos FROM ranking_jugador WHERE jugador_id = $1',
          [eq.jugador2_id]
        );

        if (r2.rowCount) {
          const nuevoTotal = (r2.rows[0].puntos || 0) + puntosJugador;
          await client.query(
            `UPDATE ranking_jugador
             SET nombre = $1,
                 apellido = $2,
                 ultima_pareja = $3,
                 torneo_participado = $4,
                 fase_llegada = $5,
                 puntos = $6,
                 updated_at = NOW()
             WHERE id = $7`,
            [
              j2.nombre_jugador,
              j2.apellido_jugador,
              ultimaPareja,
              nombreTorneo,
              fase,
              nuevoTotal,
              r2.rows[0].id
            ]
          );
        } else {
          await client.query(
            `INSERT INTO ranking_jugador
              (jugador_id, nombre, apellido, ultima_pareja, torneo_participado, fase_llegada, puntos)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              eq.jugador2_id,
              j2.nombre_jugador,
              j2.apellido_jugador,
              ultimaPareja,
              nombreTorneo,
              fase,
              puntosJugador
            ]
          );
        }
        jugadoresProcesados++;
      }
    }

    await client.query('COMMIT');

    res.json({
      ok: true,
      torneo_id: Number(id),
      torneo: nombreTorneo,
      jugadores_procesados: jugadoresProcesados
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /torneos/:id/generar-ranking] error:', err);
    res.status(500).json({ error: 'No se pudo generar el ranking para este torneo' });
  } finally {
    client.release();
  }
});

router.get("/ranking", async (req, res) => {
  const { categoria } = req.query;

  if (!categoria) {
    return res.json([]); // no mostrar nada hasta elegir categoría
  }

  try {
    const result = await pool.query(
      `
      SELECT id,
             jugador_id,
             nombre,
             apellido,
             ultima_pareja,
             torneo_participado,
             fase_llegada,
             puntos
      FROM ranking_jugador
      WHERE categoria = $1
      ORDER BY puntos DESC, apellido ASC, nombre ASC
    `,
      [categoria]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("[GET /ranking] Error al obtener ranking:", err);
    res.status(500).json({ error: "Error al obtener ranking" });
  }
});


export default router;
