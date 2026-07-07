import { useState } from 'react';
import { LayoutDashboard, Users, FileText, DollarSign, CreditCard, Menu, X, ShoppingCart, AlertTriangle, BarChart3, Crown } from 'lucide-react';
import Dashboard from './components/Dashboard';
import MemberList from './components/MemberList';
import MemberDetail from './components/MemberDetail';
import MemberStatement from './components/MemberStatement';
import DueReport from './components/DueReport';
import RecordPayment from './components/RecordPayment';
import POSBilling from './components/POSBilling';
import OverdueAccounts from './components/OverdueAccounts';
import CollectionReport from './components/CollectionReport';
import type { ViewType } from './types';

type ViewState = {
  view: ViewType;
  memberId?: string;
};

function App() {
  const [viewState, setViewState] = useState<ViewState>({ view: 'dashboard' });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function navigate(view: string, memberId?: string) {
    setViewState({ view: view as ViewType, memberId });
    setSidebarOpen(false);
  }

  const navItems = [
    { view: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
    { view: 'pos-billing' as ViewType, label: 'POS Billing', icon: ShoppingCart },
    { view: 'loan-members' as ViewType, label: 'Loan Members', icon: Users },
    { view: 'payment-collection' as ViewType, label: 'Record Payment', icon: CreditCard },
    { view: 'due-report' as ViewType, label: 'Due Report', icon: FileText },
    { view: 'overdue-accounts' as ViewType, label: 'Overdue Accounts', icon: AlertTriangle },
    { view: 'collection-report' as ViewType, label: 'Collection Report', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-white hover:bg-amber-500/20"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-amber-200" />
          <span className="text-lg font-bold text-white">Royal Rich POS</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-0 left-0 z-50 lg:z-10
            w-72 h-screen bg-gradient-to-b from-slate-900 to-slate-800
            transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Logo Area */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Crown className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Royal Rich</h1>
                <p className="text-xs text-amber-400/80 tracking-wide">Fashion Boutique POS</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Main Menu</p>
            <ul className="space-y-1">
              {navItems.map(item => (
                <li key={item.view}>
                  <button
                    onClick={() => navigate(item.view)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      viewState.view === item.view
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-3">Reports</p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => navigate('due-report')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    viewState.view === 'due-report'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <FileText className="h-5 w-5" />
                  <span className="font-medium">Due Report</span>
                </button>
              </li>
            </ul>
          </nav>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
            <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-xl p-4 border border-amber-500/20">
              <p className="text-xs text-amber-400 font-medium">Loan Member Management</p>
              <p className="text-xs text-slate-400 mt-1">Royal Rich Clothing Retail</p>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:ml-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {viewState.view === 'dashboard' && <Dashboard onNavigate={navigate} />}
            {viewState.view === 'loan-members' && <MemberList onNavigate={navigate} />}
            {viewState.view === 'member-detail' && viewState.memberId && (
              <MemberDetail memberId={viewState.memberId} onNavigate={navigate} />
            )}
            {viewState.view === 'statement' && viewState.memberId && (
              <MemberStatement memberId={viewState.memberId} onNavigate={navigate} />
            )}
            {viewState.view === 'due-report' && <DueReport onNavigate={navigate} />}
            {viewState.view === 'payment-collection' && <RecordPayment onNavigate={navigate} />}
            {viewState.view === 'pos-billing' && <POSBilling onNavigate={navigate} />}
            {viewState.view === 'overdue-accounts' && <OverdueAccounts onNavigate={navigate} />}
            {viewState.view === 'collection-report' && <CollectionReport onNavigate={navigate} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
