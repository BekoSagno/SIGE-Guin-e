-- Générer les IDs SIGE pour les utilisateurs existants
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
    
    RAISE NOTICE 'IDs SIGE générés pour tous les citoyens existants.';
END $$;
