import { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Trash2, Search, User, AlertCircle, Check, CreditCard, X, Receipt, Printer } from 'lucide-react';
import { supabase, generateInvoiceNumber } from '../lib/supabase';
import type { LoanMember, BillItem } from '../types';

interface Props {
  onNavigate: (view: string, memberId?: string) => void;
}

interface CompletedSale {
  invoiceNumber: string;
  member: LoanMember;
  items: BillItem[];
  total: number;
  newBalance: number;
  timestamp: Date;
}

export default function POSBilling({ onNavigate }: Props) {
  const [members, setMembers] = useState<LoanMember[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<LoanMember | null>(null);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [items, setItems] = useState<BillItem[]>([]);
  const [newItem, setNewItem] = useState({ name: '', quantity: '1', price: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);

  useEffect(() => {
    loadMembers();
    initInvoiceNumber();
  }, []);

  async function initInvoiceNumber() {
    const inv = await generateInvoiceNumber();
    setInvoiceNumber(inv);
  }

  async function loadMembers() {
    try {
      const { data, error } = await supabase
        .from('loan_members')
        .select('*')
        .eq('status', 'active')
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

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  function addItem() {
    if (!newItem.name || !newItem.price) return;

    const item: BillItem = {
      id: Date.now().toString(),
      name: newItem.name,
      quantity: parseInt(newItem.quantity) || 1,
      price: parseFloat(newItem.price) || 0,
      total: (parseInt(newItem.quantity) || 1) * (parseFloat(newItem.price) || 0),
    };

    setItems([...items, item]);
    setNewItem({ name: '', quantity: '1', price: '' });
  }

  function removeItem(id: string) {
    setItems(items.filter(item => item.id !== id));
  }

  async function handleSubmitCreditSale() {
    if (!selectedMember || items.length === 0) return;

    const newBalance = Number(selectedMember.outstanding_balance) + subtotal;
    const creditLimit = Number(selectedMember.credit_limit);

    // Check if credit limit will be exceeded
    if (newBalance > creditLimit) {
      const proceed = confirm(
        `⚠️ WARNING: Credit Limit Exceeded\n\n` +
        `Member: ${selectedMember.name}\n` +
        `Credit Limit: Rs. ${creditLimit.toLocaleString()}\n` +
        `Current Balance: Rs. ${Number(selectedMember.outstanding_balance).toLocaleString()}\n` +
        `Sale Amount: Rs. ${subtotal.toLocaleString()}\n` +
        `New Balance: Rs. ${newBalance.toLocaleString()}\n\n` +
        `This member will be Rs. ${(newBalance - creditLimit).toLocaleString()} OVER their credit limit.\n\n` +
        `Do you want to proceed with this credit sale?`
      );
      if (!proceed) return;
    }

    setSubmitting(true);
    try {
      const inv = await generateInvoiceNumber();

      // Create the transaction record
      const { error: txError } = await supabase.from('loan_transactions').insert({
        member_id: selectedMember.id,
        transaction_type: 'credit_sale',
        amount: subtotal,
        description: `Credit sale - ${items.length} items (${items.map(i => i.name).join(', ')})`,
        invoice_number: inv,
        bill_items: items,
        payment_method: 'loan_member',
        balance_after: newBalance,
      });

      if (txError) throw txError;

      // Update the member's outstanding balance
      const { error: memberError } = await supabase
        .from('loan_members')
        .update({ outstanding_balance: newBalance })
        .eq('id', selectedMember.id);

      if (memberError) throw memberError;

      // Show completed sale receipt
      setCompletedSale({
        invoiceNumber: inv,
        member: selectedMember,
        items: items,
        total: subtotal,
        newBalance: newBalance,
        timestamp: new Date(),
      });

      // Reset form
      setSelectedMember(null);
      setItems([]);
      initInvoiceNumber();
      loadMembers(); // Refresh member data
    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Failed to process sale. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function printReceipt() {
    if (!completedSale) return;
    window.print();
  }

  function closeReceiptAndNewSale() {
    setCompletedSale(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  // Show completed sale receipt
  if (completedSale) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none">
          {/* Receipt Header */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white text-center print:bg-white print:text-slate-900">
            <div className="flex items-center justify-center gap-2 mb-2 print:justify-center">
              <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center print:bg-amber-100">
                <Receipt className="h-6 w-6 print:text-amber-600" />
              </div>
              <span className="text-xl font-bold">Royal Rich</span>
            </div>
            <p className="text-amber-100 text-sm print:text-slate-600">Fashion Boutique POS</p>
          </div>

          {/* Success Badge */}
          <div className="bg-green-50 p-4 border-b border-slate-200 print:hidden">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-6 w-6" />
              </div>
              <span className="text-lg font-semibold">Credit Sale Recorded!</span>
            </div>
          </div>

          {/* Receipt Details */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Invoice No:</span>
              <span className="font-mono font-semibold text-slate-900">{completedSale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Date:</span>
              <span className="text-slate-900">{completedSale.timestamp.toLocaleDateString()} {completedSale.timestamp.toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Member:</span>
              <span className="font-semibold text-slate-900">{completedSale.member.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Member ID:</span>
              <span className="text-amber-600 font-medium">{completedSale.member.member_id}</span>
            </div>

            <div className="border-t border-dashed border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Items:</p>
              {completedSale.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm py-1">
                  <span className="text-slate-600">{item.name} x{item.quantity}</span>
                  <span className="text-slate-900">Rs. {item.total.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">Total Amount:</span>
                <span className="text-xl font-bold text-slate-900">Rs. {completedSale.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Payment Method:</span>
                <span className="text-blue-600 font-medium">Loan Account</span>
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <div className="flex justify-between items-center">
                <span className="text-red-700 font-medium">New Outstanding Balance:</span>
                <span className="text-xl font-bold text-red-600">Rs. {completedSale.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-xs text-red-600 mt-1 text-right">
                Credit Limit: Rs. {Number(completedSale.member.credit_limit).toLocaleString()}
              </p>
            </div>
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
                onClick={closeReceiptAndNewSale}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all font-semibold"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">POS Billing</h1>
          <p className="text-slate-600 mt-1">Create credit sales for loan members</p>
        </div>
        <div className="px-4 py-2 bg-slate-900 rounded-xl text-white font-mono text-sm">
          {invoiceNumber}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add Item */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
              Add Items
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Item name / description"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={newItem.quantity}
                  onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price"
                  value={newItem.price}
                  onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <button
                  onClick={addItem}
                  disabled={!newItem.name || !newItem.price}
                  className="px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Item List */}
          {items.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Item</th>
                      <th className="text-center px-4 py-4 text-sm font-semibold text-slate-700">Qty</th>
                      <th className="text-right px-4 py-4 text-sm font-semibold text-slate-700">Price</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">Total</th>
                      <th className="px-4 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-900">{item.name}</span>
                        </td>
                        <td className="px-4 py-4 text-center text-slate-600">{item.quantity}</td>
                        <td className="px-4 py-4 text-right text-slate-600">Rs. {item.price.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-900">Rs. {item.total.toLocaleString()}</td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white">
                      <td colSpan={3} className="px-6 py-4 text-right font-medium">Total</td>
                      <td className="px-6 py-4 text-right font-bold text-xl">Rs. {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <ShoppingCart className="h-16 w-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400">Add items to create a bill</p>
              <p className="text-sm text-slate-300 mt-1">Enter item name, quantity and price above</p>
            </div>
          )}
        </div>

        {/* Member Selection & Summary */}
        <div className="space-y-4">
          {/* Member Selection */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Loan Member</h2>

            {selectedMember ? (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <User className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{selectedMember.name}</p>
                        <p className="text-sm text-amber-600">{selectedMember.member_id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedMember(null)}
                      className="p-1 hover:bg-amber-200 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-slate-500">Credit Limit</p>
                      <p className="font-semibold text-slate-900">Rs. {Number(selectedMember.credit_limit).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-slate-500">Current Balance</p>
                      <p className="font-semibold text-red-600">Rs. {Number(selectedMember.outstanding_balance).toLocaleString()}</p>
                    </div>
                  </div>
                  {subtotal > 0 && (
                    <div className="mt-3 p-3 bg-white rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">After this sale:</span>
                        <span className={`font-bold ${Number(selectedMember.outstanding_balance) + subtotal > Number(selectedMember.credit_limit) ? 'text-red-600' : 'text-slate-900'}`}>
                          Rs. {(Number(selectedMember.outstanding_balance) + subtotal).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                  {Number(selectedMember.outstanding_balance) + subtotal > Number(selectedMember.credit_limit) && subtotal > 0 && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg flex items-start gap-2 border border-red-100">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-red-700">
                        <p className="font-medium">Credit limit will be exceeded</p>
                        <p className="text-red-600 text-xs">You'll need to confirm to proceed</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={() => setShowMemberSelect(true)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                {showMemberSelect && filteredMembers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-10 max-h-64 overflow-y-auto">
                    {filteredMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => {
                          setSelectedMember(member);
                          setShowMemberSelect(false);
                          setSearch('');
                        }}
                        className="w-full p-3 hover:bg-slate-50 flex items-center gap-3 text-left border-b border-slate-100 last:border-0"
                      >
                        <div className="h-9 w-9 bg-slate-100 rounded-lg flex items-center justify-center">
                          <User className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.member_id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Balance</p>
                          <p className="text-sm font-medium text-red-600">Rs. {Number(member.outstanding_balance).toLocaleString()}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-4">Bill Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-300">
                <span>Items</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Qty</span>
                <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="h-px bg-slate-700"></div>
              <div className="flex justify-between text-2xl font-bold">
                <span>Total</span>
                <span>Rs. {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitCreditSale}
              disabled={!selectedMember || items.length === 0 || submitting}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Charge to Loan Account
                </>
              )}
            </button>

            <p className="text-center text-slate-400 text-xs mt-3">
              This will add Rs. {subtotal.toLocaleString()} to member's outstanding balance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
