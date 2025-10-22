// routes/playoffRoutes.js
import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

/**
 * GET /torneos/:id/playoff
 * Devuelve el bracket agrupado por ronda.
 */
router.get('/torneos/:id/playoff', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.id_torneo, p.ronda, p.orden, p.estado,
             p.equipo1_id, e1.nombre_equipo AS equipo1_nombre,
             p.equipo2_id, e2.nombre_equipo AS equipo2_nombre,
             p.set1_equipo1, p.set1_equipo2,
             p.set2_equipo1, p.set2_equipo2,
             p.set3_equipo1, p.set3_equipo2,
             p.ganador_id, p.next_match_id, p.next_slot
      FROM partidos_llave p
      LEFT JOIN equipo e1 ON e1.id_equipo = p.equipo1_id
      LEFT JOIN equipo e2 ON e2.id_equipo = p.equipo2_id
      WHERE p.id_torneo = $1
      ORDER BY CASE p.ronda
                 WHEN 'OCTAVOS' THEN 1
                 WHEN 'CUARTOS' THEN 2
                 WHEN 'SEMIS'   THEN 3
                 WHEN 'FINAL'   THEN 4
               END, p.orden
    `, [id]);

    const rondas = rows.reduce((acc, r) => {
      acc[r.ronda] ||= [];
      acc[r.ronda].push(r);
      return acc;
    }, {});
    res.json({ torneo_id: Number(id), rondas });
  } catch (err) {
    console.error('[GET playoff] error:', err);
    res.status(500).json({ error: 'No se pudo obtener el play-off' });
  }
});

/**
 * POST /torneos/:id/playoff
 * Genera el bracket si:
 *  - No existe aún (idempotencia)
 *  - TODOS los partidos de grupos del torneo están finalizados.
 * Casos soportados:
 *  - 1 solo grupo: FINAL (2-3 equipos) o SEMIS (>=4) con 1vs4, 2vs3
 *  - Múltiples grupos: cruces inter-grupo 1°A-2°B, 1°B-2°A, etc. (requiere cantidad par de grupos)
 */
router.post('/torneos/:id/playoff', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Idempotencia
    const ya = await client.query(
      `SELECT 1 FROM partidos_llave WHERE id_torneo=$1 LIMIT 1`, [id]
    );
    if (ya.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El play-off ya fue generado' });
    }

    // Validar que TODOS los partidos de grupos estén finalizados
    const pend = await client.query(`
      SELECT COUNT(*)::int AS pendientes
      FROM partidos_grupo pg
      JOIN grupos g ON g.id_grupo = pg.grupo_id
      WHERE g.id_torneo = $1 AND LOWER(TRIM(pg.estado)) <> 'finalizado'
    `, [id]);
    if (pend.rows[0].pendientes > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Aún hay partidos de grupos sin finalizar' });
    }

    // Traer grupos del torneo
    const gruposRes = await client.query(
      `SELECT id_grupo, nombre FROM grupos WHERE id_torneo=$1 ORDER BY nombre`, [id]
    );
    if (!gruposRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No hay grupos generados' });
    }

    // Clasificados por grupo: orden por puntos, diferencia, sets a favor
    // Tomamos hasta 4 por grupo (sirve para el caso de un solo grupo).
    const clasif = [];
    for (const g of gruposRes.rows) {
      const { rows } = await client.query(`
        SELECT equipo_id,
               puntos,
               (sets_favor - sets_contra) AS dif,
               sets_favor
        FROM equipos_grupo
        WHERE grupo_id = $1
        ORDER BY puntos DESC, (sets_favor - sets_contra) DESC, sets_favor DESC
        LIMIT 4
      `, [g.id_grupo]);
      rows.forEach((r, idx) => {
        clasif.push({
          grupoNombre: g.nombre,
          equipo_id: r.equipo_id,
          posicion: idx + 1,
          puntos: r.puntos,
          dif: r.dif,
          sf: r.sets_favor
        });
      });
    }

    // Agrupar por grupo
    const byGroup = clasif.reduce((acc, r) => {
      acc[r.grupoNombre] ||= [];
      acc[r.grupoNombre].push(r);
      return acc;
    }, {});
    const gruposOrden = Object.keys(byGroup).sort();

    // Armar cruces
    const cruces = [];
    let rondaInicial = 'FINAL';

    if (gruposOrden.length === 1) {
      // ----- Un solo grupo -----
      const lista = byGroup[gruposOrden[0]];
      if (lista.length < 2) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No hay suficientes clasificados en el grupo para armar play-off' });
      }
      if (lista.length >= 4) {
        // SEMIS: 1 vs 4, 2 vs 3
        rondaInicial = 'SEMIS';
        cruces.push({ local: lista[0].equipo_id, visita: lista[3].equipo_id }); // 1 vs 4
        cruces.push({ local: lista[1].equipo_id, visita: lista[2].equipo_id }); // 2 vs 3
      } else {
        // FINAL directa: 1 vs 2
        rondaInicial = 'FINAL';
        cruces.push({ local: lista[0].equipo_id, visita: lista[1].equipo_id });
      }
    } else {
      // ----- Múltiples grupos -----
      if (gruposOrden.length % 2 !== 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'La cantidad de grupos debe ser par para armar cruces inter-grupo (A-B, C-D, ...)' });
      }
      for (let i = 0; i < gruposOrden.length; i += 2) {
        const g1 = gruposOrden[i], g2 = gruposOrden[i + 1];
        const p1 = (byGroup[g1] || []).find(x => x.posicion === 1);
        const s1 = (byGroup[g1] || []).find(x => x.posicion === 2);
        const p2 = (byGroup[g2] || []).find(x => x.posicion === 1);
        const s2 = (byGroup[g2] || []).find(x => x.posicion === 2);

        if (!(p1 && s1 && p2 && s2)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Grupos incompletos: ${g1} o ${g2}` });
        }
        // 1°G1 vs 2°G2 y 1°G2 vs 2°G1
        cruces.push({ local: p1.equipo_id, visita: s2.equipo_id });
        cruces.push({ local: p2.equipo_id, visita: s1.equipo_id });
      }

      const total = cruces.length * 2;
      rondaInicial = total === 16 ? 'OCTAVOS'
                   : total === 8  ? 'CUARTOS'
                   : total === 4  ? 'SEMIS'
                   : 'FINAL';
    }

    if (cruces.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No se pudieron calcular cruces de play-off (revisá cantidad de grupos y clasificados)' });
    }

    // Crear estructura de rondas hacia la final
    const RONDAS = ['OCTAVOS','CUARTOS','SEMIS','FINAL'];
    const ordenR = RONDAS.slice(RONDAS.indexOf(rondaInicial));
    const idsPorRonda = {};

    // Crear partidos "vacíos" de rondas posteriores
    let count = cruces.length;
    for (let i = 1; i < ordenR.length; i++) {
      const ronda = ordenR[i];
      const cant = Math.ceil(count / 2);
      idsPorRonda[ronda] = [];
      for (let j = 0; j < cant; j++) {
        const ins = await client.query(`
          INSERT INTO partidos_llave (id_torneo, ronda, orden, estado)
          VALUES ($1,$2,$3,'no_iniciado') RETURNING id
        `, [id, ronda, j]);
        idsPorRonda[ronda].push(ins.rows[0].id);
      }
      count = cant;
    }

    // Insertar ronda inicial y linkear siguiente
    const siguiente = ordenR[1]; // undefined si la inicial es FINAL
    for (let i = 0; i < cruces.length; i++) {
      let nextId = null, nextSlot = null;
      if (siguiente) {
        const idxNext = Math.floor(i / 2);
        nextId = idsPorRonda[siguiente][idxNext];
        nextSlot = (i % 2 === 0) ? 1 : 2;
      }
      await client.query(`
        INSERT INTO partidos_llave
          (id_torneo, ronda, orden, estado, equipo1_id, equipo2_id, next_match_id, next_slot)
        VALUES ($1,$2,$3,'no_iniciado',$4,$5,$6,$7)
      `, [id, rondaInicial, i, cruces[i].local, cruces[i].visita, nextId, nextSlot]);
    }

    await client.query('COMMIT');
    res.json({ ok: true, rondaInicial, partidos: cruces.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST playoff] error:', err);
    res.status(500).json({ error: 'No se pudo generar el play-off' });
  } finally {
    client.release();
  }
});

/**
 * PATCH /partidos-llave/:id/resultado
 * Guarda sets, marca ganador y lo propaga al next_match_id/next_slot si corresponde.
 * Body: { set1_equipo1,set1_equipo2,set2_equipo1,set2_equipo2,set3_equipo1,set3_equipo2, [ganador_id] }
 */
router.patch('/partidos-llave/:id/resultado', async (req, res) => {
  const { id } = req.params;
  const {
    set1_equipo1, set1_equipo2,
    set2_equipo1, set2_equipo2,
    set3_equipo1, set3_equipo2,
    ganador_id: ganadorManual
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pr = await client.query(`
      SELECT id, id_torneo, equipo1_id, equipo2_id, next_match_id, next_slot
      FROM partidos_llave WHERE id=$1 FOR UPDATE
    `, [id]);
    if (!pr.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    const partido = pr.rows[0];

    // calcular ganador (si no viene manual)
    let g1 = 0, g2 = 0;
    const sets = [
      [set1_equipo1, set1_equipo2],
      [set2_equipo1, set2_equipo2],
      [set3_equipo1, set3_equipo2],
    ];
    for (const [a,b] of sets) {
      if (a == null || b == null) continue;
      if (a > b) g1++; else if (b > a) g2++;
    }
    const ganadorId = ganadorManual ?? (g1 > g2 ? partido.equipo1_id : partido.equipo2_id);

    await client.query(`
      UPDATE partidos_llave
      SET set1_equipo1=$2,set1_equipo2=$3,
          set2_equipo1=$4,set2_equipo2=$5,
          set3_equipo1=$6,set3_equipo2=$7,
          estado='finalizado', ganador_id=$8, updated_at=NOW()
      WHERE id=$1
    `, [ id, set1_equipo1, set1_equipo2, set2_equipo1, set2_equipo2, set3_equipo1, set3_equipo2, ganadorId ]);

    // Propagar
    if (partido.next_match_id && partido.next_slot) {
      const col = partido.next_slot === 1 ? 'equipo1_id' : 'equipo2_id';
      await client.query(
        `UPDATE partidos_llave SET ${col} = $2 WHERE id = $1 AND ${col} IS NULL`,
        [partido.next_match_id, ganadorId]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true, ganador_id: ganadorId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PATCH resultado] error:', err);
    res.status(500).json({ error: 'No se pudo guardar el resultado' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /torneos/:id/playoff
 * Limpia todo el cuadro del torneo (útil para regenerar).
 */
router.delete('/torneos/:id/playoff', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM partidos_llave WHERE id_torneo=$1`, [id]);
    res.json({ ok: true, mensaje: 'Play-off eliminado' });
  } catch (err) {
    console.error('[DELETE playoff] error:', err);
    res.status(500).json({ error: 'No se pudo eliminar el play-off' });
  }
});

export default router;
