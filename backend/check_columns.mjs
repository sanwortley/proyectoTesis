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

async function checkColumn() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'jugador'");
        console.log(res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkColumn();
