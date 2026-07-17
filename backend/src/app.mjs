import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Rutas principales
import routes from './routes/index.js';

// Rutas de auditoría (log de ingresos)
import auditoriaRoutes from './routes/auditoria.js';
import authRoutes from './routes/auth.js';
import playoffroutes from './routes/playoffRoutes.js'
import rankingRoutes from './routes/rankingRoutes.js'
import torneoRoutes from './routes/torneosRoutes.js'

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Servir carpetas estáticas (uploads)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// app.mjs está en src/, uploads está en ../uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Montaje de rutas
import dashboardRoutes from './routes/dashboardRoutes.js';
import cron from 'node-cron';
import pool from './config/db.js';
import { enviarRecordatorioTorneo } from './utils/mailer.js';

app.use('/api', playoffroutes);
app.use('/api', routes);
app.use('/api', auditoriaRoutes);
app.use('/api', authRoutes);
app.use('/api', rankingRoutes);
app.use('/api', torneoRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/test_debug', (req, res) => res.json({ msg: 'I AM ALIVE' }));

// ─────────────────────────────────────────────────────────
// CRON: recordatorio 24h antes del torneo
// Se ejecuta cada hora en el minuto 0
// ─────────────────────────────────────────────────────────
const recordatoriosEnviados = new Set(); // evita duplicados en la misma ejecución del proceso

cron.schedule('0 * * * *', async () => {
  if (!process.env.RESEND_API_KEY) return;
  try {
    // Torneos cuya fecha_inicio está entre 23h y 25h desde ahora
    const { rows: torneos } = await pool.query(`
      SELECT id_torneo, nombre_torneo, fecha_inicio
      FROM torneo
      WHERE fecha_inicio BETWEEN NOW() + INTERVAL '23 hours'
                              AND NOW() + INTERVAL '25 hours'
    `);

    for (const torneo of torneos) {
      if (recordatoriosEnviados.has(torneo.id_torneo)) continue;

      // Todos los jugadores inscriptos en este torneo
      const { rows: jugadores } = await pool.query(`
        SELECT DISTINCT j.id_jugador, j.nombre_jugador, j.apellido_jugador, j.email,
               e.nombre_equipo
        FROM inscripcion i
        JOIN equipo e ON e.id_equipo = i.id_equipo
        JOIN jugador j ON j.id_jugador IN (e.jugador1_id, e.jugador2_id)
        WHERE i.id_torneo = $1 AND j.email IS NOT NULL
      `, [torneo.id_torneo]);

      for (const j of jugadores) {
        enviarRecordatorioTorneo({
          email: j.email,
          nombre: `${j.nombre_jugador} ${j.apellido_jugador}`,
          nombreTorneo: torneo.nombre_torneo,
          fechaTorneo: torneo.fecha_inicio,
          nombreEquipo: j.nombre_equipo,
        }).catch(err => console.error('[CRON MAIL]', err.message));
      }

      recordatoriosEnviados.add(torneo.id_torneo);
      console.log(`[CRON] Recordatorios enviados para torneo ${torneo.id_torneo} — ${torneo.nombre_torneo}`);
    }
  } catch (err) {
    console.error('[CRON] Error en recordatorio 24h:', err.message);
  }
});


console.log('[ROUTES] playoff montada');


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log('[ROUTES] auditoria montada');

});



export default app;
