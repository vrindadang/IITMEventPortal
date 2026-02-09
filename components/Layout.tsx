
import React, { useState } from 'react';
import { EVENT_DATE } from '../constants';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: 'dashboard' | 'my-tasks' | 'team';
  onNavigate: (view: 'dashboard' | 'my-tasks' | 'team') => void;
  currentUser: User;
  onLogout: () => void;
}

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const notifications = [
    { id: 1, title: "Task Overdue", message: "Campus Publicity poster design is 2 days overdue", type: "alert", time: "1 hour ago" },
    { id: 2, title: "Milestone Achieved", message: "Pre-Event phase reached 66% completion", type: "success", time: "3 hours ago" },
    { id: 3, title: "New Comment", message: "Dr. Anup Naha commented on your task", type: "info", time: "5 hours ago" }
  ];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
      >
        <span className="text-xl">🔔</span>
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-[8px] font-bold text-white rounded-full w-4 h-4 flex items-center justify-center border border-indigo-900">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-slideUp">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.map(notif => (
                <div key={notif.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      notif.type === 'alert' ? 'bg-red-500' : 
                      notif.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="font-bold text-xs text-slate-900">{notif.title}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-wider">{notif.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 text-center bg-slate-50">
              <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">
                View All Notifications
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'my-tasks', label: 'My Tasks', icon: '✅' },
    { id: 'team', label: 'Team', icon: '👥' },
  ];

  const daysToGo = Math.ceil((new Date(EVENT_DATE).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Mobile Header */}
      <header className="md:hidden bg-indigo-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <h1 className="font-bold text-lg">IIT-M Event</h1>
        <div className="flex items-center space-x-2">
          <NotificationDropdown />
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
              <NotificationDropdown />
            </div>
          </div>
          <p className="text-indigo-300 text-sm">10/03/2026</p>
          <div className="mt-4 inline-block bg-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">
            {daysToGo > 0 ? `${daysToGo} Days to Go` : 'Event Day!'}
          </div>
        </div>

        <nav className="mt-6 px-4 space-y-2 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id as any);
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                ${activeView === item.id ? 'bg-indigo-700 text-white shadow-lg' : 'text-indigo-200 hover:bg-indigo-800'}
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
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
