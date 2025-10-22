// utils/logIngreso.js
import pool from '../config/db.js';
import { appendAuditToFiles } from './fileAudit.js';

export const registrarLogIngreso = async ({ jugadorId, ip, userAgent, exitoso, motivo }) => {
  const reason = motivo || (exitoso ? 'Login exitoso' : 'Fallo de autenticación');
  try {
    await pool.query(
      `INSERT INTO audit_log_ingresos (jugador_id, ip, user_agent, exitoso, motivo)
      VALUES ($1, $2, $3, $4, $5)`,
      [jugadorId ?? null, ip ?? null, userAgent ?? null, !!exitoso, reason]
);
  } catch (err) {
    console.error('DB audit insert error:', err?.message || err);
    // Seguimos con archivo aunque la DB falle
  }

  await appendAuditToFiles({ jugadorId, ip, userAgent, exitoso, motivo: reason });
};
