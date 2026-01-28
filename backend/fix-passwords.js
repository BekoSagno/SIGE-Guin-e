import bcrypt from 'bcryptjs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function fixPasswords() {
  try {
    console.log('🔧 Correction des mots de passe...');
    
    // Générer le hash
    const hashedPassword = await bcrypt.hash('password123', 10);
    console.log('Hash généré:', hashedPassword);
    
    // Mettre à jour tous les utilisateurs
    const updateQuery = `UPDATE users SET password_hash = '${hashedPassword}' WHERE email IN ('mamadou@test.com', 'fatou@test.com', 'agent@edg.gn', 'admin@energie.gn');`;
    
    await execAsync(
      `docker exec sige-postgres psql -U postgres -d sige_guinee -c "${updateQuery}"`
    );
    
    console.log('✅ Mots de passe mis à jour !');
    
    // Tester
    const { stdout } = await execAsync(
      'docker exec sige-postgres psql -U postgres -d sige_guinee -t -c "SELECT email, password_hash FROM users WHERE email = \'mamadou@test.com\';"'
    );
    
    const parts = stdout.trim().split('|').map(s => s.trim());
    const testHash = parts[1];
    const isValid = await bcrypt.compare('password123', testHash);
    console.log('Test password:', isValid ? '✅ Valide' : '❌ Invalide');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixPasswords();
