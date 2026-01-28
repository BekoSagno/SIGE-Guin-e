// Script pour tester la connexion en utilisant docker exec
import { exec } from 'child_process';
import { promisify } from 'util';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const execAsync = promisify(exec);

async function testLogin() {
  try {
    // Récupérer l'utilisateur via docker exec
    const { stdout } = await execAsync(
      'docker exec sige-postgres psql -U postgres -d sige_guinee -t -c "SELECT id, nom, email, password_hash, role FROM users WHERE email = \'mamadou@test.com\';"'
    );
    
    const parts = stdout.trim().split('|').map(s => s.trim());
    if (parts.length < 5) {
      console.log('❌ User not found');
      return;
    }
    
    const [id, nom, email, passwordHash, role] = parts;
    console.log('✅ User found:', email);
    
    // Test password
    const isValid = await bcrypt.compare('password123', passwordHash);
    console.log('Password valid:', isValid);
    
    if (isValid) {
      const token = jwt.sign(
        { userId: id, email, role },
        'your-super-secret-jwt-key-change-in-production-min-32-chars',
        { expiresIn: '7d' }
      );
      console.log('✅ Token generated:', token.substring(0, 50) + '...');
      console.log('\n🎉 Connexion réussie !');
      console.log('Vous pouvez maintenant utiliser ce token dans le frontend.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin();
