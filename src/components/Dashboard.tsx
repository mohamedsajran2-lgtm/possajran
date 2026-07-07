import { useEffect, useState } from 'react';
import { CreditCard, Users, DollarSign, TrendingUp, ArrowUpRight, AlertTriangle, Calendar, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { LoanMember, PaymentStats } from '../types';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalOutstanding: number;
  totalCreditLimit: number;
  membersOverLimit: number;
  todayCollections: PaymentStats;
}

interface Props {
  onNavigate: (view: string, memberId?: string) => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    totalOutstanding: 0,
    totalCreditLimit: 0,
    membersOverLimit: 0,
    todayCollections: { todayTotal: 0, todayCount: 0, weekTotal: 0, monthTotal: 0 },
  });
  const [topDebtors, setTopDebtors] = useState<LoanMember[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      const [membersResult, todayPayments, weekPayments, monthPayments, recentTx] = await Promise.all([
        supabase.from('loan_members').select('*'),
        supabase.from('loan_transactions').select('amount').eq('transaction_type', 'payment').gte('created_at', todayStart),
        supabase.from('loan_transactions').select('amount').eq('transaction_type', 'payment').gte('created_at', weekStart),
        supabase.from('loan_transactions').select('amount').eq('transaction_type', 'payment').gte('created_at', monthStart),
        supabase.from('loan_transactions').select('*, member:loan_members(name, member_id)').eq('transaction_type', 'payment').order('created_at', { ascending: false }).limit(5),
      ]);

      if (membersResult.data) {
        const members = membersResult.data as LoanMember[];
        const totalOutstanding = members.reduce((sum, m) => sum + Number(m.outstanding_balance), 0);
        const totalCreditLimit = members.reduce((sum, m) => sum + Number(m.credit_limit), 0);
        const membersOverLimit = members.filter(m => Number(m.outstanding_balance) > Number(m.credit_limit)).length;
        const activeMembers = members.filter(m => m.status === 'active').length;

        setStats({
          totalMembers: members.length,
          activeMembers,
          totalOutstanding,
          totalCreditLimit,
          membersOverLimit,
          todayCollections: {
            todayTotal: todayPayments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
            todayCount: todayPayments.data?.length || 0,
            weekTotal: weekPayments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
            monthTotal: monthPayments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
          },
        });

        const sorted = [...members].sort((a, b) => Number(b.outstanding_balance) - Number(a.outstanding_balance));
        setTopDebtors(sorted.slice(0, 5));
      }

      if (recentTx.data) {
        setRecentPayments(recentTx.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">Loan Member Management Overview</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar className="h-4 w-4" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Outstanding</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                Rs. {stats.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-red-100 to-red-50 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Today's Collections */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/10 to-transparent rounded-full -mr-8 -mt-8"></div>
          <div className="flex items-center justify-between relative">
            <div>
              <p className="text-sm font-medium text-slate-500">Today's Collections</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                Rs. {stats.todayCollections.todayTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-400 mt-1">{stats.todayCollections.todayCount} payments received</p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-green-100 to-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Members</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.activeMembers}</p>
              <p className="text-xs text-slate-400 mt-1">of {stats.totalMembers} total</p>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Over Limit */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Over Credit Limit</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.membersOverLimit}</p>
              <button
                onClick={() => onNavigate('overdue-accounts')}
                className="text-xs text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-1"
              >
                View Details <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Royal Rich POS</h2>
              <p className="text-amber-100">Quick access to frequent actions</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('pos-billing')}
              className="px-5 py-2.5 bg-white text-amber-600 rounded-xl font-semibold hover:bg-amber-50 transition-colors shadow-sm"
            >
              New Sale
            </button>
            <button
              onClick={() => onNavigate('payment-collection')}
              className="px-5 py-2.5 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              Record Payment
            </button>
            <button
              onClick={() => onNavigate('loan-members')}
              className="px-5 py-2.5 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              Add Member
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Outstanding */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Top Outstanding Balances</h2>
            <button
              onClick={() => onNavigate('due-report')}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
            >
              View All <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          {topDebtors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">No members with outstanding balance</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topDebtors.map((member, index) => {
                const balance = Number(member.outstanding_balance);
                const limit = Number(member.credit_limit);
                const percentage = limit > 0 ? (balance / limit) * 100 : 0;
                const isOverLimit = balance > limit;

                return (
                  <button
                    key={member.id}
                    onClick={() => onNavigate('member-detail', member.id)}
                    className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-left group"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-slate-900 truncate">{member.name}</p>
                        <p className={`font-bold ${isOverLimit ? 'text-red-600' : 'text-slate-900'}`}>
                          Rs. {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{member.member_id}</span>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all ${isOverLimit ? 'bg-red-500' : percentage > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${isOverLimit ? 'text-red-600' : 'text-slate-600'}`}>
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Payments</h2>
          {recentPayments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">No recent payments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      {payment.member?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 text-sm">
                      +Rs. {Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => onNavigate('collection-report')}
            className="mt-4 w-full py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors"
          >
            View Collection Report
          </button>
        </div>
      </div>
    </div>
  );
}
