
import React, { useState, useMemo } from 'react';
import { Category, Phase, Status, Task } from '../types';
import { EVENT_DATE } from '../constants';

interface DashboardProps {
  categories: Category[];
  overallProgress: number;
  onSelectCategory: (category: Category) => void;
  tasks: Task[];
}

const StatCard: React.FC<{ icon: string; label: string; value: string; trend: string; trendUp: boolean }> = ({ icon, label, value, trend, trendUp }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl">
        {icon}
      </div>
      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trendUp ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
        {trend}
      </div>
    </div>
    <div className="text-2xl font-black text-slate-800">{value}</div>
    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</div>
  </div>
);

const ActivityItem: React.FC<{ user: string; action: string; timeAgo: string; type: 'progress' | 'complete' | 'blocker' }> = ({ user, action, timeAgo, type }) => {
  const getIcon = () => {
    switch (type) {
      case 'complete': return '✅';
      case 'blocker': return '⚠️';
      default: return '📈';
    }
  };
  return (
    <div className="flex items-start space-x-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm shadow-sm">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-700">
          <span className="font-bold text-slate-900">{user}</span> {action}
        </p>
        <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{timeAgo}</p>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ categories, overallProgress, onSelectCategory, tasks }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getPhaseData = (phase: Phase) => {
    const phaseCategories = categories.filter(c => c.phase === phase);
    const progress = phaseCategories.length > 0 
      ? Math.round(phaseCategories.reduce((acc, c) => acc + c.progress, 0) / phaseCategories.length)
      : 0;
    const completedTasks = phaseCategories.filter(c => c.status === 'completed').length;
    return { progress, total: phaseCategories.length, completed: completedTasks };
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.responsiblePersons.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [categories, searchQuery]);

  const preEvent = getPhaseData('pre-event');
  const duringEvent = getPhaseData('during-event');
  const postEvent = getPhaseData('post-event');

  const daysToGo = Math.ceil((new Date(EVENT_DATE).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const blockedTasksCount = tasks.filter(t => t.status === 'blocked').length;

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      default: return 'text-slate-500 bg-slate-100';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Quick Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon="✅" 
          label="Tasks Complete" 
          value={`${completedTasksCount}/${tasks.length}`} 
          trend="+3 this week" 
          trendUp={true} 
        />
        <StatCard 
          icon="⏳" 
          label="Days Until Event" 
          value={daysToGo.toString()} 
          trend="10/03/2026" 
          trendUp={false} 
        />
        <StatCard 
          icon="👥" 
          label="Team Active" 
          value="8" 
          trend="100% online" 
          trendUp={true} 
        />
        <StatCard 
          icon="⚠️" 
          label="At Risk" 
          value={blockedTasksCount.toString()} 
          trend="Need focus" 
          trendUp={false} 
        />
      </div>

      {/* Overall Progress */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Overall Event Progress</h2>
            <p className="text-slate-500">Global health of the IIT Madras Talk project</p>
          </div>
          <div className="text-4xl font-extrabold text-indigo-600">{overallProgress}%</div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
          <div 
            className="bg-indigo-600 h-full transition-all duration-1000 ease-out" 
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Phase Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Pre-Event', data: preEvent, color: 'bg-indigo-600' },
          { label: 'During Event', data: duringEvent, color: 'bg-indigo-500' },
          { label: 'Post-Event', data: postEvent, color: 'bg-indigo-400' }
        ].map((phase, idx) => (
          <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-slate-800 mb-2">{phase.label}</h3>
            <div className="flex items-end justify-between mb-4">
              <span className="text-3xl font-bold text-slate-900">{phase.data.progress}%</span>
              <span className="text-sm text-slate-500">{phase.data.completed}/{phase.data.total} Categories</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className={`${phase.color} h-full transition-all duration-700`} 
                style={{ width: `${phase.data.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Category List & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-xl font-bold text-slate-800">Category Progress</h3>
          <div className="relative w-full md:w-80">
            <input 
              type="text"
              placeholder="Search categories or owners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredCategories.length > 0 ? filteredCategories.map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => onSelectCategory(cat)}
              className="p-6 hover:bg-slate-50 cursor-pointer transition-colors group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <h4 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{cat.name}</h4>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusColor(cat.status)}`}>
                      {cat.status.replace('-', ' ')}
                    </span>
                    {cat.priority === 'high' && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">HIGH PRIORITY</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{cat.responsiblePersons.join(', ')}</p>
                </div>
                <div className="w-full md:w-64">
                  <div className="flex justify-between items-center mb-1 text-sm font-medium">
                    <span className="text-slate-600">{cat.progress}%</span>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-tight">Due {new Date(cat.dueDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-500" 
                      style={{ width: `${cat.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-slate-400 italic">No categories found matching your search.</div>
          )}
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
          Live Activity Feed
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActivityItem 
            user="Ms. Rachneet" 
            action="updated Student Club Participation" 
            timeAgo="2 HOURS AGO" 
            type="progress" 
          />
          <ActivityItem 
            user="Mr. Anmol" 
            action="completed Email Templates task" 
            timeAgo="5 HOURS AGO" 
            type="complete" 
          />
          <ActivityItem 
            user="Ms. Shalini" 
            action="flagged blocker in Campus Publicity" 
            timeAgo="1 DAY AGO" 
            type="blocker" 
          />
          <ActivityItem 
            user="Dr. Anup Naha" 
            action="initiated contact with 20 student clubs" 
            timeAgo="2 DAYS AGO" 
            type="complete" 
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
