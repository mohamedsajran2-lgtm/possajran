-- Rename credit_transactions to loan_transactions for clarity
ALTER TABLE credit_transactions RENAME TO loan_transactions;

-- Add new columns for POS integration
ALTER TABLE loan_transactions ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE loan_transactions ADD COLUMN IF NOT EXISTS bill_items JSONB;
ALTER TABLE loan_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'loan_member';

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1001;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num BIGINT;
BEGIN
  next_num := nextval('invoice_number_seq');
  RETURN 'INV-' || to_char(NOW(), 'YYYYMM') || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Create index for invoice_number
CREATE INDEX IF NOT EXISTS idx_loan_transactions_invoice ON loan_transactions(invoice_number);

-- Add status column to loan_members for active/inactive tracking
ALTER TABLE loan_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Function to generate member ID
CREATE OR REPLACE FUNCTION generate_member_id()
RETURNS TEXT AS $$
DECLARE
  next_num BIGINT;
BEGIN
  next_num := (SELECT COALESCE(MAX(CAST(SUBSTRING(member_id FROM 3) AS BIGINT)), 0) + 1 FROM loan_members WHERE member_id LIKE 'RR%');
  RETURN 'RR' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;