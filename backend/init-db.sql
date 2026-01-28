-- Script SQL pour initialiser la base de données manuellement
-- À exécuter dans le conteneur PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'CITOYEN' CHECK (role IN ('CITOYEN', 'AGENT_EDG', 'ADMIN_ETAT')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Homes
CREATE TABLE IF NOT EXISTS homes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proprietaire_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('EDG', 'SOLAIRE', 'HYBRIDE')),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_homes_ville ON homes(ville);
CREATE INDEX IF NOT EXISTS idx_homes_proprietaire ON homes(proprietaire_id);

-- Table Meters
CREATE TABLE IF NOT EXISTS meters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    firmware_version VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'OFFLINE')),
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meters_status ON meters(status);
CREATE INDEX IF NOT EXISTS idx_meters_home ON meters(home_id);

-- Table EnergyData
CREATE TABLE IF NOT EXISTS energy_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    voltage DECIMAL(10, 2),
    current DECIMAL(10, 2),
    power DECIMAL(10, 2),
    energy_source VARCHAR(50) NOT NULL CHECK (energy_source IN ('GRID', 'SOLAR', 'BATTERY')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_energy_data_timestamp ON energy_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_energy_data_meter ON energy_data(meter_id);
CREATE INDEX IF NOT EXISTS idx_energy_data_meter_timestamp ON energy_data(meter_id, timestamp DESC);

-- Table Incidents
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    home_id UUID REFERENCES homes(id),
    description TEXT NOT NULL,
    photo_url VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DISPATCHED', 'CLOSED')),
    incident_type VARCHAR(50) CHECK (incident_type IN ('FRAUDE_SUSPECTEE', 'PANNE', 'COUPURE', 'AUTRE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON incidents(reporter_id);

-- Table Financials
CREATE TABLE IF NOT EXISTS financials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id UUID UNIQUE NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    last_topup TIMESTAMP,
    monthly_budget DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financials_home ON financials(home_id);

-- Table NILM Signatures
CREATE TABLE IF NOT EXISTS nilm_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    power_signature DECIMAL(10, 2),
    detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_nilm_signatures_meter ON nilm_signatures(meter_id);
CREATE INDEX IF NOT EXISTS idx_nilm_signatures_active ON nilm_signatures(meter_id, is_active);

-- Table Load Shedding Events
CREATE TABLE IF NOT EXISTS load_shedding_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id VARCHAR(100) NOT NULL,
    triggered_by UUID REFERENCES users(id),
    command_type VARCHAR(50) NOT NULL CHECK (command_type IN ('SHED_HEAVY_LOADS', 'RESTORE')),
    meters_affected INTEGER,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_load_shedding_zone ON load_shedding_events(zone_id);
CREATE INDEX IF NOT EXISTS idx_load_shedding_started ON load_shedding_events(started_at DESC);

-- Table HomeMember (Gestion Familiale)
CREATE TABLE IF NOT EXISTS home_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER', 'CHILD')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(home_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_home_members_home ON home_members(home_id);
CREATE INDEX IF NOT EXISTS idx_home_members_user ON home_members(user_id);

-- Table DeviceInventory
CREATE TABLE IF NOT EXISTS device_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    signature_nilm VARCHAR(255),
    power_rating DECIMAL(10, 2),
    is_restricted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_inventory_home ON device_inventory(home_id);

-- Table EnergyTransaction
CREATE TABLE IF NOT EXISTS energy_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_home_id UUID NOT NULL REFERENCES homes(id),
    to_home_id UUID NOT NULL REFERENCES homes(id),
    amount DECIMAL(15, 2) NOT NULL,
    unit VARCHAR(10) NOT NULL CHECK (unit IN ('GNF', 'Wh')),
    initiated_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_energy_transactions_from ON energy_transactions(from_home_id);
CREATE INDEX IF NOT EXISTS idx_energy_transactions_to ON energy_transactions(to_home_id);
CREATE INDEX IF NOT EXISTS idx_energy_transactions_initiator ON energy_transactions(initiated_by);

-- Fonction pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_homes_updated_at ON homes;
CREATE TRIGGER update_homes_updated_at BEFORE UPDATE ON homes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meters_updated_at ON meters;
CREATE TRIGGER update_meters_updated_at BEFORE UPDATE ON meters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents;
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financials_updated_at ON financials;
CREATE TRIGGER update_financials_updated_at BEFORE UPDATE ON financials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_home_members_updated_at ON home_members;
CREATE TRIGGER update_home_members_updated_at BEFORE UPDATE ON home_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_device_inventory_updated_at ON device_inventory;
CREATE TRIGGER update_device_inventory_updated_at BEFORE UPDATE ON device_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
