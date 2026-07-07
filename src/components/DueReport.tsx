import { useEffect, useState } from 'react';
import { ArrowLeft, Download, AlertTriangle, DollarSign, Users, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { LoanMember } from '../types';

interface Props {
  onNavigate: (view: string, memberId?: string) => void;
}

export default function DueReport({ onNavigate }: Props) {
  const [members, setMembers] = useState<LoanMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'high'>('all');

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const { data, error } = await supabase
        .from('loan_members')
        .select('*')
        .gt('outstanding_balance', 0)
        .order('outstanding_balance', { ascending: false });

      if (error) throw error;
      setMembers((data || []) as LoanMember[]);
    } catch (error) {
      console.error('Error loading due report:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredMembers = members.filter(m => {
    const balance = Number(m.outstanding_balance);
    const limit = Number(m.credit_limit);
    if (filter === 'overdue') return balance > limit;
    if (filter === 'high') return balance > limit * 0.75;
    return true;
  });

  const totalOutstanding = filteredMembers.reduce((sum, m) => sum + Number(m.outstanding_balance), 0);
  const overLimitCount = filteredMembers.filter(m => Number(m.outstanding_balance) > Number(m.credit_limit)).length;

  function exportToCSV() {
    const headers = ['Member ID', 'Name', 'Phone', 'Address', 'Credit Limit', 'Outstanding Balance', 'Status'];
    const rows = filteredMembers.map(m => [
      m.member_id,
      m.name,
      m.phone || '',
      m.address || '',
      Number(m.credit_limit).toFixed(2),
      Number(m.outstanding_balance).toFixed(2),
      Number(m.outstanding_balance) > Number(m.credit_limit) ? 'Over Limit' : 'Normal',
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `due-balance-report-${new Date().toISOString().split('T')[0]}.csv`;
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
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Member Due Report</h1>
            <p className="text-slate-600 mt-1">All outstanding balances</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-red-100 text-sm">Total Outstanding</p>
              <p className="text-2xl font-bold">Rs. {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Members with Dues</p>
              <p className="text-2xl font-bold text-slate-900">{filteredMembers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Over Credit Limit</p>
              <p className="text-2xl font-bold text-slate-900">{overLimitCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${filter === 'all' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          All ({members.length})
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${filter === 'overdue' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          Over Limit ({members.filter(m => Number(m.outstanding_balance) > Number(m.credit_limit)).length})
        </button>
        <button
          onClick={() => setFilter('high')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${filter === 'high' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          High ({members.filter(m => {
            const balance = Number(m.outstanding_balance);
            const limit = Number(m.credit_limit);
            return balance > limit * 0.75 && balance <= limit;
          }).length})
        </button>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <DollarSign className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">No members with outstanding balance</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Member</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 hidden sm:table-cell">Phone</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Credit Limit</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Outstanding</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900 hidden md:table-cell">Utilization</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map(member => {
                  const balance = Number(member.outstanding_balance);
                  const limit = Number(member.credit_limit);
                  const utilization = limit > 0 ? (balance / limit) * 100 : 0;
                  const isOverLimit = balance > limit;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{member.name}</p>
                          <p className="text-sm text-amber-600">{member.member_id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 hidden sm:table-cell">{member.phone || '-'}</td>
                      <td className="px-6 py-4 text-right text-slate-900">
                        Rs. {limit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${isOverLimit ? 'text-red-600' : 'text-slate-900'}`}>
                        Rs. {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right hidden md:table-cell">
                        <div className="flex items-center justify-end gap-3">
                          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${isOverLimit ? 'bg-red-500' : utilization > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-600 w-12 text-right">{utilization.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isOverLimit ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                            <AlertTriangle className="h-3 w-3" />
                            Over Limit
                          </span>
                        ) : utilization > 75 ? (
                          <span className="inline-flex px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                            High
                          </span>
                        ) : (
                          <span className="inline-flex px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onNavigate('member-detail', member.id)}
                          className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
