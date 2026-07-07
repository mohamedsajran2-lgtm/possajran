import { useEffect, useState } from 'react';
import { Search, Plus, Edit2, Trash2, User, Phone, MapPin, DollarSign, RefreshCw } from 'lucide-react';
import { supabase, generateMemberId } from '../lib/supabase';
import type { LoanMember } from '../types';

interface Props {
  onNavigate: (view: string, memberId?: string) => void;
}

export default function MemberList({ onNavigate }: Props) {
  const [members, setMembers] = useState<LoanMember[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<LoanMember | null>(null);
  const [formData, setFormData] = useState({
    member_id: '',
    name: '',
    phone: '',
    address: '',
    credit_limit: '',
  });
  const [generatingId, setGeneratingId] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const { data, error } = await supabase
        .from('loan_members')
        .select('*')
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

  async function generateNewMemberId() {
    setGeneratingId(true);
    try {
      const newId = await generateMemberId();
      setFormData(prev => ({ ...prev, member_id: newId }));
    } catch (error) {
      console.error('Error generating member ID:', error);
    } finally {
      setGeneratingId(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingMember) {
        const { error } = await supabase
          .from('loan_members')
          .update({
            name: formData.name,
            phone: formData.phone || null,
            address: formData.address || null,
            credit_limit: parseFloat(formData.credit_limit) || 0,
          })
          .eq('id', editingMember.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('loan_members').insert({
          member_id: formData.member_id,
          name: formData.name,
          phone: formData.phone || null,
          address: formData.address || null,
          credit_limit: parseFloat(formData.credit_limit) || 0,
          status: 'active',
        });

        if (error) throw error;
      }

      setShowForm(false);
      setEditingMember(null);
      setFormData({ member_id: '', name: '', phone: '', address: '', credit_limit: '' });
      loadMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      alert('Failed to save member. Please try again.');
    }
  }

  async function handleDelete(member: LoanMember) {
    if (!confirm(`Are you sure you want to delete ${member.name}?`)) return;

    try {
      const { error } = await supabase.from('loan_members').delete().eq('id', member.id);
      if (error) throw error;
      loadMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Failed to delete member. Please try again.');
    }
  }

  function openEdit(member: LoanMember) {
    setEditingMember(member);
    setFormData({
      member_id: member.member_id,
      name: member.name,
      phone: member.phone || '',
      address: member.address || '',
      credit_limit: member.credit_limit.toString(),
    });
    setShowForm(true);
  }

  async function openAdd() {
    setEditingMember(null);
    setFormData({ member_id: '', name: '', phone: '', address: '', credit_limit: '' });
    setShowForm(true);
    // Auto-generate member ID
    generateNewMemberId();
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Loan Members</h1>
          <p className="text-slate-600 mt-1">Manage credit members for your boutique</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-sm shadow-amber-500/25"
        >
          <Plus className="h-5 w-5" />
          <span className="font-semibold">Add Member</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, member ID, or phone number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white shadow-sm"
        />
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-600">
        <span>Total: {filteredMembers.length} members</span>
        <span className="text-slate-300">|</span>
        <span className="text-amber-600 font-medium">
          Outstanding: Rs. {filteredMembers.reduce((sum, m) => sum + Number(m.outstanding_balance), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Users className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">No members found</p>
          {search && <p className="text-sm text-slate-300 mt-1">Try adjusting your search</p>}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMembers.map(member => {
            const balance = Number(member.outstanding_balance);
            const limit = Number(member.credit_limit);
            const utilization = limit > 0 ? (balance / limit) * 100 : 0;
            const isOverLimit = balance > limit;

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-amber-200 transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => onNavigate('member-detail', member.id)}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isOverLimit ? 'bg-red-100' : 'bg-gradient-to-br from-amber-100 to-amber-50'}`}>
                        <User className={`h-6 w-6 ${isOverLimit ? 'text-red-600' : 'text-amber-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-lg">{member.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md">
                            {member.member_id}
                          </span>
                          {member.status === 'inactive' && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                      {member.phone && (
                        <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {member.phone}
                        </span>
                      )}
                      {member.address && (
                        <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {member.address}
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-600">Credit Utilization</span>
                        <span className={`text-sm font-bold ${isOverLimit ? 'text-red-600' : 'text-slate-900'}`}>
                          Rs. {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} / Rs. {limit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all ${isOverLimit ? 'bg-red-500' : utilization > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2">
                    <button
                      onClick={() => onNavigate('statement', member.id)}
                      className="flex-1 sm:flex-none px-4 py-2 text-sm bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-xl hover:from-green-100 hover:to-green-200 transition-all font-medium"
                    >
                      <DollarSign className="h-4 w-4 inline mr-1" />
                      Statement
                    </button>
                    <button
                      onClick={() => openEdit(member)}
                      className="flex-1 sm:flex-none px-4 py-2 text-sm bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all"
                    >
                      <Edit2 className="h-4 w-4 inline mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(member)}
                      className="flex-1 sm:flex-none px-4 py-2 text-sm bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-xl hover:from-red-100 hover:to-red-200 transition-all"
                    >
                      <Trash2 className="h-4 w-4 inline mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingMember ? 'Edit Member' : 'Add New Member'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingMember(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Member ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.member_id}
                      onChange={e => setFormData({ ...formData, member_id: e.target.value })}
                      disabled={!!editingMember || generatingId}
                      required
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-50 disabled:text-slate-500"
                      placeholder="Auto-generated"
                    />
                    {!editingMember && (
                      <button
                        type="button"
                        onClick={generateNewMemberId}
                        disabled={generatingId}
                        className="px-3 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-5 w-5 ${generatingId ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Customer full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Contact number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                    placeholder="Full address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Credit Limit (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.credit_limit}
                    onChange={e => setFormData({ ...formData, credit_limit: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingMember(null);
                    }}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all font-semibold shadow-sm shadow-amber-500/25"
                  >
                    {editingMember ? 'Update' : 'Add'} Member
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
