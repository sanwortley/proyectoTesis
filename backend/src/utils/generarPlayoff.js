// src/utils/generarPlayoff.js
import pool from '../config/db.js';

export async function generarPlayoffSiNoExiste(idTorneo) {
  const client = await pool.connect();
  try {
    // ¿ya existe algo?
    const check = await client.query(
      'SELECT COUNT(*) FROM partidos_llave WHERE id_torneo = $1',
      [idTorneo]
    );
    if (parseInt(check.rows[0].count) > 0) {
      console.log('[PLAYOFF] Ya existía árbol, no se regenera');
      return;
    }

    // ============================
    // TOP 2 POR GRUPO (CLASIFICADOS)
    // ============================
    const clasif = await client.query(
      `
      SELECT
        sub.equipo_id      AS id_equipo,
        e.nombre_equipo,
        sub.id_grupo,
        sub.pos
      FROM (
        SELECT
          eg.equipo_id,
          g.id_grupo,
          RANK() OVER (
            PARTITION BY g.id_grupo
            ORDER BY
              eg.puntos DESC,
              (eg.sets_favor - eg.sets_contra) DESC,
              eg.sets_favor DESC
          ) AS pos
        FROM equipos_grupo eg
        JOIN grupos g ON g.id_grupo = eg.grupo_id
        WHERE g.id_torneo = $1
      ) sub
      JOIN equipo e ON e.id_equipo = sub.equipo_id
      WHERE sub.pos <= 2               -- 👈 SOLO 1° y 2° de cada grupo
      ORDER BY sub.id_grupo, sub.pos   -- 1° grupo A, 2° grupo A, 1° grupo B, 2° grupo B, etc.
      `,
      [idTorneo]
    );

    const seeds = clasif.rows; // [{id_equipo, nombre_equipo, id_grupo, pos}, ...]
    const N = seeds.length;

    if (N === 0) {
      console.log('[PLAYOFF] No hay clasificados para generar llaves');
      return;
    }

    // ============================
    // Si solo hay 2 → FINAL directa
    // ============================
    if (N === 2) {
      await client.query(
        `
        INSERT INTO partidos_llave
          (id_torneo, ronda, orden, equipo1_id, equipo2_id, estado)
        VALUES ($1,'FINAL',1,$2,$3,'no_iniciado')
        `,
        [idTorneo, seeds[0].id_equipo, seeds[1].id_equipo]
      );
      console.log('[PLAYOFF] Generada FINAL directa');
      return;
    }

    // ============================
    // CUARTOS / SEMIS / FINAL
    // (para N=4,8,16... ahora con N=8 tenés 4 partidos de CUARTOS)
    // ============================
    await client.query('BEGIN');

    const cuartosIds = [];

    // Emparejamiento "snake": 1 vs último, 2 vs anteúltimo, etc.
    for (let i = 0; i < Math.floor(N / 2); i++) {
      const A = seeds[i]?.id_equipo ?? null;
      const B = seeds[N - 1 - i]?.id_equipo ?? null;

      const r = await client.query(
        `
        INSERT INTO partidos_llave
          (id_torneo, ronda, orden, equipo1_id, equipo2_id, estado)
        VALUES ($1,'CUARTOS',$2,$3,$4,'no_iniciado')
        RETURNING id
        `,
        [idTorneo, i + 1, A, B]
      );
      cuartosIds.push(r.rows[0].id);
    }

    // SEMIS (2 partidos vacíos)
    const semisIds = [];
    for (let i = 0; i < Math.ceil(cuartosIds.length / 2); i++) {
      const r = await client.query(
        `
        INSERT INTO partidos_llave
          (id_torneo, ronda, orden, estado)
        VALUES ($1,'SEMIS',$2,'no_iniciado')
        RETURNING id
        `,
        [idTorneo, i + 1]
      );
      semisIds.push(r.rows[0].id);
    }

    // FINAL (1 partido vacío)
    const finalId = (
      await client.query(
        `
        INSERT INTO partidos_llave
          (id_torneo, ronda, orden, estado)
        VALUES ($1,'FINAL',1,'no_iniciado')
        RETURNING id
        `,
        [idTorneo]
      )
    ).rows[0].id;

    // Linkear CUARTOS → SEMIS
    for (let i = 0; i < cuartosIds.length; i++) {
      const nextSemi = semisIds[Math.floor(i / 2)];
      const slot = (i % 2) === 0 ? 1 : 2; // primer partido entra como slot1, segundo como slot2
      await client.query(
        `
        UPDATE partidos_llave
        SET next_match_id = $1, next_slot = $2
        WHERE id = $3
        `,
        [nextSemi, slot, cuartosIds[i]]
      );
    }

    // Linkear SEMIS → FINAL
    await client.query(
      `
      UPDATE partidos_llave
      SET next_match_id = $1, next_slot = 1
      WHERE id = $2
      `,
      [finalId, semisIds[0]]
    );
    if (semisIds[1]) {
      await client.query(
        `
        UPDATE partidos_llave
        SET next_match_id = $1, next_slot = 2
        WHERE id = $2
        `,
        [finalId, semisIds[1]]
      );
    }

    await client.query('COMMIT');
    console.log(
      `[PLAYOFF] Árbol generado: N=${N}, cuartos=${cuartosIds.length}, semis=${semisIds.length}, final=1`
    );
  } catch (err) {
    // 👇 usar el mismo client
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('[PLAYOFF] Error generar árbol:', err);
    throw err;
  } finally {
    client.release();
  }
}
