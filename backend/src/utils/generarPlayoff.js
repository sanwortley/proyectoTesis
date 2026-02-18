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

    // Determinar nombre de la primera ronda según cantidad de equipos
    const numPartidosPrimeraRonda = Math.floor(N / 2);
    let primeraRonda;
    if (numPartidosPrimeraRonda === 8) {
      primeraRonda = 'OCTAVOS';  // 16 equipos → 8 partidos
    } else if (numPartidosPrimeraRonda === 4) {
      primeraRonda = 'CUARTOS';  // 8 equipos → 4 partidos
    } else if (numPartidosPrimeraRonda === 2) {
      primeraRonda = 'SEMIS';    // 4 equipos → 2 partidos
    } else {
      primeraRonda = 'CUARTOS';  // fallback
    }

    console.log(`[PLAYOFF] N=${N} equipos → ${numPartidosPrimeraRonda} partidos en ${primeraRonda}`);

    // Emparejamiento "snake": 1 vs último, 2 vs anteúltimo, etc.
    for (let i = 0; i < numPartidosPrimeraRonda; i++) {
      const A = seeds[i]?.id_equipo ?? null;
      const B = seeds[N - 1 - i]?.id_equipo ?? null;

      const r = await client.query(
        `
        INSERT INTO partidos_llave
          (id_torneo, ronda, orden, equipo1_id, equipo2_id, estado)
        VALUES ($1,$2,$3,$4,$5,'no_iniciado')
        RETURNING id
        `,
        [idTorneo, primeraRonda, i + 1, A, B]
      );
      cuartosIds.push(r.rows[0].id);
    }

    // Determinar las rondas siguientes según la primera ronda
    let segundaRonda, terceraRonda;
    if (primeraRonda === 'OCTAVOS') {
      segundaRonda = 'CUARTOS';  // 8 partidos → 4 partidos
      terceraRonda = 'SEMIS';     // 4 partidos → 2 partidos
    } else if (primeraRonda === 'CUARTOS') {
      segundaRonda = 'SEMIS';     // 4 partidos → 2 partidos
      terceraRonda = 'FINAL';     // 2 partidos → 1 partido (pero FINAL se genera aparte)
    } else if (primeraRonda === 'SEMIS') {
      segundaRonda = 'FINAL';     // 2 partidos → 1 partido (pero FINAL se genera aparte)
      terceraRonda = null;
    }

    // Segunda ronda (CUARTOS o SEMIS según la primera ronda)
    const segundaRondaIds = [];
    const numPartidosSegundaRonda = Math.ceil(cuartosIds.length / 2);
    for (let i = 0; i < numPartidosSegundaRonda; i++) {
      const r = await client.query(
        `
        INSERT INTO partidos_llave
          (id_torneo, ronda, orden, estado)
        VALUES ($1,$2,$3,'no_iniciado')
        RETURNING id
        `,
        [idTorneo, segundaRonda, i + 1]
      );
      segundaRondaIds.push(r.rows[0].id);
    }

    // Tercera ronda (solo si existe - para OCTAVOS sería SEMIS)
    const terceraRondaIds = [];
    if (terceraRonda && terceraRonda !== 'FINAL') {
      const numPartidosTerceraRonda = Math.ceil(segundaRondaIds.length / 2);
      for (let i = 0; i < numPartidosTerceraRonda; i++) {
        const r = await client.query(
          `
          INSERT INTO partidos_llave
            (id_torneo, ronda, orden, estado)
          VALUES ($1,$2,$3,'no_iniciado')
          RETURNING id
          `,
          [idTorneo, terceraRonda, i + 1]
        );
        terceraRondaIds.push(r.rows[0].id);
      }
    }

    // FINAL (siempre 1 partido)
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

    // Linkear primera ronda → segunda ronda
    for (let i = 0; i < cuartosIds.length; i++) {
      const nextMatch = segundaRondaIds[Math.floor(i / 2)];
      const slot = (i % 2) === 0 ? 1 : 2;
      await client.query(
        `
        UPDATE partidos_llave
        SET next_match_id = $1, next_slot = $2
        WHERE id = $3
        `,
        [nextMatch, slot, cuartosIds[i]]
      );
    }

    // Linkear segunda ronda → tercera ronda (o FINAL)
    if (terceraRondaIds.length > 0) {
      // Hay tercera ronda (ej: OCTAVOS→CUARTOS→SEMIS)
      for (let i = 0; i < segundaRondaIds.length; i++) {
        const nextMatch = terceraRondaIds[Math.floor(i / 2)];
        const slot = (i % 2) === 0 ? 1 : 2;
        await client.query(
          `
          UPDATE partidos_llave
          SET next_match_id = $1, next_slot = $2
          WHERE id = $3
          `,
          [nextMatch, slot, segundaRondaIds[i]]
        );
      }

      // Linkear tercera ronda → FINAL
      for (let i = 0; i < terceraRondaIds.length; i++) {
        const slot = (i % 2) === 0 ? 1 : 2;
        await client.query(
          `
          UPDATE partidos_llave
          SET next_match_id = $1, next_slot = $2
          WHERE id = $3
          `,
          [finalId, slot, terceraRondaIds[i]]
        );
      }
    } else {
      // No hay tercera ronda - segunda ronda va directo a FINAL
      for (let i = 0; i < segundaRondaIds.length; i++) {
        const slot = (i % 2) === 0 ? 1 : 2;
        await client.query(
          `
          UPDATE partidos_llave
          SET next_match_id = $1, next_slot = $2
          WHERE id = $3
          `,
          [finalId, slot, segundaRondaIds[i]]
        );
      }
    }

    await client.query('COMMIT');
    console.log(
      `[PLAYOFF] Árbol generado: N=${N}, cuartos=${cuartosIds.length}, semis=${semisIds.length}, final=1`
    );
  } catch (err) {
    // 👇 usar el mismo client
    try {
      await client.query('ROLLBACK');
    } catch { }
    console.error('[PLAYOFF] Error generar árbol:', err);
    throw err;
  } finally {
    client.release();
  }
}
