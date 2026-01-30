
import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@db:5432/postgres'
});

async function listTables() {
    try {
        await client.connect();
        console.log('Connected. Listing all tables in public schema...');

        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        if (res.rows.length === 0) {
            console.log('No tables found in public schema!');
        } else {
            console.log('Tables found:');
            res.rows.forEach(r => console.log(` - ${r.table_name}`));
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}

listTables();
