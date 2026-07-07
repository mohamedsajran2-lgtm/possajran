import { useEffect, useState } from 'react';
import { ArrowLeft, User, Phone, MapPin, CreditCard, DollarSign, Calendar, Plus, Printer, Receipt, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { LoanMember, LoanTransaction } from '../types';

interface Props {
  memberId: string;
  onNavigate: (view: string, memberId?: string) => void;
}

interface TransactionReceipt {
  type: 'payment' | 'credit_sale';
  member: LoanMember;
  amount: number;
  newBalance: number;
  description: string;
  timestamp: Date;
}

export default function MemberDetail({ memberId, onNavigate }: Props) {
  const [member, setMember] = useState<LoanMember | null>(null);
  const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);

  useEffect(() => {
    loadMemberData();
  }, [memberId]);

  async function loadMemberData() {
    try {
      const [memberResult, transactionsResult] = await Promise.all([
        supabase.from('loan_members').select('*').eq('id', memberId).single(),
        supabase
          .from('loan_transactions')
          .select('*')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (memberResult.data) setMember(memberResult.data as LoanMember);
      if (transactionsResult.data) setTransactions(transactionsResult.data as LoanTransaction[]);
    } catch (error) {
      console.error('Error loading member data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;

    const paymentAmount = parseFloat(amount);
    const currentBalance = Number(member.outstanding_balance);

    if (paymentAmount > currentBalance) {
      alert(`Payment exceeds outstanding balance. Maximum: Rs. ${currentBalance.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    try {
      const newBalance = currentBalance - paymentAmount;

      await supabase.from('loan_transactions').insert({
        member_id: member.id,
        transaction_type: 'payment',
        amount: paymentAmount,
        description: description || 'Payment received',
        reference_id: referenceId || null,
        balance_after: newBalance,
      });

      await supabase.from('loan_members').update({ outstanding_balance: newBalance }).eq('id', member.id);

      // Show receipt
      setReceipt({
        type: 'payment',
        member: member,
        amount: paymentAmount,
        newBalance: newBalance,
        description: description || 'Payment received',
        timestamp: new Date(),
      });

      setShowPaymentForm(false);
      setAmount('');
      setDescription('');
      setReferenceId('');
      loadMemberData();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreditSale(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;

    const saleAmount = parseFloat(amount);
    const newBalance = Number(member.outstanding_balance) + saleAmount;
    const creditLimit = Number(member.credit_limit);

    if (newBalance > creditLimit) {
      const proceed = confirm(
        `This sale will exceed credit limit.\n\n` +
        `New balance: Rs. ${newBalance.toLocaleString()}\n` +
        `Credit limit: Rs. ${creditLimit.toLocaleString()}\n\n` +
        `Proceed anyway?`
      );
      if (!proceed) return;
    }

    setSubmitting(true);
    try {
      await supabase.from('loan_transactions').insert({
        member_id: member.id,
        transaction_type: 'credit_sale',
        amount: saleAmount,
        description: description || 'Credit sale',
        reference_id: referenceId || null,
        balance_after: newBalance,
      });

      await supabase.from('loan_members').update({ outstanding_balance: newBalance }).eq('id', member.id);

      setReceipt({
        type: 'credit_sale',
        member: member,
        amount: saleAmount,
        newBalance: newBalance,
        description: description || 'Credit sale',
        timestamp: new Date(),
      });

      setShowCreditForm(false);
      setAmount('');
      setDescription('');
      setReferenceId('');
      loadMemberData();
    } catch (error) {
      console.error('Error recording credit sale:', error);
      alert('Failed to record credit sale. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Member not found</p>
        <button onClick={() => onNavigate('loan-members')} className="mt-4 text-amber-600 hover:text-amber-700">
          Back to Members
        </button>
      </div>
    );
  }

  const balance = Number(member.outstanding_balance);
  const limit = Number(member.credit_limit);
  const utilization = limit > 0 ? (balance / limit) * 100 : 0;
  const isOverLimit = balance > limit;
  const availableCredit = Math.max(0, limit - balance);

  // Show receipt after transaction
  if (receipt) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none">
          {/* Receipt Header */}
          <div className={`${receipt.type === 'payment' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-amber-500 to-amber-600'} p-6 text-white text-center print:bg-white print:text-slate-900`}>
            <div className="flex items-center justify-center gap-2 mb-2 print:justify-center">
              <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center print:bg-slate-100">
                <Receipt className="h-6 w-6 print:text-amber-600" />
              </div>
              <span className="text-xl font-bold">Royal Rich</span>
            </div>
            <p className="text-white/80 text-sm print:text-slate-600">Fashion Boutique POS</p>
          </div>

          {/* Success Badge */}
          <div className={`${receipt.type === 'payment' ? 'bg-green-50' : 'bg-amber-50'} p-4 border-b border-slate-200 print:hidden`}>
            <div className="flex items-center justify-center gap-2 text-slate-900">
              <div className={`h-10 w-10 ${receipt.type === 'payment' ? 'bg-green-100' : 'bg-amber-100'} rounded-full flex items-center justify-center`}>
                <Check className={`h-6 w-6 ${receipt.type === 'payment' ? 'text-green-600' : 'text-amber-600'}`} />
              </div>
              <span className="text-lg font-semibold">
                {receipt.type === 'payment' ? 'Payment Recorded!' : 'Credit Sale Recorded!'}
              </span>
            </div>
          </div>

          {/* Receipt Details */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Date:</span>
              <span className="text-slate-900">{receipt.timestamp.toLocaleDateString()} {receipt.timestamp.toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Member:</span>
              <span className="font-semibold text-slate-900">{receipt.member.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Member ID:</span>
              <span className="text-amber-600 font-medium">{receipt.member.member_id}</span>
            </div>

            <div className="border-t border-dashed border-slate-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Description:</span>
                <span className="text-slate-600">{receipt.description}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">
                  {receipt.type === 'payment' ? 'Amount Received:' : 'Sale Amount:'}
                </span>
                <span className={`text-2xl font-bold ${receipt.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                  {receipt.type === 'payment' ? '+' : ''}Rs. {receipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className={`${receipt.type === 'payment' ? 'bg-green-50' : 'bg-red-50'} rounded-xl p-4 border ${receipt.type === 'payment' ? 'border-green-100' : 'border-red-100'}`}>
              <div className="flex justify-between items-center">
                <span className={`font-medium ${receipt.type === 'payment' ? 'text-green-700' : 'text-red-700'}`}>
                  New Outstanding Balance:
                </span>
                <span className={`text-xl font-bold ${receipt.newBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Rs. {receipt.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {receipt.newBalance === 0 && receipt.type === 'payment' && (
                <p className="text-xs text-green-600 mt-1 text-right font-medium">Account fully cleared!</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 pt-0 print:hidden">
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={() => setReceipt(null)}
                className={`flex-1 px-4 py-3 ${receipt.type === 'payment' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-amber-500 to-amber-600'} text-white rounded-xl font-semibold`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => onNavigate('loan-members')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Members</span>
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{member.name}</h1>
                <p className="text-amber-100">{member.member_id}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentForm(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-amber-600 rounded-xl hover:bg-amber-50 transition-colors font-semibold flex items-center gap-2 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Payment
              </button>
              <button
                onClick={() => setShowCreditForm(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors font-medium flex items-center gap-2 backdrop-blur-sm"
              >
                <Plus className="h-4 w-4" />
                Credit Sale
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {member.phone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-5 w-5 text-slate-400" />
                <span>{member.phone}</span>
              </div>
            )}
            {member.address && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-5 w-5 text-slate-400" />
                <span>{member.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="h-5 w-5 text-slate-400" />
              <span>Member since {new Date(member.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Credit Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <CreditCard className="h-4 w-4" />
                Credit Limit
              </div>
              <p className="text-2xl font-bold text-slate-900">
                Rs. {limit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`rounded-xl p-5 ${isOverLimit ? 'bg-red-50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <DollarSign className="h-4 w-4" />
                Outstanding Balance
              </div>
              <p className={`text-2xl font-bold ${isOverLimit ? 'text-red-600' : 'text-slate-900'}`}>
                Rs. {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`rounded-xl p-5 ${availableCredit === 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <CreditCard className="h-4 w-4" />
                Available Credit
              </div>
              <p className={`text-2xl font-bold ${availableCredit === 0 ? 'text-red-600' : 'text-green-600'}`}>
                Rs. {availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Utilization Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Credit Utilization</span>
              <span className={`text-sm font-bold ${isOverLimit ? 'text-red-600' : 'text-slate-900'}`}>
                {utilization.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all ${isOverLimit ? 'bg-red-500' : utilization > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
          <button
            onClick={() => onNavigate('statement', member.id)}
            className="flex items-center gap-2 text-amber-600 hover:text-amber-700 text-sm font-medium"
          >
            <Printer className="h-4 w-4" />
            View Full Statement
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <DollarSign className="h-12 w-12 mx-auto mb-2 text-slate-200" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map(tx => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {tx.transaction_type === 'payment' ? 'Payment Received' : 'Credit Sale'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {tx.description} - {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                  {tx.invoice_number && (
                    <p className="text-xs text-amber-600">Invoice: {tx.invoice_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${tx.transaction_type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.transaction_type === 'payment' ? '-' : '+'}Rs. {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-400">
                    Bal: Rs. {tx.balance_after.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Record Payment</h2>
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance.toString()}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="0.00"
                  />
                  <div className="flex justify-between mt-2">
                    <button type="button" onClick={() => setAmount((balance * 0.25).toFixed(2))} className="text-xs text-amber-600 hover:text-amber-700">25%</button>
                    <button type="button" onClick={() => setAmount((balance * 0.5).toFixed(2))} className="text-xs text-amber-600 hover:text-amber-700">50%</button>
                    <button type="button" onClick={() => setAmount((balance * 0.75).toFixed(2))} className="text-xs text-amber-600 hover:text-amber-700">75%</button>
                    <button type="button" onClick={() => setAmount(balance.toFixed(2))} className="text-xs text-amber-600 hover:text-amber-700">Full</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Payment notes..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Receipt No. (Optional)</label>
                  <input
                    type="text"
                    value={referenceId}
                    onChange={e => setReferenceId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Reference number"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentForm(false);
                      setAmount('');
                      setDescription('');
                      setReferenceId('');
                    }}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Credit Sale Modal */}
      {showCreditForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Record Credit Sale</h2>
              <form onSubmit={handleCreditSale} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Items purchased..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Invoice No. (Optional)</label>
                  <input
                    type="text"
                    value={referenceId}
                    onChange={e => setReferenceId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Invoice number"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreditForm(false);
                      setAmount('');
                      setDescription('');
                      setReferenceId('');
                    }}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all font-semibold disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : 'Record Sale'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
