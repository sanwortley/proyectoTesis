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

    // ranking global post grupos
    const clasif = await client.query(`
      SELECT e.id_equipo, e.nombre_equipo
      FROM equipos_grupo eg
      JOIN equipo e ON e.id_equipo = eg.equipo_id
      JOIN grupos g ON g.id_grupo = eg.grupo_id
      WHERE g.id_torneo = $1
      ORDER BY eg.puntos DESC, (eg.sets_favor - eg.sets_contra) DESC
    `, [idTorneo]);

    const seeds = clasif.rows; // [{id_equipo, nombre_equipo}, ...]

    if (seeds.length === 2) {
      // final directa
      await client.query(`
        INSERT INTO partidos_llave (id_torneo, ronda, orden, equipo1_id, equipo2_id, estado)
        VALUES ($1,'FINAL',1,$2,$3,'no_iniciado')
      `, [idTorneo, seeds[0].id_equipo, seeds[1].id_equipo]);
      console.log('[PLAYOFF] Generada FINAL directa');
      return;
    }

    // Normal: armar CUARTOS/SEMIS/FINAL
    // 1) CUARTOS (emparejamiento snake: 1-8, 4-5, 3-6, 2-7 si hay 8; se adapta a N)
    const N = seeds.length;
    const cuartosIds = []; // ids de partidos de cuartos en orden 1..4
    await client.query('BEGIN');
    for (let i = 0; i < Math.floor(N / 2); i++) {
      const A = seeds[i]?.id_equipo ?? null;
      const B = seeds[N - 1 - i]?.id_equipo ?? null;
      const r = await client.query(
        `INSERT INTO partidos_llave (id_torneo, ronda, orden, equipo1_id, equipo2_id, estado)
         VALUES ($1,'CUARTOS',$2,$3,$4,'no_iniciado')
         RETURNING id`,
        [idTorneo, i + 1, A, B]
      );
      cuartosIds.push(r.rows[0].id);
    }

    // 2) SEMIS (2 partidos vacíos)
    const semisIds = [];
    for (let i = 0; i < Math.ceil(cuartosIds.length / 2); i++) {
      const r = await client.query(
        `INSERT INTO partidos_llave (id_torneo, ronda, orden, estado)
         VALUES ($1,'SEMIS',$2,'no_iniciado')
         RETURNING id`,
        [idTorneo, i + 1]
      );
      semisIds.push(r.rows[0].id);
    }

    // 3) FINAL (1 partido vacío)
    const finalId = (await client.query(
      `INSERT INTO partidos_llave (id_torneo, ronda, orden, estado)
       VALUES ($1,'FINAL',1,'no_iniciado')
       RETURNING id`,
      [idTorneo]
    )).rows[0].id;

    // 4) Linkear cuartos → semis
    // cuartos 1-2 alimentan semi 1 (slots 1 y 2), cuartos 3-4 alimentan semi 2, etc.
    for (let i = 0; i < cuartosIds.length; i++) {
      const nextSemi = semisIds[Math.floor(i / 2)];
      const slot = (i % 2) === 0 ? 1 : 2;
      await client.query(
        `UPDATE partidos_llave SET next_match_id = $1, next_slot = $2 WHERE id = $3`,
        [nextSemi, slot, cuartosIds[i]]
      );
    }

    // 5) Linkear semis → final
    await client.query(
      `UPDATE partidos_llave SET next_match_id = $1, next_slot = 1 WHERE id = $2`,
      [finalId, semisIds[0]]
    );
    if (semisIds[1]) {
      await client.query(
        `UPDATE partidos_llave SET next_match_id = $1, next_slot = 2 WHERE id = $2`,
        [finalId, semisIds[1]]
      );
    }

    await client.query('COMMIT');
    console.log('[PLAYOFF] Árbol CUARTOS→SEMIS→FINAL creado y linkeado');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('[PLAYOFF] Error generar árbol:', err);
    throw err;
  } finally {
    client.release();
  }
}
