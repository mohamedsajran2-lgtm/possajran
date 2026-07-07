-- Loan Members Table
CREATE TABLE IF NOT EXISTS loan_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  outstanding_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Transactions Table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES loan_members(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_sale', 'payment')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  reference_id TEXT,
  balance_after DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loan_members_name ON loan_members(name);
CREATE INDEX IF NOT EXISTS idx_loan_members_phone ON loan_members(phone);
CREATE INDEX IF NOT EXISTS idx_loan_members_member_id ON loan_members(member_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_member_id ON credit_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- Enable RLS
ALTER TABLE loan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loan_members
CREATE POLICY "select_loan_members" ON loan_members FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_loan_members" ON loan_members FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_loan_members" ON loan_members FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_loan_members" ON loan_members FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for credit_transactions
CREATE POLICY "select_credit_transactions" ON credit_transactions FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_credit_transactions" ON credit_transactions FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_credit_transactions" ON credit_transactions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_credit_transactions" ON credit_transactions FOR DELETE
  TO authenticated USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for loan_members
CREATE TRIGGER update_loan_members_updated_at
  BEFORE UPDATE ON loan_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();