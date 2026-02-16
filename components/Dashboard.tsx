
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

  const scheduleItemProgress = useMemo(() => {
    const progressMap: Record<string, number> = {};
    schedule.forEach(item => {
      const itemTasks = tasks.filter(t => t.scheduleItemId === item.id);
      if (itemTasks.length === 0) progressMap[item.id] = 0;
      else progressMap[item.id] = Math.round(itemTasks.reduce((acc, t) => acc + t.progress, 0) / itemTasks.length);
    });
    return progressMap;
  }, [schedule, tasks]);

  const activeIndex = useMemo(() => {
    if (schedule.length === 0) return 0;
    const idx = schedule.findIndex(item => (scheduleItemProgress[item.id] || 0) < 100);
    return idx === -1 ? schedule.length - 1 : idx;
  }, [schedule, scheduleItemProgress]);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      const { data } = await supabase.from('schedule').select('*').order('s_no', { ascending: true });
      if (data) {
        setSchedule(data);
        const currentActiveIdx = data.findIndex(item => {
          const itemTasks = tasks.filter(t => t.scheduleItemId === item.id);
          const progress = itemTasks.length > 0 ? Math.round(itemTasks.reduce((acc, t) => acc + t.progress, 0) / itemTasks.length) : 0;
          return progress < 100;
        });
        setSelectedItemId(currentActiveIdx === -1 ? data[data.length - 1]?.id : data[currentActiveIdx]?.id);
      }
      setLoading(false);
    };
    fetchSchedule();
  }, [tasks]);

  const selectedItem = useMemo(() => schedule.find(item => item.id === selectedItemId), [schedule, selectedItemId]);
  const linkedTasks = useMemo(() => tasks.filter(task => task.scheduleItemId === selectedItemId), [tasks, selectedItemId]);

  if (loading) return <div className="flex flex-col items-center justify-center min-h-[400px]"><div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" /><p className="text-slate-400 font-black tracking-[0.3em] text-[10px] uppercase">Syncing roadmap...</p></div>;

  return (
    <div className="space-y-10 animate-fadeIn pb-24">
      {/* Header Section */}
      <div className="flex flex-col space-y-6">
        <h2 className="font-classy-serif text-[3.8rem] text-slate-900 leading-tight tracking-tight">Event Roadmap</h2>
        <div className="flex items-center space-x-12">
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">TARGET</span>
            <span className="text-xl font-bold text-slate-900">10 Mar 2026</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">STATUS</span>
            <span className="text-xl font-black text-[#10b981] uppercase tracking-wide">LIVE</span>
          </div>
        </div>
      </div>

      {schedule.length > 0 ? (
        <div className="space-y-8">
          {/* Vertical Roadmap Timeline Card - Scrollable */}
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_15px_50px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="p-12 max-h-[440px] overflow-y-auto custom-scrollbar no-scrollbar">
              <div className="space-y-12">
                {schedule.map((item, index) => {
                  const progress = scheduleItemProgress[item.id] || 0;
                  const isCompleted = progress === 100;
                  const isSelected = selectedItemId === item.id;

                  return (
                    <div key={item.id} className="relative flex items-center group cursor-pointer" onClick={() => setSelectedItemId(item.id)}>
                      {/* Vertical Line Connector */}
                      {index < schedule.length - 1 && (
                        <div className={`absolute left-[24px] top-12 bottom-[-48px] w-[2px] transition-colors duration-500 ${index < activeIndex ? 'bg-[#10b981]' : 'bg-[#e2e8f0]'}`} />
                      )}
                      
                      {/* Status Icon */}
                      <div className="relative z-10 mr-8">
                        {isSelected ? (
                          /* SELECTED PULSING ICON (Matches requested image style) */
                          <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center border-4 border-white shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse">
                            <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                          </div>
                        ) : isCompleted ? (
                          /* COMPLETED (UNSELECTED) ICON */
                          <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center text-white border-4 border-white shadow-md">
                            <span className="text-lg font-bold">✓</span>
                          </div>
                        ) : (
                          /* INCOMPLETE (UNSELECTED) ICON */
                          <div className="w-12 h-12 rounded-full bg-[#d1fae5] flex items-center justify-center border-4 border-white shadow-sm">
                            <div className="w-4 h-[2.5px] bg-[#10b981] rounded-full opacity-60" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <h4 className={`text-sm font-black uppercase tracking-[0.15em] transition-all ${isSelected ? 'text-[#4361ee]' : isCompleted ? 'text-slate-400' : 'text-[#4361ee]'}`}>
                          {item.event_transit}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedItem && (
            <div className="animate-slideUp space-y-6">
              {/* Protocol Card */}
              <div className="bg-white rounded-[2.5rem] border-l-[8px] border-[#8a2be2] shadow-[0_15px_50px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="p-10">
                  <div className="flex items-center mb-8">
                    <span className="text-3xl mr-5">📋</span>
                    <h3 className="font-classy-serif text-[2.4rem] text-slate-900 tracking-tight">Protocol</h3>
                  </div>
                  <div className="bg-[#f8f9fa] p-8 rounded-[2rem] border border-slate-50">
                    <p className="text-slate-500 font-medium italic leading-relaxed text-lg">
                      {selectedItem.description || `Standard operating procedure for ${selectedItem.event_transit}.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Card */}
              <div className="bg-white rounded-[2.5rem] border-l-[8px] border-[#4361ee] shadow-[0_15px_50px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="p-10 flex items-center justify-between border-b border-slate-50">
                  <div className="flex items-center">
                    <span className="text-3xl mr-5">✓</span>
                    <h3 className="font-classy-serif text-[2.4rem] text-slate-900 tracking-tight">Verification</h3>
                  </div>
                  <div className="bg-[#eef2ff] px-6 py-2 rounded-full border border-indigo-100">
                    <span className="text-[10px] font-black text-[#4361ee] uppercase tracking-[0.2em]">{linkedTasks.length} OPS</span>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  {linkedTasks.length > 0 ? linkedTasks.map((task) => (
                    <div key={task.id} className="bg-[#f8f9fa] rounded-[2rem] p-8 flex justify-between items-center group transition-all hover:bg-slate-100/50">
                      <div className="flex-1 pr-6">
                        <p className="font-bold text-slate-900 text-[1.2rem] leading-tight mb-1.5">{task.title}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{task.assignedTo.join(', ')}</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="flex items-baseline font-classy-serif leading-none">
                          <span className="text-5xl text-[#4361ee] font-normal tracking-tighter">{task.progress}</span>
                          <span className="text-2xl text-[#4361ee] opacity-40 ml-0.5">%</span>
                        </div>
                        <button 
                          onClick={() => setSelectedHistoryTask(task)} 
                          className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3 border-b border-transparent hover:border-slate-300 transition-all hover:text-slate-600"
                        >
                          AUDIT LOG
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="py-24 text-center text-slate-300 italic font-medium">No verification items listed for this phase.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white py-48 text-center rounded-[3rem] border-2 border-slate-100 border-dashed"><h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Roadmap Clear</h3></div>
      )}

      {/* Audit Modal */}
      {selectedHistoryTask && (
        <div className="fixed inset-0 z-[160] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-lg md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl overflow-hidden animate-slideUp border border-indigo-100 flex flex-col max-h-[90vh]">
            <div className="p-8 bg-indigo-950 text-white flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                <h2 className="text-lg font-black uppercase tracking-tight">Audit Trail</h2>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] truncate max-w-[200px]">{selectedHistoryTask.title}</span>
              </div>
              <button onClick={() => setSelectedHistoryTask(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">✕</button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-slate-50/50">
              {selectedHistoryTask.updates?.length > 0 ? selectedHistoryTask.updates.map((update, idx) => (
                <div key={idx} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{update.user}</p>
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{update.progressBefore}% → {update.progressAfter}%</span>
                  </div>
                  <p className="text-sm text-slate-500 italic font-medium leading-relaxed">"{update.message}"</p>
                  <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-4">{new Date(update.timestamp).toLocaleString('en-GB')}</p>
                </div>
              )) : (
                <div className="text-center py-10 text-slate-400 font-medium italic">No audit records found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
