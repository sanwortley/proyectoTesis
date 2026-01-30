// src/routes/index.js
import { Router } from 'express';
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { generarGruposAleatorios } from '../utils/generarGrupos.js';
import { generarPlayoffSiNoExiste } from '../utils/generarPlayoff.js';

const router = Router();

import { requireAuth } from './auth.js';
const verificarToken = requireAuth;

const esOrganizador = (req, res, next) => {
  const rol = req.user?.role || req.user?.rol; // A veces viene como role o rol
  if (rol !== 'organizador') {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de organizador' });
  }
  next();
};

router.get('/', (req, res) => {
  res.send('API funcionando');
});

/* =========================
 * CATEGORÍAS
 * ========================= */
router.get('/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categoria ORDER BY id_categoria');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener categorías:', error.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Ahora espera nombre + valor_numerico (2..8)
router.post('/categorias', async (req, res) => {
  const { nombre, valor_numerico } = req.body;

  if (!nombre || valor_numerico == null) {
    return res.status(400).json({ error: 'Nombre y valor_numerico son obligatorios' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO categoria (nombre, valor_numerico) VALUES ($1, $2) RETURNING *',
      [nombre, valor_numerico]
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
    const { nombre_jugador, apellido_jugador, apodo, email, telefono, password, confirmar_password, admin_token } = req.body;

    // 🔒 Verificación de seguridad
    // Si no configuran el ADMIN_SECRET en .env, usamos uno por defecto MUY seguro para evitar registros accidentales
    const SECRET = process.env.ADMIN_SECRET || 'NO_SECRET_DEFINED_BLOCK_REGISTRATION';

    if (!admin_token || admin_token !== SECRET) {
      return res.status(403).json({ error: 'Código de seguridad inválido. No tenés permisos para crear administradores.' });
    }

    if (password !== confirmar_password) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const q = `
      INSERT INTO jugador (nombre_jugador, apellido_jugador, apodo, email, telefono, password, rol)
      VALUES ($1, $2, $3, $4, $5, $6, 'organizador')
      RETURNING id_jugador, nombre_jugador, apellido_jugador, apodo, email, telefono, rol
    `;
    const { rows } = await pool.query(q, [nombre_jugador, apellido_jugador, apodo, email, telefono, hashedPassword]);
    res.status(201).json({ jugador: rows[0] });
  } catch (error) {
    console.error('Error al registrar organizador:', error);
    res.status(500).json({ error: 'No se pudo registrar el organizador' });
  }
});

// Podés extender este registro más adelante para pedir categoria_id
router.post('/registro', async (req, res) => {
  try {
    const {
      nombre_jugador,
      apellido_jugador,
      apodo,
      email,
      telefono,
      password,
      confirmar_password,
      categoria_id
    } = req.body;

    if (password !== confirmar_password) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden' });
    }

    if (!categoria_id) {
      return res.status(400).json({ error: 'Debés seleccionar una categoría' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const q = `
      INSERT INTO jugador
      (nombre_jugador, apellido_jugador, apodo, email, telefono, password, rol, categoria_id)
      VALUES ($1, $2, $3, $4, $5, $6, 'jugador', $7)
      RETURNING id_jugador, nombre_jugador, apellido_jugador, apodo, email, telefono, rol, categoria_id
    `;

    const { rows } = await pool.query(q, [
      nombre_jugador,
      apellido_jugador,
      apodo,
      email,
      telefono,
      hashedPassword,
      categoria_id
    ]);

    return res.status(201).json({ jugador: rows[0] });
  } catch (error) {
    console.error('Error al registrar jugador:', error);
    return res.status(500).json({ error: 'No se pudo registrar el jugador' });
  }
});


router.post('/jugadores/bulk', async (req, res) => {
  try {
    const { jugadores } = req.body;
    if (!Array.isArray(jugadores) || jugadores.length === 0) {
      return res.status(400).json({ error: 'Lista de jugadores inválida' });
    }

    const values = [];
    const placeholders = jugadores.map((j, i) => {
      const idx = i * 6;
      values.push(
        j.nombre_jugador,
        j.apellido_jugador,
        j.email,
        j.telefono,
        j.password, // 👈 en test puede ir sin hash
        j.categoria_id
      );
      return `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, 'jugador', $${idx + 6})`;
    });

    const q = `
      INSERT INTO jugador
      (nombre_jugador, apellido_jugador, email, telefono, password, rol, categoria_id)
      VALUES ${placeholders.join(',')}
    `;

    await pool.query(q, values);
    res.status(201).json({ ok: true, total: jugadores.length });
  } catch (err) {
    console.error('Error bulk jugadores:', err);
    res.status(500).json({ error: 'No se pudieron insertar jugadores' });
  }
});



// ⬇️ Importar el logger
import { registrarLogIngreso } from '../utils/logIngreso.js';

router.post('/login', async (req, res) => {
  // Datos para auditoría
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.get('User-Agent');

  try {
    const loginInput = (req.body.email ?? req.body.login ?? '').trim().toLowerCase();
    const { password } = req.body;

    if (!loginInput || !password) {
      await registrarLogIngreso({ ip, userAgent, exitoso: false, motivo: 'Faltan credenciales' });
      return res.status(400).json({ error: 'Faltan credenciales' });
    }

    const result = await pool.query(
      `
      SELECT id_jugador, nombre_jugador, apellido_jugador, email, telefono, rol, password, categoria_id
      FROM public.jugador
      WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
      LIMIT 1
      `,
      [loginInput]
    );

    if (result.rows.length === 0) {
      await registrarLogIngreso({ ip, userAgent, exitoso: false, motivo: 'Usuario no encontrado' });
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    const jugador = result.rows[0];
    const ok = jugador.password?.startsWith('$2')
      ? await bcrypt.compare(password, jugador.password)
      : password === jugador.password;

    if (!ok) {
      await registrarLogIngreso({ jugadorId: jugador.id_jugador, ip, userAgent, exitoso: false, motivo: 'Contraseña incorrecta' });
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // ✅ Login Exitoso
    await registrarLogIngreso({ jugadorId: jugador.id_jugador, ip, userAgent, exitoso: true });

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
    // Registrar error de servidor si es posible
    await registrarLogIngreso({ ip, userAgent, exitoso: false, motivo: 'Error de servidor: ' + error.message });
    return res.status(500).json({ error: 'Error del servidor' });
  }
});

/* =========================
 * JUGADORES
 * ========================= */
// Creación de jugador por administrador
router.post('/jugadores', verificarToken, esOrganizador, async (req, res) => {
  const { nombre_jugador, apellido_jugador, apodo, email, telefono, categoria_id, password } = req.body;

  if (!nombre_jugador || !apellido_jugador || !email || !categoria_id) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar si el email ya existe
    const checkEmail = await client.query('SELECT 1 FROM jugador WHERE email = $1', [email]);
    if (checkEmail.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hash password (default "123456" si no viene)
    const passToHash = password || '123456';
    const hashedPassword = await bcrypt.hash(passToHash, 10);

    const q = `
      INSERT INTO jugador
      (nombre_jugador, apellido_jugador, apodo, email, telefono, password, rol, categoria_id)
      VALUES ($1, $2, $3, $4, $5, $6, 'jugador', $7)
      RETURNING id_jugador, nombre_jugador, apellido_jugador, email
    `;

    const { rows } = await client.query(q, [
      nombre_jugador,
      apellido_jugador,
      apodo || null,
      email,
      telefono || null,
      hashedPassword,
      categoria_id
    ]);

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creando jugador:', error);
    res.status(500).json({ error: 'Error al crear el jugador' });
  } finally {
    client.release();
  }
});

router.get('/jugadores', async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        j.id_jugador, 
        j.nombre_jugador, 
        j.apellido_jugador, 
        j.apodo,
        j.email,
        j.telefono,
        j.rol,
        j.categoria_id,
        c.nombre AS categoria_nombre
      FROM jugador j
      LEFT JOIN categoria c ON j.categoria_id = c.id_categoria
      order by j.apellido_jugador, j.nombre_jugador
      `
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener jugadores:', error);
    res.status(500).json({ error: 'Error al obtener jugadores' });
  }
});

// DELETE /jugadores/:id
router.delete('/jugadores/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar si el jugador existe
    const check = await client.query('SELECT rol FROM jugador WHERE id_jugador = $1', [id]);
    if (check.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Opcional: Evitar borrar organizadores si se requiere
    // if (check.rows[0].rol === 'organizador') { ... }

    // Borrar (ON DELETE CASCADE en inscripcion/ranking debería encargarse del resto, 
    // pero verificar si hay equipos/inscripciones activas podría ser prudente).
    // Por ahora, confiamos en el CASCADE o lo forzamos manual si el schema no lo tiene.

    // Eliminamos inscripciones donde participe
    // (Si el schema tiene ON DELETE CASCADE en inscripcion->equipo, esto es automático, 
    // pero equipo->jugador también debería tenerlo. Revisemos schema mentalmente:
    // equipo.jugador1_id REFERENCES jugador
    // Si no tiene cascade, fallará. Intentemos borrar.)

    await client.query('DELETE FROM jugador WHERE id_jugador = $1', [id]);

    await client.query('COMMIT');
    res.json({ mensaje: 'Jugador eliminado correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar jugador:', error);
    res.status(500).json({ error: 'No se pudo eliminar el jugador. Puede que tenga torneos activos.' });
  } finally {
    client.release();
  }
});

// PUT /jugadores/:id
// GET /jugadores/:id
router.get('/jugadores/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id_jugador, nombre_jugador, apellido_jugador, apodo, email, telefono, rol, categoria_id, foto_perfil
       FROM jugador WHERE id_jugador = $1`,
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Jugador no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener jugador:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /jugadores/:id (Edición de perfil)
import upload from '../config/multer.js';

router.put('/jugadores/:id', verificarToken, upload.single('foto_perfil'), async (req, res) => {
  const { id } = req.params;
  const { nombre_jugador, apellido_jugador, apodo, email, telefono, categoria_id, password } = req.body;

  // 🔒 Verificar permisos: Solo el propio usuario o un organizador pueden editar
  const usuarioAutenticado = req.user;
  if (usuarioAutenticado.role !== 'organizador' && parseInt(usuarioAutenticado.id) !== parseInt(id)) {
    return res.status(403).json({ error: 'No tienes permiso para editar este perfil' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Construir query dinámica
    const fields = [];
    const values = [];
    let idx = 1;

    if (nombre_jugador) { fields.push(`nombre_jugador=$${idx++}`); values.push(nombre_jugador); }
    if (apellido_jugador) { fields.push(`apellido_jugador=$${idx++}`); values.push(apellido_jugador); }
    if (apodo !== undefined) {
      if (apodo === 'null' || apodo === '') {
        fields.push(`apodo=$${idx++}`);
        values.push(null);
      } else {
        fields.push(`apodo=$${idx++}`);
        values.push(apodo);
      }
    }
    if (email) { fields.push(`email=$${idx++}`); values.push(email); }
    if (telefono !== undefined) {
      if (telefono === 'null' || telefono === '') {
        fields.push(`telefono=$${idx++}`);
        values.push(null);
      } else {
        fields.push(`telefono=$${idx++}`);
        values.push(telefono);
      }
    }
    if (categoria_id !== undefined) {
      if (categoria_id === 'null' || categoria_id === '') {
        fields.push(`categoria_id=$${idx++}`);
        values.push(null);
      } else {
        fields.push(`categoria_id=$${idx++}`);
        values.push(categoria_id);
      }
    }

    // Si viene foto
    if (req.file) {
      // Guardar path relativo
      const fotoPath = `uploads/perfiles/${req.file.filename}`;
      fields.push(`foto_perfil=$${idx++}`);
      values.push(fotoPath);
    }

    // Si viene password (chequear que no sea vacío)
    if (password && password.trim().length > 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push(`password=$${idx++}`);
      values.push(hashedPassword);
    }

    if (fields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No se enviaron datos para actualizar' });
    }

    values.push(id);
    const q = `UPDATE jugador SET ${fields.join(', ')} WHERE id_jugador=$${idx} RETURNING *`;

    const result = await client.query(q, values);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    await client.query('COMMIT');

    // Devolver usuario sin password
    const { password: _p, ...jugador } = result.rows[0];
    res.json({ mensaje: 'Perfil actualizado correctamente', jugador });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al editar jugador:', error);
    res.status(500).json({ error: 'Error al actualizar el jugador' });
  } finally {
    client.release();
  }
});

// ✅ Jugadores disponibles para inscribirse en un torneo (excluye ya inscriptos)
router.get('/torneos/:idTorneo/jugadores-disponibles', async (req, res) => {
  try {
    const { idTorneo } = req.params;

    const q = `
      SELECT 
        j.id_jugador,
        j.nombre_jugador,
        j.apellido_jugador,
        j.rol,
        j.categoria_id
      FROM jugador j
      WHERE j.rol = 'jugador'
        AND j.id_jugador NOT IN (
          SELECT e.jugador1_id
          FROM inscripcion i
          JOIN equipo e ON e.id_equipo = i.id_equipo
          WHERE i.id_torneo = $1
          UNION
          SELECT e.jugador2_id
          FROM inscripcion i
          JOIN equipo e ON e.id_equipo = i.id_equipo
          WHERE i.id_torneo = $1
        )
      ORDER BY j.apellido_jugador, j.nombre_jugador
    `;

    const { rows } = await pool.query(q, [idTorneo]);
    return res.json(rows);
  } catch (error) {
    console.error('Error jugadores disponibles:', error);
    return res.status(500).json({ error: 'No se pudieron obtener jugadores disponibles' });
  }
});

/* =========================
 * TORNEOS CRUD + consultas
 * ========================= */
// Crear torneo con formato_categoria + categoria_id/suma_categoria
router.post('/torneos', async (req, res) => {
  const {
    nombre_torneo,
    formato_categoria,   // 'categoria_fija' | 'suma'
    categoria_id,        // requerido si categoria_fija
    suma_categoria,      // requerido si suma
    fecha_inicio,
    fecha_fin,
    fecha_cierre_inscripcion,
    max_equipos
  } = req.body;

  // Validaciones básicas
  if (!nombre_torneo || !formato_categoria || !fecha_inicio || !fecha_cierre_inscripcion || !max_equipos) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para crear el torneo' });
  }

  if (!['categoria_fija', 'suma'].includes(formato_categoria)) {
    return res.status(400).json({ error: 'formato_categoria inválido' });
  }

  if (formato_categoria === 'categoria_fija' && !categoria_id) {
    return res.status(400).json({ error: 'Debe indicar categoria_id para formato categoria_fija' });
  }
  if (formato_categoria === 'suma' && (suma_categoria == null || isNaN(Number(suma_categoria)))) {
    return res.status(400).json({ error: 'Debe indicar suma_categoria numérica para formato suma' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cierre = new Date(fecha_cierre_inscripcion);
    cierre.setHours(23, 59, 59, 999);

    const insertTorneo = `
      INSERT INTO torneo (
        nombre_torneo,
        fecha_inicio,
        fecha_fin,
        fecha_cierre_inscripcion,
        max_equipos,
        categoria_id,
        formato_categoria,
        suma_categoria,
        modalidad,
        dias_juego
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id_torneo
    `;

    const params = [
      nombre_torneo,
      fecha_inicio,
      req.body.fecha_fin || null,
      cierre,
      max_equipos,
      formato_categoria === 'categoria_fija' ? categoria_id : null,
      formato_categoria,
      formato_categoria === 'suma' ? suma_categoria : null,
      req.body.modalidad || 'fin_de_semana',
      req.body.dias_juego || null
    ];

    const { rows } = await client.query(insertTorneo, params);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Torneo creado correctamente', torneoId: rows[0].id_torneo });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear torneo:', error);
    res.status(500).json({ error: 'Error al crear el torneo' });
  } finally {
    client.release();
  }
});

router.get('/torneos', async (req, res) => {
  try {
    const { anio } = req.query;

    let sql = `
      SELECT 
        t.*,
        c.nombre AS categoria_nombre
      FROM torneo t
      LEFT JOIN categoria c ON t.categoria_id = c.id_categoria
    `;
    const params = [];

    if (anio && String(anio).trim() !== '') {
      const anioNum = Number(anio);
      if (Number.isNaN(anioNum)) {
        return res.status(400).json({ error: 'Año inválido' });
      }
      sql += ` WHERE EXTRACT(YEAR FROM t.fecha_inicio) = $1`;
      params.push(anioNum);
    }

    sql += ` ORDER BY t.fecha_inicio DESC`;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener torneos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


router.get('/torneos/anios', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT EXTRACT(YEAR FROM fecha_inicio)::int AS anio
      FROM torneo
      ORDER BY anio DESC
    `);
    res.json(result.rows.map(r => r.anio));
  } catch (error) {
    console.error('Error al obtener años de torneos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


// Esta ruta asume que tenés columna id_organizador en torneo; si no, ajústala
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

// Último torneo reciente de CATEGORÍA FIJA para una categoría dada
router.get('/torneos/reciente/:idCategoria', async (req, res) => {
  const { idCategoria } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM torneo
      WHERE formato_categoria = 'categoria_fija'
        AND categoria_id = $1
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
    nombre_torneo,
    formato_categoria,
    categoria_id,
    suma_categoria,
    fecha_inicio,
    fecha_fin,
    fecha_cierre_inscripcion,
    max_equipos
  } = req.body;

  if (!['categoria_fija', 'suma'].includes(formato_categoria)) {
    return res.status(400).json({ error: 'formato_categoria inválido' });
  }

  if (formato_categoria === 'categoria_fija' && !categoria_id) {
    return res.status(400).json({ error: 'Debe indicar categoria_id para formato categoria_fija' });
  }
  if (formato_categoria === 'suma' && (suma_categoria == null || isNaN(Number(suma_categoria)))) {
    return res.status(400).json({ error: 'Debe indicar suma_categoria numérica para formato suma' });
  }

  try {
    await pool.query(
      `UPDATE torneo
       SET nombre_torneo=$1,
           fecha_inicio=$2,
           fecha_fin=$3,
           fecha_cierre_inscripcion=$4,
           max_equipos=$5,
           categoria_id=$6,
           formato_categoria=$7,
           suma_categoria=$8
       WHERE id_torneo=$9`,
      [
        nombre_torneo,
        fecha_inicio,
        fecha_fin,
        fecha_cierre_inscripcion,
        max_equipos,
        formato_categoria === 'categoria_fija' ? categoria_id : null,
        formato_categoria,
        formato_categoria === 'suma' ? suma_categoria : null,
        id
      ]
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

    // Traer info del torneo (incluye formato, categoria/suma)
    const torneoRes = await client.query(`
      SELECT 
        t.fecha_inicio,
        t.fecha_fin,
        t.fecha_cierre_inscripcion,
        t.formato_categoria,
        t.categoria_id,
        t.suma_categoria,
        c.nombre AS categoria_nombre
      FROM torneo t
      LEFT JOIN categoria c ON t.categoria_id = c.id_categoria
      WHERE t.id_torneo = $1
    `, [id_torneo]);

    if (torneoRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const torneo = torneoRes.rows[0];

    const cierre = new Date(torneo.fecha_cierre_inscripcion);
    const hoy = new Date();
    if (hoy > cierre) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La inscripción a este torneo ya está cerrada' });
    }

    // ✅ B) Bloquear si alguno ya está inscripto en OTRO torneo que se pisa por fecha (comparten al menos 1 día)
    const solapado = await client.query(`
      SELECT t2.id_torneo, t2.nombre_torneo, t2.fecha_inicio, t2.fecha_fin
      FROM inscripcion i
      JOIN equipo e ON i.id_equipo = e.id_equipo
      JOIN torneo t2 ON t2.id_torneo = i.id_torneo
      WHERE (
        $1 IN (e.jugador1_id, e.jugador2_id)
        OR
        $2 IN (e.jugador1_id, e.jugador2_id)
      )
      AND i.id_torneo <> $3
      AND NOT (t2.fecha_fin < $4 OR t2.fecha_inicio > $5)
      LIMIT 1
    `, [jugador1_id, jugador2_id, id_torneo, torneo.fecha_inicio, torneo.fecha_fin]);

    if (solapado.rowCount > 0) {
      await client.query('ROLLBACK');
      const t = solapado.rows[0];
      return res.status(400).json({
        error: `Alguno de los jugadores ya está inscripto en otro torneo que se pisa por fecha: ${t.nombre_torneo}`
      });
    }

    // ✅ A) Bloquear si cualquiera de los dos jugadores ya está inscripto en ESTE torneo
    const yaInscripto = await client.query(`
      SELECT 1
      FROM inscripcion i
      JOIN equipo e ON i.id_equipo = e.id_equipo
      WHERE i.id_torneo = $1
        AND (
          $2 IN (e.jugador1_id, e.jugador2_id)
          OR
          $3 IN (e.jugador1_id, e.jugador2_id)
        )
      LIMIT 1
    `, [id_torneo, jugador1_id, jugador2_id]);

    if (yaInscripto.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Uno de los jugadores ya está inscripto en este torneo'
      });
    }

    // (Esto ya queda medio redundante con A, pero lo podés dejar por mensaje específico)
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

    // Traer categorías de los jugadores
    const jugRes = await client.query(`
      SELECT 
        j.id_jugador,
        j.categoria_id,
        c.valor_numerico,
        c.nombre AS categoria_nombre
      FROM jugador j
      LEFT JOIN categoria c ON j.categoria_id = c.id_categoria
      WHERE j.id_jugador = ANY($1)
    `, [[jugador1_id, jugador2_id]]);

    if (jugRes.rowCount !== 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No se encontraron ambos jugadores' });
    }

    const j1 = jugRes.rows.find(j => j.id_jugador === Number(jugador1_id));
    const j2 = jugRes.rows.find(j => j.id_jugador === Number(jugador2_id));

    if (!j1 || !j2) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Error con los datos de los jugadores' });
    }

    // Validación según tipo de torneo
    if (torneo.formato_categoria === 'categoria_fija') {
      if (!torneo.categoria_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Torneo mal configurado (sin categoría fija definida)' });
      }

      if (j1.categoria_id !== torneo.categoria_id || j2.categoria_id !== torneo.categoria_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Solo se pueden inscribir jugadores de la categoría ${torneo.categoria_nombre || 'asignada al torneo'}`
        });
      }
    } else if (torneo.formato_categoria === 'suma') {
      if (torneo.suma_categoria == null) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Torneo mal configurado (sin suma_categoria definida)' });
      }

      if (j1.valor_numerico == null || j2.valor_numerico == null) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Ambos jugadores deben tener categoría asignada para torneos SUMA' });
      }

      const suma = Number(j1.valor_numerico) + Number(j2.valor_numerico);
      if (suma !== Number(torneo.suma_categoria)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `La pareja debe sumar exactamente ${torneo.suma_categoria}. Suma actual: ${suma}`
        });
      }
    }

    // Crear equipo si pasa las validaciones
    // Crear equipo si pasa las validaciones
    const qJug = 'SELECT apellido_jugador, apodo FROM jugador WHERE id_jugador = $1';
    const resJ1 = await client.query(qJug, [jugador1_id]);
    const resJ2 = await client.query(qJug, [jugador2_id]);

    const j1Data = resJ1.rows[0];
    const j2Data = resJ2.rows[0];

    // Formato: ApodoApellido o solo Apellido
    const getNombreDisplay = (j) => {
      if (j.apodo) return `${j.apodo}${j.apellido_jugador}`;
      return j.apellido_jugador;
    };

    const n1 = getNombreDisplay(j1Data);
    const n2 = getNombreDisplay(j2Data);

    // Ordenar alfabéticamente para evitar duplicados A/B vs B/A
    const [name1, name2] = [n1, n2].sort();
    const nombre_equipo = `${name1}/${name2}`;

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


// =========================
// JUGADORES DISPONIBLES POR TORNEO
// =========================
router.get('/torneos/:idTorneo/jugadores-disponibles', async (req, res) => {
  try {
    const { idTorneo } = req.params;

    const q = `
      SELECT 
        j.id_jugador,
        j.nombre_jugador,
        j.apellido_jugador,
        j.rol,
        j.categoria_id
      FROM jugador j
      WHERE j.rol = 'jugador'
        AND j.id_jugador NOT IN (
          SELECT e.jugador1_id
          FROM inscripcion i
          JOIN equipo e ON e.id_equipo = i.id_equipo
          WHERE i.id_torneo = $1

          UNION

          SELECT e.jugador2_id
          FROM inscripcion i
          JOIN equipo e ON e.id_equipo = i.id_equipo
          WHERE i.id_torneo = $1
        )
      ORDER BY j.apellido_jugador, j.nombre_jugador
    `;

    const { rows } = await pool.query(q, [idTorneo]);
    return res.json(rows);
  } catch (error) {
    console.error('Error jugadores disponibles por torneo:', error);
    return res.status(500).json({ error: 'No se pudieron obtener jugadores disponibles' });
  }
});



router.get('/torneos/:id/equipos', async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query(
      `
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
      `,
      [id]
    );

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

    // 🔍 Evitar duplicados: verificar si ya existen grupos
    const checkGrupos = await client.query('SELECT 1 FROM grupos WHERE id_torneo = $1 LIMIT 1', [id]);
    if (checkGrupos.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Los grupos ya fueron generados para este torneo.' });
    }

    const equiposRes = await client.query(
      `
      SELECT e.id_equipo, e.nombre_equipo
      FROM inscripcion i
      JOIN equipo e ON i.id_equipo = e.id_equipo
      WHERE i.id_torneo = $1
      `,
      [id]
    );

    const equipos = equiposRes.rows;
    if (equipos.length < 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Se necesitan al menos 2 equipos para generar partidos' });
    }

    // 🔍 0) Chequear modalidad
    const tInfo = await client.query('SELECT modalidad FROM torneo WHERE id_torneo = $1', [id]);
    const modalidad = tInfo.rows[0]?.modalidad || 'fin_de_semana';

    if (equipos.length === 2) {
      // (Misma lógica existente para 2 equipos - FINAL)
      await client.query(
        `
        INSERT INTO partidos_llave (id_torneo, ronda, orden, equipo1_id, equipo2_id, estado)
        VALUES ($1, 'FINAL', 1, $2, $3, 'no_iniciado')
        ON CONFLICT DO NOTHING
        `,
        [id, equipos[0].id_equipo, equipos[1].id_equipo]
      );
      await client.query('COMMIT');
      return res.json({ mensaje: 'Partido final generado (solo 2 equipos)' });
    }

    let grupos = [];

    // SI ES LIGA => 1 Solo Grupo con TODOS + Generación de Fixture con Fechas
    if (modalidad === 'liga') {
      const nombreGrupo = "Liga Única";
      const grupoRes = await client.query(
        `INSERT INTO grupos (id_torneo, nombre) VALUES ($1, $2) RETURNING id_grupo`,
        [id, nombreGrupo]
      );
      const grupoId = grupoRes.rows[0].id_grupo;

      // Insertar equipos en el grupo
      for (const equipo of equipos) {
        await client.query(
          `INSERT INTO equipos_grupo (grupo_id, equipo_id) VALUES ($1, $2)`,
          [grupoId, equipo.id_equipo]
        );
      }

      // --- LOGICA DE FIXTURE (ROUND ROBIN) ---
      // Algoritmo de Berger o similar
      let listaEquipos = [...equipos];
      if (listaEquipos.length % 2 !== 0) {
        listaEquipos.push(null); // Dummy para fecha libre
      }
      const numRondas = listaEquipos.length - 1;
      const partPorFecha = listaEquipos.length / 2;

      // Obtener info del torneo para fechas
      const tRes = await client.query('SELECT fecha_inicio, dias_juego FROM torneo WHERE id_torneo = $1', [id]);
      const fechaInicio = new Date(tRes.rows[0].fecha_inicio);
      // dias_juego viene como "Lunes,Miércoles" o IDs de día. Asumiremos string con nombres en español o inglés por ahora.
      // Parsear días de juego:
      const diasStr = tRes.rows[0].dias_juego || "";
      // Mapa de dias: 0=Domingo, 1=Lunes...
      const mapDias = {
        'domingo': 0, 'sunday': 0, 'sun': 0,
        'lunes': 1, 'monday': 1, 'mon': 1,
        'martes': 2, 'tuesday': 2, 'tue': 2,
        'miercoles': 3, 'miércoles': 3, 'wednesday': 3, 'wed': 3,
        'jueves': 4, 'thursday': 4, 'thu': 4,
        'viernes': 5, 'friday': 5, 'fri': 5,
        'sabado': 6, 'sábado': 6, 'saturday': 6, 'sat': 6
      };

      let diasSeleccionados = [];
      diasStr.toLowerCase().split(/[\s,y]+/).forEach(ws => { // split por espacio, coma o 'y'
        const clean = ws.trim();
        if (mapDias.hasOwnProperty(clean)) diasSeleccionados.push(mapDias[clean]);
        // Fallback por si mandan numeros '1,3'
        else if (!isNaN(clean)) diasSeleccionados.push(parseInt(clean) % 7);
      });
      // Si no pudo parsear nada, default a Viernes(5)
      if (diasSeleccionados.length === 0) diasSeleccionados = [5];
      diasSeleccionados = [...new Set(diasSeleccionados)].sort(); // Unicos y ordenados

      let currentDate = new Date(fechaInicio);

      // Ajustar currentDate al primer dia valido >= fechaInicio
      while (!diasSeleccionados.includes(currentDate.getDay())) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      let fechaUltimoPartido = new Date(currentDate);

      for (let r = 0; r < numRondas; r++) {
        // Generar partidos de la ronda R
        for (let i = 0; i < partPorFecha; i++) {
          const e1 = listaEquipos[i];
          const e2 = listaEquipos[listaEquipos.length - 1 - i];

          if (e1 && e2) { // Si ninguno es el dummy
            // Alternar localía (simple)
            const local = (r % 2 === 0) ? e1 : e2;
            const visit = (r % 2 === 0) ? e2 : e1;

            await client.query(
              `INSERT INTO partidos_grupo (grupo_id, equipo1_id, equipo2_id, fecha) VALUES ($1, $2, $3, $4)`,
              [grupoId, local.id_equipo, visit.id_equipo, currentDate]
            );
          }
        }

        fechaUltimoPartido = new Date(currentDate);

        // Mover fecha al siguiente dia valido
        // Buscar el siguiente dia en la lista que sea > currentDay
        // o dar la vuelta a la semana
        let dayFound = false;
        let checkDate = new Date(currentDate);
        checkDate.setDate(checkDate.getDate() + 1);

        // Loop seguro (max 7 dias)
        for (let d = 0; d < 7; d++) {
          if (diasSeleccionados.includes(checkDate.getDay())) {
            currentDate = new Date(checkDate);
            dayFound = true;
            break;
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }

        // Rotar array para siguiente ronda (dejando fijo al primero)
        // [0, 1, 2, 3] -> [0, 3, 1, 2]
        const fijo = listaEquipos[0];
        const resto = listaEquipos.slice(1);
        const lastObj = resto.pop();
        resto.unshift(lastObj);
        listaEquipos = [fijo, ...resto];
      }

      // Actualizar Fecha Fin del Torneo
      await client.query('UPDATE torneo SET fecha_fin = $1 WHERE id_torneo = $2', [fechaUltimoPartido, id]);

    } else {
      // SI ES FIN DE SEMANA => Generar grupos aleatorios (o mantener lógica vieja)
      // (Aquí va el código original de generación de grupos múltiples)
      const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const gruposList = generarGruposAleatorios(equipos); // Ya importada

      for (let i = 0; i < gruposList.length; i++) {
        const nombreGrupo = `Grupo ${letras[i]}`;
        const grupoRes = await client.query(
          `INSERT INTO grupos (id_torneo, nombre) VALUES ($1, $2) RETURNING id_grupo`,
          [id, nombreGrupo]
        );
        const grupoId = grupoRes.rows[0].id_grupo;

        for (const equipo of gruposList[i]) {
          await client.query(
            `INSERT INTO equipos_grupo (grupo_id, equipo_id) VALUES ($1, $2)`,
            [grupoId, equipo.id_equipo]
          );
        }

        const participantes = gruposList[i];
        for (let j = 0; j < participantes.length; j++) {
          for (let k = j + 1; k < participantes.length; k++) {
            await client.query(
              `
              INSERT INTO partidos_grupo (grupo_id, equipo1_id, equipo2_id)
              VALUES ($1, $2, $3)
              `,
              [grupoId, participantes[j].id_equipo, participantes[k].id_equipo]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Grupos generados correctamente' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al generar grupos:', error);  // en la consola de Node

    // 👇 devolvemos el detalle para verlo en el navegador
    res.status(500).json({
      error: 'Error al generar los grupos',
      detalle: error.message,
      code: error.code ?? null
    });
  } finally {
    client.release();
  }
});


router.get('/torneos/:id/grupos', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    const torneoInfoRes = await client.query(
      `
      SELECT 
        t.nombre_torneo AS nombre_torneo,
        t.formato_categoria,
        t.suma_categoria,
        t.modalidad,
        t.dias_juego,
        c.nombre AS categoria_nombre
      FROM torneo t
      LEFT JOIN categoria c ON t.categoria_id = c.id_categoria
      WHERE t.id_torneo = $1
      `,
      [id]
    );
    if (torneoInfoRes.rowCount === 0) return res.status(404).json({ error: 'Torneo no encontrado' });

    const { nombre_torneo, categoria_nombre, formato_categoria, suma_categoria } = torneoInfoRes.rows[0];

    const gruposRes = await client.query(
      `
      SELECT id_grupo, nombre
      FROM grupos
      WHERE id_torneo = $1
      ORDER BY id_grupo
      `,
      [id]
    );

    const grupos = [];
    for (const grupo of gruposRes.rows) {
      const grupoId = grupo.id_grupo;

      const equiposRes = await client.query(
        `
        SELECT 
          eg.equipo_id,
          e.nombre_equipo,
          eg.puntos,
          eg.partidos_jugados,
          eg.sets_favor,
          eg.sets_contra,
          eg.games_favor,
          eg.games_contra,
          j1.foto_perfil AS foto1,
          j2.foto_perfil AS foto2
        FROM equipos_grupo eg
        JOIN equipo e ON eg.equipo_id = e.id_equipo
        LEFT JOIN jugador j1 ON e.jugador1_id = j1.id_jugador
        LEFT JOIN jugador j2 ON e.jugador2_id = j2.id_jugador
        WHERE eg.grupo_id = $1
        `,
        [grupoId]
      );

      const partidosRes = await client.query(
        `
        SELECT 
          pg.id,
          pg.equipo1_id,
          e1.nombre_equipo AS equipo1,
          pg.equipo2_id,
          e2.nombre_equipo AS equipo2,
          pg.set1_equipo1,
          pg.set1_equipo2,
          pg.set2_equipo1,
          pg.set2_equipo2,
          pg.set3_equipo1,
          pg.set3_equipo2,
          pg.estado,
          pg.fecha
        FROM partidos_grupo pg
        JOIN equipo e1 ON pg.equipo1_id = e1.id_equipo
        JOIN equipo e2 ON pg.equipo2_id = e2.id_equipo
        WHERE pg.grupo_id = $1
        `,
        [grupoId]
      );

      grupos.push({
        id_grupo: grupoId,
        nombre: grupo.nombre,
        equipos: equiposRes.rows,
        partidos: partidosRes.rows
      });
    }

    res.json({
      torneo: nombre_torneo,
      categoria: categoria_nombre, // solo si es categoria_fija
      formato_categoria,
      suma_categoria,
      modalidad: torneoInfoRes.rows[0].modalidad,
      dias_juego: torneoInfoRes.rows[0].dias_juego,
      grupos
    });
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

    const partidoRes = await client.query(
      `
      SELECT grupo_id, equipo1_id, equipo2_id
      FROM partidos_grupo
      WHERE id = $1
      `,
      [id]
    );
    if (partidoRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    const { grupo_id, equipo1_id, equipo2_id } = partidoRes.rows[0];

    await client.query(
      `
      UPDATE partidos_grupo
      SET
        set1_equipo1 = $1, set1_equipo2 = $2,
        set2_equipo1 = $3, set2_equipo2 = $4,
        set3_equipo1 = $5, set3_equipo2 = $6,
        estado = 'finalizado'
      WHERE id = $7
      `,
      [
        set1_equipo1, set1_equipo2,
        set2_equipo1, set2_equipo2,
        set3_equipo1, set3_equipo2,
        id
      ]
    );

    const sets = [
      [set1_equipo1, set1_equipo2],
      [set2_equipo1, set2_equipo2],
      [set3_equipo1, set3_equipo2]
    ];
    let setsGanados1 = 0, setsGanados2 = 0, gamesFavor1 = 0, gamesFavor2 = 0;
    for (const [s1, s2] of sets) {
      if (s1 == null || s2 == null) continue;
      if (s1 > s2) setsGanados1++; else if (s2 > s1) setsGanados2++;
      gamesFavor1 += (s1 ?? 0);
      gamesFavor2 += (s2 ?? 0);
    }
    const puntos1 = setsGanados1 > setsGanados2 ? 3 : 0;
    const puntos2 = setsGanados2 > setsGanados1 ? 3 : 0;

    await client.query(
      `
      UPDATE equipos_grupo
      SET
        puntos = puntos + $1,
        partidos_jugados = partidos_jugados + 1,
        sets_favor = sets_favor + $2,
        sets_contra = sets_contra + $3,
        games_favor = games_favor + $4,
        games_contra = games_contra + $5
      WHERE grupo_id = $6 AND equipo_id = $7
      `,
      [puntos1, setsGanados1, setsGanados2, gamesFavor1, gamesFavor2, grupo_id, equipo1_id]
    );

    await client.query(
      `
      UPDATE equipos_grupo
      SET
        puntos = puntos + $1,
        partidos_jugados = partidos_jugados + 1,
        sets_favor = sets_favor + $2,
        sets_contra = sets_contra + $3,
        games_favor = games_favor + $4,
        games_contra = games_contra + $5
      WHERE grupo_id = $6 AND equipo_id = $7
      `,
      [puntos2, setsGanados2, setsGanados1, gamesFavor2, gamesFavor1, grupo_id, equipo2_id]
    );

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
    const { rows } = await pool.query(
      `
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
        pl.next_slot,
        j1a.foto_perfil AS eq1_foto1,
        j1b.foto_perfil AS eq1_foto2,
        j2a.foto_perfil AS eq2_foto1,
        j2b.foto_perfil AS eq2_foto2
      FROM partidos_llave pl
      LEFT JOIN equipo e1 ON e1.id_equipo = pl.equipo1_id
      LEFT JOIN equipo e2 ON e2.id_equipo = pl.equipo2_id
      LEFT JOIN jugador j1a ON e1.jugador1_id = j1a.id_jugador
      LEFT JOIN jugador j1b ON e1.jugador2_id = j1b.id_jugador
      LEFT JOIN jugador j2a ON e2.jugador1_id = j2a.id_jugador
      LEFT JOIN jugador j2b ON e2.jugador2_id = j2b.id_jugador
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
      `,
      [idTorneo]
    );

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
    const r = await pool.query(
      `
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
      `,
      [idTorneo]
    );

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

    const p = await client.query(
      `
      SELECT id, equipo1_id, equipo2_id, next_match_id, next_slot
      FROM partidos_llave
      WHERE id = $1 AND id_torneo = $2
      FOR UPDATE
      `,
      [idPartido, idTorneo]
    );
    if (p.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    const partido = p.rows[0];

    await client.query(
      `
      UPDATE partidos_llave
      SET set1_equipo1=$1, set1_equipo2=$2,
          set2_equipo1=$3, set2_equipo2=$4,
          set3_equipo1=$5, set3_equipo2=$6,
          estado='finalizado'
      WHERE id=$7
      `,
      [
        set1_equipo1, set1_equipo2,
        set2_equipo1, set2_equipo2,
        set3_equipo1, set3_equipo2,
        idPartido
      ]
    );

    const sets = [
      [set1_equipo1, set1_equipo2],
      [set2_equipo1, set2_equipo2],
      [set3_equipo1, set3_equipo2],
    ].filter(([a, b]) => a != null && b != null);

    let g1 = 0, g2 = 0;
    for (const [a, b] of sets) {
      if (a > b) g1++; else if (b > a) g2++;
    }
    const ganador_id = g1 > g2 ? partido.equipo1_id : partido.equipo2_id || null;

    await client.query(
      `UPDATE partidos_llave SET ganador_id = $1 WHERE id = $2`,
      [ganador_id, idPartido]
    );

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
