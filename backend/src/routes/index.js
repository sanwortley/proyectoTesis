// src/routes/index.js
import { Router } from 'express';
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { generarGruposAleatorios } from '../utils/generarGrupos.js';
import { generarPlayoffSiNoExiste } from '../utils/generarPlayoff.js';

const router = Router();

router.get('/', (req, res) => {
  res.send('API funcionando');
});

/* =========================
 * CATEGORÍAS
 * ========================= */
router.get('/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categoria');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener categorías:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/categorias', async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const result = await pool.query(
      'INSERT INTO categoria (nombre) VALUES ($1) RETURNING *',
      [nombre]
    );
    res.status(201).json({ categoria: result.rows[0] });
  } catch (error) {
    console.error('Error al crear categoría:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* =========================
 * REGISTRO / LOGIN
 * ========================= */
router.post('/registro-organizadores', async (req, res) => {
  try {
    const { nombre_jugador, apellido_jugador, email, telefono, password, confirmar_password } = req.body;
    if (password !== confirmar_password) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const q = `
      INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, rol)
      VALUES ($1, $2, $3, $4, $5, 'organizador')
      RETURNING id_jugador, nombre_jugador, apellido_jugador, email, telefono, rol
    `;
    const { rows } = await pool.query(q, [nombre_jugador, apellido_jugador, email, telefono, hashedPassword]);
    res.status(201).json({ jugador: rows[0] });
  } catch (error) {
    console.error('Error al registrar organizador:', error);
    res.status(500).json({ error: 'No se pudo registrar el organizador' });
  }
});

router.post('/registro', async (req, res) => {
  try {
    const { nombre_jugador, apellido_jugador, email, telefono, password, confirmar_password } = req.body;
    if (password !== confirmar_password) return res.status(400).json({ error: 'Las contraseñas no coinciden' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const q = `
      INSERT INTO jugador (nombre_jugador, apellido_jugador, email, telefono, password, rol)
      VALUES ($1, $2, $3, $4, $5, 'jugador')
      RETURNING id_jugador, nombre_jugador, apellido_jugador, email, telefono, rol
    `;
    const { rows } = await pool.query(q, [nombre_jugador, apellido_jugador, email, telefono, hashedPassword]);
    res.status(201).json({ jugador: rows[0] });
  } catch (error) {
    console.error('Error al registrar jugador:', error);
    res.status(500).json({ error: 'No se pudo registrar el jugador' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const loginInput = (req.body.email ?? req.body.login ?? '').trim().toLowerCase();
    const { password } = req.body;
    if (!loginInput || !password) return res.status(400).json({ error: 'Faltan credenciales' });

    const result = await pool.query(
      `
      SELECT id_jugador, nombre_jugador, apellido_jugador, email, telefono, rol, password
      FROM public.jugador
      WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
      LIMIT 1
      `,
      [loginInput]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Jugador no encontrado' });

    const jugador = result.rows[0];
    const ok = jugador.password?.startsWith('$2')
      ? await bcrypt.compare(password, jugador.password)
      : password === jugador.password;

    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const role = (jugador.rol || 'jugador').toLowerCase();
    const token = jwt.sign(
      { id: jugador.id_jugador, role },
      process.env.JWT_SECRET || 'dev_secret_change_me',
      { expiresIn: '6h' }
    );
    const { password: _pw, ...jugadorSinPassword } = jugador;
    return res.json({ ok: true, token, jugador: jugadorSinPassword });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

/* =========================
 * JUGADORES
 * ========================= */
router.get('/jugadores', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id_jugador, nombre_jugador, apellido_jugador, rol FROM jugador`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener jugadores:', error);
    res.status(500).json({ error: 'Error al obtener jugadores' });
  }
});

/* =========================
 * TORNEOS CRUD + consultas
 * ========================= */
router.post('/torneos', async (req, res) => {
  const {
    nombre_torneo,
    categoria,
    fecha_inicio,
    fecha_fin,
    fecha_cierre_inscripcion,
    max_equipos
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cierre = new Date(fecha_cierre_inscripcion);
    cierre.setHours(23, 59, 59, 999);

    const insertTorneo = `
      INSERT INTO torneo (
        nombre_torneo, categoria, fecha_inicio, fecha_fin,
        fecha_cierre_inscripcion, max_equipos
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_torneo
    `;
    const { rows } = await client.query(insertTorneo, [
      nombre_torneo, categoria, fecha_inicio, fecha_fin, cierre, max_equipos
    ]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Torneo creado correctamente', torneoId: rows[0].id_torneo });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Error al crear el torneo' });
  } finally {
    client.release();
  }
});

router.get('/torneos', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM torneo');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener torneos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/torneos/organizador/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM torneo WHERE id_organizador = $1`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener torneos por organizador:', error);
    res.status(500).json({ error: 'No se pudo obtener los torneos del organizador' });
  }
});

router.get('/torneos/reciente/:idCategoria', async (req, res) => {
  const { idCategoria } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM torneo
      WHERE categoria = $1
      ORDER BY fecha_inicio DESC
      LIMIT 1
    `, [idCategoria]);

    const torneo = result.rows[0];
    if (!torneo) return res.json([]);

    const hoy = new Date();
    const fechaInicio = new Date(torneo.fecha_inicio);
    const diasDiferencia = (hoy - fechaInicio) / (1000 * 60 * 60 * 24);
    if (diasDiferencia > 7) return res.json([]);

    res.json([torneo]);
  } catch (error) {
    console.error('Error al obtener torneo reciente:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/torneos/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nombre_torneo, categoria, fecha_inicio, fecha_fin,
    fecha_cierre_inscripcion, max_equipos
  } = req.body;

  try {
    await pool.query(
      `UPDATE torneo
       SET nombre_torneo=$1, categoria=$2, fecha_inicio=$3, fecha_fin=$4, fecha_cierre_inscripcion=$5, max_equipos=$6
       WHERE id_torneo=$7`,
      [nombre_torneo, categoria, fecha_inicio, fecha_fin, fecha_cierre_inscripcion, max_equipos, id]
    );
    res.json({ mensaje: 'Torneo actualizado correctamente' });
  } catch (error) {
    console.error('Error al editar torneo:', error);
    res.status(500).json({ error: 'No se pudo editar el torneo' });
  }
});

router.delete('/torneos/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM inscripcion WHERE id_torneo = $1`, [id]);
    await client.query(`DELETE FROM torneo WHERE id_torneo = $1`, [id]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Torneo eliminado correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar torneo:', error);
    res.status(500).json({ error: 'No se pudo eliminar el torneo' });
  } finally {
    client.release();
  }
});

/* =========================
 * INSCRIPCIONES / EQUIPOS
 * ========================= */
router.post('/inscripcion', async (req, res) => {
  const { jugador1_id, jugador2_id, id_torneo } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const torneo = await client.query(
      `SELECT fecha_cierre_inscripcion FROM torneo WHERE id_torneo = $1`,
      [id_torneo]
    );
    const cierre = new Date(torneo.rows[0].fecha_cierre_inscripcion);
    const hoy = new Date();
    if (hoy > cierre) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La inscripción a este torneo ya está cerrada' });
    }

    const check = await client.query(`
      SELECT i.id_inscripcion
      FROM inscripcion i
      JOIN equipo e ON i.id_equipo = e.id_equipo
      WHERE i.id_torneo = $1 AND
           ((e.jugador1_id = $2 AND e.jugador2_id = $3) OR
            (e.jugador1_id = $3 AND e.jugador2_id = $2))
    `, [id_torneo, jugador1_id, jugador2_id]);
    if (check.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Este equipo ya está inscrito en el torneo' });
    }

    const jugador1 = await client.query('SELECT apellido_jugador FROM jugador WHERE id_jugador = $1', [jugador1_id]);
    const jugador2 = await client.query('SELECT apellido_jugador FROM jugador WHERE id_jugador = $1', [jugador2_id]);
    const [a1, a2] = [jugador1.rows[0].apellido_jugador, jugador2.rows[0].apellido_jugador].sort();
    const nombre_equipo = `${a1}/${a2}`;

    const nuevoEquipo = await client.query(
      `INSERT INTO equipo (jugador1_id, jugador2_id, nombre_equipo)
       VALUES ($1, $2, $3) RETURNING id_equipo`,
      [jugador1_id, jugador2_id, nombre_equipo]
    );
    const id_equipo = nuevoEquipo.rows[0].id_equipo;

    await client.query(
      `INSERT INTO inscripcion (id_equipo, id_torneo) VALUES ($1, $2)`,
      [id_equipo, id_torneo]
    );

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Inscripción exitosa', nombre_equipo });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en inscripción:', error);
    res.status(500).json({ error: 'No se pudo completar la inscripción' });
  } finally {
    client.release();
  }
});

router.get('/torneos/:id/equipos', async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query(`
      SELECT 
        t.nombre_torneo,
        e.id_equipo,
        e.nombre_equipo,
        j1.id_jugador AS jugador1_id,
        j1.nombre_jugador AS nombre_jugador1,
        j1.apellido_jugador AS apellido_jugador1,
        j2.id_jugador AS jugador2_id,
        j2.nombre_jugador AS nombre_jugador2,
        j2.apellido_jugador AS apellido_jugador2
      FROM inscripcion i
      JOIN equipo e ON i.id_equipo = e.id_equipo
      JOIN torneo t ON i.id_torneo = t.id_torneo
      JOIN jugador j1 ON e.jugador1_id = j1.id_jugador
      JOIN jugador j2 ON e.jugador2_id = j2.id_jugador
      WHERE i.id_torneo = $1
    `, [id]);

    res.json({
      nombre_torneo: resultado.rows[0]?.nombre_torneo || 'Torneo desconocido',
      equipos: resultado.rows
    });
  } catch (error) {
    console.error('Error al obtener equipos del torneo:', error);
    res.status(500).json({ error: 'No se pudo obtener los equipos del torneo' });
  }
});

router.put('/equipos/:id', async (req, res) => {
  const { id } = req.params;
  const { jugador1_id, jugador2_id, nombre_equipo } = req.body;
  try {
    await pool.query(
      `UPDATE equipo SET jugador1_id=$1, jugador2_id=$2, nombre_equipo=$3 WHERE id_equipo=$4`,
      [jugador1_id, jugador2_id, nombre_equipo, id]
    );
    res.json({ mensaje: 'Equipo actualizado correctamente' });
  } catch (error) {
    console.error('Error al editar equipo:', error);
    res.status(500).json({ error: 'No se pudo editar el equipo' });
  }
});

router.delete('/equipos/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM inscripcion WHERE id_equipo = $1', [id]);
    await client.query('DELETE FROM equipo WHERE id_equipo = $1', [id]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Equipo eliminado correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar equipo:', error);
    res.status(500).json({ error: 'No se pudo eliminar el equipo' });
  } finally {
    client.release();
  }
});

/* =========================
 * GRUPOS (crear / leer / borrar)
 * ========================= */
router.post('/torneos/:id/generar-grupos', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const equiposRes = await client.query(`
      SELECT e.id_equipo, e.nombre_equipo
      FROM inscripcion i
      JOIN equipo e ON i.id_equipo = e.id_equipo
      WHERE i.id_torneo = $1
    `, [id]);

    const equipos = equiposRes.rows;
    if (equipos.length < 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Se necesitan al menos 2 equipos para generar partidos' });
    }

    if (equipos.length === 2) {
      await client.query(`
        INSERT INTO partidos_llave (id_torneo, ronda, orden, equipo1_id, equipo2_id, estado)
        VALUES ($1, 'FINAL', 1, $2, $3, 'no_iniciado')
        ON CONFLICT DO NOTHING
      `, [id, equipos[0].id_equipo, equipos[1].id_equipo]);
      await client.query('COMMIT');
      return res.json({ mensaje: 'Partido final generado (solo 2 equipos)' });
    }

    const grupos = generarGruposAleatorios(equipos);
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < grupos.length; i++) {
      const nombreGrupo = `Grupo ${letras[i]}`;

      const grupoRes = await client.query(
        `INSERT INTO grupos (id_torneo, nombre) VALUES ($1, $2) RETURNING id_grupo`,
        [id, nombreGrupo]
      );
      const grupoId = grupoRes.rows[0].id_grupo;

      for (const equipo of grupos[i]) {
        await client.query(
          `INSERT INTO equipos_grupo (grupo_id, equipo_id) VALUES ($1, $2)`,
          [grupoId, equipo.id_equipo]
        );
      }

      const participantes = grupos[i];
      for (let j = 0; j < participantes.length; j++) {
        for (let k = j + 1; k < participantes.length; k++) {
          await client.query(
            `INSERT INTO partidos_grupo (grupo_id, equipo1_id, equipo2_id)
             VALUES ($1, $2, $3)`,
            [grupoId, participantes[j].id_equipo, participantes[k].id_equipo]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Grupos generados correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al generar grupos:', error);
    res.status(500).json({ error: 'Error al generar los grupos' });
  } finally {
    client.release();
  }
});

router.get('/torneos/:id/grupos', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    const torneoInfoRes = await client.query(`
      SELECT t.nombre_torneo AS nombre_torneo, c.nombre AS categoria
      FROM torneo t
      JOIN categoria c ON t.categoria = c.id_categoria
      WHERE t.id_torneo = $1
    `, [id]);
    if (torneoInfoRes.rowCount === 0) return res.status(404).json({ error: 'Torneo no encontrado' });

    const { nombre_torneo, categoria } = torneoInfoRes.rows[0];

    const gruposRes = await client.query(`
      SELECT id_grupo, nombre
      FROM grupos
      WHERE id_torneo = $1
      ORDER BY id_grupo
    `, [id]);

    const grupos = [];
    for (const grupo of gruposRes.rows) {
      const grupoId = grupo.id_grupo;

      const equiposRes = await client.query(`
        SELECT 
          eg.equipo_id,
          e.nombre_equipo,
          eg.puntos,
          eg.partidos_jugados,
          eg.sets_favor,
          eg.sets_contra
        FROM equipos_grupo eg
        JOIN equipo e ON eg.equipo_id = e.id_equipo
        WHERE eg.grupo_id = $1
      `, [grupoId]);

      const partidosRes = await client.query(`
        SELECT 
          pg.id,
          e1.nombre_equipo AS equipo1,
          e2.nombre_equipo AS equipo2,
          pg.set1_equipo1,
          pg.set1_equipo2,
          pg.set2_equipo1,
          pg.set2_equipo2,
          pg.set3_equipo1,
          pg.set3_equipo2,
          pg.estado
        FROM partidos_grupo pg
        JOIN equipo e1 ON pg.equipo1_id = e1.id_equipo
        JOIN equipo e2 ON pg.equipo2_id = e2.id_equipo
        WHERE pg.grupo_id = $1
      `, [grupoId]);

      grupos.push({
        id_grupo: grupoId,
        nombre: grupo.nombre,
        equipos: equiposRes.rows,
        partidos: partidosRes.rows
      });
    }

    res.json({ torneo: nombre_torneo, categoria, grupos });
  } catch (error) {
    console.error('Error al obtener grupos:', error);
    res.status(500).json({ error: 'No se pudieron obtener los grupos' });
  } finally {
    client.release();
  }
});

router.delete('/torneos/:id/grupos', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const gruposRes = await client.query(
      'SELECT id_grupo FROM grupos WHERE id_torneo = $1',
      [id]
    );
    const grupoIds = gruposRes.rows.map(r => r.id_grupo);
    if (grupoIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No hay grupos para este torneo' });
    }

    await client.query('DELETE FROM partidos_grupo WHERE grupo_id = ANY($1)', [grupoIds]);
    await client.query('DELETE FROM equipos_grupo WHERE grupo_id = ANY($1)', [grupoIds]);
    await client.query('DELETE FROM grupos WHERE id_torneo = $1', [id]);

    await client.query('COMMIT');
    res.json({ mensaje: 'Grupos del torneo eliminados correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar grupos del torneo:', error);
    res.status(500).json({ error: 'No se pudieron eliminar los grupos del torneo' });
  } finally {
    client.release();
  }
});

/* =========================
 * PARTIDOS – Fase de grupos (carga de sets)
 * ========================= */
router.put('/partidos-grupo/:id', async (req, res) => {
  const { id } = req.params;
  const {
    set1_equipo1, set1_equipo2,
    set2_equipo1, set2_equipo2,
    set3_equipo1, set3_equipo2
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const partidoRes = await client.query(`
      SELECT grupo_id, equipo1_id, equipo2_id
      FROM partidos_grupo
      WHERE id = $1
    `, [id]);
    if (partidoRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    const { grupo_id, equipo1_id, equipo2_id } = partidoRes.rows[0];

    await client.query(`
      UPDATE partidos_grupo
      SET
        set1_equipo1 = $1, set1_equipo2 = $2,
        set2_equipo1 = $3, set2_equipo2 = $4,
        set3_equipo1 = $5, set3_equipo2 = $6,
        estado = 'finalizado'
      WHERE id = $7
    `, [
      set1_equipo1, set1_equipo2,
      set2_equipo1, set2_equipo2,
      set3_equipo1, set3_equipo2,
      id
    ]);

    const sets = [
      [set1_equipo1, set1_equipo2],
      [set2_equipo1, set2_equipo2],
      [set3_equipo1, set3_equipo2]
    ];
    let setsGanados1 = 0, setsGanados2 = 0, setsFavor1 = 0, setsFavor2 = 0;
    for (const [s1, s2] of sets) {
      if (s1 == null || s2 == null) continue;
      if (s1 > s2) setsGanados1++; else if (s2 > s1) setsGanados2++;
      setsFavor1 += (s1 ?? 0);
      setsFavor2 += (s2 ?? 0);
    }
    const puntos1 = setsGanados1 > setsGanados2 ? 3 : 0;
    const puntos2 = setsGanados2 > setsGanados1 ? 3 : 0;

    await client.query(`
      UPDATE equipos_grupo
      SET
        puntos = puntos + $1,
        partidos_jugados = partidos_jugados + 1,
        sets_favor = sets_favor + $2,
        sets_contra = sets_contra + $3
      WHERE grupo_id = $4 AND equipo_id = $5
    `, [puntos1, setsFavor1, setsFavor2, grupo_id, equipo1_id]);

    await client.query(`
      UPDATE equipos_grupo
      SET
        puntos = puntos + $1,
        partidos_jugados = partidos_jugados + 1,
        sets_favor = sets_favor + $2,
        sets_contra = sets_contra + $3
      WHERE grupo_id = $4 AND equipo_id = $5
    `, [puntos2, setsFavor2, setsFavor1, grupo_id, equipo2_id]);

    await client.query('COMMIT');
    res.json({ mensaje: 'Resultado guardado y estadísticas actualizadas' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al guardar resultado:', error);
    res.status(500).json({ error: 'No se pudo guardar el resultado' });
  } finally {
    client.release();
  }
});

/* =========================
 * PLAY-OFFS (GET/POST/PUT)
 * ========================= */

// GET llaves por torneo
router.get('/torneos/:idTorneo/playoff', async (req, res) => {
  const rawId = req.params.idTorneo;
  const idTorneo = Number(rawId);

  if (Number.isNaN(idTorneo)) {
    console.error('[PLAYOFF GET] ID de torneo inválido:', rawId);
    return res.status(400).json({ error: 'ID de torneo inválido' });
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        pl.id,
        pl.id_torneo,
        pl.ronda,
        pl.orden,
        pl.equipo1_id,
        e1.nombre_equipo AS equipo1_nombre,
        pl.equipo2_id,
        e2.nombre_equipo AS equipo2_nombre,
        pl.set1_equipo1, pl.set1_equipo2,
        pl.set2_equipo1, pl.set2_equipo2,
        pl.set3_equipo1, pl.set3_equipo2,
        pl.estado,
        pl.ganador_id,
        pl.next_match_id,
        pl.next_slot
      FROM partidos_llave pl
      LEFT JOIN equipo e1 ON e1.id_equipo = pl.equipo1_id
      LEFT JOIN equipo e2 ON e2.id_equipo = pl.equipo2_id
      WHERE pl.id_torneo = $1
      ORDER BY
        CASE pl.ronda
          WHEN 'OCTAVOS' THEN 1
          WHEN 'CUARTOS' THEN 2
          WHEN 'SEMIS'   THEN 3
          WHEN 'FINAL'   THEN 4
          ELSE 99
        END,
        pl.orden ASC
    `, [idTorneo]);

    const rondas = {};
    for (const r of rows) {
      if (!rondas[r.ronda]) rondas[r.ronda] = [];
      rondas[r.ronda].push(r);
    }
    return res.json({ rondas });
  } catch (err) {
    console.error('[PLAYOFF GET] Error:', err);
    return res.status(500).json({ error: 'No se pudieron obtener las llaves' });
  }
});

// POST generar llaves si no existen
router.post('/torneos/:idTorneo/playoff', async (req, res) => {
  const { idTorneo } = req.params;
  try {
    await generarPlayoffSiNoExiste(Number(idTorneo));
    const { rows } = await pool.query(
      `SELECT id FROM partidos_llave WHERE id_torneo = $1 LIMIT 1`,
      [idTorneo]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'No se pudo generar el play-off (revisar grupos/completitud).' });
    }
    // devolver estado actual
    const r = await pool.query(`
      SELECT
        pl.id,
        pl.id_torneo,
        pl.ronda,
        pl.orden,
        pl.equipo1_id, e1.nombre_equipo AS equipo1_nombre,
        pl.equipo2_id, e2.nombre_equipo AS equipo2_nombre,
        pl.set1_equipo1, pl.set1_equipo2,
        pl.set2_equipo1, pl.set2_equipo2,
        pl.set3_equipo1, pl.set3_equipo2,
        pl.estado, pl.ganador_id, pl.next_match_id, pl.next_slot
      FROM partidos_llave pl
      LEFT JOIN equipo e1 ON e1.id_equipo = pl.equipo1_id
      LEFT JOIN equipo e2 ON e2.id_equipo = pl.equipo2_id
      WHERE pl.id_torneo = $1
      ORDER BY
        CASE pl.ronda
          WHEN 'OCTAVOS' THEN 1
          WHEN 'CUARTOS' THEN 2
          WHEN 'SEMIS'   THEN 3
          WHEN 'FINAL'   THEN 4
          ELSE 99
        END, pl.orden ASC
    `, [idTorneo]);

    const rondas = {};
    for (const x of r.rows) {
      if (!rondas[x.ronda]) rondas[x.ronda] = [];
      rondas[x.ronda].push(x);
    }
    return res.json({ ok: true, rondas });
  } catch (err) {
    console.error('[PLAYOFF POST] Error:', err);
    return res.status(500).json({ error: 'No se pudo generar el play-off' });
  }
});

// PUT cerrar/actualizar partido de play-off
router.put('/torneos/:idTorneo/playoff/partidos/:idPartido', async (req, res) => {
  const { idTorneo, idPartido } = req.params;
  const {
    set1_equipo1, set1_equipo2,
    set2_equipo1, set2_equipo2,
    set3_equipo1, set3_equipo2
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Traer partido y sus enlaces
    const p = await client.query(
      `SELECT id, equipo1_id, equipo2_id, next_match_id, next_slot
         FROM partidos_llave
        WHERE id = $1 AND id_torneo = $2
        FOR UPDATE`,
      [idPartido, idTorneo]
    );
    if (p.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    const partido = p.rows[0];

    // Guardar sets + estado
    await client.query(
      `UPDATE partidos_llave
          SET set1_equipo1=$1, set1_equipo2=$2,
              set2_equipo1=$3, set2_equipo2=$4,
              set3_equipo1=$5, set3_equipo2=$6,
              estado='finalizado'
        WHERE id=$7`,
      [
        set1_equipo1, set1_equipo2,
        set2_equipo1, set2_equipo2,
        set3_equipo1, set3_equipo2,
        idPartido
      ]
    );

    // Calcular ganador por sets
    const sets = [
      [set1_equipo1, set1_equipo2],
      [set2_equipo1, set2_equipo2],
      [set3_equipo1, set3_equipo2],
    ].filter(([a,b]) => a != null && b != null);

    let g1 = 0, g2 = 0;
    for (const [a,b] of sets) {
      if (a > b) g1++; else if (b > a) g2++;
    }
    const ganador_id = g1 > g2 ? partido.equipo1_id : partido.equipo2_id || null;

    // Setear ganador en el partido
    await client.query(
      `UPDATE partidos_llave SET ganador_id = $1 WHERE id = $2`,
      [ganador_id, idPartido]
    );

    // Propagar al siguiente, si existe y hay ganador
    if (ganador_id && partido.next_match_id && partido.next_slot) {
      if (partido.next_slot === 1) {
        await client.query(
          `UPDATE partidos_llave SET equipo1_id = $1 WHERE id = $2`,
          [ganador_id, partido.next_match_id]
        );
      } else {
        await client.query(
          `UPDATE partidos_llave SET equipo2_id = $1 WHERE id = $2`,
          [ganador_id, partido.next_match_id]
        );
      }
      // Si re-guardan un partido, se “sobre-escribe” el slot correcto arriba.
    }

    await client.query('COMMIT');
    return res.json({ ok: true, ganador_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PLAYOFF] PUT resultado:', err);
    return res.status(500).json({ error: 'No se pudo guardar el resultado' });
  } finally {
    client.release();
  }
});

export default router;
