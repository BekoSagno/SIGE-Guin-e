import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Client } = pg;

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'sige_guinee',
  user: 'postgres',
  password: 'postgres',
});

async function main() {
  try {
    console.log('🌱 Début du seed (via pg)...');
    await client.connect();
    console.log('✅ Connecté à PostgreSQL');

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Nettoyer
    await client.query('TRUNCATE TABLE energy_transactions CASCADE');
    await client.query('TRUNCATE TABLE nilm_signatures CASCADE');
    await client.query('TRUNCATE TABLE energy_data CASCADE');
    await client.query('TRUNCATE TABLE meters CASCADE');
    await client.query('TRUNCATE TABLE financials CASCADE');
    await client.query('TRUNCATE TABLE home_members CASCADE');
    await client.query('TRUNCATE TABLE device_inventory CASCADE');
    await client.query('TRUNCATE TABLE load_shedding_events CASCADE');
    await client.query('TRUNCATE TABLE incidents CASCADE');
    await client.query('TRUNCATE TABLE homes CASCADE');
    await client.query('TRUNCATE TABLE users CASCADE');

    // Créer utilisateurs
    const user1 = await client.query(
      `INSERT INTO users (nom, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Mamadou Diallo', 'mamadou@test.com', hashedPassword, 'CITOYEN']
    );
    const user1Id = user1.rows[0].id;

    const user2 = await client.query(
      `INSERT INTO users (nom, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Fatoumata Bah', 'fatou@test.com', hashedPassword, 'CITOYEN']
    );
    const user2Id = user2.rows[0].id;

    const userEDG = await client.query(
      `INSERT INTO users (nom, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Ibrahim Camara', 'agent@edg.gn', hashedPassword, 'AGENT_EDG']
    );
    const userEDGId = userEDG.rows[0].id;

    const userAdmin = await client.query(
      `INSERT INTO users (nom, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Ministre de l\'Énergie', 'admin@energie.gn', hashedPassword, 'ADMIN_ETAT']
    );
    const userAdminId = userAdmin.rows[0].id;

    console.log('✅ Utilisateurs créés');

    // Créer foyers
    const home1 = await client.query(
      `INSERT INTO homes (proprietaire_id, nom, ville, type, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [user1Id, 'Villa Diallo', 'Dixinn', 'HYBRIDE', 9.5383, -13.6574]
    );
    const home1Id = home1.rows[0].id;

    const home2 = await client.query(
      `INSERT INTO homes (proprietaire_id, nom, ville, type, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [user2Id, 'Résidence Bah', 'Dixinn', 'EDG', 9.5412, -13.6598]
    );
    const home2Id = home2.rows[0].id;

    const home3 = await client.query(
      `INSERT INTO homes (proprietaire_id, nom, ville, type, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [user1Id, 'Appartement Camara', 'Kaloum', 'SOLAIRE', 9.5092, -13.7122]
    );
    const home3Id = home3.rows[0].id;

    const home4 = await client.query(
      `INSERT INTO homes (proprietaire_id, nom, ville, type, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userAdminId, 'Bureau Ministère', 'Kaloum', 'EDG', 9.5115, -13.7145]
    );
    const home4Id = home4.rows[0].id;

    console.log('✅ Foyers créés');

    // Créer financials
    await client.query(
      `INSERT INTO financials (home_id, balance, monthly_budget, last_topup) VALUES ($1, $2, $3, NOW())`,
      [home1Id, 50000, 100000]
    );
    await client.query(
      `INSERT INTO financials (home_id, balance, monthly_budget, last_topup) VALUES ($1, $2, $3, NOW() - INTERVAL '5 days')`,
      [home2Id, 25000, 80000]
    );
    await client.query(
      `INSERT INTO financials (home_id, balance, monthly_budget) VALUES ($1, $2, $3)`,
      [home3Id, 0, 0]
    );
    await client.query(
      `INSERT INTO financials (home_id, balance, monthly_budget, last_topup) VALUES ($1, $2, $3, NOW())`,
      [home4Id, 100000, 150000]
    );

    console.log('✅ Données financières créées');

    // Créer meters
    const meter1 = await client.query(
      `INSERT INTO meters (home_id, firmware_version, status, last_seen) VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [home1Id, 'v1.2.3', 'ONLINE']
    );
    const meter1Id = meter1.rows[0].id;

    const meter2 = await client.query(
      `INSERT INTO meters (home_id, firmware_version, status, last_seen) VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [home2Id, 'v1.2.3', 'ONLINE']
    );
    const meter2Id = meter2.rows[0].id;

    const meter3 = await client.query(
      `INSERT INTO meters (home_id, firmware_version, status, last_seen) VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [home3Id, 'v1.2.0', 'ONLINE']
    );
    const meter3Id = meter3.rows[0].id;

    console.log('✅ Kits IoT créés');

    // Créer energy data
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
      await client.query(
        `INSERT INTO energy_data (meter_id, timestamp, voltage, current, power, energy_source) VALUES ($1, $2, $3, $4, $5, $6)`,
        [meter1Id, timestamp, 220 + Math.random() * 10, 5 + Math.random() * 3, 1100 + Math.random() * 500, i % 2 === 0 ? 'GRID' : 'SOLAR']
      );
      await client.query(
        `INSERT INTO energy_data (meter_id, timestamp, voltage, current, power, energy_source) VALUES ($1, $2, $3, $4, $5, $6)`,
        [meter2Id, timestamp, 220 + Math.random() * 10, 3 + Math.random() * 2, 600 + Math.random() * 300, 'GRID']
      );
    }

    console.log('✅ Données énergétiques créées');

    // Créer NILM signatures
    await client.query(
      `INSERT INTO nilm_signatures (meter_id, device_name, device_type, power_signature, is_active) VALUES ($1, $2, $3, $4, $5)`,
      [meter1Id, 'Climatiseur Salon', 'CLIM', 1500, true]
    );
    await client.query(
      `INSERT INTO nilm_signatures (meter_id, device_name, device_type, power_signature, is_active) VALUES ($1, $2, $3, $4, $5)`,
      [meter1Id, 'Réfrigérateur', 'FRIGO', 200, true]
    );
    await client.query(
      `INSERT INTO nilm_signatures (meter_id, device_name, device_type, power_signature, is_active) VALUES ($1, $2, $3, $4, $5)`,
      [meter2Id, 'Chauffe-eau', 'CHAUFFE_EAU', 2000, false]
    );

    console.log('✅ Signatures NILM créées');

    // Créer incident
    await client.query(
      `INSERT INTO incidents (reporter_id, home_id, description, latitude, longitude, status, incident_type) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user1Id, home1Id, 'Poteau électrique penché dans la rue principale', 9.5383, -13.6574, 'OPEN', 'PANNE']
    );

    console.log('✅ Incidents créés');
    console.log('🎉 Seed terminé avec succès!');
    console.log('\n📋 Comptes de test:');
    console.log('Citoyen: mamadou@test.com / password123');
    console.log('Agent EDG: agent@edg.gn / password123');
    console.log('Admin État: admin@energie.gn / password123');
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

main();
