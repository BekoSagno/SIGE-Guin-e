-- =====================================================
-- SIGE-Guinée - Migration: Tables EDG Dashboard
-- Version: 2.0
-- Date: 2025-01-21
-- =====================================================

-- Table des messages de diffusion (Broadcast)
CREATE TABLE IF NOT EXISTS broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'info', -- info, warning, danger, success
    target_mode VARCHAR(50) NOT NULL, -- zone, individual
    targets JSONB, -- Liste des IDs de zones ou utilisateurs
    recipients_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    sent_by UUID REFERENCES users(id),
    sent_at TIMESTAMP,
    scheduled_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'SENT', -- SENT, SCHEDULED, CANCELLED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_sent_at ON broadcast_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_status ON broadcast_messages(status);

-- Table des modèles de messages
CREATE TABLE IF NOT EXISTS broadcast_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(10),
    title VARCHAR(255) NOT NULL,
    template_content TEXT,
    message_type VARCHAR(50) DEFAULT 'info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insérer les modèles par défaut
INSERT INTO broadcast_templates (id, name, icon, title, template_content, message_type) VALUES
    (gen_random_uuid(), 'maintenance', '🔧', 'Maintenance planifiée', 'Chers abonnés, une maintenance est prévue le {date} de {heureDebut} à {heureFin}. Votre alimentation sera temporairement interrompue. Merci de votre compréhension.', 'info'),
    (gen_random_uuid(), 'coupure', '⚡', 'Coupure programmée', 'Information importante : Une coupure de courant est programmée le {date} dans votre zone pour des travaux sur le réseau. Durée estimée : {duree}.', 'warning'),
    (gen_random_uuid(), 'retablissement', '✅', 'Rétablissement', 'Bonne nouvelle ! L''alimentation électrique a été rétablie dans votre zone. Nous vous remercions de votre patience.', 'success'),
    (gen_random_uuid(), 'incident', '🚨', 'Incident en cours', 'Un incident technique affecte actuellement votre zone. Nos équipes sont mobilisées. Rétablissement prévu : {heureEstimee}.', 'danger'),
    (gen_random_uuid(), 'facture', '📄', 'Rappel facture', 'Rappel : Votre facture d''électricité du mois de {mois} est disponible. Montant : {montant} GNF. Date limite de paiement : {dateLimite}.', 'info'),
    (gen_random_uuid(), 'economie', '💡', 'Conseil économie', 'Conseil énergie : Pendant les heures de pointe ({heurePointe}), réduisez votre consommation pour économiser et aider le réseau. Merci !', 'info'),
    (gen_random_uuid(), 'custom', '✏️', 'Message personnalisé', '', 'info')
ON CONFLICT (name) DO NOTHING;

-- Table des résultats de réconciliation
CREATE TABLE IF NOT EXISTS reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    triggered_by UUID REFERENCES users(id),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED
    zones_analyzed INTEGER DEFAULT 0,
    anomalies_found INTEGER DEFAULT 0,
    total_delta DECIMAL(15, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reconciliation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES reconciliation_runs(id) ON DELETE CASCADE,
    zone_name VARCHAR(100) NOT NULL,
    energy_injected DECIMAL(15, 2), -- kWh injecté par le poste
    energy_billed DECIMAL(15, 2), -- kWh facturé
    delta DECIMAL(15, 2), -- Différence
    delta_percent DECIMAL(5, 2), -- Pourcentage de perte
    status VARCHAR(50) DEFAULT 'NORMAL', -- NORMAL, WARNING, CRITICAL
    suspected_location_lat DECIMAL(10, 6),
    suspected_location_lng DECIMAL(10, 6),
    suspected_location_address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_results_run ON reconciliation_results(run_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_results_zone ON reconciliation_results(zone_name);

-- Table des tickets d'audit fraude
CREATE TABLE IF NOT EXISTS audit_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    location_lat DECIMAL(10, 6),
    location_lng DECIMAL(10, 6),
    location_address VARCHAR(255),
    estimated_loss INTEGER DEFAULT 0, -- en GNF
    delta_percent DECIMAL(5, 2),
    status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, CANCELLED
    assigned_to UUID REFERENCES users(id),
    resolution_notes TEXT,
    recovered_amount INTEGER DEFAULT 0, -- Montant récupéré
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_tickets_status ON audit_tickets(status);
CREATE INDEX IF NOT EXISTS idx_audit_tickets_zone ON audit_tickets(zone_name);

-- Table de maintenance des transformateurs
CREATE TABLE IF NOT EXISTS transformer_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(100) NOT NULL,
    maintenance_type VARCHAR(50) NOT NULL, -- PREVENTIVE, CORRECTIVE, INSPECTION
    description TEXT NOT NULL,
    cost INTEGER DEFAULT 0, -- en GNF
    scheduled_at TIMESTAMP,
    performed_at TIMESTAMP,
    performed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transformer_maintenance_zone ON transformer_maintenance(zone_name);
CREATE INDEX IF NOT EXISTS idx_transformer_maintenance_date ON transformer_maintenance(performed_at DESC);

-- Table des anomalies détectées sur les transformateurs
CREATE TABLE IF NOT EXISTS transformer_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(100) NOT NULL,
    anomaly_type VARCHAR(100) NOT NULL, -- OVERHEATING, MICRO_ARC, VIBRATION, OIL_LEAK, etc.
    severity VARCHAR(50) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    description TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transformer_anomalies_zone ON transformer_anomalies(zone_name);
CREATE INDEX IF NOT EXISTS idx_transformer_anomalies_resolved ON transformer_anomalies(resolved);

-- Table des événements de délestage (amélioration de l'existante)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'load_shedding_events' 
                   AND column_name = 'mqtt_command_id') THEN
        ALTER TABLE load_shedding_events ADD COLUMN mqtt_command_id VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'load_shedding_events' 
                   AND column_name = 'delivery_status') THEN
        ALTER TABLE load_shedding_events ADD COLUMN delivery_status VARCHAR(50) DEFAULT 'PENDING';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'load_shedding_events' 
                   AND column_name = 'delivered_count') THEN
        ALTER TABLE load_shedding_events ADD COLUMN delivered_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Table pour le journal MQTT (délestage IoT)
CREATE TABLE IF NOT EXISTS mqtt_command_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(100) NOT NULL,
    command VARCHAR(100) NOT NULL, -- CMD_REDUCE_LOAD, CMD_RESTORE, etc.
    meters_targeted INTEGER DEFAULT 0,
    meters_delivered INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, DELIVERED, PARTIAL, FAILED
    initiated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mqtt_command_log_zone ON mqtt_command_log(zone_name);
CREATE INDEX IF NOT EXISTS idx_mqtt_command_log_date ON mqtt_command_log(created_at DESC);

-- Vue pour les statistiques du dashboard EDG
CREATE OR REPLACE VIEW edg_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE role = 'CITOYEN') as total_clients,
    (SELECT COUNT(*) FROM meters WHERE status = 'ONLINE') as active_meters,
    (SELECT COUNT(*) FROM incidents WHERE status = 'OPEN') as open_incidents,
    (SELECT COUNT(*) FROM incidents WHERE incident_type = 'FRAUDE_SUSPECTEE' AND status != 'CLOSED') as fraud_alerts,
    (SELECT COUNT(*) FROM audit_tickets WHERE status = 'OPEN') as open_audit_tickets,
    (SELECT COALESCE(SUM(consumption), 0) FROM energy_data WHERE timestamp >= NOW() - INTERVAL '24 hours') as daily_consumption;

-- Ajouter le champ téléphone aux users si manquant
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'telephone') THEN
        ALTER TABLE users ADD COLUMN telephone VARCHAR(50);
    END IF;
END $$;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Migration EDG tables completed successfully!';
END $$;
