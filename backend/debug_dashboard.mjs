import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function debugDashboard() {
    const query = `
    SELECT t.id_torneo, t.nombre_torneo, t.fecha_inicio, t.fecha_fin,
    CASE 
        WHEN CURRENT_DATE > t.fecha_fin THEN 'Finalizado'
        WHEN (
            (SELECT COUNT(*) FROM partidos_grupo pg JOIN grupos g ON pg.grupo_id = g.id_grupo WHERE g.torneo_id = t.id_torneo) > 0 OR
            (SELECT COUNT(*) FROM partidos_llave pl WHERE pl.id_torneo = t.id_torneo) > 0
        ) AND (
            (SELECT COUNT(*) FROM partidos_grupo pg JOIN grupos g ON pg.grupo_id = g.id_grupo WHERE g.torneo_id = t.id_torneo AND pg.estado != 'finalizado') = 0 AND
            (SELECT COUNT(*) FROM partidos_llave pl WHERE pl.id_torneo = t.id_torneo AND pl.estado != 'finalizado') = 0
        ) THEN 'Finalizado'
        WHEN CURRENT_DATE < t.fecha_inicio THEN 'Inscripción abierta'
        ELSE 'En curso'
    END as estado,
    c.nombre as categoria
    FROM torneo t
    LEFT JOIN categoria c ON t.categoria_id = c.id_categoria
    ORDER BY t.fecha_inicio DESC
  `;

    try {
        const res = await pool.query(query);
        console.log("Success! Rows:", res.rows.length);
        console.log(res.rows[0]);
    } catch (err) {
        console.error("SQL Error:", err.message);
    } finally {
        pool.end();
    }
}

debugDashboard();
