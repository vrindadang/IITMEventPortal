
import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleItem, Category, Task, TaskUpdate } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';

interface DashboardProps {
  categories: Category[];
  overallProgress: number;
  onSelectCategory: (category: Category | null) => void;
  tasks: Task[];
}

const Dashboard: React.FC<DashboardProps> = ({ categories, overallProgress, onSelectCategory, tasks }) => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedHistoryTask, setSelectedHistoryTask] = useState<Task | null>(null);

  // Calculate real progress per schedule item based on linked tasks
  const scheduleItemProgress = useMemo(() => {
    const progressMap: Record<string, number> = {};
    schedule.forEach(item => {
      const itemTasks = tasks.filter(t => t.scheduleItemId === item.id);
      if (itemTasks.length === 0) {
        progressMap[item.id] = 0;
      } else {
        const avg = itemTasks.reduce((acc, t) => acc + t.progress, 0) / itemTasks.length;
        progressMap[item.id] = Math.round(avg);
      }
    });
    return progressMap;
  }, [schedule, tasks]);

  // Find the "Active Index" (the first node where progress < 100%)
  const activeIndex = useMemo(() => {
    if (schedule.length === 0) return 0;
    const idx = schedule.findIndex(item => (scheduleItemProgress[item.id] || 0) < 100);
    // If all are 100%, set last as active
    return idx === -1 ? schedule.length - 1 : idx;
  }, [schedule, scheduleItemProgress]);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('schedule')
        .select('*')
        .order('s_no', { ascending: true });
      
      if (data) {
        setSchedule(data);
        
        // Focus on the first incomplete item (active node) on load
        const currentActiveIdx = data.findIndex(item => {
          const itemTasks = tasks.filter(t => t.scheduleItemId === item.id);
          const progress = itemTasks.length > 0 
            ? Math.round(itemTasks.reduce((acc, t) => acc + t.progress, 0) / itemTasks.length)
            : 0;
          return progress < 100;
        });
        
        const targetId = currentActiveIdx === -1 ? data[data.length - 1]?.id : data[currentActiveIdx]?.id;
        setSelectedItemId(targetId);
      }
      setLoading(false);
    };

    fetchSchedule();
  }, [tasks]);

  const selectedItem = useMemo(() => 
    schedule.find(item => item.id === selectedItemId), 
  [schedule, selectedItemId]);

  const linkedTasks = useMemo(() => 
    tasks.filter(task => task.scheduleItemId === selectedItemId),
  [tasks, selectedItemId]);

  // Color constants - Satisfying the new requirement for a purely Green/Light Green timeline
  const GREEN = '#22c55e'; // For all tasks completed
  const LIGHT_GREEN = '#86efac'; // For some tasks pending
  const DARK_ORANGE = '#ff6b52'; // Preserved for other UI elements
  
  // The progress line ends exactly at the active index's center
  const timelineProgressWidth = useMemo(() => {
    if (schedule.length <= 1) return 0;
    const totalSegments = schedule.length - 1;
    return (activeIndex / totalSegments) * 100;
  }, [schedule, activeIndex]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-orange-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold animate-pulse tracking-widest text-xs uppercase">Syncing Live Roadmap...</p>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-fadeIn pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-3 block">Live Roadmap</span>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Event Day Sequence</h2>
          <p className="text-slate-400 text-sm mt-3 font-medium">Monitoring sequential progress for IIT-M Talk sessions.</p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Date</p>
          <p className="text-xl font-black text-slate-800">10 March 2026</p>
        </div>
      </div>

      {schedule.length > 0 ? (
        <div className="space-y-12">
          {/* Timeline Visualizer */}
          <div className="relative bg-white rounded-[3rem] border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="overflow-x-auto py-28 px-24 no-scrollbar">
              <div className="relative flex items-center min-w-max">
                
                {/* 1. Background Track Line (Now Green to show the full timeline of tasks) */}
                <div 
                  className="absolute left-0 right-0 h-1.5 rounded-full" 
                  style={{ 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    backgroundColor: GREEN // Set to Green as requested
                  }} 
                />
                
                {/* 2. Progress Overlay Line */}
                <div 
                  className="absolute left-0 h-1.5 transition-all duration-1000 ease-in-out z-10 rounded-full" 
                  style={{ 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    width: `${timelineProgressWidth}%`,
                    backgroundColor: GREEN, // Overlay matches the track
                  }}
                />
                
                {schedule.map((item, index) => {
                  const isSelected = selectedItemId === item.id;
                  
                  // Task Status Logic for Node Colors
                  const itemTasks = tasks.filter(t => t.scheduleItemId === item.id);
                  const hasTasks = itemTasks.length > 0;
                  const allTasksCompleted = hasTasks && itemTasks.every(t => t.progress === 100);
                  const someTasksPending = hasTasks && itemTasks.some(t => t.progress < 100);
                  
                  // Node Color determination: Green if done, Light Green if pending. No grey.
                  let nodeColor = LIGHT_GREEN;
                  if (allTasksCompleted) {
                    nodeColor = GREEN;
                  } else if (someTasksPending || index === activeIndex) {
                    nodeColor = LIGHT_GREEN;
                  } else if (index < activeIndex) {
                    // Items before the active one are considered completed/green
                    nodeColor = GREEN; 
                  } else {
                    // Future items with no tasks are considered pending/light green
                    nodeColor = LIGHT_GREEN;
                  }
                  
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedItemId(item.id)}
                      className={`flex flex-col items-center relative z-20 mx-16 cursor-pointer group transition-all duration-500`}
                    >
                      {/* Time Bubble */}
                      <div className="absolute -top-16">
                        <span className={`
                          text-[10px] font-black px-4 py-1.5 rounded-full border transition-all
                          ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-110' : 'bg-white border-slate-200 text-slate-400'}
                        `}>
                          {item.time}
                        </span>
                      </div>

                      {/* Circle Node - Pulse if Selected */}
                      <div 
                        className={`
                          rounded-full flex items-center justify-center transition-all duration-500 border-4
                          ${isSelected ? 'w-16 h-16 shadow-2xl animate-pulse scale-110' : 'w-14 h-14'}
                        `}
                        style={{ 
                          backgroundColor: nodeColor,
                          borderColor: isSelected ? 'rgba(255,255,255,0.8)' : nodeColor
                        }}
                      >
                        {allTasksCompleted && (
                          <span className="text-white text-lg font-black leading-none">✓</span>
                        )}
                        {isSelected && !allTasksCompleted && (
                          <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        )}
                        {!allTasksCompleted && !isSelected && (
                           <div className="w-2 h-2 rounded-full bg-white/40" />
                        )}
                      </div>

                      {/* Labels */}
                      <div className="absolute top-20 flex flex-col items-center w-48 text-center">
                        <h4 className={`
                          text-[11px] leading-tight uppercase tracking-tight transition-all duration-300 mb-1
                          ${allTasksCompleted ? 'text-green-600 font-black' : (isSelected ? 'text-indigo-600 font-black' : 'text-slate-400 font-bold')}
                        `}>
                          {item.event_transit}
                        </h4>
                        
                        <div className="flex items-center">
                          {allTasksCompleted ? (
                            <span className="text-[9px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded border border-green-100">
                              VERIFIED
                            </span>
                          ) : someTasksPending ? (
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                              IN PROGRESS
                            </span>
                          ) : isSelected ? (
                            <span className="text-[9px] font-black text-white uppercase tracking-widest bg-indigo-600 px-2.5 py-1 rounded shadow-sm">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                              {item.duration || 'WAIT'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed Selection Info */}
          {selectedItem && (
            <div className="animate-slideUp space-y-6">
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-slate-900" />
                <h3 className="text-xl font-black text-slate-800 mb-5 flex items-center">
                  <span className="mr-3 p-2 bg-slate-50 rounded-xl">📄</span>
                  Session Guidelines
                </h3>
                <div className="text-slate-600 leading-relaxed font-medium bg-slate-50/70 p-8 rounded-[2rem] border border-slate-100 italic">
                  {selectedItem.description || `Management protocol for ${selectedItem.event_transit}. Ensure all linked tasks are verified by lead team members before transitioning.`}
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                   <h3 className="text-xl font-black text-slate-800 flex items-center">
                     <span className="mr-3 p-2 bg-green-50 rounded-xl">📋</span>
                     Task Verification
                   </h3>
                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                     {linkedTasks.length} Tracked Contributions
                   </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white">
                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">S.No.</th>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Activity Name</th>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Members</th>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Sync</th>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Media</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedTasks.length > 0 ? linkedTasks.map((task, idx) => (
                        <tr key={task.id} className="hover:bg-slate-50 transition-all duration-300">
                          <td className="px-10 py-6 text-sm font-bold text-slate-400">#{(idx + 1).toString().padStart(2, '0')}</td>
                          <td className="px-10 py-6">
                            <div>
                              <p className="font-bold text-slate-800 text-sm leading-tight">{task.title}</p>
                              <p className="text-[10px] text-slate-400 mt-1 font-medium line-clamp-1">{task.description}</p>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex flex-wrap gap-1.5">
                              {task.assignedTo.map((name, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-600 whitespace-nowrap">
                                  {name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <button 
                              onClick={() => setSelectedHistoryTask(task)}
                              className="flex items-center space-x-4 group/progress hover:bg-indigo-50 px-3 py-2 rounded-2xl transition-all border border-transparent hover:border-indigo-100"
                              title="Click to view update history"
                            >
                              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden min-w-[80px] shadow-inner">
                                <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${task.progress}%` }} />
                              </div>
                              <span className="text-[11px] font-black text-slate-800 group-hover/progress:text-indigo-600">{task.progress}%</span>
                            </button>
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex items-center space-x-2">
                              {task.attachments && task.attachments.length > 0 ? (
                                task.attachments.map((at, i) => (
                                  at.startsWith('data:image') ? (
                                    <div key={i} className="w-11 h-11 rounded-xl overflow-hidden border-2 border-slate-100 shadow-md">
                                      <img src={at} alt="Evidence" className="w-full h-full object-cover" />
                                    </div>
                                  ) : null
                                ))
                              ) : (
                                <span className="text-[10px] font-black text-slate-200 uppercase tracking-tighter italic">No Media</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-10 py-24 text-center">
                            <div className="text-5xl mb-5 opacity-20">📁</div>
                            <p className="text-slate-400 font-bold italic text-sm">No operational tasks linked to this segment.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white py-48 text-center rounded-[4rem] border-2 border-slate-100 border-dashed shadow-sm">
          <div className="text-8xl mb-10 grayscale opacity-10 select-none font-black italic">!</div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Timeline Empty</h3>
          <p className="text-slate-400 mt-4 font-bold max-sm:px-4 max-w-sm mx-auto">Define your event phases to start live tracking.</p>
        </div>
      )}

      {/* Footer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Operations Target</h5>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
            <p className="text-lg font-black text-slate-800 leading-tight">{schedule[activeIndex]?.event_transit || 'N/A'}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Overall Completion</h5>
          <p className="text-3xl font-black text-indigo-600">{overallProgress}% Sync</p>
          <div className="mt-4 w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Mode</h5>
          <p className="text-lg font-black text-slate-800">10 March 2026</p>
          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mt-1">Status: Active Tracking</p>
        </div>
      </div>

      {/* Task History Modal */}
      {selectedHistoryTask && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp border border-indigo-100 flex flex-col max-h-[85vh]">
            <div className="p-8 bg-indigo-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black">Audit Trail</h2>
                <p className="text-xs text-indigo-300 mt-1 font-bold uppercase tracking-wider">{selectedHistoryTask.title}</p>
              </div>
              <button 
                onClick={() => setSelectedHistoryTask(null)} 
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {selectedHistoryTask.updates && selectedHistoryTask.updates.length > 0 ? (
                [...selectedHistoryTask.updates]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((update, idx) => (
                  <div key={idx} className="relative pl-8 pb-8 last:pb-0 border-l-2 border-slate-100 last:border-l-0">
                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm" />
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-black text-slate-800">{update.user}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            {new Date(update.timestamp).toLocaleString('en-GB', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm text-[10px] font-black text-indigo-600">
                          {update.progressBefore}% → {update.progressAfter}%
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed italic">"{update.message}"</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4 opacity-10">📜</div>
                  <p className="text-slate-400 font-bold italic text-sm">No update history found for this task.</p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50 shrink-0">
              <button 
                onClick={() => setSelectedHistoryTask(null)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-lg active:scale-95 border-b-4 border-indigo-800"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
