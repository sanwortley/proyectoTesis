import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const sqlPath = path.resolve(__dirname, '../DATA/patch_schema.sql');
const rawSql = fs.readFileSync(sqlPath, 'utf8');
const statements = rawSql
  .split(/;\s*\n/)
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0);

const dbHost = process.env.DB_HOST === 'db' && process.platform === 'win32'
  ? '127.0.0.1'
  : process.env.DB_HOST || '127.0.0.1';

const pool = new pg.Pool({
  host: dbHost,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'procup3',
});

async function applyPatch() {
  const client = await pool.connect();
  try {
    console.log('Applying patch schema from', sqlPath);
    for (const statement of statements) {
      console.log('Executing:', statement.replace(/\s+/g, ' ').trim());
      await client.query(statement);
    }
    console.log('Schema patch applied successfully.');
  } catch (error) {
    console.error('Failed to apply schema patch:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

applyPatch();
