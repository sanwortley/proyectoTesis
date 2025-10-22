import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const LOG_DIR = process.env.AUDIT_LOG_DIR || path.resolve('./logs');
const CSV_PATH = path.join(LOG_DIR, 'audit_ingresos.csv');
const JSONL_PATH = path.join(LOG_DIR, 'audit_ingresos.jsonl');

let headerOk = false;

async function ensureSetup() {
  try {
    await fsp.mkdir(LOG_DIR, { recursive: true });
    try {
      await fsp.access(CSV_PATH, fs.constants.F_OK);
      headerOk = true;
    } catch {
      await fsp.writeFile(
        CSV_PATH,
        'timestamp,jugador_id,ip,user_agent,exitoso,motivo\n',
        'utf8'
      );
      headerOk = true;
    }
    // Forzá la creación del JSONL si no existe
    try {
      await fsp.access(JSONL_PATH, fs.constants.F_OK);
    } catch {
      await fsp.writeFile(JSONL_PATH, '', 'utf8');
    }
  } catch (e) {
    console.error('[AUDIT] ensureSetup error:', e?.message || e);
  }
}

function csvEscape(val = '') {
  const s = String(val ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function appendAuditToFiles({ jugadorId, ip, userAgent, exitoso, motivo, timestamp = new Date() }) {
  try {
    if (!headerOk) await ensureSetup();

    const row = [
      csvEscape(timestamp.toISOString()),
      csvEscape(jugadorId ?? ''),
      csvEscape(ip ?? ''),
      csvEscape(userAgent ?? ''),
      csvEscape(exitoso ? 1 : 0),
      csvEscape(motivo ?? '')
    ].join(',') + '\n';

    const jsonLine = JSON.stringify({
      timestamp: timestamp.toISOString(),
      jugador_id: jugadorId ?? null,
      ip: ip ?? null,
      user_agent: userAgent ?? null,
      exitoso: !!exitoso,
      motivo: motivo ?? null
    }) + '\n';

    // Si alguno falla, no rompe el flujo
    const results = await Promise.allSettled([
      fsp.appendFile(CSV_PATH, row, 'utf8'),
      fsp.appendFile(JSONL_PATH, jsonLine, 'utf8'),
    ]);

    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('[AUDIT] append error:', r.reason?.message || r.reason);
      }
    }
  } catch (err) {
    console.error('[AUDIT] appendAuditToFiles error:', err?.message || err);
  }
}

export function getAuditPaths() {
  return { CSV_PATH, JSONL_PATH, LOG_DIR };
}
