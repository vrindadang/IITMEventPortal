
import React, { useState, useEffect } from 'react';
import { EVENT_DATE } from '../constants.ts';
import { User, NavView } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';

interface LayoutProps {
  children: React.ReactNode;
  activeView: NavView;
  onNavigate: (view: NavView) => void;
  currentUser: User;
  onLogout: () => void;
}

const NotificationDropdown = ({ isMobile = false }: { isMobile?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const clearNotification = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error("Error clearing notification:", err);
    }
  };

  const clearAll = async () => {
    try {
      const { error } = await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      setNotifications([]);
    } catch (err) {
      console.error("Error clearing all notifications:", err);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-white active:scale-95"
      >
        <span className="text-xl">🔔</span>
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-[8px] font-black text-white rounded-full w-4 h-4 flex items-center justify-center border-2 border-[#1a1c3d] animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className={`
            absolute mt-3 w-[calc(100vw-2rem)] md:w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-200 z-[100] overflow-hidden animate-slideUp
            ${isMobile ? 'right-0 -mr-2' : 'left-0 md:left-2'}
          `}>
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">Live Updates</h3>
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-tighter">Clear All</button>
              )}
            </div>
            
            <div className="max-h-[60vh] md:max-h-[32rem] overflow-y-auto custom-scrollbar">
              {isLoading && notifications.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                   <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Syncing Feed...</p>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map(notif => (
                  <div key={notif.id} className="relative p-6 border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                    <button onClick={() => clearNotification(notif.id)} className="absolute top-5 right-5 text-slate-300 hover:text-red-500 transition-colors text-sm opacity-100 md:opacity-0 md:group-hover:opacity-100">✕</button>
                    <div className="flex items-start gap-4">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 shadow-sm ${notif.type === 'alert' ? 'bg-red-500' : notif.type === 'success' ? 'bg-green-500' : 'bg-indigo-500'}`}></div>
                      <div className="flex-1">
                        <p className="font-black text-[11px] text-slate-900 uppercase tracking-tight mb-0.5">{notif.title}</p>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">{notif.message}</p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase mt-2 tracking-widest">{notif.time}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 px-6 text-center">
                  <div className="text-4xl mb-4 opacity-10">📫</div>
                  <p className="text-sm font-bold text-slate-400">System Clear</p>
                  <p className="text-[10px] text-slate-300 uppercase mt-1 tracking-widest">No priority alerts</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, currentUser, onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navItems: { id: NavView; label: string; icon: string; isSub?: boolean; hasChevron?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'tasks', label: 'Tasks', icon: '✅', hasChevron: true },
    { id: 'progress', label: 'Progress', icon: '📈', isSub: true },
    { id: 'my-tasks-sub', label: 'My Tasks', icon: '👤', isSub: true },
    { id: 'overall-tasks-list', label: 'Overall', icon: '📋', isSub: true },
    { id: 'gallery', label: 'Gallery', icon: '🖼️' },
    { id: 'confirmed-guest-list', label: 'Guest List', icon: '🎫' },
    { id: 'approvals', label: 'Approval Requests', icon: '📥' },
    { id: 'messenger', label: 'Messenger', icon: '💬' },
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'team-members', label: 'Team Members', icon: '👥' },
  ];

  const daysToGo = Math.ceil((new Date(EVENT_DATE).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden bg-[#1a1c3d] text-white px-5 py-4 flex justify-between items-center sticky top-0 z-50 border-b border-indigo-900/30">
        <div className="flex flex-col">
          <h1 className="font-classy-serif text-lg leading-none">IIT Madras</h1>
          <span className="text-[8px] text-indigo-400 font-bold tracking-widest uppercase">Suite 2026</span>
        </div>
        <div className="flex items-center space-x-2">
          <NotificationDropdown isMobile={true} />
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="p-2.5 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-all"
          >
            {isSidebarOpen ? <span className="text-lg">✕</span> : <span className="text-xl">☰</span>}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[60] w-[280px] bg-[#1a1c3d] text-white transform transition-all duration-500 ease-in-out md:relative md:translate-x-0 flex flex-col border-r border-indigo-900/20
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full shadow-none'}
        ${isSidebarOpen ? 'shadow-[20px_0_60px_rgba(0,0,0,0.5)]' : ''}
      `}>
        {/* Sidebar Header */}
        <div className="px-8 pt-10 pb-6">
          <h1 className="font-classy-serif text-3xl tracking-tight mb-0.5">IIT Madras</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Event Suite 2026</p>
          
          <div className="mt-8 bg-[#252850] border border-white/5 rounded-2xl px-6 py-4 flex items-center justify-between shadow-inner">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Countdown</span>
            <div className="flex items-baseline font-classy-serif gap-1.5">
              <span className="text-xl font-bold text-white">{daysToGo > 0 ? daysToGo : '0'}</span>
              <span className="text-sm font-bold text-white">Days</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar no-scrollbar pb-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all relative group
                ${activeView === item.id ? 'bg-[#24285b] text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                ${item.isSub ? 'ml-8 w-[calc(100%-2rem)] py-2.5' : ''}
              `}
            >
              <div className="flex items-center gap-4">
                {activeView === item.id && !item.isSub && (
                  <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-full" />
                )}
                {item.isSub && <div className={`w-1 h-1 rounded-full flex-shrink-0 ${activeView === item.id ? 'bg-indigo-400' : 'bg-indigo-900'}`} />}
                <span className={`text-xl transition-transform group-hover:scale-110 ${activeView === item.id ? 'grayscale-0' : 'grayscale opacity-60'}`}>{item.icon}</span>
                <span className={`text-[13px] font-bold tracking-tight ${item.isSub ? 'font-medium opacity-80' : ''}`}>{item.label}</span>
              </div>
              {item.hasChevron && (
                <span className="text-[10px] opacity-40 group-hover:translate-x-1 transition-transform">❯</span>
              )}
            </button>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-6 border-t border-white/5 bg-[#171937]/50">
          <div className="bg-[#24285b]/40 rounded-2xl p-4 border border-white/5 backdrop-blur-md mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#4338ca] flex items-center justify-center text-white font-classy-serif text-lg font-bold shadow-lg border border-white/10">
                {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="overflow-hidden">
                <p className="text-[13px] font-bold truncate text-white tracking-tight leading-none mb-1.5">{currentUser.name}</p>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{currentUser.role.replace('-', ' ')}</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full py-4 bg-[#21172a] hover:bg-[#2d1b33] transition-all text-[11px] font-black uppercase tracking-widest text-[#f95d7e] rounded-2xl border border-[#3e1f2b] active:scale-95 shadow-sm"
          >
            Log Out Session
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#fdfdfd] md:p-10 p-4 custom-scrollbar">
        <div className="max-w-7xl mx-auto pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#0f1129]/80 backdrop-blur-sm z-[55] md:hidden transition-all duration-500 animate-fadeIn" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
