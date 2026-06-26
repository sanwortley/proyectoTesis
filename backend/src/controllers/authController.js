// src/controllers/authController.js
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { registrarLogIngreso } from '../utils/logIngreso.js';

// 🔹 Obtener IP real del cliente
const getClientIp = (req) => {
  const fwd = req.headers['x-forwarded-for'];
  if (Array.isArray(fwd)) return fwd[0];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.ip;
};

// 🔹 Controlador de Login
export const login = async (req, res) => {
  const loginInput = (req.body.email ?? req.body.login ?? '').trim().toLowerCase();
  const { password } = req.body;

  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    if (!loginInput || !password) {
      return res.status(400).json({ error: 'Faltan credenciales' });
    }

    // Logs de diagnóstico
    console.log('[LOGIN] body:', req.body);

    // Verificar base de datos actual
    const dbMeta = await pool.query('SELECT current_database() db, current_user usr');
    console.log('[DB]', dbMeta.rows[0]); // Ej: { db: 'procup3', usr: 'postgres' }

    // Query a tu tabla real con TRIM para evitar espacios invisibles
    const { rows } = await pool.query(
      `
      SELECT
        j.id_jugador,
        j.nombre_jugador,
        j.apellido_jugador,
        j.email,
        j.rol,
        j.password AS password_norm,
        j.categoria_id,
        c.valor_numerico
      FROM public.jugador j
      LEFT JOIN categoria c ON c.id_categoria = j.categoria_id
      WHERE LOWER(TRIM(j.email)) = LOWER(TRIM($1))
      LIMIT 1
      `,
      [loginInput]
    );

    console.log('[LOGIN] email:', loginInput, 'rows:', rows.length, 'row0:', rows[0]?.email);

    const user = rows[0];
    if (!user) {
      await registrarLogIngreso({
        jugadorId: null,
        nombre: null,
        apellido: null,
        ip,
        userAgent,
        exitoso: false,
        motivo: 'Jugador no encontrado'
      });
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Verificación de contraseña (bcrypt o texto plano)
    const stored = user.password_norm || '';
    const isHash = stored.startsWith?.('$2');
    const isValid = isHash ? await bcrypt.compare(password, stored) : password === stored;

    if (!isValid) {
      await registrarLogIngreso({
        jugadorId: user.id_jugador,
        nombre: user.nombre_jugador,
        apellido: user.apellido_jugador,
        ip,
        userAgent,
        exitoso: false,
        motivo: 'Contraseña incorrecta'
      });
      console.log('[LOGIN] Contraseña incorrecta para:', user.email);
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Rol normalizado
    const role = (user.rol || 'jugador').toLowerCase();

    // Generar token JWT
    const token = jwt.sign(
      { id: user.id_jugador, role },
      process.env.JWT_SECRET || 'dev_secret_change_me',
      { expiresIn: '6h' }
    );

    await registrarLogIngreso({
      jugadorId: user.id_jugador,
      nombre: user.nombre_jugador,
      apellido: user.apellido_jugador,
      ip,
      userAgent,
      exitoso: true,
      motivo: 'Login exitoso'
    });

    // Respuesta al frontend
    return res.json({
      ok: true,
      token,
      jugador: {
        id: user.id_jugador,
        nombre: user.nombre_jugador,
        apellido: user.apellido_jugador,
        email: user.email,
        role,
        rol: role,
        categoria_id: user.categoria_id,
        valor_numerico: user.valor_numerico,
      }
    });

  } catch (err) {
    console.error('[AUTH] Error en login:', err);
    await registrarLogIngreso({
      jugadorId: null,
      nombre: null,
      apellido: null,
      ip,
      userAgent,
      exitoso: false,
      motivo: 'Error interno'
    });
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
