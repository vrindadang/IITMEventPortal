import React, { useState, useMemo } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import CategoryDetail from './components/CategoryDetail.tsx';
import AISmartInsights from './components/AISmartInsights.tsx';
import Login from './components/Login.tsx';
import TeamView from './components/TeamView.tsx';
import { CATEGORIES, TASKS, USERS } from './constants.ts';
import { Category, Task, Phase, User } from './types.ts';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'my-tasks' | 'team'>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [tasks, setTasks] = useState<Task[]>(TASKS);

  const updatedCategories = useMemo(() => {
    return categories.map(cat => {
      const catTasks = tasks.filter(t => t.categoryId === cat.id);
      if (catTasks.length === 0) return cat;
      const progress = Math.round(catTasks.reduce((acc, t) => acc + t.progress, 0) / catTasks.length);
      const isBlocked = catTasks.some(t => t.status === 'blocked');
      const isCompleted = catTasks.every(t => t.status === 'completed');
      
      return {
        ...cat,
        progress,
        status: isBlocked ? 'blocked' : isCompleted ? 'completed' : 'in-progress'
      } as Category;
    });
  }, [categories, tasks]);

  const overallProgress = useMemo(() => {
    const weights: Record<Phase, number> = {
      'pre-event': 0.6,
      'during-event': 0.2,
      'post-event': 0.2
    };

    let totalProgress = 0;
    const phases: Phase[] = ['pre-event', 'during-event', 'post-event'];

    phases.forEach(phase => {
      const phaseCats = updatedCategories.filter(c => c.phase === phase);
      const phaseProgress = phaseCats.length > 0 
        ? phaseCats.reduce((acc, c) => acc + c.progress, 0) / phaseCats.length
        : 0;
      totalProgress += phaseProgress * weights[phase];
    });

    return Math.round(totalProgress);
  }, [updatedCategories]);

  const handleUpdateTask = (updatedTask: Task) => {
    if (!currentUser) return;
    
    const newProgress = Math.min(updatedTask.progress + 10, 100);
    const newStatus = newProgress === 100 ? 'completed' : 'in-progress';
    
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? {
      ...t,
      progress: newProgress,
      status: newStatus,
      updates: [{
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        message: `Updated progress to ${newProgress}% via quick update.`,
        progressBefore: updatedTask.progress,
        progressAfter: newProgress
      }, ...t.updates]
    } : t));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedCategory(null);
    setActiveView('dashboard');
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <Layout 
      activeView={activeView} 
      onNavigate={setActiveView} 
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {activeView === 'dashboard' && (
        <>
          {selectedCategory ? (
            <CategoryDetail 
              category={updatedCategories.find(c => c.id === selectedCategory.id)!}
              tasks={tasks.filter(t => t.categoryId === selectedCategory.id)}
              onBack={() => setSelectedCategory(null)}
              onUpdateTask={handleUpdateTask}
            />
          ) : (
            <>
              <Dashboard 
                categories={updatedCategories} 
                overallProgress={overallProgress}
                onSelectCategory={setSelectedCategory}
                tasks={tasks}
              />
              <AISmartInsights categories={updatedCategories} tasks={tasks} />
            </>
          )}
        </>
      )}

      {activeView === 'my-tasks' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-800">My Tasks</h2>
              <p className="text-slate-500">Tasks assigned directly to you or your department</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center space-x-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-bold text-indigo-900">Active Session: {currentUser.name}</span>
            </div>
          </div>
          
          <div className="grid gap-4">
             {tasks.filter(t => t.assignedTo.some(name => name.includes(currentUser.name) || name.includes('Team'))).length > 0 ? (
               tasks.filter(t => t.assignedTo.some(name => name.includes(currentUser.name) || name.includes('Team'))).map(task => (
                  <div key={task.id} className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between md:items-center shadow-sm gap-4">
                     <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-bold text-slate-800 text-lg">{task.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {task.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{task.description}</p>
                        <div className="mt-3 flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category:</span>
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {updatedCategories.find(c => c.id === task.categoryId)?.name}
                          </span>
                        </div>
                     </div>
                     <div className="flex items-center space-x-6">
                        <div className="text-right">
                           <div className="text-xl font-black text-slate-800">{task.progress}%</div>
                           <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Progress</div>
                        </div>
                        <button 
                          onClick={() => handleUpdateTask(task)}
                          className={`
                            px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm
                            ${task.progress === 100 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}
                          `}
                          disabled={task.progress === 100}
                        >
                          {task.progress === 100 ? 'Completed' : 'Update'}
                        </button>
                     </div>
                  </div>
               ))
             ) : (
               <div className="bg-white py-16 text-center rounded-2xl border border-slate-200 border-dashed">
                 <div className="text-4xl mb-4">✨</div>
                 <h3 className="text-lg font-bold text-slate-800">All caught up!</h3>
                 <p className="text-slate-500">You have no pending tasks assigned at the moment.</p>
               </div>
             )}
          </div>
        </div>
      )}

      {activeView === 'team' && (
        <div className="space-y-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-800">Team Performance</h2>
                <p className="text-slate-500">Comprehensive overview of team contributions and task health.</p>
              </div>
              <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
                + Invite Member
              </button>
           </div>
           
           <TeamView users={USERS} tasks={tasks} />
        </div>
      )}
    </Layout>
  );
};

export default App;