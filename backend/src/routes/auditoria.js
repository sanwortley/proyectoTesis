import express from 'express';
import fs from 'fs'
import fsp from 'fs/promises';
import pool from '../config/db.js';
import { getAuditPaths } from '../utils/fileAudit.js';

const router = express.Router();

// Ejemplo: /auditoria/ingresos?jugadorId=3&desde=2025-10-01&hasta=2025-10-08
router.get('/ingresos', async (req, res) => {
  const { jugadorId, desde, hasta } = req.query;
  let query = 'SELECT * FROM audit_log_ingresos WHERE 1=1';
  const params = [];

  if (jugadorId) {
    params.push(jugadorId);
    query += ` AND jugador_id = $${params.length}`;
  }

  if (desde) {
    params.push(desde);
    query += ` AND timestamp >= $${params.length}`;
  }

  if (hasta) {
    params.push(hasta);
    query += ` AND timestamp <= $${params.length}`;
  }

  query += ' ORDER BY timestamp DESC LIMIT 100';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo logs:', err);
    res.status(500).json({ message: 'Error al obtener logs' });
  }
});

router.get('/ingresos/export', (req, res) => {
  const { CSV_PATH } = getAuditPaths();
  if (!fs.existsSync(CSV_PATH)) {
    return res.status(404).json({ message: 'Aún no hay registros.' });
    }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="audit_ingresos.csv"');
  fs.createReadStream(CSV_PATH).pipe(res);
});

router.get('/ingresos/test-write', async (req, res) => {
  try {
    const { LOG_DIR, CSV_PATH, JSONL_PATH } = getAuditPaths();
    await fsp.mkdir(LOG_DIR, { recursive: true });
    await fsp.appendFile(CSV_PATH, 'TEST, , , ,0,Endpoint de prueba\n', 'utf8');
    await fsp.appendFile(JSONL_PATH, JSON.stringify({ test: true, ts: new Date().toISOString() }) + '\n', 'utf8');

    res.json({
      ok: true,
      LOG_DIR, CSV_PATH, JSONL_PATH,
      csvExists: fs.existsSync(CSV_PATH),
      jsonExists: fs.existsSync(JSONL_PATH)
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;
