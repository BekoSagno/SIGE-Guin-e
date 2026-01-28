-- Migration: Système de Communication et Notifications ÉTAT-EDG
-- Date: 2025-01-20
-- Description: Tables pour notifications en temps réel et messagerie entre ÉTAT et EDG

-- 1. Table pour les notifications en temps réel
CREATE TABLE IF NOT EXISTS state_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_role VARCHAR(50) NOT NULL, -- 'ADMIN_ETAT', 'AGENT_EDG', 'ADMIN_SYSTEME'
    recipient_user_id UUID REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL, -- 'ALERT', 'INFO', 'WARNING', 'SUCCESS', 'MESSAGE'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Données supplémentaires (lien, métriques, etc.)
    read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_state_notifications_recipient ON state_notifications(recipient_role, recipient_user_id);
CREATE INDEX idx_state_notifications_read ON state_notifications(read);
CREATE INDEX idx_state_notifications_created ON state_notifications(created_at DESC);
CREATE INDEX idx_state_notifications_type ON state_notifications(notification_type);

-- 2. Table pour la messagerie ÉTAT-EDG
CREATE TABLE IF NOT EXISTS etat_edg_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_role VARCHAR(50) NOT NULL, -- 'ADMIN_ETAT' ou 'AGENT_EDG'
    recipient_role VARCHAR(50) NOT NULL, -- 'ADMIN_ETAT' ou 'AGENT_EDG'
    recipient_user_id UUID REFERENCES users(id), -- NULL = message à tous les utilisateurs du rôle
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'MESSAGE', -- 'MESSAGE', 'ALERT', 'REQUEST', 'RESPONSE'
    priority VARCHAR(20) DEFAULT 'NORMAL',
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_etat_edg_messages_sender ON etat_edg_messages(sender_id, sender_role);
CREATE INDEX idx_etat_edg_messages_recipient ON etat_edg_messages(recipient_role, recipient_user_id);
CREATE INDEX idx_etat_edg_messages_read ON etat_edg_messages(read);
CREATE INDEX idx_etat_edg_messages_created ON etat_edg_messages(created_at DESC);

-- 3. Table pour les conversations (threads de messages)
CREATE TABLE IF NOT EXISTS etat_edg_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    initiator_id UUID NOT NULL REFERENCES users(id),
    initiator_role VARCHAR(50) NOT NULL,
    participant_role VARCHAR(50) NOT NULL, -- Rôle du destinataire
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'OPEN', -- 'OPEN', 'CLOSED', 'ARCHIVED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_etat_edg_conversations_initiator ON etat_edg_conversations(initiator_id, initiator_role);
CREATE INDEX idx_etat_edg_conversations_participant ON etat_edg_conversations(participant_role);
CREATE INDEX idx_etat_edg_conversations_status ON etat_edg_conversations(status);

-- Ajouter une colonne conversation_id aux messages
ALTER TABLE etat_edg_messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES etat_edg_conversations(id);

CREATE INDEX idx_etat_edg_messages_conversation ON etat_edg_messages(conversation_id);

-- Vue pour les notifications non lues
CREATE OR REPLACE VIEW v_unread_notifications AS
SELECT 
    n.*,
    u.nom as recipient_name,
    u.email as recipient_email
FROM state_notifications n
LEFT JOIN users u ON n.recipient_user_id = u.id
WHERE n.read = FALSE
    AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
ORDER BY 
    CASE n.priority
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'NORMAL' THEN 3
        WHEN 'LOW' THEN 4
    END,
    n.created_at DESC;

-- Vue pour les conversations actives
CREATE OR REPLACE VIEW v_active_conversations AS
SELECT 
    c.*,
    u.nom as initiator_name,
    u.email as initiator_email,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_time
FROM etat_edg_conversations c
LEFT JOIN users u ON c.initiator_id = u.id
LEFT JOIN etat_edg_messages m ON m.conversation_id = c.id
WHERE c.status = 'OPEN'
GROUP BY c.id, u.nom, u.email
ORDER BY last_message_time DESC NULLS LAST;

COMMENT ON TABLE state_notifications IS 'Notifications en temps réel pour les utilisateurs ÉTAT et EDG';
COMMENT ON TABLE etat_edg_messages IS 'Messages entre le Ministère (ÉTAT) et EDG';
COMMENT ON TABLE etat_edg_conversations IS 'Conversations/threads de messages ÉTAT-EDG';
