-- =====================================================
-- SIGE-Guinée - Migration: Gestion Personnel EDG & RBAC
-- Version: 3.0
-- Date: 2025-01-21
-- =====================================================

-- Extension des rôles pour inclure les sous-rôles EDG
-- Note: On garde le champ role existant mais on ajoute un champ edg_subrole

-- Ajouter le champ edg_subrole à la table users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'edg_subrole') THEN
        ALTER TABLE users ADD COLUMN edg_subrole VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'telephone') THEN
        ALTER TABLE users ADD COLUMN telephone VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'zone_assigned') THEN
        ALTER TABLE users ADD COLUMN zone_assigned VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'supervisor_id') THEN
        ALTER TABLE users ADD COLUMN supervisor_id UUID REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'status') THEN
        ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'last_location_lat') THEN
        ALTER TABLE users ADD COLUMN last_location_lat DECIMAL(10, 6);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'last_location_lng') THEN
        ALTER TABLE users ADD COLUMN last_location_lng DECIMAL(10, 6);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'last_location_update') THEN
        ALTER TABLE users ADD COLUMN last_location_update TIMESTAMP;
    END IF;
END $$;

-- Table des tâches assignées aux agents
CREATE TABLE IF NOT EXISTS assigned_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_number VARCHAR(50) UNIQUE NOT NULL,
    incident_id UUID REFERENCES incidents(id),
    audit_ticket_id UUID REFERENCES audit_tickets(id),
    task_type VARCHAR(50) NOT NULL, -- INCIDENT, AUDIT, MAINTENANCE, INSPECTION
    priority VARCHAR(50) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED
    assigned_to UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP,
    accepted_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    location_lat DECIMAL(10, 6),
    location_lng DECIMAL(10, 6),
    location_address VARCHAR(255),
    description TEXT,
    completion_photo_url VARCHAR(500),
    completion_report TEXT,
    estimated_duration INTEGER, -- en minutes
    actual_duration INTEGER, -- en minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assigned_tasks_status ON assigned_tasks(status);
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_assigned_to ON assigned_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_type ON assigned_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_priority ON assigned_tasks(priority);

-- Table des permissions RBAC
CREATE TABLE IF NOT EXISTS edg_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50), -- PERSONNEL, INCIDENTS, FRAUD, MAINTENANCE, BILLING, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison entre rôles et permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL, -- AGENT_EDG
    edg_subrole VARCHAR(50), -- ADMIN_SYSTEME, SUPERVISEUR_ZONE, AGENT_TERRAIN
    permission_id UUID REFERENCES edg_permissions(id),
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, edg_subrole, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role, edg_subrole);

-- Table des audit logs (traçabilité complète)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(100) NOT NULL, -- CREATE_USER, ASSIGN_TASK, TRIGGER_LOADSHEADING, etc.
    resource_type VARCHAR(100), -- USER, TASK, INCIDENT, TRANSFORMER, etc.
    resource_id UUID,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB, -- Données supplémentaires
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at DESC);

-- Table des notifications pour les agents
CREATE TABLE IF NOT EXISTS agent_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    task_id UUID REFERENCES assigned_tasks(id),
    notification_type VARCHAR(50) NOT NULL, -- TASK_ASSIGNED, TASK_UPDATED, SYSTEM_ALERT, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    priority VARCHAR(50) DEFAULT 'INFO', -- INFO, WARNING, URGENT
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_notifications_user ON agent_notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_task ON agent_notifications(task_id);

-- Table des performances des agents (statistiques)
CREATE TABLE IF NOT EXISTS agent_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    tasks_completed INTEGER DEFAULT 0,
    tasks_on_time INTEGER DEFAULT 0,
    tasks_late INTEGER DEFAULT 0,
    average_completion_time DECIMAL(10, 2), -- en minutes
    response_time_avg DECIMAL(10, 2), -- temps moyen de réponse en minutes
    rating DECIMAL(3, 2), -- Note sur 5.00
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_agent_performance_user ON agent_performance(user_id, period_start DESC);

-- Insérer les permissions de base
INSERT INTO edg_permissions (id, permission_name, description, category) VALUES
    (gen_random_uuid(), 'personnel.create', 'Créer un compte employé', 'PERSONNEL'),
    (gen_random_uuid(), 'personnel.update', 'Modifier un compte employé', 'PERSONNEL'),
    (gen_random_uuid(), 'personnel.delete', 'Supprimer/révoquer un compte', 'PERSONNEL'),
    (gen_random_uuid(), 'personnel.view_all', 'Voir tous les employés', 'PERSONNEL'),
    (gen_random_uuid(), 'task.assign', 'Assigner des tâches', 'TASKS'),
    (gen_random_uuid(), 'task.view_all', 'Voir toutes les tâches', 'TASKS'),
    (gen_random_uuid(), 'task.update_status', 'Mettre à jour le statut d''une tâche', 'TASKS'),
    (gen_random_uuid(), 'incident.view_all', 'Voir tous les incidents', 'INCIDENTS'),
    (gen_random_uuid(), 'incident.resolve', 'Résoudre un incident', 'INCIDENTS'),
    (gen_random_uuid(), 'fraud.audit', 'Créer des tickets d''audit fraude', 'FRAUD'),
    (gen_random_uuid(), 'loadshedding.trigger', 'Déclencher un délestage', 'GRID'),
    (gen_random_uuid(), 'maintenance.schedule', 'Planifier une maintenance', 'MAINTENANCE'),
    (gen_random_uuid(), 'broadcast.send', 'Envoyer des messages aux usagers', 'COMMUNICATION'),
    (gen_random_uuid(), 'reconciliation.run', 'Lancer une réconciliation', 'FRAUD'),
    (gen_random_uuid(), 'dashboard.view_analytics', 'Voir les analytics avancés', 'ANALYTICS')
ON CONFLICT (permission_name) DO NOTHING;

-- Assigner les permissions par défaut selon les rôles
-- ADMIN_SYSTEME : Toutes les permissions
-- SUPERVISEUR_ZONE : Gestion tâches, incidents, fraud, maintenance, broadcast
-- AGENT_TERRAIN : Voir ses tâches, mettre à jour statut, résoudre incidents

DO $$
DECLARE
    admin_sys_perms UUID[];
    supervisor_perms UUID[];
    agent_perms UUID[];
BEGIN
    -- Permissions ADMIN_SYSTEME (toutes)
    SELECT ARRAY_AGG(id) INTO admin_sys_perms FROM edg_permissions;
    
    -- Permissions SUPERVISEUR_ZONE
    SELECT ARRAY_AGG(id) INTO supervisor_perms 
    FROM edg_permissions 
    WHERE permission_name IN (
        'personnel.view_all', 'task.assign', 'task.view_all', 'task.update_status',
        'incident.view_all', 'incident.resolve', 'fraud.audit', 'loadshedding.trigger',
        'maintenance.schedule', 'broadcast.send', 'reconciliation.run', 'dashboard.view_analytics'
    );
    
    -- Permissions AGENT_TERRAIN
    SELECT ARRAY_AGG(id) INTO agent_perms 
    FROM edg_permissions 
    WHERE permission_name IN (
        'task.update_status', 'incident.resolve'
    );
    
    -- Insérer les permissions pour ADMIN_SYSTEME
    INSERT INTO role_permissions (role, edg_subrole, permission_id, granted)
    SELECT 'AGENT_EDG', 'ADMIN_SYSTEME', unnest(admin_sys_perms), TRUE
    ON CONFLICT DO NOTHING;
    
    -- Insérer les permissions pour SUPERVISEUR_ZONE
    INSERT INTO role_permissions (role, edg_subrole, permission_id, granted)
    SELECT 'AGENT_EDG', 'SUPERVISEUR_ZONE', unnest(supervisor_perms), TRUE
    ON CONFLICT DO NOTHING;
    
    -- Insérer les permissions pour AGENT_TERRAIN
    INSERT INTO role_permissions (role, edg_subrole, permission_id, granted)
    SELECT 'AGENT_EDG', 'AGENT_TERRAIN', unnest(agent_perms), TRUE
    ON CONFLICT DO NOTHING;
END $$;

-- Mettre à jour les utilisateurs existants avec AGENT_EDG pour leur donner un sous-rôle par défaut
UPDATE users 
SET edg_subrole = 'SUPERVISEUR_ZONE', status = 'ACTIVE'
WHERE role = 'AGENT_EDG' AND edg_subrole IS NULL;

-- Ajouter un champ assigned_to aux incidents pour l'assignation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incidents' 
                   AND column_name = 'assigned_to') THEN
        ALTER TABLE incidents ADD COLUMN assigned_to UUID REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incidents' 
                   AND column_name = 'assigned_at') THEN
        ALTER TABLE incidents ADD COLUMN assigned_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incidents' 
                   AND column_name = 'assigned_by') THEN
        ALTER TABLE incidents ADD COLUMN assigned_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Migration Gestion Personnel EDG terminée avec succès!';
END $$;
