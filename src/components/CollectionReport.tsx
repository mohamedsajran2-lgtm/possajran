import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Filter, TrendingUp, Download, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { LoanTransaction } from '../types';

interface Props {
  onNavigate: (view: string, memberId?: string) => void;
}

interface DailySummary {
  date: string;
  count: number;
  total: number;
}

export default function CollectionReport({ onNavigate }: Props) {
  const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupBy, setGroupBy] = useState<'daily' | 'all'>('daily');

  useEffect(() => {
    loadTransactions();
  }, [dateFrom, dateTo]);

  async function loadTransactions() {
    try {
      let query = supabase
        .from('loan_transactions')
        .select('*, member:loan_members(name, member_id)')
        .eq('transaction_type', 'payment')
        .order('created_at', { ascending: false });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTransactions((data || []) as LoanTransaction[]);
    } catch (error) {
      console.error('Error loading collection report:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalCollected = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

  // Group by date
  const dailySummaries: DailySummary[] = [];
  const dailyMap = new Map<string, { count: number; total: number }>();

  transactions.forEach(tx => {
    const date = new Date(tx.created_at).toLocaleDateString();
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { count: 0, total: 0 });
    }
    const current = dailyMap.get(date)!;
    dailyMap.set(date, {
      count: current.count + 1,
      total: current.total + Number(tx.amount),
    });
  });

  dailyMap.forEach((value, key) => {
    dailySummaries.push({ date: key, ...value });
  });

  function exportToCSV() {
    const headers = ['Date', 'Member ID', 'Member Name', 'Amount', 'Description', 'Balance After'];
    const rows = transactions.map(tx => [
      new Date(tx.created_at).toLocaleDateString(),
      tx.member?.member_id || '',
      tx.member?.name || '',
      Number(tx.amount).toFixed(2),
      tx.description || '',
      Number(tx.balance_after).toFixed(2),
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Collection Report</h1>
            <p className="text-slate-600 mt-1">Payment collection history</p>
          </div>
        </div>
        <button
          onClick={exportToCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-green-100 text-sm">Total Collected</p>
              <p className="text-2xl font-bold">Rs. {totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Period</p>
              <p className="text-lg font-semibold text-slate-900">
                {dateFrom || 'All'} - {dateTo || 'Now'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Transactions</p>
              <p className="text-2xl font-bold text-slate-900">{transactions.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
            className="px-4 py-2.5 text-slate-600 hover:text-slate-900"
          >
            Clear
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">No payments recorded for this period</p>
          </div>
        ) : (
          <>
            {/* Daily Summary */}
            {groupBy === 'daily' && dailySummaries.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Daily Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {dailySummaries.slice(0, 4).map(day => (
                    <div key={day.date} className="bg-slate-50 rounded-xl p-4">
                      <p className="text-sm text-slate-500">{day.date}</p>
                      <p className="text-lg font-bold text-slate-900">Rs. {day.total.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{day.count} payments</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction List */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Member</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden sm:table-cell">Description</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Amount</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="text-slate-900">{new Date(tx.created_at).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{tx.member?.name || 'Unknown'}</p>
                        <p className="text-xs text-amber-600">{tx.member?.member_id}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                        {tx.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-green-600">
                          +Rs. {Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        Rs. {Number(tx.balance_after).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
