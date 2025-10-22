// src/controllers/authController.js (o .mjs)
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { registrarLogIngreso } from '../utils/logIngreso.js';

const getClientIp = (req) => {
  const fwd = req.headers['x-forwarded-for'];
  if (Array.isArray(fwd)) return fwd[0];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.ip;
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    const { rows } = await pool.query('SELECT * FROM jugador WHERE email = $1', [email]);
    const user = rows[0];

    if (!user) {
      await registrarLogIngreso({ jugadorId: null, ip, userAgent, exitoso: false, motivo: 'Usuario no encontrado' });
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Soporta contraseña hasheada (bcrypt) o texto plano (seed inicial)
    let isValid = false;
    if (user.password?.startsWith('$2')) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      isValid = password === user.password;
    }

    if (!isValid) {
      await registrarLogIngreso({ jugadorId: user.id_jugador, ip, userAgent, exitoso: false, motivo: 'Contraseña incorrecta' });
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id: user.id_jugador, rol: user.rol || 'jugador' },
      process.env.JWT_SECRET || 'dev_secret_change_me',
      { expiresIn: '6h' }
    );

    await registrarLogIngreso({ jugadorId: user.id_jugador, ip, userAgent, exitoso: true, motivo: 'Login exitoso' });

    return res.json({
      ok: true,
      token,
      jugador: {
        id: user.id_jugador,
        nombre: user.nombre_jugador,
        apellido: user.apellido_jugador,
        email: user.email,
        rol: user.rol
      }
    });

  } catch (err) {
    console.error('[AUTH] Error en login:', err);
    await registrarLogIngreso({ jugadorId: null, ip, userAgent, exitoso: false, motivo: 'Error interno' });
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
