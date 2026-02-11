
import React, { useState, useMemo } from 'react';
import { User, Task, Status } from '../types.ts';

interface TeamViewProps {
  users: User[];
  tasks: Task[];
  currentUser: User;
  onDeleteUser?: (userId: string) => void;
}

interface UserStats {
  total: number;
  completed: number;
  active: number;
  blocked: number;
  avgProgress: number;
  lastActive: string | null;
}

const TeamView: React.FC<TeamViewProps> = ({ users, tasks, currentUser, onDeleteUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const isSuperAdmin = currentUser.role === 'super-admin';

  // Departments list for filter
  const departments = useMemo(() => ['All', ...new Set(users.map(u => u.department))], [users]);

  // Calculate stats for each user
  const userStatsMap = useMemo(() => {
    const stats: Record<string, UserStats> = {};
    
    users.forEach(user => {
      // Find tasks assigned to this user (matching name)
      const userTasks = tasks.filter(t => t.assignedTo.includes(user.name));
      const completed = userTasks.filter(t => t.status === 'completed').length;
      const active = userTasks.filter(t => t.status === 'in-progress' || t.status === 'not-started').length;
      const blocked = userTasks.filter(t => t.status === 'blocked').length;
      const avgProgress = userTasks.length > 0 
        ? Math.round(userTasks.reduce((acc, t) => acc + t.progress, 0) / userTasks.length)
        : 0;
      
      // Find last active timestamp from updates
      let lastActive: string | null = null;
      userTasks.forEach(task => {
        task.updates.forEach(update => {
          if (update.user === user.name) {
            if (!lastActive || new Date(update.timestamp) > new Date(lastActive)) {
              lastActive = update.timestamp;
            }
          }
        });
      });

      stats[user.id] = {
        total: userTasks.length,
        completed,
        active,
        blocked,
        avgProgress,
        lastActive
      };
    });
    
    return stats;
  }, [users, tasks]);

  // Global stats
  const globalStats = useMemo(() => {
    const totalMembers = users.length;
    const totalActiveTasks = tasks.filter(t => t.status !== 'completed').length;
    const blockedCount = tasks.filter(t => t.status === 'blocked').length;
    const avgProg = Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length);
    
    return { totalMembers, totalActiveTasks, blockedCount, avgProg };
  }, [users, tasks]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = deptFilter === 'All' || user.department === deptFilter;
      const matchesRole = roleFilter === 'All' || 
                         (roleFilter === 'Admin' && user.role === 'admin') || 
                         (roleFilter === 'Team' && user.role === 'team-member');
      
      return matchesSearch && matchesDept && matchesRole;
    });
  }, [users, searchQuery, deptFilter, roleFilter]);

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return 'bg-green-500';
    if (progress >= 40) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  const formatRelativeDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Quick Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Members</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-slate-800">{globalStats.totalMembers}</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-xl">👥</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Tasks</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-slate-800">{globalStats.totalActiveTasks}</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-xl">⚡</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Avg Progress</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-slate-800">{globalStats.avgProg}%</span>
            <span className="p-2 bg-green-50 text-green-600 rounded-lg text-xl">📊</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Blocked Items</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-red-600">{globalStats.blockedCount}</span>
            <span className="p-2 bg-red-50 text-red-600 rounded-lg text-xl animate-pulse">⚠️</span>
          </div>
        </div>
      </div>

      {/* Advanced Filtering */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row flex-1 gap-4">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            />
            <span className="absolute left-3 top-3 text-slate-400">🔍</span>
          </div>
          <select 
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none cursor-pointer"
          >
            {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
          </select>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none cursor-pointer"
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admins</option>
            <option value="Team">Team Members</option>
          </select>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
          >
            List View
          </button>
          <button 
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
          >
            Contributions
          </button>
        </div>
      </div>

      <p className="text-sm font-bold text-slate-500 px-2">Showing {filteredUsers.length} of {users.length} members</p>

      {/* Main Content Area */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Member</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Dept & Role</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Tasks</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Avg Progress</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Last Active</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(user => {
                  const stat = userStatsMap[user.id];
                  return (
                    <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-sm
                            ${user.id === '8' ? 'bg-indigo-600' : user.role === 'admin' ? 'bg-slate-800' : 'bg-blue-500'}
                          `}>
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{user.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {user.role}
                          </span>
                          {user.id !== '8' && (
                            <span className="text-[10px] font-medium text-slate-400 italic">{user.department}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="font-bold text-slate-800">{stat.total}</span>
                          <div className="flex space-x-1">
                            {stat.completed > 0 && <span className="text-green-500 font-bold" title="Completed">✓{stat.completed}</span>}
                            {stat.active > 0 && <span className="text-blue-500 font-bold" title="Active">⚡{stat.active}</span>}
                            {stat.blocked > 0 && <span className="text-red-500 font-bold animate-pulse" title="Blocked">⚠️{stat.blocked}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-500">{stat.avgProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full ${getProgressColor(stat.avgProgress)} transition-all`} style={{ width: `${stat.avgProgress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-500 font-medium">{formatRelativeDate(stat.lastActive)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => setSelectedUser(user)}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all border border-slate-200"
                          >
                            Details
                          </button>
                          {isSuperAdmin && user.id !== currentUser.id && (
                            <button 
                              onClick={() => onDeleteUser?.(user.id)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest text-red-600 transition-all border border-red-200"
                              title="Remove Member"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => {
            const stat = userStatsMap[user.id];
            return (
              <div key={user.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-500 transition-all group relative">
                {isSuperAdmin && user.id !== currentUser.id && (
                  <button 
                    onClick={() => onDeleteUser?.(user.id)}
                    className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    title="Remove Member"
                  >
                    🗑️
                  </button>
                )}
                <div className="flex items-center space-x-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl transition-all group-hover:scale-110
                    ${user.id === '8' ? 'bg-indigo-600' : 'bg-slate-50 text-indigo-600 border border-indigo-100'}
                  `}>
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">{user.name}</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{user.department}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tasks</p>
                    <p className="text-lg font-black text-slate-700">{stat.total}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded-xl text-green-700">
                    <p className="text-[10px] font-bold text-green-400 uppercase">Done</p>
                    <p className="text-lg font-black">{stat.completed}</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-xl text-blue-700">
                    <p className="text-[10px] font-bold text-blue-400 uppercase">Prog</p>
                    <p className="text-lg font-black">{stat.avgProgress}%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Last Contribution</span>
                    <span className="font-bold text-slate-700">{stat.lastActive ? new Date(stat.lastActive).toLocaleDateString('en-GB') : 'N/A'}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedUser(user)}
                    className="w-full py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-bold rounded-xl text-xs transition-all"
                  >
                    View Timeline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
            <div className="p-8 bg-indigo-900 text-white flex justify-between items-start">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center text-3xl font-bold border border-white/20">
                  {selectedUser.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-3xl font-black mb-1">{selectedUser.name}</h2>
                  <p className="text-indigo-200 uppercase text-xs font-bold tracking-widest">{selectedUser.role} • {selectedUser.department}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">✕</button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8 flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Assigned</p>
                  <p className="text-2xl font-black text-slate-800">{userStatsMap[selectedUser.id].total}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                  <p className="text-[10px] font-black text-green-500 uppercase mb-1">Completed</p>
                  <p className="text-2xl font-black text-green-700">{userStatsMap[selectedUser.id].completed}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-500 uppercase mb-1">Avg Progress</p>
                  <p className="text-2xl font-black text-blue-700">{userStatsMap[selectedUser.id].avgProgress}%</p>
                </div>
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-black text-red-400 uppercase mb-1">Blocked</p>
                  <p className="text-2xl font-black text-red-600">{userStatsMap[selectedUser.id].blocked}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-6">Recent Contributions</h3>
                <div className="space-y-4">
                  {tasks.flatMap(t => t.updates)
                    .filter(u => u.user === selectedUser.name)
                    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 10)
                    .map((update, idx) => (
                    <div key={idx} className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm flex items-start space-x-4">
                      <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-sm">✏️</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{new Date(update.timestamp).toLocaleString('en-GB')}</p>
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                            {update.progressBefore}% → {update.progressAfter}%
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed italic">"{update.message}"</p>
                      </div>
                    </div>
                  ))}
                  {tasks.flatMap(t => t.updates).filter(u => u.user === selectedUser.name).length === 0 && (
                    <div className="text-center py-12 text-slate-400 italic">No update history recorded for this member.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedUser(null)}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamView;
