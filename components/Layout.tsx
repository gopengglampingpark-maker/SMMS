import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Megaphone, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon
} from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  currentView: string;
  onNavigate: (view: string, data?: any) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, currentView, onNavigate, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
  ];

  if (user.role === 'Admin') {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: Settings });
  }

  const handleNav = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center z-50 shadow-md">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2">
          <span className="text-emerald-500">GGPH</span> SMMS
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out z-40
        md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 hidden md:block">
          <div className="font-bold text-2xl tracking-tight text-white">
            <span className="text-emerald-500">GGPH</span> SMMS
          </div>
          <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Gopeng Glamping Park</div>
        </div>

        <nav className="p-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' 
                    : 'hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-emerald-500">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 text-slate-400 hover:text-red-400 px-2 py-2 text-sm transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen bg-slate-50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;