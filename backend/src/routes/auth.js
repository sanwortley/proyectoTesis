import express from 'express';
import jwt from 'jsonwebtoken';
import { login } from '../controllers/authController.js';

const router = express.Router();
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Acceso denegado: no autenticado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me'); // { id, role }
    req.user = { id: payload.id, role: payload.role || 'invitado' };
    next();
  } catch {
    return res.status(401).json({ error: 'Acceso denegado: token inválido o expirado' });
  }
}
router.post('/login', login);

export default router;
