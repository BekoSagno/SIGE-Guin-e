-- Migration: Ajout du système de rapports pour les tâches
-- Date: 2025-01-21

-- Table des rapports de tâches
CREATE TABLE IF NOT EXISTS task_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number VARCHAR(50) UNIQUE NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- DAILY, WEEKLY, MONTHLY, CUSTOM, TASK_COMPLETION
    period_start DATE,
    period_end DATE,
    task_type VARCHAR(50), -- INCIDENT, AUDIT, MAINTENANCE, INSPECTION, ALL
    status_filter VARCHAR(50), -- COMPLETED, IN_PROGRESS, ALL
    priority_filter VARCHAR(50), -- URGENT, HIGH, MEDIUM, LOW, ALL
    assigned_to_filter UUID REFERENCES users(id), -- NULL = tous les agents
    zone_filter VARCHAR(100), -- NULL = toutes les zones
    generated_by UUID REFERENCES users(id) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Données du rapport (JSON)
    report_data JSONB NOT NULL,
    
    -- Métadonnées
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    in_progress_tasks INTEGER DEFAULT 0,
    pending_tasks INTEGER DEFAULT 0,
    avg_completion_time DECIMAL(10, 2), -- en minutes
    total_incidents INTEGER DEFAULT 0,
    total_audits INTEGER DEFAULT 0,
    total_maintenance INTEGER DEFAULT 0,
    total_inspections INTEGER DEFAULT 0,
    
    -- Export
    exported_at TIMESTAMP,
    export_format VARCHAR(20), -- PDF, EXCEL, JSON
    export_file_path VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_task_reports_type ON task_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_task_reports_period ON task_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_task_reports_generated_by ON task_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_task_reports_generated_at ON task_reports(generated_at DESC);

-- Vue pour les statistiques de rapports
CREATE OR REPLACE VIEW v_task_reports_stats AS
SELECT 
    report_type,
    COUNT(*) as total_reports,
    COUNT(DISTINCT generated_by) as total_generators,
    MAX(generated_at) as last_generated,
    SUM(total_tasks) as total_tasks_reported,
    AVG(avg_completion_time) as avg_completion_time_all
FROM task_reports
GROUP BY report_type;

-- Fonction pour générer un numéro de rapport unique
CREATE OR REPLACE FUNCTION generate_report_number(report_type_var VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR(10);
    date_part VARCHAR(8);
    seq_num INTEGER;
    report_num VARCHAR(50);
BEGIN
    -- Déterminer le préfixe selon le type
    CASE report_type_var
        WHEN 'DAILY' THEN prefix := 'RPT-DAILY';
        WHEN 'WEEKLY' THEN prefix := 'RPT-WEEK';
        WHEN 'MONTHLY' THEN prefix := 'RPT-MONTH';
        WHEN 'CUSTOM' THEN prefix := 'RPT-CUSTOM';
        WHEN 'TASK_COMPLETION' THEN prefix := 'RPT-TASK';
        ELSE prefix := 'RPT';
    END CASE;
    
    -- Date au format YYYYMMDD
    date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Séquence du jour
    SELECT COALESCE(MAX(CAST(SUBSTRING(report_number FROM LENGTH(report_number) - 3) AS INTEGER)), 0) + 1
    INTO seq_num
    FROM task_reports
    WHERE report_number LIKE prefix || '-' || date_part || '-%';
    
    -- Générer le numéro
    report_num := prefix || '-' || date_part || '-' || LPAD(seq_num::TEXT, 4, '0');
    
    RETURN report_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE task_reports IS 'Rapports générés pour les tâches EDG';
COMMENT ON COLUMN task_reports.report_data IS 'Données JSON du rapport (tâches, statistiques, graphiques)';
COMMENT ON COLUMN task_reports.export_file_path IS 'Chemin du fichier exporté (PDF/Excel) si disponible';
