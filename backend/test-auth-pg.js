import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'sige_guinee',
  user: 'postgres',
  password: 'postgres',
});

async function test() {
  try {
    console.log('Testing auth with pg...');
    const result = await pool.query(
      'SELECT id, nom, email, password_hash, role FROM users WHERE email = $1',
      ['mamadou@test.com']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = result.rows[0];
    console.log('✅ User found:', user.email);
    
    // Test password
    const isValid = await bcrypt.compare('password123', user.password_hash);
    console.log('Password valid:', isValid);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
