import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'sige_guinee',
  user: 'postgres',
  password: 'postgres',
});

async function test() {
  try {
    console.log('Testing direct PostgreSQL connection...');
    await client.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ Connection successful!');
    console.log('PostgreSQL version:', result.rows[0].version);
    await client.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

test();
