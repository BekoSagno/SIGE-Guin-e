-- =====================================================
-- SIGE-Guinée - Migration: Types de Clients (VIP/USAGER)
-- Version: 5.0
-- Date: 2025-01-21
-- =====================================================

-- Ajouter le champ client_type à la table users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'client_type') THEN
        ALTER TABLE users ADD COLUMN client_type VARCHAR(20);
    END IF;
END $$;

-- Définir le type de client selon le rôle
-- ADMIN_ETAT = VIP (Ministères, Présidence, etc.)
-- CITOYEN = USAGER
UPDATE users 
SET client_type = CASE 
    WHEN role = 'ADMIN_ETAT' THEN 'VIP'
    WHEN role = 'CITOYEN' THEN 'USAGER'
    ELSE NULL
END
WHERE client_type IS NULL;

-- Ajouter une contrainte pour s'assurer que client_type est soit VIP soit USAGER
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_client_type'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT check_client_type 
        CHECK (client_type IS NULL OR client_type IN ('VIP', 'USAGER'));
    END IF;
END $$;

-- Ajouter une zone VIP dans les compteurs d'IDs SIGE
INSERT INTO sige_id_counters (zone_code, last_number) VALUES
    ('VIP', 0)
ON CONFLICT (zone_code) DO NOTHING;

-- Modifier la fonction get_zone_code pour gérer les clients VIP
CREATE OR REPLACE FUNCTION get_zone_code(city_name VARCHAR, user_role VARCHAR DEFAULT NULL) RETURNS VARCHAR AS $$
BEGIN
    -- Si c'est un admin État, retourner VIP
    IF user_role = 'ADMIN_ETAT' THEN
        RETURN 'VIP';
    END IF;
    
    -- Sinon, utiliser la logique normale pour les villes
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

-- Modifier la fonction generate_sige_id pour accepter le rôle
CREATE OR REPLACE FUNCTION generate_sige_id(user_id UUID, city_name VARCHAR, user_role VARCHAR DEFAULT NULL) RETURNS VARCHAR AS $$
DECLARE
    zone_code_var VARCHAR(10);
    next_number INTEGER;
    new_sige_id VARCHAR(50);
BEGIN
    -- Obtenir le code de zone (inclut maintenant VIP pour ADMIN_ETAT)
    zone_code_var := get_zone_code(city_name, user_role);
    
    -- Incrémenter le compteur pour cette zone (avec verrouillage)
    UPDATE sige_id_counters 
    SET last_number = last_number + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE sige_id_counters.zone_code = zone_code_var
    RETURNING last_number INTO next_number;
    
    -- Si la zone n'existe pas, la créer
    IF next_number IS NULL THEN
        INSERT INTO sige_id_counters (zone_code, last_number) 
        VALUES (zone_code_var, 1)
        ON CONFLICT (zone_code) DO UPDATE 
        SET last_number = sige_id_counters.last_number + 1,
            updated_at = CURRENT_TIMESTAMP
        RETURNING last_number INTO next_number;
    END IF;
    
    -- Générer l'ID SIGE au format GUI-ZONE-NUMERO
    new_sige_id := 'GUI-' || zone_code_var || '-' || LPAD(next_number::TEXT, 5, '0');
    
    -- Mettre à jour l'utilisateur avec le nouvel ID SIGE
    UPDATE users 
    SET sige_id = new_sige_id
    WHERE id = user_id;
    
    RETURN new_sige_id;
END;
$$ LANGUAGE plpgsql;

-- Modifier le trigger pour générer des IDs SIGE pour tous les clients (VIP et USAGER)
CREATE OR REPLACE FUNCTION auto_generate_sige_id() RETURNS TRIGGER AS $$
DECLARE
    user_city VARCHAR;
BEGIN
    -- Générer un ID SIGE pour les CITOYEN (USAGER) et ADMIN_ETAT (VIP)
    IF (NEW.role = 'CITOYEN' OR NEW.role = 'ADMIN_ETAT') AND NEW.sige_id IS NULL THEN
        -- Récupérer la ville depuis le premier foyer de l'utilisateur (si disponible)
        SELECT ville INTO user_city
        FROM homes
        WHERE proprietaire_id = NEW.id
        LIMIT 1;
        
        -- Si pas de foyer, utiliser 'Conakry' par défaut
        IF user_city IS NULL THEN
            user_city := 'Conakry';
        END IF;
        
        -- Générer l'ID SIGE avec le rôle pour déterminer VIP ou zone normale
        PERFORM generate_sige_id(NEW.id, user_city, NEW.role);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_sige_id ON users;
CREATE TRIGGER trigger_auto_generate_sige_id
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_sige_id();

-- Générer les IDs SIGE pour les ADMIN_ETAT existants qui n'en ont pas
DO $$
DECLARE
    user_record RECORD;
    user_city VARCHAR;
BEGIN
    FOR user_record IN 
        SELECT u.id, u.role, h.ville
        FROM users u
        LEFT JOIN homes h ON h.proprietaire_id = u.id
        WHERE u.role = 'ADMIN_ETAT' AND u.sige_id IS NULL
        GROUP BY u.id, u.role, h.ville
    LOOP
        user_city := COALESCE(user_record.ville, 'Conakry');
        PERFORM generate_sige_id(user_record.id, user_city, user_record.role);
    END LOOP;
    
    RAISE NOTICE 'IDs SIGE générés pour les clients VIP (ADMIN_ETAT).';
END $$;

-- Mettre à jour la vue pour inclure le type de client
CREATE OR REPLACE VIEW v_sige_client_info AS
SELECT 
    u.id as user_id,
    u.sige_id,
    u.nom,
    u.email,
    u.telephone,
    u.role,
    u.client_type,
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
WHERE (u.role = 'CITOYEN' OR u.role = 'ADMIN_ETAT') AND u.sige_id IS NOT NULL
GROUP BY u.id, u.sige_id, u.nom, u.email, u.telephone, u.role, u.client_type, u.created_at;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Migration Types de Clients terminée avec succès!';
    RAISE NOTICE 'Clients VIP (ADMIN_ETAT) et USAGER (CITOYEN) configurés.';
    RAISE NOTICE 'IDs SIGE générés pour tous les clients VIP existants.';
END $$;
