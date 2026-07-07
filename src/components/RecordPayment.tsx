import { useEffect, useState } from 'react';
import { ArrowLeft, Search, DollarSign, User, Check, Receipt, Printer, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { LoanMember } from '../types';

interface Props {
  onNavigate: (view: string, memberId?: string) => void;
}

interface PaymentReceipt {
  member: LoanMember;
  amount: number;
  newBalance: number;
  description: string;
  referenceId: string;
  timestamp: Date;
}

export default function RecordPayment({ onNavigate }: Props) {
  const [members, setMembers] = useState<LoanMember[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<LoanMember | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentReceipt | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const { data, error } = await supabase
        .from('loan_members')
        .select('*')
        .eq('status', 'active')
        .gt('outstanding_balance', 0)
        .order('name', { ascending: true });

      if (error) throw error;
      setMembers((data || []) as LoanMember[]);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredMembers = members.filter(
    m =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.member_id.toLowerCase().includes(search.toLowerCase()) ||
      (m.phone && m.phone.includes(search))
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMember) return;

    const paymentAmount = parseFloat(amount);
    const currentBalance = Number(selectedMember.outstanding_balance);

    // Validate payment amount doesn't exceed balance
    if (paymentAmount > currentBalance) {
      alert(`Payment amount (Rs. ${paymentAmount.toLocaleString()}) exceeds outstanding balance (Rs. ${currentBalance.toLocaleString()}). Please adjust the amount.`);
      return;
    }

    setSubmitting(true);
    try {
      const newBalance = currentBalance - paymentAmount;

      // Create the payment transaction
      const { error: txError } = await supabase.from('loan_transactions').insert({
        member_id: selectedMember.id,
        transaction_type: 'payment',
        amount: paymentAmount,
        description: description || 'Payment received',
        reference_id: referenceId || null,
        balance_after: newBalance,
      });

      if (txError) throw txError;

      // Update the member's outstanding balance
      const { error: memberError } = await supabase
        .from('loan_members')
        .update({ outstanding_balance: newBalance })
        .eq('id', selectedMember.id);

      if (memberError) throw memberError;

      // Show payment receipt
      setPaymentReceipt({
        member: selectedMember,
        amount: paymentAmount,
        newBalance: newBalance,
        description: description || 'Payment received',
        referenceId: referenceId,
        timestamp: new Date(),
      });

      // Reset form
      setSelectedMember(null);
      setAmount('');
      setDescription('');
      setReferenceId('');
      loadMembers(); // Refresh member data
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function printReceipt() {
    window.print();
  }

  function closeReceiptAndNew() {
    setPaymentReceipt(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  // Show payment receipt
  if (paymentReceipt) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none">
          {/* Receipt Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white text-center print:bg-white print:text-slate-900">
            <div className="flex items-center justify-center gap-2 mb-2 print:justify-center">
              <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center print:bg-green-100">
                <Receipt className="h-6 w-6 print:text-green-600" />
              </div>
              <span className="text-xl font-bold">Royal Rich</span>
            </div>
            <p className="text-green-100 text-sm print:text-slate-600">Fashion Boutique POS</p>
          </div>

          {/* Success Badge */}
          <div className="bg-green-50 p-4 border-b border-slate-200 print:hidden">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-6 w-6" />
              </div>
              <span className="text-lg font-semibold">Payment Recorded!</span>
            </div>
          </div>

          {/* Receipt Details */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Date:</span>
              <span className="text-slate-900">{paymentReceipt.timestamp.toLocaleDateString()} {paymentReceipt.timestamp.toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Member:</span>
              <span className="font-semibold text-slate-900">{paymentReceipt.member.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Member ID:</span>
              <span className="text-amber-600 font-medium">{paymentReceipt.member.member_id}</span>
            </div>
            {paymentReceipt.referenceId && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-mono text-slate-900">{paymentReceipt.referenceId}</span>
              </div>
            )}

            <div className="border-t border-dashed border-slate-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Description:</span>
                <span className="text-slate-600">{paymentReceipt.description}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Amount Received:</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-600">
                    +Rs. {paymentReceipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Payment Method:</span>
                <span className="text-slate-600">Cash/Other</span>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="flex justify-between items-center">
                <span className="text-green-700 font-medium">New Outstanding Balance:</span>
                <span className="text-xl font-bold text-green-600">
                  Rs. {paymentReceipt.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {paymentReceipt.newBalance === 0 && (
                <p className="text-xs text-green-600 mt-1 text-right font-medium">
                  Account fully cleared!
                </p>
              )}
            </div>

            {paymentReceipt.newBalance > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Remaining credit limit:</span>
                  <span className="text-slate-900">
                    Rs. {(Number(paymentReceipt.member.credit_limit) - paymentReceipt.newBalance).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 pt-0 print:hidden">
            <div className="flex gap-3">
              <button
                onClick={printReceipt}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={closeReceiptAndNew}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold"
              >
                New Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('dashboard')}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Record Payment</h1>
          <p className="text-slate-600 mt-1">Collect payment from loan members</p>
        </div>
      </div>

      {!selectedMember ? (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search members with outstanding balance..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white shadow-sm text-lg"
            />
          </div>

          <p className="text-slate-600">
            Showing {filteredMembers.length} members with outstanding balance
          </p>

          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <DollarSign className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">No members with outstanding balance</p>
              <p className="text-sm text-slate-300 mt-1">All accounts are up to date!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map(member => {
                const balance = Number(member.outstanding_balance);
                const limit = Number(member.credit_limit);
                const isOverLimit = balance > limit;
                const utilization = limit > 0 ? (balance / limit) * 100 : 0;

                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-amber-300 transition-all text-left group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isOverLimit ? 'bg-red-100' : 'bg-amber-100'}`}>
                          <User className={`h-6 w-6 ${isOverLimit ? 'text-red-600' : 'text-amber-600'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{member.name}</p>
                          <p className="text-sm text-amber-600">{member.member_id}</p>
                        </div>
                      </div>
                    </div>
                    {member.phone && (
                      <p className="text-sm text-slate-500 mb-3">{member.phone}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-sm text-slate-500">Outstanding:</span>
                        <span className={`font-bold text-lg ${isOverLimit ? 'text-red-600' : 'text-slate-900'}`}>
                          Rs. {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${isOverLimit ? 'bg-red-500' : utilization > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                    </div>
                    {isOverLimit && (
                      <span className="inline-flex items-center gap-1 mt-3 px-2 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full">
                        Over Credit Limit
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Member Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedMember.name}</h2>
                    <p className="text-amber-100">{selectedMember.member_id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Balance Info */}
            <div className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Current Outstanding Balance</p>
                  <p className="text-3xl font-bold text-red-600">
                    Rs. {Number(selectedMember.outstanding_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Credit Limit</p>
                  <p className="text-lg font-semibold text-slate-700">
                    Rs. {Number(selectedMember.credit_limit).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Amount (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={Number(selectedMember.outstanding_balance).toString()}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    className="w-full px-4 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
                    placeholder="0.00"
                  />
                  {parseFloat(amount) > Number(selectedMember.outstanding_balance) && (
                    <p className="text-sm text-red-600 mt-1">
                      Amount exceeds outstanding balance
                    </p>
                  )}
                  <div className="flex justify-between mt-3 gap-2">
                    <button type="button" onClick={() => setAmount((Number(selectedMember.outstanding_balance) * 0.25).toFixed(2))} className="flex-1 px-3 py-2 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">25%</button>
                    <button type="button" onClick={() => setAmount((Number(selectedMember.outstanding_balance) * 0.5).toFixed(2))} className="flex-1 px-3 py-2 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">50%</button>
                    <button type="button" onClick={() => setAmount((Number(selectedMember.outstanding_balance) * 0.75).toFixed(2))} className="flex-1 px-3 py-2 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">75%</button>
                    <button type="button" onClick={() => setAmount(Number(selectedMember.outstanding_balance).toFixed(2))} className="flex-1 px-3 py-2 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium">Full</button>
                  </div>
                </div>

                {amount && parseFloat(amount) > 0 && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700 font-medium">Balance after payment:</span>
                      <span className="text-xl font-bold text-green-600">
                        Rs. {Math.max(0, Number(selectedMember.outstanding_balance) - parseFloat(amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Notes</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Cash, Bank transfer, UPI, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Receipt Number (Optional)</label>
                  <input
                    type="text"
                    value={referenceId}
                    onChange={e => setReferenceId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Manual receipt number"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedMember(null)}
                    className="flex-1 px-4 py-3.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || parseFloat(amount) > Number(selectedMember.outstanding_balance)}
                    className="flex-1 px-4 py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        Record Payment
                      </>
                    )}
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
