
import pg from 'pg';
const { Client } = pg;

// Update DB name to 'procup3'
const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@db:5432/procup3'
});

async function clean() {
    try {
        await client.connect();
        console.log('Connected to procup3. Cleaning test tournaments...');

        const res = await client.query(`
      DELETE FROM torneo 
      WHERE nombre_torneo LIKE '%Multi Test%'
      RETURNING id_torneo, nombre_torneo;
    `);

        console.log('Deleted tournaments:', res.rowCount);
        res.rows.forEach(r => console.log(`Deleted: ${r.nombre_torneo} (ID: ${r.id_torneo})`));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

clean();
