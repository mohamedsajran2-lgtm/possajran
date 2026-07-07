import { useEffect, useState } from 'react';
import { ArrowLeft, AlertTriangle, User, Phone, MapPin, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { LoanMember } from '../types';

interface Props {
  onNavigate: (view: string, memberId?: string) => void;
}

export default function OverdueAccounts({ onNavigate }: Props) {
  const [members, setMembers] = useState<LoanMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverdueMembers();
  }, []);

  async function loadOverdueMembers() {
    try {
      const { data, error } = await supabase
        .from('loan_members')
        .select('*')
        .order('outstanding_balance', { ascending: false });

      if (error) throw error;

      // Filter members who are over their credit limit
      const overdueMembers = (data || []).filter(
        m => Number(m.outstanding_balance) > Number(m.credit_limit)
      );
      setMembers(overdueMembers as LoanMember[]);
    } catch (error) {
      console.error('Error loading overdue accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const totalOverdue = members.reduce(
    (sum, m) => sum + Number(m.outstanding_balance) - Number(m.credit_limit),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('dashboard')}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Overdue Accounts</h1>
          <p className="text-slate-600 mt-1">Members exceeding their credit limit</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-red-100 text-sm">Total Overdue Amount</p>
              <p className="text-3xl font-bold">Rs. {totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-red-100 text-sm">Accounts Over Limit</p>
            <p className="text-4xl font-bold">{members.length}</p>
          </div>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-slate-900 font-medium">No Overdue Accounts</p>
          <p className="text-slate-500 text-sm mt-1">All members are within their credit limits</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Member</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 hidden sm:table-cell">Contact</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Credit Limit</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Balance</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900 text-red-600">Over By</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map(member => {
                  const balance = Number(member.outstanding_balance);
                  const limit = Number(member.credit_limit);
                  const overBy = balance - limit;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <User className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{member.name}</p>
                            <p className="text-sm text-amber-600">{member.member_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        {member.phone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="h-4 w-4 text-slate-400" />
                            {member.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        Rs. {limit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-red-600">
                        Rs. {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                          Rs. {overBy.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onNavigate('payment-collection')}
                            className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                          >
                            Collect
                          </button>
                          <button
                            onClick={() => onNavigate('member-detail', member.id)}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                          >
                            View
                          </button>
                        </div>
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
