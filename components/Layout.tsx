
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

  // Fetch notifications from Supabase
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
      // Fallback to empty if table doesn't exist yet or other error
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Optional: Set up real-time subscription for new notifications
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const clearNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error("Error clearing notification:", err);
    }
  };

  const clearAll = async () => {
    try {
      // Deleting all rows (requires appropriate RLS or service role if RLS is enabled)
      const { error } = await supabase
        .from('notifications')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
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
        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
      >
        <span className="text-xl">🔔</span>
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-[8px] font-bold text-white rounded-full w-4 h-4 flex items-center justify-center border border-indigo-900 animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className={`
            absolute mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 z-[100] overflow-hidden animate-slideUp
            ${isMobile ? 'right-0' : 'left-0 md:left-2'}
          `}>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Notifications</h3>
              {notifications.length > 0 && (
                <button 
                  onClick={clearAll}
                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
              {isLoading && notifications.length === 0 ? (
                <div className="p-10 text-center">
                   <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
                   <p className="text-[10px] text-slate-400 font-bold uppercase">Syncing...</p>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map(notif => (
                  <div key={notif.id} className="relative p-5 border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                    <button 
                      onClick={() => clearNotification(notif.id)}
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors text-xs opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                    <div className="flex items-start gap-4">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 shadow-sm ${
                        notif.type === 'alert' ? 'bg-red-500 shadow-red-200' : 
                        notif.type === 'success' ? 'bg-green-500 shadow-green-200' : 'bg-blue-500 shadow-blue-200'
                      }`}></div>
                      <div className="flex-1 pr-4">
                        <p className="font-black text-[11px] text-slate-900 uppercase tracking-tight mb-0.5">{notif.title}</p>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">{notif.message}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">{notif.time}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 px-6 text-center">
                  <div className="text-4xl mb-3 opacity-20">📭</div>
                  <p className="text-sm font-bold text-slate-400">All caught up!</p>
                  <p className="text-[10px] text-slate-300 uppercase mt-1">No new alerts to show</p>
                </div>
              )}
            </div>
            
            <div className="p-4 text-center bg-slate-50 border-t border-slate-100">
              <button className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors">
                Notification History
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, currentUser, onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navItems: { id: NavView; label: string; icon: string; isSub?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Mobile Header */}
      <header className="md:hidden bg-indigo-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <h1 className="font-bold text-lg">IIT-M Event</h1>
        <div className="flex items-center space-x-2">
          <NotificationDropdown isMobile={true} />
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 bg-indigo-800 rounded">
            {isSidebarOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-indigo-900 text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <div className="flex justify-between items-start mb-1">
            <h1 className="text-xl font-bold">IIT Madras Talk</h1>
            <div className="hidden md:block">
              <NotificationDropdown isMobile={false} />
            </div>
          </div>
          <p className="text-indigo-300 text-sm">10/03/2026</p>
          <div className="mt-4 inline-block bg-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">
            {daysToGo > 0 ? `${daysToGo} Days to Go` : 'Event Day!'}
          </div>
        </div>

        <nav className="mt-6 px-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all
                ${activeView === item.id ? 'bg-indigo-700 text-white shadow-lg translate-x-1' : 'text-indigo-200 hover:bg-indigo-800/50'}
                ${item.isSub ? 'ml-6 w-[calc(100%-1.5rem)] py-1.5' : ''}
              `}
            >
              {item.isSub && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 flex-shrink-0" />}
              <span className="text-lg">{item.icon}</span>
              <span className={`${item.isSub ? 'text-sm font-medium' : 'font-semibold'}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6">
          <div className="bg-indigo-800/50 rounded-2xl p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold border-2 border-indigo-400">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                <p className="text-[10px] text-indigo-300 uppercase tracking-wider">{currentUser.role}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full py-2 bg-indigo-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
