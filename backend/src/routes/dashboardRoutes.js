import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth } from './auth.js';

const router = Router();

// Middleware to ensure user is organizer
const esOrganizador = (req, res, next) => {
    const rol = req.user?.role || req.user?.rol;
    if (rol !== 'organizador') {
        return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de organizador' });
    }
    next();
};

// Apply auth and role check to all dashboard routes
router.use(requireAuth, esOrganizador);

// 1. KPIs
router.get('/kpis', async (req, res) => {
    try {
        const queries = {
            torneosActivos: "SELECT COUNT(*) FROM torneo WHERE fecha_fin >= CURRENT_DATE",
            equiposInscriptos: "SELECT COUNT(*) FROM inscripcion",
            partidosJugados: "SELECT COUNT(*) FROM partidos_grupo WHERE estado = 'finalizado'",
            partidosPendientes: "SELECT COUNT(*) FROM partidos_grupo WHERE estado != 'finalizado'",
            jugadoresRegistrados: "SELECT COUNT(*) FROM jugador WHERE rol = 'jugador'"
        };

        const results = {};
        for (const [key, query] of Object.entries(queries)) {
            const { rows } = await pool.query(query);
            results[key] = parseInt(rows[0].count, 10);
        }

        // Add playoff matches to counts
        const playoffJugados = await pool.query("SELECT COUNT(*) FROM partidos_llave WHERE estado = 'finalizado'");
        const playoffPendientes = await pool.query("SELECT COUNT(*) FROM partidos_llave WHERE estado != 'finalizado'");

        results.partidosJugados += parseInt(playoffJugados.rows[0].count, 10);
        results.partidosPendientes += parseInt(playoffPendientes.rows[0].count, 10);

        res.json(results);
    } catch (error) {
        console.error('Error fetching KPIs:', error);
        res.status(500).json({ error: 'Error al obtener KPIs' });
    }
});

// 2. Charts Data
router.get('/stats', async (req, res) => {
    try {
        // A. Teams per Category
        const teamsPerCategoryQuery = `
      SELECT 
        COALESCE(c.nombre, 'Suma ' || t.suma_categoria) as categoria, 
        COUNT(i.id_equipo)::int as cantidad
      FROM inscripcion i
      JOIN torneo t ON i.id_torneo = t.id_torneo
      LEFT JOIN categoria c ON t.categoria_id = c.id_categoria
      GROUP BY categoria
      ORDER BY cantidad DESC
    `;
        const teamsPerCategory = await pool.query(teamsPerCategoryQuery);

        // B. Match Status (Total)
        const matchStatusQuery = `
        SELECT 
            (SELECT COUNT(*) FROM partidos_grupo WHERE estado = 'finalizado') + 
            (SELECT COUNT(*) FROM partidos_llave WHERE estado = 'finalizado') as jugados,
            (SELECT COUNT(*) FROM partidos_grupo WHERE estado != 'finalizado') + 
            (SELECT COUNT(*) FROM partidos_llave WHERE estado != 'finalizado') as pendientes
    `;
        const matchStatus = await pool.query(matchStatusQuery);

        // C. Inscriptions Evolution
        const inscriptionsEvolutionQuery = `
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as fecha, COUNT(*) as cantidad
      FROM inscripcion
      WHERE created_at IS NOT NULL
      GROUP BY fecha
      ORDER BY fecha ASC
    `;
        const inscriptionsEvolution = await pool.query(inscriptionsEvolutionQuery);

        // D. Top Players (Ranking)
        const topPlayersQuery = `
        SELECT nombre || ' ' || apellido as nombre, puntos 
        FROM ranking_jugador 
        ORDER BY puntos DESC 
        LIMIT 5
    `;
        const topPlayers = await pool.query(topPlayersQuery);

        // E. Recent Activity (Last 5 inscriptions)
        const recentActivityQuery = `
            SELECT 
                t.nombre_torneo,
                e.nombre_equipo,
                COALESCE(c.nombre, 'Suma ' || t.suma_categoria) as categoria,
                i.created_at
            FROM inscripcion i
            JOIN torneo t ON i.id_torneo = t.id_torneo
            JOIN equipo e ON i.id_equipo = e.id_equipo
            LEFT JOIN categoria c ON t.categoria_id = c.id_categoria
            ORDER BY i.created_at DESC
            LIMIT 5
        `;
        const recentActivity = await pool.query(recentActivityQuery);

        res.json({
            equiposPorCategoria: teamsPerCategory.rows,
            estadoPartidos: [
                { name: 'Jugados', value: parseInt(matchStatus.rows[0].jugados) },
                { name: 'Pendientes', value: parseInt(matchStatus.rows[0].pendientes) }
            ],
            evolucionInscripciones: inscriptionsEvolution.rows,
            topJugadores: topPlayers.rows,
            actividadReciente: recentActivity.rows
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// 3. Alerts
router.get('/alerts', async (req, res) => {
    try {
        const alerts = [];

        // A. Tournaments with open spots
        const torneosIncompletos = await pool.query(`
      SELECT t.id_torneo, t.nombre_torneo, t.max_equipos, COUNT(i.id_equipo) as inscriptos
      FROM torneo t
      LEFT JOIN inscripcion i ON t.id_torneo = i.id_torneo
      WHERE t.fecha_inicio >= CURRENT_DATE
      GROUP BY t.id_torneo
      HAVING COUNT(i.id_equipo) < t.max_equipos
    `);

        torneosIncompletos.rows.forEach(t => {
            alerts.push({
                type: 'warning',
                message: `El torneo "${t.nombre_torneo}" tiene cupos disponibles (${t.inscriptos}/${t.max_equipos}).`
            });
        });

        // B. Inscriptions closed but not full
        const inscripcionesCerradas = await pool.query(`
      SELECT t.id_torneo, t.nombre_torneo, t.max_equipos, COUNT(i.id_equipo) as inscriptos
      FROM torneo t
      LEFT JOIN inscripcion i ON t.id_torneo = i.id_torneo
      WHERE t.fecha_cierre_inscripcion < CURRENT_DATE AND t.fecha_inicio > CURRENT_DATE
      GROUP BY t.id_torneo
      HAVING COUNT(i.id_equipo) < t.max_equipos
    `);

        inscripcionesCerradas.rows.forEach(t => {
            alerts.push({
                type: 'error',
                message: `Inscripciones cerradas para "${t.nombre_torneo}" sin completar cupo (${t.inscriptos}/${t.max_equipos}).`
            });
        });

        res.json(alerts);

    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Error al obtener alertas' });
    }
});

// 4. Tournament Status List
router.get('/torneos-status', async (req, res) => {
    try {
        const query = `
            SELECT t.id_torneo, t.nombre_torneo, t.fecha_inicio, t.fecha_fin, t.max_equipos,
            (SELECT COUNT(*) FROM inscripcion i WHERE i.id_torneo = t.id_torneo) as inscriptos,
            CASE 
                -- Si ya pasaron todas las fechas => Finalizado
                WHEN CURRENT_DATE > t.fecha_fin THEN 'Finalizado'
                
                -- Si hay partidos y TODOS están finalizados => Finalizado (independiente de la fecha)
                WHEN (
                    (SELECT COUNT(*) FROM partidos_grupo pg JOIN grupos g ON pg.grupo_id = g.id_grupo WHERE g.id_torneo = t.id_torneo) > 0 OR
                    (SELECT COUNT(*) FROM partidos_llave pl WHERE pl.id_torneo = t.id_torneo) > 0
                ) AND (
                    (SELECT COUNT(*) FROM partidos_grupo pg JOIN grupos g ON pg.grupo_id = g.id_grupo WHERE g.id_torneo = t.id_torneo AND pg.estado != 'finalizado') = 0 AND
                    (SELECT COUNT(*) FROM partidos_llave pl WHERE pl.id_torneo = t.id_torneo AND pl.estado != 'finalizado') = 0
                ) THEN 'Finalizado'

                -- Si no empezó y está lleno => Inscripción llena
                WHEN CURRENT_DATE < t.fecha_inicio AND (SELECT COUNT(*) FROM inscripcion i2 WHERE i2.id_torneo = t.id_torneo) >= t.max_equipos THEN 'Inscripción llena'

                -- Si no empezó => Inscripción abierta
                WHEN CURRENT_DATE < t.fecha_inicio THEN 'Inscripción abierta'
                
                -- Si está en fecha => En curso
                ELSE 'En curso'
            END as estado,
            c.nombre as categoria
            FROM torneo t
            LEFT JOIN categoria c ON t.categoria_id = c.id_categoria
            ORDER BY t.fecha_inicio DESC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching tournament status:', error);
        res.status(500).json({ error: 'Error al obtener estado de torneos' });
    }
});

export default router;
