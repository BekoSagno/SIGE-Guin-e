-- Migration: Tables avancées pour le module ÉTAT (Ministère)
-- Date: 2025-01-20
-- Description: Tables pour Planification Ravitaillement, Audit Performance, Impact Social, Maintenance Prédictive

-- 1. Table pour les achats d'énergie (Interconnexion OMVG/WAPP, Centrales thermiques)
CREATE TABLE IF NOT EXISTS energy_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_date DATE NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'OMVG', 'WAPP', 'THERMAL', 'HYDRO'
    energy_kwh DECIMAL(15, 2) NOT NULL,
    cost_gnf DECIMAL(18, 2) NOT NULL,
    supplier_name VARCHAR(255),
    contract_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_energy_purchases_date ON energy_purchases(purchase_date);
CREATE INDEX idx_energy_purchases_source ON energy_purchases(source_type);

-- 2. Table pour les barrages hydroélectriques (données réelles)
CREATE TABLE IF NOT EXISTS hydro_dams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE, -- 'Souapiti', 'Kaléta', 'Garafiri'
    capacity_max_mw DECIMAL(10, 2) NOT NULL,
    current_level_percent DECIMAL(5, 2) NOT NULL, -- 0-100
    production_current_mw DECIMAL(10, 2) NOT NULL,
    cost_per_kwh DECIMAL(10, 2) NOT NULL, -- Coût marginal
    forecast_level_7d JSONB, -- Prévisions 7 jours
    forecast_production_7d JSONB,
    weather_alert TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hydro_dams_name ON hydro_dams(name);
CREATE INDEX idx_hydro_dams_level ON hydro_dams(current_level_percent);

-- 3. Table pour la planification du ravitaillement rural
CREATE TABLE IF NOT EXISTS rural_electrification_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region VARCHAR(100) NOT NULL,
    village_name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    population INTEGER,
    current_status VARCHAR(50) DEFAULT 'NON_ELECTRIFIE', -- 'NON_ELECTRIFIE', 'EN_PLANIFICATION', 'EN_CONSTRUCTION', 'ELECTRIFIE'
    energy_surplus_allocated_mw DECIMAL(10, 4), -- Énergie réallouée depuis le surplus urbain
    estimated_cost_gnf DECIMAL(18, 2),
    target_completion_date DATE,
    actual_completion_date DATE,
    electrification_rate_2030 DECIMAL(5, 2), -- Objectif 2030
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rural_plans_region ON rural_electrification_plans(region);
CREATE INDEX idx_rural_plans_status ON rural_electrification_plans(current_status);

-- 4. Table pour l'audit de performance des zones
CREATE TABLE IF NOT EXISTS zone_performance_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(100) NOT NULL,
    audit_period_start DATE NOT NULL,
    audit_period_end DATE NOT NULL,
    revenue_collected_gnf DECIMAL(18, 2) NOT NULL,
    energy_injected_kwh DECIMAL(15, 2) NOT NULL,
    energy_recovered_kwh DECIMAL(15, 2) NOT NULL,
    efficiency_percent DECIMAL(5, 2) NOT NULL, -- Rendement financier
    fraud_cases_detected INTEGER DEFAULT 0,
    iot_equipment_count INTEGER DEFAULT 0,
    alert_level VARCHAR(20) DEFAULT 'NORMAL', -- 'NORMAL', 'WARNING', 'CRITICAL'
    investigation_required BOOLEAN DEFAULT FALSE,
    investigation_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_zone_audit_zone ON zone_performance_audit(zone_name);
CREATE INDEX idx_zone_audit_period ON zone_performance_audit(audit_period_start, audit_period_end);
CREATE INDEX idx_zone_audit_alert ON zone_performance_audit(alert_level);

-- 5. Table pour l'impact social (hôpitaux, écoles, pouvoir d'achat)
CREATE TABLE IF NOT EXISTS social_impact_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    region VARCHAR(100),
    hospital_count INTEGER DEFAULT 0,
    hospitals_with_power INTEGER DEFAULT 0,
    school_count INTEGER DEFAULT 0,
    schools_with_power INTEGER DEFAULT 0,
    total_families_savings_gnf DECIMAL(18, 2) DEFAULT 0, -- Économies cumulées grâce au Mode Économie
    families_benefiting_count INTEGER DEFAULT 0,
    avg_savings_per_family_gnf DECIMAL(12, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_social_impact_date ON social_impact_metrics(metric_date);
CREATE INDEX idx_social_impact_region ON social_impact_metrics(region);

-- 6. Table pour la maintenance prédictive du réseau HT (Haute Tension)
CREATE TABLE IF NOT EXISTS network_maintenance_ht (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_name VARCHAR(255) NOT NULL, -- Nom de la ligne HT
    region VARCHAR(100) NOT NULL,
    voltage_level_kv INTEGER NOT NULL, -- 110kV, 220kV, etc.
    voltage_drop_percent DECIMAL(5, 2), -- Chute de tension détectée
    current_load_percent DECIMAL(5, 2), -- Charge actuelle
    predicted_failure_risk VARCHAR(20) DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    failure_probability_percent DECIMAL(5, 2),
    predicted_failure_date DATE,
    maintenance_priority VARCHAR(20) DEFAULT 'NORMAL', -- 'NORMAL', 'HIGH', 'URGENT', 'NATIONAL_PRIORITY'
    maintenance_cost_estimated_gnf DECIMAL(18, 2),
    maintenance_scheduled_date DATE,
    maintenance_completed_date DATE,
    weather_impact_factor DECIMAL(5, 2), -- Impact conditions climatiques
    age_years INTEGER,
    last_maintenance_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_network_ht_line ON network_maintenance_ht(line_name);
CREATE INDEX idx_network_ht_risk ON network_maintenance_ht(predicted_failure_risk);
CREATE INDEX idx_network_ht_priority ON network_maintenance_ht(maintenance_priority);
CREATE INDEX idx_network_ht_region ON network_maintenance_ht(region);

-- 7. Table pour les alertes de black-out national
CREATE TABLE IF NOT EXISTS national_blackout_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_level VARCHAR(20) NOT NULL, -- 'WARNING', 'CRITICAL', 'IMMINENT'
    affected_lines TEXT[], -- Array de noms de lignes
    estimated_impact_population INTEGER,
    estimated_impact_regions TEXT[],
    estimated_duration_hours DECIMAL(5, 2),
    emergency_funds_required_gnf DECIMAL(18, 2),
    funds_approved BOOLEAN DEFAULT FALSE,
    funds_approved_date TIMESTAMP,
    mitigation_actions TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blackout_alerts_level ON national_blackout_alerts(alert_level);
CREATE INDEX idx_blackout_alerts_resolved ON national_blackout_alerts(resolved);

-- 8. Table pour les rapports ministériels automatisés
CREATE TABLE IF NOT EXISTS ministerial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number VARCHAR(50) UNIQUE NOT NULL, -- Format: RPT-ETAT-YYYYMMDD-0001
    report_type VARCHAR(50) NOT NULL, -- 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'SPECIALIZED'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    report_data JSONB NOT NULL, -- Données agrégées du rapport
    generated_by UUID REFERENCES users(id),
    file_path VARCHAR(500), -- Chemin vers le PDF généré
    file_size_bytes BIGINT,
    status VARCHAR(20) DEFAULT 'GENERATED', -- 'GENERATED', 'APPROVED', 'ARCHIVED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ministerial_reports_type ON ministerial_reports(report_type);
CREATE INDEX idx_ministerial_reports_period ON ministerial_reports(period_start, period_end);
CREATE INDEX idx_ministerial_reports_status ON ministerial_reports(status);

-- Fonction pour générer le numéro de rapport
CREATE OR REPLACE FUNCTION generate_ministerial_report_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    today DATE := CURRENT_DATE;
    date_str VARCHAR(8) := TO_CHAR(today, 'YYYYMMDD');
    seq_num INTEGER;
    report_num VARCHAR(50);
BEGIN
    -- Compter les rapports du jour
    SELECT COALESCE(COUNT(*), 0) + 1 INTO seq_num
    FROM ministerial_reports
    WHERE DATE(created_at) = today;
    
    report_num := 'RPT-ETAT-' || date_str || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN report_num;
END;
$$ LANGUAGE plpgsql;

-- Vue pour les statistiques de souveraineté énergétique
CREATE OR REPLACE VIEW v_energy_sovereignty AS
SELECT 
    DATE_TRUNC('month', ep.purchase_date) as month,
    ep.source_type,
    SUM(ep.energy_kwh) as total_energy_kwh,
    SUM(ep.cost_gnf) as total_cost_gnf,
    -- Calculer la part solaire vs thermique
    CASE 
        WHEN ep.source_type = 'HYDRO' THEN 'RENEWABLE'
        WHEN ep.source_type IN ('OMVG', 'WAPP', 'THERMAL') THEN 'IMPORTED'
        ELSE 'OTHER'
    END as energy_category
FROM energy_purchases ep
GROUP BY DATE_TRUNC('month', ep.purchase_date), ep.source_type;

-- Vue pour le classement des zones par rendement
CREATE OR REPLACE VIEW v_zone_efficiency_ranking AS
SELECT 
    zone_name,
    efficiency_percent,
    revenue_collected_gnf,
    energy_injected_kwh,
    energy_recovered_kwh,
    alert_level,
    ROW_NUMBER() OVER (ORDER BY efficiency_percent DESC) as efficiency_rank
FROM zone_performance_audit
WHERE audit_period_end >= CURRENT_DATE - INTERVAL '1 month'
ORDER BY efficiency_percent DESC;

COMMENT ON TABLE energy_purchases IS 'Achats d''énergie (Interconnexion, Centrales thermiques)';
COMMENT ON TABLE hydro_dams IS 'Données des barrages hydroélectriques en temps réel';
COMMENT ON TABLE rural_electrification_plans IS 'Planification de l''électrification rurale';
COMMENT ON TABLE zone_performance_audit IS 'Audit de performance des zones de distribution';
COMMENT ON TABLE social_impact_metrics IS 'Métriques d''impact social (hôpitaux, écoles, pouvoir d''achat)';
COMMENT ON TABLE network_maintenance_ht IS 'Maintenance prédictive du réseau Haute Tension';
COMMENT ON TABLE national_blackout_alerts IS 'Alertes de risque de black-out national';
COMMENT ON TABLE ministerial_reports IS 'Rapports ministériels automatisés';
