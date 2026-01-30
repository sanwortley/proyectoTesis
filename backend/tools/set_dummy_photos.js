import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function run() {
    try {
        const res = await pool.query('SELECT id_jugador, nombre_jugador, apellido_jugador FROM jugador');
        console.log(`Encontrados ${res.rowCount} jugadores.`);

        for (const p of res.rows) {
            const url = `https://ui-avatars.com/api/?name=${p.nombre_jugador}+${p.apellido_jugador}&background=random&size=128`;
            await pool.query('UPDATE jugador SET foto_perfil = $1 WHERE id_jugador = $2', [url, p.id_jugador]);
            console.log(`Actualizado ${p.nombre_jugador} ${p.apellido_jugador}`);
        }
        console.log('Todos los jugadores actualiados con fotos dummy.');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
