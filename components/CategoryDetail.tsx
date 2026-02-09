import React from 'react';
import { Category, Task } from '../types.ts';

interface CategoryDetailProps {
  category: Category;
  tasks: Task[];
  onBack: () => void;
  onUpdateTask: (task: Task) => void;
}

const CategoryDetail: React.FC<CategoryDetailProps> = ({ category, tasks, onBack, onUpdateTask }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'blocked': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-slideUp">
      <button 
        onClick={onBack}
        className="flex items-center text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
      >
        <span className="mr-2">←</span> Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8 bg-indigo-900 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                  {category.phase.replace('-', ' ')}
                </span>
                {category.status === 'blocked' && (
                  <span className="text-xs font-bold uppercase tracking-wider bg-red-500 px-2 py-0.5 rounded animate-pulse">
                    Blocked
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-4">{category.name}</h1>
              <p className="text-indigo-200 max-w-2xl">
                Led by: {category.responsiblePersons.join(', ')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black mb-1">{category.progress}%</div>
              <div className="text-sm text-indigo-300">Target: {new Date(category.dueDate).toLocaleDateString('en-GB')}</div>
            </div>
          </div>
          <div className="mt-8 w-full bg-indigo-950/50 rounded-full h-3 overflow-hidden">
            <div className="bg-white h-full" style={{ width: `${category.progress}%` }} />
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <p className="text-lg font-bold text-slate-800 capitalize">{category.status.replace('-', ' ')}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Priority</p>
              <p className="text-lg font-bold text-slate-800 capitalize">{category.priority}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Tasks</p>
              <p className="text-lg font-bold text-slate-800">{tasks.length}</p>
            </div>
          </div>

          {/* Tasks List */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Tasks ({tasks.length})</h2>
              <button className="text-sm bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-100">
                + Add Task
              </button>
            </div>
            <div className="space-y-4">
              {tasks.length > 0 ? tasks.map(task => (
                <div key={task.id} className="p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{task.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${getStatusBadge(task.status)}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex -space-x-2">
                      {task.assignedTo.map((name, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600" title={name}>
                          {name.split(' ').map(n => n[0]).join('')}
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      Due: {new Date(task.dueDate).toLocaleDateString('en-GB')}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${task.progress}%` }} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{task.progress}%</span>
                    <button 
                      onClick={() => onUpdateTask(task)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Update
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-slate-500">No tasks found for this category.</p>
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="pt-8 border-t border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Recent Activity</h2>
            <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200">
              {tasks.flatMap(t => t.updates).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((update, i) => (
                <div key={i} className="relative pl-8">
                  <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-indigo-500 z-10" />
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800 text-sm">{update.user}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{new Date(update.timestamp).toLocaleString('en-GB')}</span>
                    </div>
                    <p className="text-sm text-slate-600 italic">"{update.message}"</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                        {update.progressBefore}% → {update.progressAfter}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryDetail;