
import React, { useState, useMemo, useEffect } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import CategoryDetail from './components/CategoryDetail.tsx';
import AISmartInsights from './components/AISmartInsights.tsx';
import Login from './components/Login.tsx';
import TeamView from './components/TeamView.tsx';
import Schedule from './components/Schedule.tsx';
import Gallery from './components/Gallery.tsx';
import OverallSummary from './components/OverallSummary.tsx';
import { CATEGORIES, TASKS, USERS } from './constants.ts';
import { Category, Task, Phase, User, Status, NavView, ScheduleItem } from './types.ts';
import { supabase } from './services/supabaseClient.ts';

const PlaceholderView = ({ title, icon }: { title: string, icon: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fadeIn text-center">
    <div className="text-9xl mb-8 grayscale opacity-10 select-none">{icon}</div>
    <h2 className="text-4xl font-black text-slate-800 mb-4">{title}</h2>
    <p className="text-slate-500 max-w-lg text-lg leading-relaxed">
      This module is currently being finalized for the IIT-M Talk Event Management suite. <br/>
      Deployment is scheduled for the pre-event phase.
    </p>
    <div className="mt-12 flex gap-3">
      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"></div>
      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce [animation-delay:-.15s]"></div>
      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // State for task search
  const [taskSearchQuery, setTaskSearchQuery] = useState('');

  // State for Global Task Creation Modal
  const [isGlobalTaskModalOpen, setIsGlobalTaskModalOpen] = useState(false);
  const [globalNewTask, setGlobalNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    categoryId: '',
    dueDate: new Date().toISOString().split('T')[0],
    assignedTo: [],
    scheduleItemId: ''
  });

  // State for inline Category creation
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  // State for Invite Member Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'team-member',
    department: '',
    password: 'password123'
  });

  // State for Progress Update Modal
  const [taskToUpdate, setTaskToUpdate] = useState<Task | null>(null);
  const [tempProgress, setTempProgress] = useState<number>(0);
  const [updateMessage, setUpdateMessage] = useState<string>('');

  // State for Task Editing Modal (Super Admin or Task Owner)
  const [taskBeingEdited, setTaskBeingEdited] = useState<Task | null>(null);

  // Helper to check if current user is authorized to modify a specific task
  const isAuthorizedForTask = (task: Task) => {
    if (!currentUser) return false;
    if (currentUser.role === 'super-admin') return true;
    return task.assignedTo.includes(currentUser.name);
  };

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
          { data: dbTasks, error: tasksErr },
          { data: dbSchedule, error: schedErr },
          { data: dbGallery, error: galleryErr }
        ] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('categories').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('schedule').select('*').order('s_no', { ascending: true }),
          supabase.from('gallery').select('*')
        ]);

        if (usersErr) console.error("Error fetching users:", usersErr);
        if (catsErr) console.error("Error fetching categories:", catsErr);
        if (tasksErr) console.error("Error fetching tasks:", tasksErr);
        if (schedErr) console.error("Error fetching schedule:", schedErr);
        if (galleryErr) console.error("Error fetching gallery:", galleryErr);

        // Handle Users
        const allUsers = dbUsers && dbUsers.length > 0 ? dbUsers : USERS;
        const hasSuperAdmin = allUsers.some(u => u.role === 'super-admin');
        if (!hasSuperAdmin) {
          const defaultSuperAdmin = USERS.find(u => u.role === 'super-admin');
          setUsers([...allUsers, defaultSuperAdmin!]);
        } else {
          setUsers(allUsers);
        }
        
        // Handle Categories
        if (dbCategories !== null) {
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
          setCategories(mappedCats.length > 0 ? mappedCats : CATEGORIES);
        } else {
          setCategories(CATEGORIES);
        }

        // Handle Tasks
        if (dbTasks !== null) {
          const mappedTasks: Task[] = dbTasks.map(t => {
            const galleryPhotos = dbGallery 
              ? dbGallery.filter(g => g.task_id === t.id).map(g => g.photo_data) 
              : [];
            
            return {
              id: t.id,
              categoryId: t.category_id,
              title: t.title,
              description: t.description,
              assignedTo: t.assigned_to || [],
              status: t.status as Status,
              progress: t.progress,
              dueDate: t.due_date,
              updates: t.updates || [],
              scheduleItemId: t.schedule_item_id,
              attachments: Array.from(new Set([...(t.attachments || []), ...galleryPhotos]))
            };
          });
          // Explicitly handle empty array vs error fallback
          setTasks(mappedTasks.length > 0 ? mappedTasks : (dbTasks.length === 0 ? [] : TASKS));
        } else {
          setTasks(TASKS);
        }

        if (dbSchedule) {
          setSchedule(dbSchedule);
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
  }, [activeView]); 

  const updatedCategories = useMemo(() => {
    return categories.map(cat => {
      const catTasks = tasks.filter(t => t.categoryId === cat.id);
      if (catTasks.length === 0) return { ...cat, progress: 0, status: 'not-started' };
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

  const currentVisibleTasks = useMemo(() => {
    if (!currentUser) return [];
    
    let filtered = tasks;
    
    // Initial scope filter based on view
    if (activeView === 'my-tasks-sub') {
      if (currentUser.role !== 'super-admin') {
        filtered = tasks.filter(t => t.assignedTo.includes(currentUser.name));
      }
    }

    // Apply search filter if query exists
    if (taskSearchQuery.trim()) {
      const query = taskSearchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.description.toLowerCase().includes(query) ||
        t.assignedTo.some(name => name.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [tasks, activeView, currentUser, taskSearchQuery]);

  const handleUpdateTask = (task: Task) => {
    if (!isAuthorizedForTask(task)) return;
    setTaskToUpdate(task);
    setTempProgress(task.progress);
    setUpdateMessage('');
  };

  const submitProgressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToUpdate || !currentUser) return;
    if (!isAuthorizedForTask(taskToUpdate)) return;

    const newStatus = tempProgress === 100 ? 'completed' : tempProgress === 0 ? 'not-started' : 'in-progress';
    
    const newUpdate = {
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      message: updateMessage.trim() || `Progress updated manually to ${tempProgress}%.`,
      progressBefore: taskToUpdate.progress,
      progressAfter: tempProgress
    };

    const updatedTaskUpdates = [newUpdate, ...(taskToUpdate.updates || [])];

    const finalTask: Task = {
      ...taskToUpdate,
      progress: tempProgress,
      status: newStatus,
      updates: updatedTaskUpdates
    };

    // Update local state immediately
    setTasks(prev => prev.map(t => t.id === taskToUpdate.id ? finalTask : t));
    setTaskToUpdate(null);

    // Persist to backend
    try {
      const { error } = await supabase.from('tasks').upsert({
        id: finalTask.id,
        category_id: finalTask.categoryId,
        title: finalTask.title,
        description: finalTask.description,
        assigned_to: finalTask.assignedTo,
        status: finalTask.status,
        progress: finalTask.progress,
        due_date: finalTask.dueDate,
        updates: finalTask.updates,
        schedule_item_id: finalTask.scheduleItemId || null,
        attachments: finalTask.attachments
      });
      
      if (error) throw error;
    } catch (err) {
      console.error("Failed to persist task update to Supabase:", err);
    }
  };

  const handleAddTask = async (categoryId: string, taskData: Partial<Task>) => {
    if (!currentUser) return;

    const assignedTo = currentUser.role === 'super-admin' 
      ? (taskData.assignedTo?.length ? taskData.assignedTo : [currentUser.name])
      : [currentUser.name];

    const newTask: Task = {
      id: `task-${Date.now()}`,
      categoryId,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      assignedTo: assignedTo,
      status: 'not-started',
      progress: 0,
      dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
      updates: [],
      scheduleItemId: taskData.scheduleItemId,
      attachments: []
    };

    setTasks(prev => [...prev, newTask]);

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
        updates: newTask.updates,
        schedule_item_id: newTask.scheduleItemId || null,
        attachments: []
      });
    } catch (err) {
      console.error("Failed to add task to Supabase:", err);
    }
  };

  // Function to add a category on the fly
  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim() || !currentUser) return;
    
    setIsCategoryLoading(true);
    const newCat: Partial<Category> = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      phase: 'pre-event',
      responsiblePersons: [currentUser.name],
      progress: 0,
      status: 'not-started',
      dueDate: '2026-03-10',
      priority: 'medium'
    };

    try {
      const { error } = await supabase.from('categories').insert({
        id: newCat.id,
        name: newCat.name,
        phase: newCat.phase,
        responsible_persons: newCat.responsiblePersons,
        progress: newCat.progress,
        status: newCat.status,
        due_date: newCat.dueDate,
        priority: newCat.priority
      });

      if (error) throw error;

      setCategories(prev => [...prev, newCat as Category]);
      setGlobalNewTask(prev => ({ ...prev, categoryId: newCat.id }));
      setIsAddingNewCategory(false);
      setNewCategoryName('');
    } catch (err) {
      console.error("Failed to create category:", err);
    } finally {
      setIsCategoryLoading(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email || !inviteForm.department) return;

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: inviteForm.name,
      email: inviteForm.email,
      role: (inviteForm.role as any) || 'team-member',
      department: inviteForm.department,
      password: inviteForm.password || 'password123'
    };

    setUsers(prev => [...prev, newUser]);
    
    try {
      const { error } = await supabase.from('users').insert({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        password: newUser.password
      });
      if (error) throw error;
      
      setIsInviteModalOpen(false);
      setInviteForm({
        name: '',
        email: '',
        role: 'team-member',
        department: '',
        password: 'password123'
      });
    } catch (err) {
      console.error("Failed to invite member:", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!currentUser || currentUser.role !== 'super-admin') return;
    
    if (!window.confirm("Are you sure you want to remove this team member? All their login credentials will be revoked.")) {
      return;
    }

    setUsers(prev => prev.filter(u => u.id !== userId));

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to delete user from Supabase:", err);
    }
  };

  const handleEditTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskBeingEdited || !currentUser) return;
    if (!isAuthorizedForTask(taskBeingEdited)) return;

    setTasks(prev => prev.map(t => t.id === taskBeingEdited.id ? taskBeingEdited : t));

    try {
      await supabase.from('tasks').upsert({
        id: taskBeingEdited.id,
        category_id: taskBeingEdited.categoryId,
        title: taskBeingEdited.title,
        description: taskBeingEdited.description,
        assigned_to: taskBeingEdited.assignedTo,
        status: taskBeingEdited.status,
        progress: taskBeingEdited.progress,
        due_date: taskBeingEdited.dueDate,
        updates: taskBeingEdited.updates,
        schedule_item_id: taskBeingEdited.scheduleItemId || null,
        attachments: taskBeingEdited.attachments
      });
      setTaskBeingEdited(null);
    } catch (err) {
      console.error("Failed to update task in Supabase:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!currentUser) return;
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    if (!isAuthorizedForTask(taskToDelete)) return;
    
    if (!window.confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      return;
    }

    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to delete task from Supabase:", err);
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
    if (currentUser?.role !== 'super-admin') return; 
    setGlobalNewTask(prev => {
      const current = prev.assignedTo || [];
      const next = current.includes(name) 
        ? current.filter(n => n !== name)
        : [...current, name];
      return { ...prev, assignedTo: next };
    });
  };

  const toggleEditAssignee = (name: string) => {
    if (!taskBeingEdited) return;
    const current = taskBeingEdited.assignedTo || [];
    const next = current.includes(name) 
      ? current.filter(n => n !== name)
      : [...current, name];
    setTaskBeingEdited({ ...taskBeingEdited, assignedTo: next });
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
      assignedTo: [],
      scheduleItemId: ''
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

  return (
    <Layout 
      activeView={activeView} 
      onNavigate={setActiveView} 
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {(activeView === 'dashboard' || activeView === 'progress') && (
        <>
          {selectedCategory ? (
            <CategoryDetail 
              category={updatedCategories.find(c => c.id === selectedCategory.id)!}
              tasks={tasks.filter(t => t.categoryId === selectedCategory.id)}
              users={users}
              schedule={schedule}
              currentUser={currentUser}
              onBack={() => setSelectedCategory(null)}
              onUpdateTask={handleUpdateTask}
              onEditTask={setTaskBeingEdited}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
            />
          ) : activeView === 'dashboard' ? (
            <Dashboard categories={updatedCategories} overallProgress={overallProgress} onSelectCategory={setSelectedCategory} tasks={tasks} />
          ) : (
             <>
               <OverallSummary 
                 categories={updatedCategories} 
                 tasks={tasks} 
                 users={users} 
                 overallProgress={overallProgress}
                 onSelectCategory={setSelectedCategory}
               />
               <AISmartInsights categories={updatedCategories} tasks={tasks} />
             </>
          )}
        </>
      )}

      {(activeView === 'tasks' || activeView === 'my-tasks-sub' || activeView === 'overall-tasks-list') && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-800">
                {activeView === 'my-tasks-sub' ? 'My Tasks' : (activeView === 'overall-tasks-list' ? 'Overall Tasks' : (currentUser.role === 'super-admin' ? 'Task Management' : 'Event Tasks'))}
              </h2>
              <p className="text-slate-500">
                {activeView === 'my-tasks-sub' 
                  ? 'Your personal responsibilities and assigned tasks.' 
                  : (activeView === 'overall-tasks-list' ? 'Unfiltered view of all project contributions.' : 'Complete overview of tasks for the IIT-M project.')}
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

          {/* Search Bar for Tasks */}
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search tasks by title, description, or member..."
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">🔍</span>
              {taskSearchQuery && (
                <button 
                  onClick={() => setTaskSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          <div className="grid gap-4">
             {currentVisibleTasks.length > 0 ? (
               currentVisibleTasks.map(task => {
                  const linkedEvent = schedule.find(s => s.id === task.scheduleItemId);
                  const isMine = isAuthorizedForTask(task);
                  return (
                    <div key={task.id} className={`bg-white p-6 rounded-xl border ${isMine ? 'border-indigo-300 shadow-md' : 'border-slate-200'} flex flex-col md:flex-row justify-between md:items-center shadow-sm gap-4 hover:border-indigo-400 transition-colors`}>
                      <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-bold text-slate-800 text-lg">{task.title}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${task.status === 'completed' ? 'bg-green-100 text-green-700' : task.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              {task.status.replace('-', ' ')}
                            </span>
                            {linkedEvent && (
                              <span className="text-[9px] font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100 uppercase tracking-tighter">
                                Linked: {linkedEvent.event_transit}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{task.description}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category:</span>
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                {updatedCategories.find(c => c.id === task.categoryId)?.name || 'Uncategorized'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned:</span>
                                <span className="text-[10px] font-medium text-slate-600">{task.assignedTo.join(', ')}</span>
                            </div>
                          </div>
                      </div>
                      <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <div className="text-xl font-black text-slate-800">{task.progress}%</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Progress</div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button 
                              disabled={!isMine}
                              onClick={() => handleUpdateTask(task)}
                              className={`
                                px-6 py-2 rounded-xl font-bold transition-all shadow-sm
                                ${!isMine ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed opacity-60' : (task.progress === 100 ? 'bg-indigo-50 text-indigo-400 border border-indigo-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95')}
                              `}
                            >
                              {task.progress === 100 ? 'Review / Edit' : 'Update Progress'}
                            </button>
                            {isMine && (
                              <>
                                <button 
                                  onClick={() => setTaskBeingEdited(task)}
                                  className="px-6 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-colors border border-indigo-100"
                                >
                                  Edit Details
                                </button>
                                <button 
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="px-6 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors border border-red-100"
                                >
                                  Delete Task
                                </button>
                              </>
                            )}
                          </div>
                      </div>
                    </div>
                  );
               })
             ) : (
               <div className="bg-white py-24 text-center rounded-3xl border border-slate-200 border-dashed">
                 <div className="text-6xl mb-6">{taskSearchQuery ? '🔍' : '🎯'}</div>
                 <h3 className="text-xl font-bold text-slate-800">
                    {taskSearchQuery ? 'No matches found' : 'No tasks found'}
                 </h3>
                 <p className="text-slate-500 mt-2">
                    {taskSearchQuery 
                      ? 'Try adjusting your search query or clear it to see all tasks.' 
                      : 'Click "Create Task" above to start tracking contributions.'}
                 </p>
               </div>
             )}
          </div>
        </div>
      )}

      {activeView === 'team-members' && (
        <div className="space-y-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-800">Team Performance</h2>
                <p className="text-slate-500">Analytics and contribution tracking across all departments.</p>
              </div>
              {currentUser.role === 'super-admin' && (
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all border-b-4 border-indigo-800 active:translate-y-0.5 active:border-b-0"
                >
                  + Invite Member
                </button>
              )}
           </div>
           
           <TeamView 
             users={users} 
             tasks={tasks} 
             currentUser={currentUser} 
             onDeleteUser={handleDeleteUser} 
           />
        </div>
      )}

      {activeView === 'gallery' && <Gallery tasks={tasks} schedule={schedule} currentUser={currentUser} />}
      {activeView === 'approvals' && <PlaceholderView title="Approval Workflow" icon="📥" />}
      {activeView === 'messenger' && <PlaceholderView title="Team Messenger" icon="💬" />}
      {activeView === 'schedule' && <Schedule currentUser={currentUser} />}

      {/* Progress Update Modal */}
      {taskToUpdate && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-md:max-w-[calc(100%-2rem)] max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Update Progress</h2>
                <p className="text-xs text-indigo-300 mt-0.5 truncate max-w-[200px]">{taskToUpdate.title}</p>
              </div>
              <button onClick={() => setTaskToUpdate(null)} className="hover:bg-white/10 p-2 rounded-xl transition-colors text-xl">✕</button>
            </div>
            
            <form onSubmit={submitProgressUpdate} className="p-6 space-y-6">
              <div className="text-center">
                <div className="text-5xl font-black text-indigo-600 mb-2">{tempProgress}%</div>
                <div className="flex items-center space-x-4">
                  <button 
                    type="button"
                    onClick={() => setTempProgress(Math.max(0, tempProgress - 5))}
                    className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-2xl transition-all active:scale-90"
                  >
                    -
                  </button>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="1"
                    value={tempProgress}
                    onChange={(e) => setTempProgress(parseInt(e.target.value))}
                    className="flex-1 accent-indigo-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <button 
                    type="button"
                    onClick={() => setTempProgress(Math.min(100, tempProgress + 5))}
                    className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-2xl transition-all active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Update Message (Optional)</label>
                <textarea 
                  value={updateMessage}
                  onChange={e => setUpdateMessage(e.target.value)}
                  placeholder="What was accomplished?"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none transition-all"
                />
              </div>

              <div className="flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setTaskToUpdate(null)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 border-b-4 border-indigo-800"
                >
                  Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Invite New Member</h2>
                <p className="text-xs text-indigo-300 mt-0.5">Expanding the team for IIT-M Talk.</p>
              </div>
              <button onClick={() => setIsInviteModalOpen(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors text-xl">✕</button>
            </div>
            
            <form onSubmit={handleInviteSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={inviteForm.name}
                  onChange={e => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Dr. John Doe"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                <input 
                  required
                  type="email" 
                  value={inviteForm.email}
                  onChange={e => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g. john@iitm.ac.in"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Department</label>
                  <input 
                    required
                    type="text" 
                    value={inviteForm.department}
                    onChange={e => setInviteForm(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. Logistics"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={e => setInviteForm(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                  >
                    <option value="team-member">Team Member</option>
                    <option value="admin">Admin</option>
                    <option value="super-admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 border-b-4 border-indigo-800"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

              <div className="grid grid-cols-2 gap-4 overflow-visible">
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Category</label>
                    <button 
                      type="button"
                      onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase"
                    >
                      {isAddingNewCategory ? 'Cancel' : '+ Add New'}
                    </button>
                  </div>
                  
                  {isAddingNewCategory ? (
                    <div className="flex flex-col space-y-2 animate-fadeIn">
                      <input 
                        autoFocus
                        type="text"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        placeholder="New category..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all shadow-inner"
                      />
                      <button 
                        type="button"
                        disabled={isCategoryLoading || !newCategoryName.trim()}
                        onClick={handleAddNewCategory}
                        className={`w-full py-2.5 rounded-xl font-bold text-white transition-all shadow-md text-xs border-b-2 ${isCategoryLoading ? 'bg-indigo-300 border-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-800 active:translate-y-0.5 active:border-b-0'}`}
                      >
                        {isCategoryLoading ? 'Processing...' : 'Add & Select'}
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        required
                        value={globalNewTask.categoryId}
                        onChange={e => setGlobalNewTask(prev => ({ ...prev, categoryId: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer transition-all pr-10"
                      >
                        <option value="" disabled>Select category...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Link to Event (Optional)</label>
                  <div className="relative">
                    <select
                      value={globalNewTask.scheduleItemId}
                      onChange={e => setGlobalNewTask(prev => ({ ...prev, scheduleItemId: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer pr-10"
                    >
                      <option value="">No Schedule Link</option>
                      {schedule.map(item => (
                        <option key={item.id} value={item.id}>{item.time} - {item.event_transit}</option>
                      ))}
                    </select>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">🔗</span>
                  </div>
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

              {currentUser.role === 'super-admin' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assign To Member(s)</label>
                  <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto p-1 custom-scrollbar border border-slate-100 rounded-xl">
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
              )}

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
                  disabled={isAddingNewCategory}
                  className={`flex-1 py-4 font-bold rounded-2xl transition-all shadow-lg active:scale-95 border-b-4 ${isAddingNewCategory ? 'bg-slate-300 border-slate-400 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-800'}`}
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin or Owner Task Edit Modal */}
      {taskBeingEdited && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Edit Task Details</h2>
                <p className="text-xs text-indigo-300 mt-0.5">{currentUser.role === 'super-admin' ? 'Admin Override' : 'Personal Assignment Management'}</p>
              </div>
              <button onClick={() => setTaskBeingEdited(null)} className="hover:bg-white/10 p-2 rounded-xl transition-colors text-xl">✕</button>
            </div>
            
            <form onSubmit={handleEditTaskSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Task Title</label>
                <input 
                  required
                  type="text" 
                  value={taskBeingEdited.title}
                  onChange={e => setTaskBeingEdited({ ...taskBeingEdited, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                  <select
                    value={taskBeingEdited.categoryId}
                    onChange={e => setTaskBeingEdited({ ...taskBeingEdited, categoryId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Link to Schedule Event</label>
                  <select
                    value={taskBeingEdited.scheduleItemId || ''}
                    onChange={e => setTaskBeingEdited({ ...taskBeingEdited, scheduleItemId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">No Schedule Link</option>
                    {schedule.map(item => (
                      <option key={item.id} value={item.id}>{item.time} - {item.event_transit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                <textarea 
                  value={taskBeingEdited.description}
                  onChange={e => setTaskBeingEdited({ ...taskBeingEdited, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assigned To</label>
                <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto p-1 custom-scrollbar">
                  {users.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      disabled={currentUser.role !== 'super-admin'}
                      onClick={() => toggleEditAssignee(u.name)}
                      className={`
                        px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border
                        ${taskBeingEdited.assignedTo?.includes(u.name) 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}
                        ${currentUser.role !== 'super-admin' ? 'cursor-not-allowed' : ''}
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
                  onClick={() => setTaskBeingEdited(null)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg border-b-4 border-indigo-800"
                >
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
