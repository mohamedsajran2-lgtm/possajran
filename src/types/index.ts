export interface LoanMember {
  id: string;
  member_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  credit_limit: number;
  outstanding_balance: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface LoanTransaction {
  id: string;
  member_id: string;
  transaction_type: 'credit_sale' | 'payment';
  amount: number;
  description: string | null;
  reference_id: string | null;
  invoice_number: string | null;
  bill_items: BillItem[] | null;
  payment_method: string;
  balance_after: number;
  created_at: string;
  member?: LoanMember;
}

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface MemberFormData {
  member_id: string;
  name: string;
  phone: string;
  address: string;
  credit_limit: number;
}

export type ViewType = 'dashboard' | 'loan-members' | 'member-detail' | 'statement' | 'due-report' | 'pos-billing' | 'payment-collection' | 'overdue-accounts' | 'collection-report';

export interface PaymentStats {
  todayTotal: number;
  todayCount: number;
  weekTotal: number;
  monthTotal: number;
}
