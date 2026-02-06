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

async function checkTorneo() {
    try {
        const res = await pool.query("SELECT * FROM torneo WHERE nombre_torneo = 'Torneo Verano 2026'");
        console.log(res.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkTorneo();
