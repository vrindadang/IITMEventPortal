
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
    <div className="space-y-8 animate-fadeIn">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="bg-green-100 p-2 rounded-lg text-green-600">✅</div>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">+3 this week</span>
          </div>
          <p className="text-2xl font-black text-slate-800">{completedTasks}/{totalTasks}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tasks Complete</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">⌛</div>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{EVENT_DATE}</span>
          </div>
          <p className="text-2xl font-black text-slate-800">{daysToGo}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Days Until Event</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">👥</div>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">100% online</span>
          </div>
          <p className="text-2xl font-black text-slate-800">{activeTeamCount}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Team Active</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="bg-red-100 p-2 rounded-lg text-red-600">⚠️</div>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Need focus</span>
          </div>
          <p className="text-2xl font-black text-slate-800">{atRiskCount}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">At Risk</p>
        </div>
      </div>

      {/* Overall Event Progress Card */}
      <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Overall Event Progress</h2>
            <p className="text-slate-500 font-medium">Global health of the IIT Madras Talk project</p>
          </div>
          <div className="text-5xl font-black text-indigo-600">{overallProgress}%</div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner">
          <div 
            className="bg-indigo-600 h-full transition-all duration-1000 ease-out relative" 
            style={{ width: `${overallProgress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Phase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Pre-Event', stats: preEvent, color: 'indigo' },
          { label: 'During Event', stats: duringEvent, color: 'blue' },
          { label: 'Post-Event', stats: postEvent, color: 'slate' }
        ].map((phase, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">{phase.label}</h3>
              <span className="text-[10px] font-bold text-slate-400">{phase.stats.count} Categories</span>
            </div>
            <div className="text-3xl font-black text-slate-800 mb-3">{phase.stats.progress}%</div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`bg-${phase.color}-600 h-full transition-all duration-700`} 
                style={{ width: `${phase.stats.progress}%` }} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* Category Progress List */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-800">Category Progress</h2>
          <div className="relative w-full md:w-80">
            <input 
              type="text" 
              placeholder="Search categories or owners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
            <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredCategories.map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => onSelectCategory(cat)}
              className="p-6 md:px-8 hover:bg-slate-50 transition-colors cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{cat.name}</h4>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    cat.status === 'completed' ? 'bg-green-100 text-green-700' :
                    cat.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {cat.status.replace('-', ' ')}
                  </span>
                  {cat.priority === 'high' && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-amber-100 text-amber-700">High Priority</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium">{cat.responsiblePersons.join(', ')}</p>
              </div>
              <div className="flex flex-col md:items-end w-full md:w-64">
                <div className="flex justify-between w-full mb-1">
                  <span className="text-[10px] font-bold text-slate-800">{cat.progress}%</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Due {new Date(cat.dueDate).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-700 ${
                      cat.status === 'blocked' ? 'bg-red-500' : 'bg-indigo-600'
                    }`} 
                    style={{ width: `${cat.progress}%` }} 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
          <h2 className="text-xl font-bold text-slate-800">Live Activity Feed</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {recentActivities.map((activity, idx) => (
            <div key={idx} className="flex items-start space-x-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
              <div className={`mt-1 p-2 rounded-xl text-lg ${
                activity.progressAfter === 100 ? 'bg-green-100 text-green-600' :
                activity.message.toLowerCase().includes('block') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {activity.progressAfter === 100 ? '✅' : activity.message.toLowerCase().includes('block') ? '⚠️' : '📝'}
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-bold text-slate-800">{activity.user}</span>{' '}
                  <span className="text-slate-500">
                    {activity.progressAfter === 100 ? `completed ${activity.taskTitle}` : 
                     activity.message.toLowerCase().includes('block') ? `flagged blocker in ${activity.taskTitle}` :
                     `updated ${activity.taskTitle}`}
                  </span>
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{getTimeAgo(activity.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OverallSummary;
