import React, { useState, useMemo, useEffect } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import CategoryDetail from './components/CategoryDetail.tsx';
import AISmartInsights from './components/AISmartInsights.tsx';
import Login from './components/Login.tsx';
import TeamView from './components/TeamView.tsx';
import { CATEGORIES, TASKS, USERS } from './constants.ts';
import { Category, Task, Phase, User, Status } from './types.ts';
import { supabase } from './services/supabaseClient.ts';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'my-tasks' | 'team'>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // State for Global Task Creation Modal (used in My Tasks)
  const [isGlobalTaskModalOpen, setIsGlobalTaskModalOpen] = useState(false);
  const [globalNewTask, setGlobalNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    categoryId: '',
    dueDate: new Date().toISOString().split('T')[0],
    assignedTo: []
  });

  // Persistent Login Check
  useEffect(() => {
    const savedUser = localStorage.getItem('iitm_event_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('iitm_event_user');
      }
    }
  }, []);

  // Fetch data from Supabase on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { data: dbUsers, error: usersErr },
          { data: dbCategories, error: catsErr },
          { data: dbTasks, error: tasksErr }
        ] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('categories').select('*'),
          supabase.from('tasks').select('*')
        ]);

        if (usersErr) console.error("Error fetching users:", usersErr);
        if (catsErr) console.error("Error fetching categories:", catsErr);
        if (tasksErr) console.error("Error fetching tasks:", tasksErr);

        // Merge DB users with Super Admin constant to ensure it's always available
        const allUsers = dbUsers && dbUsers.length > 0 ? dbUsers : USERS;
        const hasSuperAdmin = allUsers.some(u => u.role === 'super-admin');
        if (!hasSuperAdmin) {
          setUsers([...allUsers, USERS.find(u => u.role === 'super-admin')!]);
        } else {
          setUsers(allUsers);
        }
        
        if (dbCategories && dbCategories.length > 0) {
          const mappedCats: Category[] = dbCategories.map(c => ({
            id: c.id,
            name: c.name,
            phase: c.phase,
            responsiblePersons: c.responsible_persons,
            progress: c.progress,
            status: c.status as Status,
            dueDate: c.due_date,
            priority: c.priority
          }));
          setCategories(mappedCats);
        } else {
          setCategories(CATEGORIES);
        }

        if (dbTasks && dbTasks.length > 0) {
          const mappedTasks: Task[] = dbTasks.map(t => ({
            id: t.id,
            categoryId: t.category_id,
            title: t.title,
            description: t.description,
            assignedTo: t.assigned_to,
            status: t.status as Status,
            progress: t.progress,
            dueDate: t.due_date,
            updates: t.updates || []
          }));
          setTasks(mappedTasks);
        } else {
          setTasks(TASKS);
        }
      } catch (err) {
        console.error("Data hydration failed:", err);
        setCategories(CATEGORIES);
        setTasks(TASKS);
        setUsers(USERS);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

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

  const handleUpdateTask = async (updatedTask: Task) => {
    if (!currentUser) return;
    
    const newProgress = Math.min(updatedTask.progress + 10, 100);
    const newStatus = newProgress === 100 ? 'completed' : 'in-progress';
    
    const newUpdate = {
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      message: `Updated progress to ${newProgress}% via quick update.`,
      progressBefore: updatedTask.progress,
      progressAfter: newProgress
    };

    const finalTask: Task = {
      ...updatedTask,
      progress: newProgress,
      status: newStatus,
      updates: [newUpdate, ...updatedTask.updates]
    };

    // Update local state first (Optimistic)
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? finalTask : t));

    // Sync with backend
    try {
      await supabase.from('tasks').upsert({
        id: finalTask.id,
        category_id: finalTask.categoryId,
        title: finalTask.title,
        description: finalTask.description,
        assigned_to: finalTask.assignedTo,
        status: finalTask.status,
        progress: finalTask.progress,
        due_date: finalTask.dueDate,
        updates: finalTask.updates
      });
    } catch (err) {
      console.error("Failed to persist task update to Supabase:", err);
    }
  };

  const handleAddTask = async (categoryId: string, taskData: Partial<Task>) => {
    if (!currentUser) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      categoryId,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      assignedTo: taskData.assignedTo?.length ? taskData.assignedTo : [currentUser.name],
      status: 'not-started',
      progress: 0,
      dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
      updates: []
    };

    // Update local state first
    setTasks(prev => [...prev, newTask]);

    // Sync with backend
    try {
      await supabase.from('tasks').insert({
        id: newTask.id,
        category_id: newTask.categoryId,
        title: newTask.title,
        description: newTask.description,
        assigned_to: newTask.assignedTo,
        status: newTask.status,
        progress: newTask.progress,
        due_date: newTask.dueDate,
        updates: newTask.updates
      });
    } catch (err) {
      console.error("Failed to add task to Supabase:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!currentUser || currentUser.role !== 'super-admin') return;
    
    if (!window.confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      return;
    }

    // Update local state
    setTasks(prev => prev.filter(t => t.id !== taskId));

    // Sync with backend
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to delete task from Supabase:", err);
      // Optional: Refresh data to restore state if deletion failed
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('iitm_event_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('iitm_event_user');
    setSelectedCategory(null);
    setActiveView('dashboard');
  };

  const toggleGlobalAssignee = (name: string) => {
    setGlobalNewTask(prev => {
      const current = prev.assignedTo || [];
      const next = current.includes(name) 
        ? current.filter(n => n !== name)
        : [...current, name];
      return { ...prev, assignedTo: next };
    });
  };

  const handleGlobalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalNewTask.title || !globalNewTask.categoryId) return;
    
    await handleAddTask(globalNewTask.categoryId, globalNewTask);
    setIsGlobalTaskModalOpen(false);
    setGlobalNewTask({
      title: '',
      description: '',
      categoryId: '',
      dueDate: new Date().toISOString().split('T')[0],
      assignedTo: []
    });
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Syncing Event State...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} users={users} />;
  }

  // Filter tasks for "My Tasks" view
  // Super Admin sees ALL tasks for management
  const myVisibleTasks = tasks.filter(t => 
    currentUser.role === 'super-admin' || 
    t.assignedTo.some(name => name.includes(currentUser.name) || name.includes('Team'))
  );

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
              users={users}
              currentUser={currentUser}
              onBack={() => setSelectedCategory(null)}
              onUpdateTask={handleUpdateTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
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
              <h2 className="text-3xl font-bold text-slate-800">
                {currentUser.role === 'super-admin' ? 'Task Management' : 'My Tasks'}
              </h2>
              <p className="text-slate-500">
                {currentUser.role === 'super-admin' 
                  ? 'Overview and management of all event tasks.' 
                  : 'Managing your personal and departmental responsibilities.'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsGlobalTaskModalOpen(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center space-x-2 border-b-4 border-indigo-800 hover:border-b-2 hover:translate-y-0.5"
              >
                <span className="text-xl">+</span>
                <span>Create Task</span>
              </button>
              <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center space-x-2">
                <span className={`w-2 h-2 ${currentUser.role === 'super-admin' ? 'bg-red-500' : 'bg-indigo-500'} rounded-full animate-pulse`}></span>
                <span className="text-sm font-bold text-indigo-900">{currentUser.name}</span>
              </div>
            </div>
          </div>
          
          <div className="grid gap-4">
             {myVisibleTasks.length > 0 ? (
               myVisibleTasks.map(task => (
                  <div key={task.id} className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between md:items-center shadow-sm gap-4 hover:border-indigo-300 transition-colors">
                     <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-bold text-slate-800 text-lg">{task.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${task.status === 'completed' ? 'bg-green-100 text-green-700' : task.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {task.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{task.description}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category:</span>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {updatedCategories.find(c => c.id === task.categoryId)?.name || 'Uncategorized'}
                            </span>
                          </div>
                          {currentUser.role === 'super-admin' && (
                             <div className="flex items-center space-x-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned:</span>
                                <span className="text-[10px] font-medium text-slate-600">{task.assignedTo.join(', ')}</span>
                             </div>
                          )}
                        </div>
                     </div>
                     <div className="flex items-center space-x-6">
                        <div className="text-right">
                           <div className="text-xl font-black text-slate-800">{task.progress}%</div>
                           <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Progress</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => handleUpdateTask(task)}
                            className={`
                              px-6 py-2 rounded-xl font-bold transition-all shadow-sm
                              ${task.progress === 100 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}
                            `}
                            disabled={task.progress === 100}
                          >
                            {task.progress === 100 ? 'Completed' : 'Update'}
                          </button>
                          {currentUser.role === 'super-admin' && (
                             <button 
                               onClick={() => handleDeleteTask(task.id)}
                               className="px-6 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors border border-red-100"
                             >
                               Delete Task
                             </button>
                          )}
                        </div>
                     </div>
                  </div>
               ))
             ) : (
               <div className="bg-white py-24 text-center rounded-3xl border border-slate-200 border-dashed">
                 <div className="text-6xl mb-6">🎯</div>
                 <h3 className="text-xl font-bold text-slate-800">No tasks found</h3>
                 <p className="text-slate-500 mt-2">Click "Create Task" above to start tracking contributions.</p>
               </div>
             )}
          </div>

          {/* Global Task Creation Modal */}
          {isGlobalTaskModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
              <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
                <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">New Task Creation</h2>
                    <p className="text-xs text-indigo-300 mt-0.5">Creating for: {currentUser.name}</p>
                  </div>
                  <button onClick={() => setIsGlobalTaskModalOpen(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors text-xl">✕</button>
                </div>
                
                <form onSubmit={handleGlobalSubmit} className="p-6 space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Task Title</label>
                    <input 
                      autoFocus
                      required
                      type="text" 
                      value={globalNewTask.title}
                      onChange={e => setGlobalNewTask(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="What needs to be done?"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Project Category</label>
                    <div className="relative">
                      <select
                        required
                        value={globalNewTask.categoryId}
                        onChange={e => setGlobalNewTask(prev => ({ ...prev, categoryId: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Select category...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description (Optional)</label>
                    <textarea 
                      value={globalNewTask.description}
                      onChange={e => setGlobalNewTask(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Add specific details or instructions..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Target Due Date</label>
                      <input 
                        type="date" 
                        value={globalNewTask.dueDate}
                        onChange={e => setGlobalNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assign To Member(s)</label>
                    <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto p-1 custom-scrollbar">
                      {users.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleGlobalAssignee(u.name)}
                          className={`
                            px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border
                            ${globalNewTask.assignedTo?.includes(u.name) 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                              : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}
                          `}
                        >
                          {u.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex space-x-3">
                    <button 
                      type="button" 
                      onClick={() => setIsGlobalTaskModalOpen(false)}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 border-b-4 border-indigo-800"
                    >
                      Save Task
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeView === 'team' && (
        <div className="space-y-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-800">Team Performance</h2>
                <p className="text-slate-500">Analytics and contribution tracking across all departments.</p>
              </div>
              <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all border-b-4 border-indigo-800">
                + Invite Member
              </button>
           </div>
           
           <TeamView users={users} tasks={tasks} />
        </div>
      )}
    </Layout>
  );
};

export default App;