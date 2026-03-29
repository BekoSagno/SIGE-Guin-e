-- =====================================================
-- SIGE-Guinée - Migration: Factures EDG et Paiements
-- Version: 1.0
-- Date: 2026-01-29
-- Description: Ajoute les tables pour les factures EDG et les paiements
-- =====================================================

-- Table EDGBill (Factures EDG)
CREATE TABLE IF NOT EXISTS edg_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    meter_id UUID REFERENCES meters(id) ON DELETE SET NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    consumption_kwh DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tariff_per_kwh DECIMAL(10, 2) NOT NULL DEFAULT 1000, -- Tarif en GNF par kWh
    total_amount DECIMAL(15, 2) NOT NULL, -- Montant total en GNF
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PAID, OVERDUE, CANCELLED
    paid_at TIMESTAMP,
    paid_amount DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Agent EDG qui a créé la facture
    notes TEXT,
    UNIQUE(home_id, billing_period_start, billing_period_end)
);

CREATE INDEX IF NOT EXISTS idx_edg_bills_home_id ON edg_bills(home_id);
CREATE INDEX IF NOT EXISTS idx_edg_bills_status ON edg_bills(status);
CREATE INDEX IF NOT EXISTS idx_edg_bills_due_date ON edg_bills(due_date);
CREATE INDEX IF NOT EXISTS idx_edg_bills_billing_period ON edg_bills(billing_period_start, billing_period_end);

-- Table EDGPayment (Paiements des factures)
CREATE TABLE IF NOT EXISTS edg_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES edg_bills(id) ON DELETE CASCADE,
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'WALLET', -- WALLET, MOBILE_MONEY, BANK_TRANSFER, CASH
    payment_reference VARCHAR(255), -- Référence de transaction (ex: numéro Orange Money)
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED, REFUNDED
    paid_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Utilisateur qui a effectué le paiement
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Agent EDG qui a traité le paiement
    transaction_id UUID REFERENCES energy_transactions(id) ON DELETE SET NULL, -- Lien avec transaction si paiement via wallet
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_edg_payments_bill_id ON edg_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_edg_payments_home_id ON edg_payments(home_id);
CREATE INDEX IF NOT EXISTS idx_edg_payments_status ON edg_payments(status);
CREATE INDEX IF NOT EXISTS idx_edg_payments_created_at ON edg_payments(created_at);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_edg_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_edg_bills_updated_at
    BEFORE UPDATE ON edg_bills
    FOR EACH ROW
    EXECUTE FUNCTION update_edg_bills_updated_at();

CREATE TRIGGER trigger_update_edg_payments_updated_at
    BEFORE UPDATE ON edg_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_edg_bills_updated_at();

-- Commentaires
COMMENT ON TABLE edg_bills IS 'Factures EDG pour la consommation d''électricité';
COMMENT ON TABLE edg_payments IS 'Paiements des factures EDG';
COMMENT ON COLUMN edg_bills.tariff_per_kwh IS 'Tarif en GNF par kWh (défaut: 1000 GNF/kWh)';
COMMENT ON COLUMN edg_payments.payment_method IS 'Méthode de paiement: WALLET (portefeuille SIGE), MOBILE_MONEY, BANK_TRANSFER, CASH';
