-- =====================================================
-- SIGE-Guinée - Migration: Smart Panel & Energy Quota
-- Version: 3.0
-- Date: 2025-01-22
-- Description: Ajoute les tables pour les relais internes (Smart Panel)
--              et les quotas d'énergie basés sur le crédit
-- =====================================================

-- Enum pour les types de circuits
DO $$ BEGIN
    CREATE TYPE circuit_type AS ENUM ('LIGHTS_PLUGS', 'POWER', 'ESSENTIAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table MeterRelay (Relais Internes du Boîtier IoT - Smart Panel)
CREATE TABLE IF NOT EXISTS meter_relays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    relay_number INTEGER NOT NULL,
    circuit_type circuit_type NOT NULL DEFAULT 'LIGHTS_PLUGS',
    label VARCHAR(100), -- "Salon", "Chambres", "Climatiseurs", etc.
    is_active BOOLEAN DEFAULT true,
    is_enabled BOOLEAN DEFAULT true, -- Contrôle manuel on/off
    current_power DECIMAL(10, 2) DEFAULT 0, -- Puissance actuelle en W
    max_power DECIMAL(10, 2), -- Puissance maximale autorisée en W
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meter_id, relay_number)
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_meter_relays_meter_id ON meter_relays(meter_id);
CREATE INDEX IF NOT EXISTS idx_meter_relays_circuit_type ON meter_relays(meter_id, circuit_type);
CREATE INDEX IF NOT EXISTS idx_meter_relays_active ON meter_relays(meter_id, is_active);

-- Ajouter la colonne relay_id à nilm_signatures si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nilm_signatures' AND column_name = 'relay_id'
    ) THEN
        ALTER TABLE nilm_signatures 
        ADD COLUMN relay_id UUID REFERENCES meter_relays(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_nilm_signatures_relay_id ON nilm_signatures(relay_id);
    END IF;
END $$;

-- Table EnergyQuota (Quota de Consommation basé sur Crédit)
CREATE TABLE IF NOT EXISTS energy_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    quota_kwh DECIMAL(10, 4) NOT NULL DEFAULT 0, -- Quota disponible en kWh
    quota_gnf DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Équivalent en GNF
    consumed_kwh DECIMAL(10, 4) DEFAULT 0, -- Consommé depuis création
    last_sync TIMESTAMP, -- Dernière synchronisation avec Kit IoT
    expires_at TIMESTAMP, -- Date d'expiration du quota
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_energy_quotas_home_id ON energy_quotas(home_id);
CREATE INDEX IF NOT EXISTS idx_energy_quotas_meter_id ON energy_quotas(meter_id);
CREATE INDEX IF NOT EXISTS idx_energy_quotas_meter_active ON energy_quotas(meter_id, is_active);
CREATE INDEX IF NOT EXISTS idx_energy_quotas_expires_at ON energy_quotas(expires_at);

-- Fonction pour créer automatiquement les relais par défaut lors de la création d'un compteur
CREATE OR REPLACE FUNCTION create_default_relays_for_meter()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer 3 relais par défaut pour chaque nouveau compteur
    INSERT INTO meter_relays (meter_id, relay_number, circuit_type, label, is_active, is_enabled, max_power)
    VALUES
        (NEW.id, 1, 'LIGHTS_PLUGS', 'Éclairage et Prises', true, true, 2000),
        (NEW.id, 2, 'POWER', 'Puissance (Climatiseurs, Chauffe-eau)', true, true, 5000),
        (NEW.id, 3, 'ESSENTIAL', 'Essentiel (Réfrigérateur)', true, true, 1000)
    ON CONFLICT (meter_id, relay_number) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement les relais
DROP TRIGGER IF EXISTS trigger_create_default_relays ON meters;
CREATE TRIGGER trigger_create_default_relays
    AFTER INSERT ON meters
    FOR EACH ROW
    EXECUTE FUNCTION create_default_relays_for_meter();

-- Fonction pour calculer le quota en kWh à partir du montant GNF
-- Taux de conversion: 1 kWh = 1000 GNF (exemple, à ajuster selon le tarif réel)
CREATE OR REPLACE FUNCTION calculate_quota_kwh(amount_gnf DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    tariff_per_kwh DECIMAL := 1000; -- Tarif en GNF par kWh
BEGIN
    RETURN ROUND(amount_gnf / tariff_per_kwh, 4);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier si un quota est valide et suffisant
CREATE OR REPLACE FUNCTION check_quota_available(meter_uuid UUID, required_kwh DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
    available_quota DECIMAL;
BEGIN
    SELECT (quota_kwh - consumed_kwh) INTO available_quota
    FROM energy_quotas
    WHERE meter_id = meter_uuid 
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF available_quota IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN available_quota >= required_kwh;
END;
$$ LANGUAGE plpgsql;

-- Commentaires pour documentation
COMMENT ON TABLE meter_relays IS 'Relais internes du boîtier IoT (Smart Panel) - Permet la gestion sélective des circuits';
COMMENT ON TABLE energy_quotas IS 'Quotas d''énergie basés sur le crédit transféré - Le Kit IoT vérifie ce quota avant d''autoriser la consommation';
COMMENT ON COLUMN meter_relays.circuit_type IS 'Type de circuit: LIGHTS_PLUGS (Relais 1), POWER (Relais 2), ESSENTIAL (Relais 3)';
COMMENT ON COLUMN energy_quotas.quota_kwh IS 'Quota disponible en kWh calculé à partir du crédit GNF transféré';
COMMENT ON COLUMN energy_quotas.consumed_kwh IS 'Quantité d''énergie déjà consommée depuis la création du quota';
