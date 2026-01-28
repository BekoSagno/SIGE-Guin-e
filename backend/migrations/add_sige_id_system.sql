-- =====================================================
-- SIGE-Guinée - Migration: Système ID SIGE Unique
-- Version: 4.0
-- Date: 2025-01-21
-- =====================================================

-- Ajouter le champ sige_id à la table users (pour les citoyens)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'sige_id') THEN
        ALTER TABLE users ADD COLUMN sige_id VARCHAR(50) UNIQUE;
    END IF;
END $$;

-- Créer un index pour les recherches rapides par ID SIGE
CREATE INDEX IF NOT EXISTS idx_users_sige_id ON users(sige_id) WHERE sige_id IS NOT NULL;

-- Table pour stocker les compteurs d'IDs SIGE par zone
CREATE TABLE IF NOT EXISTS sige_id_counters (
    zone_code VARCHAR(10) PRIMARY KEY,
    last_number INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insérer les zones par défaut
INSERT INTO sige_id_counters (zone_code, last_number) VALUES
    ('DIX', 0),
    ('KAL', 0),
    ('RAT', 0),
    ('MAT', 0),
    ('COY', 0),
    ('DUB', 0)
ON CONFLICT (zone_code) DO NOTHING;

-- Fonction pour obtenir le code de zone depuis une ville
CREATE OR REPLACE FUNCTION get_zone_code(city_name VARCHAR) RETURNS VARCHAR AS $$
BEGIN
    RETURN CASE 
        WHEN UPPER(city_name) LIKE '%DIXINN%' OR UPPER(city_name) = 'DIXINN' THEN 'DIX'
        WHEN UPPER(city_name) LIKE '%KALOUM%' OR UPPER(city_name) = 'KALOUM' THEN 'KAL'
        WHEN UPPER(city_name) LIKE '%RATOMA%' OR UPPER(city_name) = 'RATOMA' THEN 'RAT'
        WHEN UPPER(city_name) LIKE '%MATOTO%' OR UPPER(city_name) = 'MATOTO' THEN 'MAT'
        WHEN UPPER(city_name) LIKE '%COYAH%' OR UPPER(city_name) = 'COYAH' THEN 'COY'
        WHEN UPPER(city_name) LIKE '%DUBREKA%' OR UPPER(city_name) = 'DUBREKA' THEN 'DUB'
        ELSE 'CON' -- Conakry par défaut
    END;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer un ID SIGE unique
CREATE OR REPLACE FUNCTION generate_sige_id(user_id UUID, city_name VARCHAR) RETURNS VARCHAR AS $$
DECLARE
    zone_code VARCHAR(10);
    next_number INTEGER;
    new_sige_id VARCHAR(50);
BEGIN
    -- Obtenir le code de zone
    zone_code := get_zone_code(city_name);
    
    -- Incrémenter le compteur pour cette zone (avec verrouillage)
    UPDATE sige_id_counters 
    SET last_number = last_number + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE sige_id_counters.zone_code = generate_sige_id.zone_code
    RETURNING last_number INTO next_number;
    
    -- Si la zone n'existe pas, la créer
    IF next_number IS NULL THEN
        INSERT INTO sige_id_counters (zone_code, last_number) 
        VALUES (generate_sige_id.zone_code, 1)
        ON CONFLICT (zone_code) DO UPDATE 
        SET last_number = sige_id_counters.last_number + 1,
            updated_at = CURRENT_TIMESTAMP
        RETURNING last_number INTO next_number;
    END IF;
    
    -- Générer l'ID SIGE au format GUI-ZONE-NUMERO
    new_sige_id := 'GUI-' || zone_code || '-' || LPAD(next_number::TEXT, 5, '0');
    
    -- Mettre à jour l'utilisateur avec le nouvel ID SIGE
    UPDATE users 
    SET sige_id = new_sige_id
    WHERE id = user_id;
    
    RETURN new_sige_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour générer automatiquement l'ID SIGE lors de la création d'un citoyen
CREATE OR REPLACE FUNCTION auto_generate_sige_id() RETURNS TRIGGER AS $$
DECLARE
    user_city VARCHAR;
BEGIN
    -- Seulement pour les citoyens (pas les agents EDG)
    IF NEW.role = 'CITOYEN' AND NEW.sige_id IS NULL THEN
        -- Récupérer la ville depuis le premier foyer de l'utilisateur (si disponible)
        SELECT ville INTO user_city
        FROM homes
        WHERE proprietaire_id = NEW.id
        LIMIT 1;
        
        -- Si pas de foyer, utiliser 'Conakry' par défaut
        IF user_city IS NULL THEN
            user_city := 'Conakry';
        END IF;
        
        -- Générer l'ID SIGE
        PERFORM generate_sige_id(NEW.id, user_city);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger (seulement si il n'existe pas déjà)
DROP TRIGGER IF EXISTS trigger_auto_generate_sige_id ON users;
CREATE TRIGGER trigger_auto_generate_sige_id
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_sige_id();

-- Vue pour faciliter les recherches par ID SIGE avec toutes les infos
CREATE OR REPLACE VIEW v_sige_client_info AS
SELECT 
    u.id as user_id,
    u.sige_id,
    u.nom,
    u.email,
    u.telephone,
    u.role,
    u.created_at as inscription_date,
    COUNT(DISTINCT h.id) as nombre_foyers,
    COUNT(DISTINCT m.id) as nombre_compteurs,
    COUNT(DISTINCT i.id) as nombre_incidents,
    MAX(ed.timestamp) as derniere_consommation,
    SUM(ed.power) as consommation_totale_kwh
FROM users u
LEFT JOIN homes h ON h.proprietaire_id = u.id
LEFT JOIN meters m ON m.home_id = h.id
LEFT JOIN incidents i ON i.reporter_id = u.id
LEFT JOIN energy_data ed ON ed.meter_id = m.id
WHERE u.role = 'CITOYEN' AND u.sige_id IS NOT NULL
GROUP BY u.id, u.sige_id, u.nom, u.email, u.telephone, u.role, u.created_at;

-- Fonction pour rechercher un client par ID SIGE
CREATE OR REPLACE FUNCTION search_client_by_sige_id(search_id VARCHAR) 
RETURNS TABLE (
    user_id UUID,
    sige_id VARCHAR,
    nom VARCHAR,
    email VARCHAR,
    telephone VARCHAR,
    nombre_foyers BIGINT,
    nombre_compteurs BIGINT,
    nombre_incidents BIGINT,
    derniere_consommation TIMESTAMP,
    consommation_totale_kwh NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.user_id,
        v.sige_id,
        v.nom,
        v.email,
        v.telephone,
        v.nombre_foyers,
        v.nombre_compteurs,
        v.nombre_incidents,
        v.derniere_consommation,
        v.consommation_totale_kwh
    FROM v_sige_client_info v
    WHERE v.sige_id = search_id;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour les utilisateurs existants (citoyens) avec des IDs SIGE
DO $$
DECLARE
    user_record RECORD;
    user_city VARCHAR;
BEGIN
    FOR user_record IN 
        SELECT u.id, u.role, h.ville
        FROM users u
        LEFT JOIN homes h ON h.proprietaire_id = u.id
        WHERE u.role = 'CITOYEN' AND u.sige_id IS NULL
        GROUP BY u.id, u.role, h.ville
    LOOP
        user_city := COALESCE(user_record.ville, 'Conakry');
        PERFORM generate_sige_id(user_record.id, user_city);
    END LOOP;
END $$;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Migration Système ID SIGE terminée avec succès!';
    RAISE NOTICE 'IDs SIGE générés pour tous les citoyens existants.';
END $$;
