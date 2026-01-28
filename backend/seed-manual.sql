-- Seed manuel pour créer les utilisateurs de test
-- Le mot de passe hashé pour "password123" avec bcrypt (10 rounds)
-- Hash: $2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZq

-- Nettoyer les données existantes
TRUNCATE TABLE energy_transactions CASCADE;
TRUNCATE TABLE nilm_signatures CASCADE;
TRUNCATE TABLE energy_data CASCADE;
TRUNCATE TABLE meters CASCADE;
TRUNCATE TABLE financials CASCADE;
TRUNCATE TABLE home_members CASCADE;
TRUNCATE TABLE device_inventory CASCADE;
TRUNCATE TABLE load_shedding_events CASCADE;
TRUNCATE TABLE incidents CASCADE;
TRUNCATE TABLE homes CASCADE;
TRUNCATE TABLE users CASCADE;

-- Créer les utilisateurs (mot de passe: password123)
-- Hash bcrypt pour "password123": $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
INSERT INTO users (id, nom, email, password_hash, role) VALUES
('00000000-0000-0000-0000-000000000001', 'Mamadou Diallo', 'mamadou@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'CITOYEN'),
('00000000-0000-0000-0000-000000000002', 'Fatoumata Bah', 'fatou@test.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'CITOYEN'),
('00000000-0000-0000-0000-000000000003', 'Ibrahim Camara', 'agent@edg.gn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AGENT_EDG'),
('00000000-0000-0000-0000-000000000004', 'Ministre de l''Énergie', 'admin@energie.gn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN_ETAT');

-- Créer les foyers
INSERT INTO homes (id, proprietaire_id, nom, ville, type, latitude, longitude) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Villa Diallo', 'Dixinn', 'HYBRIDE', 9.5383, -13.6574),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Résidence Bah', 'Dixinn', 'EDG', 9.5412, -13.6598),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Appartement Camara', 'Kaloum', 'SOLAIRE', 9.5092, -13.7122),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'Bureau Ministère', 'Kaloum', 'EDG', 9.5115, -13.7145);

-- Créer les compteurs financiers
INSERT INTO financials (id, home_id, balance, monthly_budget, last_topup) VALUES
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 50000, 100000, NOW()),
('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 25000, 80000, NOW() - INTERVAL '5 days'),
('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 0, 0, NULL),
('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 100000, 150000, NOW());

-- Créer les kits IoT
INSERT INTO meters (id, home_id, firmware_version, status, last_seen) VALUES
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'v1.2.3', 'ONLINE', NOW()),
('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'v1.2.3', 'ONLINE', NOW()),
('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'v1.2.0', 'ONLINE', NOW());

-- Créer quelques données énergétiques
INSERT INTO energy_data (id, meter_id, timestamp, voltage, current, power, energy_source) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', NOW(), 220, 5, 1100, 'GRID'),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 hour', 220, 4, 880, 'SOLAR'),
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', NOW(), 220, 3, 660, 'GRID');

-- Créer des signatures NILM
INSERT INTO nilm_signatures (id, meter_id, device_name, device_type, power_signature, is_active) VALUES
('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Climatiseur Salon', 'CLIM', 1500, true),
('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Réfrigérateur', 'FRIGO', 200, true),
('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'Chauffe-eau', 'CHAUFFE_EAU', 2000, false);

-- Créer un incident de test
INSERT INTO incidents (id, reporter_id, home_id, description, latitude, longitude, status, incident_type) VALUES
('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Poteau électrique penché dans la rue principale', 9.5383, -13.6574, 'OPEN', 'PANNE');
