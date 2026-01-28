-- Correction de la fonction generate_sige_id
CREATE OR REPLACE FUNCTION generate_sige_id(user_id UUID, city_name VARCHAR) RETURNS VARCHAR AS $$
DECLARE
    zone_code_var VARCHAR(10);
    next_number INTEGER;
    new_sige_id VARCHAR(50);
BEGIN
    -- Obtenir le code de zone
    zone_code_var := get_zone_code(city_name);
    
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
