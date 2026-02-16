
import React, { useState, useMemo } from 'react';
import { Category, Task, User, Phase } from '../types.ts';
import { EVENT_DATE } from '../constants.ts';

interface OverallSummaryProps {
  categories: Category[];
  tasks: Task[];
  users: User[];
  overallProgress: number;
  onSelectCategory: (category: Category | null) => void;
}

const OverallSummary: React.FC<OverallSummaryProps> = ({ 
  categories, 
  tasks, 
  users, 
  overallProgress,
  onSelectCategory 
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Calculations for Top Stats
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const daysToGo = Math.ceil((new Date(EVENT_DATE).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const activeTeamCount = useMemo(() => {
    const activeUserNames = new Set<string>();
    tasks.forEach(t => t.updates.forEach(u => activeUserNames.add(u.user)));
    return activeUserNames.size || users.length;
  }, [tasks, users]);
  const atRiskCount = categories.filter(c => c.status === 'blocked').length;

  // 2. Phase Calculations
  const getPhaseStats = (phase: Phase) => {
    const phaseCats = categories.filter(c => c.phase === phase);
    const progress = phaseCats.length > 0 
      ? Math.round(phaseCats.reduce((acc, c) => acc + c.progress, 0) / phaseCats.length)
      : 0;
    return { progress, count: phaseCats.length };
  };

  const preEvent = getPhaseStats('pre-event');
  const duringEvent = getPhaseStats('during-event');
  const postEvent = getPhaseStats('post-event');

  // 3. Category Filtering
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.responsiblePersons.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 4. Activity Feed Data
  const recentActivities = useMemo(() => {
    return tasks
      .flatMap(t => t.updates.map(u => ({ ...u, taskTitle: t.title, taskId: t.id })))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 4);
  }, [tasks]);

  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-12 animate-fadeIn pb-12">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-green-50 w-10 h-10 rounded-xl flex items-center justify-center text-green-600 border border-green-100 shadow-inner">✅</div>
            <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full tracking-tighter uppercase border border-green-100">+3 this week</span>
          </div>
          <p className="font-classy-serif text-[2.8rem] text-slate-900 leading-none">{completedTasks}/{totalTasks}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-3">Tasks Complete</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">⌛</div>
            <span className="text-[9px] font-black text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full tracking-tighter uppercase border border-indigo-100">{EVENT_DATE}</span>
          </div>
          <p className="font-classy-serif text-[2.8rem] text-slate-900 leading-none">{daysToGo}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-3">Days Until Event</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-purple-50 w-10 h-10 rounded-xl flex items-center justify-center text-purple-600 border border-purple-100 shadow-inner">👥</div>
            <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full tracking-tighter uppercase border border-purple-100">100% online</span>
          </div>
          <p className="font-classy-serif text-[2.8rem] text-slate-900 leading-none">{activeTeamCount}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-3">Team Active</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-red-50 w-10 h-10 rounded-xl flex items-center justify-center text-red-600 border border-red-100 shadow-inner">⚠️</div>
            <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full tracking-tighter uppercase border border-red-100">Need focus</span>
          </div>
          <p className="font-classy-serif text-[2.8rem] text-slate-900 leading-none">{atRiskCount}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-3">At Risk</p>
        </div>
      </div>

      {/* Overall Event Progress Card */}
      <div className="bg-white rounded-[3rem] p-12 md:p-14 shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 relative z-10">
          <div>
            <h2 className="font-classy-serif text-[3rem] text-slate-900 leading-tight tracking-tight">Overall Event Progress</h2>
            <p className="text-slate-500 font-medium text-lg mt-2">Global health of the IIT Madras Talk project</p>
          </div>
          <div className="flex items-baseline font-classy-serif leading-none">
            <span className="text-[7rem] text-indigo-600 font-normal tracking-tighter">{overallProgress}</span>
            <span className="text-[3.5rem] text-indigo-300 ml-1">%</span>
          </div>
        </div>
        <div className="w-full bg-slate-50 rounded-full h-5 overflow-hidden shadow-inner border border-slate-100 relative z-10">
          <div 
            className="bg-indigo-600 h-full transition-all duration-1000 ease-out relative" 
            style={{ width: `${overallProgress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Phase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Pre-Event', stats: preEvent, color: 'indigo' },
          { label: 'During Event', stats: duringEvent, color: 'blue' },
          { label: 'Post-Event', stats: postEvent, color: 'slate' }
        ].map((phase, idx) => (
          <div key={idx} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md group">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-classy-serif text-2xl text-slate-800 tracking-tight">{phase.label}</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{phase.stats.count} Categories</span>
            </div>
            <div className="flex items-baseline font-classy-serif leading-none mb-6">
              <span className="text-[3.8rem] text-slate-900 font-normal tracking-tighter">{phase.stats.progress}</span>
              <span className="text-2xl text-slate-300 ml-0.5">%</span>
            </div>
            <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden border border-slate-50">
              <div 
                className={`bg-${phase.color === 'indigo' ? '[#4361ee]' : phase.color === 'blue' ? '[#3a86ff]' : '[#94a3b8]'} h-full transition-all duration-700`} 
                style={{ width: `${phase.stats.progress}%` }} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* Category Progress List */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-10 md:p-12 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h2 className="font-classy-serif text-[2.4rem] text-slate-900 tracking-tight">Category Progress</h2>
          <div className="relative w-full md:w-96">
            <input 
              type="text" 
              placeholder="Search categories or owners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {filteredCategories.map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => onSelectCategory(cat)}
              className="p-8 md:px-12 hover:bg-slate-50/50 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-8"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h4 className="font-classy-serif text-[1.8rem] text-slate-900 tracking-tight group-hover:text-indigo-900 transition-colors leading-tight">{cat.name}</h4>
                  <div className="flex gap-2">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${
                      cat.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-100' :
                      cat.status === 'blocked' ? 'bg-red-50 text-red-700 border border-red-100 animate-pulse' : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {cat.status.replace('-', ' ')}
                    </span>
                    {cat.priority === 'high' && (
                      <span className="text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">Priority</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{cat.responsiblePersons.join(', ')}</p>
              </div>
              <div className="flex flex-col md:items-end w-full md:w-72">
                <div className="flex justify-between items-baseline w-full mb-2">
                  <div className="flex items-baseline font-classy-serif leading-none">
                    <span className="text-[2rem] text-slate-900 font-normal">{cat.progress}</span>
                    <span className="text-sm text-slate-300 ml-0.5">%</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">DUE {new Date(cat.dueDate).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-50">
                  <div 
                    className={`h-full transition-all duration-700 ${
                      cat.status === 'blocked' ? 'bg-red-500' : 'bg-[#4361ee]'
                    }`} 
                    style={{ width: `${cat.progress}%` }} 
                  />
                </div>
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="py-24 text-center">
              <p className="text-slate-400 italic font-medium text-lg">No matching categories found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)] p-12 md:p-14">
        <div className="flex items-center space-x-4 mb-12">
          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
          <h2 className="font-classy-serif text-[2.4rem] text-slate-900 tracking-tight">Live Activity Feed</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
          {recentActivities.map((activity, idx) => (
            <div key={idx} className="flex items-start space-x-6 p-6 rounded-[2rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-50 group">
              <div className={`mt-1 w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-110 ${
                activity.progressAfter === 100 ? 'bg-green-50 text-green-600 border border-green-100' :
                activity.message.toLowerCase().includes('block') ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
              }`}>
                {activity.progressAfter === 100 ? '✅' : activity.message.toLowerCase().includes('block') ? '⚠️' : '📝'}
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed">
                  <span className="font-black text-slate-900 uppercase tracking-tight text-[11px]">{activity.user}</span>{' '}
                  <span className="text-slate-500 font-medium italic">
                    {activity.progressAfter === 100 ? `finalized "${activity.taskTitle}"` : 
                     activity.message.toLowerCase().includes('block') ? `flagged a critical blocker in "${activity.taskTitle}"` :
                     `noted progress on "${activity.taskTitle}"`}
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-full">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{getTimeAgo(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {recentActivities.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 italic">
              No recent activity recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverallSummary;
