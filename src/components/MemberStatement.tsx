import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Printer, Calendar, Filter, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { LoanMember, LoanTransaction } from '../types';

interface Props {
  memberId: string;
  onNavigate: (view: string, memberId?: string) => void;
}

export default function MemberStatement({ memberId, onNavigate }: Props) {
  const [member, setMember] = useState<LoanMember | null>(null);
  const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadStatement();
  }, [memberId, dateFrom, dateTo]);

  async function loadStatement() {
    try {
      const [memberResult, transactionsResult] = await Promise.all([
        supabase.from('loan_members').select('*').eq('id', memberId).single(),
        supabase
          .from('loan_transactions')
          .select('*')
          .eq('member_id', memberId)
          .gte('created_at', dateFrom || '1970-01-01')
          .lte('created_at', dateTo ? `${dateTo}T23:59:59` : '9999-12-31')
          .order('created_at', { ascending: false }),
      ]);

      if (memberResult.data) setMember(memberResult.data as LoanMember);
      if (transactionsResult.data) setTransactions(transactionsResult.data as LoanTransaction[]);
    } catch (error) {
      console.error('Error loading statement:', error);
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    if (!member) return;

    const headers = ['Date', 'Type', 'Description', 'Invoice', 'Debit', 'Credit', 'Balance'];
    const rows = transactions.map(tx => [
      new Date(tx.created_at).toLocaleDateString(),
      tx.transaction_type === 'credit_sale' ? 'Credit Sale' : 'Payment',
      tx.description || '',
      tx.invoice_number || '',
      tx.transaction_type === 'credit_sale' ? tx.amount.toFixed(2) : '',
      tx.transaction_type === 'payment' ? tx.amount.toFixed(2) : '',
      tx.balance_after.toFixed(2),
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement-${member.member_id}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalCredits = transactions.filter(tx => tx.transaction_type === 'credit_sale').reduce((sum, tx) => sum + tx.amount, 0);
  const totalPayments = transactions.filter(tx => tx.transaction_type === 'payment').reduce((sum, tx) => sum + tx.amount, 0);

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

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('member-detail', memberId)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Member Statement</h1>
            <p className="text-slate-600 mt-1">Transaction history</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Statement Header */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white print:bg-amber-600">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{member.name}</h2>
              <p className="text-amber-100 mt-1">Member ID: {member.member_id}</p>
              {member.phone && <p className="text-amber-100 text-sm mt-1">Phone: {member.phone}</p>}
              {member.address && <p className="text-amber-100 text-sm">Address: {member.address}</p>}
            </div>
            <div className="text-right">
              <p className="text-amber-100 text-sm">Statement Date</p>
              <p className="font-semibold">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Date Filter */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6">
          <div className="bg-slate-50 rounded-xl p-4 print:bg-gray-100">
            <p className="text-sm text-slate-500">Credit Limit</p>
            <p className="text-lg font-bold text-slate-900">Rs. {Number(member.credit_limit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Outstanding</p>
            <p className="text-lg font-bold text-red-600">Rs. {Number(member.outstanding_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Total Credits</p>
            <p className="text-lg font-bold text-red-600">Rs. {totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Total Payments</p>
            <p className="text-lg font-bold text-green-600">Rs. {totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Transaction Table */}
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Filter className="h-12 w-12 mx-auto mb-3 text-slate-200" />
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Description</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden sm:table-cell">Invoice</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Debit</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Credit</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {tx.transaction_type === 'credit_sale' ? 'Credit Sale' : 'Payment Received'}
                      </p>
                      <p className="text-sm text-slate-500">{tx.description || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{tx.invoice_number || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {tx.transaction_type === 'credit_sale' && (
                        <span className="font-semibold text-red-600">Rs. {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {tx.transaction_type === 'payment' && (
                        <span className="font-semibold text-green-600">Rs. {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      Rs. {tx.balance_after.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
