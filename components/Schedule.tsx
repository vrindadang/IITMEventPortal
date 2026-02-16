
import React, { useState, useEffect } from 'react';
import { ScheduleItem, User } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ScheduleProps {
  currentUser: User;
}

const Schedule: React.FC<ScheduleProps> = ({ currentUser }) => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfHeading, setPdfHeading] = useState('Schedule of visit at IIT-M\n10 March 2026');
  const [newItem, setNewItem] = useState<Partial<ScheduleItem>>({
    s_no: 1,
    time: '',
    event_transit: '',
    duration: ''
  });
  const [editingItem, setEditingItem] = useState<Partial<ScheduleItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperAdmin = currentUser.role === 'super-admin';

  const fetchSchedule = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('schedule')
      .select('*')
      .order('s_no', { ascending: true });
    
    if (data) {
      const needsSync = data.some((item, index) => item.s_no !== index + 1);
      if (needsSync && isSuperAdmin) {
        const syncedData = data.map((item, index) => ({ ...item, s_no: index + 1 }));
        try {
          const { error: syncError } = await supabase.from('schedule').upsert(syncedData);
          if (!syncError) setSchedule(syncedData);
          else setSchedule(data);
        } catch (e) {
          setSchedule(data);
        }
      } else {
        setSchedule(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchSchedule(); }, []);

  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const targetSNo = newItem.s_no || 1;
      const existingAtOrAfter = schedule.filter(item => item.s_no >= targetSNo);
      if (existingAtOrAfter.length > 0) {
        const updates = existingAtOrAfter.map(item => ({ ...item, s_no: item.s_no + 1 }));
        const { error: shiftError } = await supabase.from('schedule').upsert(updates);
        if (shiftError) throw shiftError;
      }
      const { data, error } = await supabase
        .from('schedule')
        .insert([{ s_no: targetSNo, time: newItem.time, event_transit: newItem.event_transit, duration: newItem.duration }])
        .select();
      if (error) throw error;
      if (data) {
        await fetchSchedule();
        setIsModalOpen(false);
        setNewItem({ s_no: schedule.length + 1, time: '', event_transit: '', duration: '' });
      }
    } catch (err) {
      console.error(err);
    } finally { setIsSubmitting(false); }
  };

  const handleUpdateRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !editingItem.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('schedule')
        .update({ s_no: editingItem.s_no, time: editingItem.time, event_transit: editingItem.event_transit, duration: editingItem.duration })
        .eq('id', editingItem.id);
      if (error) throw error;
      await fetchSchedule();
      setIsEditModalOpen(false);
      setEditingItem({});
    } catch (err) {
      console.error(err);
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm("Delete row and auto-adjust S.No?")) return;
    const { error } = await supabase.from('schedule').delete().eq('id', id);
    if (!error) await fetchSchedule();
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setTextColor(30, 41, 59);
    const splitHeading = doc.splitTextToSize(pdfHeading, 180);
    doc.text(splitHeading, 105, 20, { align: 'center' });
    autoTable(doc, {
      startY: 20 + (splitHeading.length * 7),
      head: [['S.No.', 'Time', 'Duration', 'Event / Transit']],
      body: schedule.map((item, index) => [index + 1, item.time, item.duration, item.event_transit]),
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      theme: 'striped',
    });
    doc.save('IIT-M_Event_Schedule.pdf');
    setIsPdfModalOpen(false);
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-classy-serif text-[3.8rem] text-slate-900 leading-tight tracking-tight">Timeline</h2>
          <p className="text-slate-500 font-medium text-lg">Session-by-session flow control.</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {isSuperAdmin && (
            <>
              <button onClick={() => setIsPdfModalOpen(true)} className="flex-shrink-0 bg-white text-indigo-600 border border-indigo-200 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-indigo-50 transition-all flex items-center space-x-2">
                <span>📄 PDF</span>
              </button>
              <button onClick={() => { setNewItem({ s_no: schedule.length + 1 }); setIsModalOpen(true); }} className="flex-shrink-0 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 border-b-4 border-indigo-800">
                + Add Session
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-6">
        {schedule.length > 0 ? schedule.map((item, index) => (
          <div key={item.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-[0_15px_45px_rgba(0,0,0,0.03)] relative overflow-hidden group active:bg-slate-50 transition-colors">
            <div className="absolute top-0 right-0 p-5">
              <span className="font-classy-serif text-sm font-bold text-slate-200">#{(index + 1).toString().padStart(2, '0')}</span>
            </div>
            <div className="flex flex-col space-y-6">
              <div className="flex items-center space-x-3">
                <div className="px-4 py-1.5 bg-[#eef2ff] border border-indigo-100 rounded-full">
                  <span className="text-[11px] font-black text-[#4361ee] uppercase tracking-[0.1em]">{item.time}</span>
                </div>
                <div className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.duration}</span>
                </div>
              </div>
              <div>
                <h4 className="font-classy-serif text-[1.8rem] text-slate-900 uppercase tracking-tight leading-tight group-hover:text-indigo-900 transition-colors">{item.event_transit}</h4>
              </div>
              {isSuperAdmin && (
                <div className="flex items-center space-x-3 pt-6 border-t border-slate-50">
                  <button onClick={() => { setNewItem({ s_no: item.s_no }); setIsModalOpen(true); }} className="flex-1 py-3 bg-green-50 text-green-600 text-[9px] font-black uppercase rounded-xl border border-green-100 tracking-[0.1em]">Ins ↑</button>
                  <button onClick={() => { setNewItem({ s_no: item.s_no + 1 }); setIsModalOpen(true); }} className="flex-1 py-3 bg-green-50 text-green-600 text-[9px] font-black uppercase rounded-xl border border-green-100 tracking-[0.1em]">Ins ↓</button>
                  <button onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">✏️</button>
                  <button onClick={() => handleDelete(item.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all">🗑️</button>
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="bg-white py-24 text-center rounded-[3rem] border-2 border-dashed border-slate-100">
            <p className="text-slate-400 italic font-medium">No sessions tracked.</p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-[3rem] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] w-28">S.No.</th>
              <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] w-56">Time</th>
              <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] w-48">Duration</th>
              <th className="px-10 py-8 font-classy-serif text-lg text-slate-900 font-bold tracking-tight">Event / Transit</th>
              {isSuperAdmin && <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] w-64 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {schedule.map((item, index) => (
              <tr key={item.id} className="hover:bg-indigo-50/20 transition-all group">
                <td className="px-10 py-8 font-classy-serif text-xl text-slate-300">#{(index + 1).toString().padStart(2, '0')}</td>
                <td className="px-10 py-8 font-black text-indigo-600 text-sm tracking-tighter uppercase">{item.time}</td>
                <td className="px-10 py-8 text-slate-500 font-bold text-[11px] uppercase tracking-widest">{item.duration}</td>
                <td className="px-10 py-8 font-classy-serif text-2xl text-slate-900 group-hover:text-indigo-900 transition-colors">{item.event_transit}</td>
                {isSuperAdmin && (
                  <td className="px-10 py-8">
                    <div className="flex items-center justify-center space-x-3">
                      <button onClick={() => { setNewItem({ s_no: item.s_no }); setIsModalOpen(true); }} className="px-3 py-2 bg-green-50 text-green-600 rounded-xl text-[9px] font-black uppercase border border-green-100 hover:bg-green-600 hover:text-white transition-all tracking-[0.1em]">Ins ↑</button>
                      <button onClick={() => { setNewItem({ s_no: item.s_no + 1 }); setIsModalOpen(true); }} className="px-3 py-2 bg-green-50 text-green-600 rounded-xl text-[9px] font-black uppercase border border-green-100 hover:bg-green-600 hover:text-white transition-all tracking-[0.1em]">Ins ↓</button>
                      <button onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} className="p-2.5 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all">✏️</button>
                      <button onClick={() => handleDelete(item.id)} className="p-2.5 hover:bg-red-50 text-red-500 rounded-xl transition-all">🗑️</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Common Modal Wrapper */}
      {(isModalOpen || isEditModalOpen || isPdfModalOpen) && (
        <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-lg md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
             <div className="p-8 bg-indigo-950 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold uppercase tracking-[0.15em]">{isModalOpen ? 'New Session' : isEditModalOpen ? 'Modify Session' : 'Export Schedule'}</h2>
                <button onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); setIsPdfModalOpen(false); }} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">✕</button>
             </div>
             
             {isPdfModalOpen ? (
               <div className="p-10 space-y-8">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Report Header</label>
                    <textarea value={pdfHeading} onChange={e => setPdfHeading(e.target.value)} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none h-40 resize-none font-medium leading-relaxed" />
                  </div>
                  <button onClick={generatePDF} className="w-full py-6 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-[2rem] border-b-4 border-indigo-800 active:scale-95 transition-all shadow-xl">Download PDF Report</button>
               </div>
             ) : (
               <form onSubmit={isModalOpen ? handleAddRow : handleUpdateRow} className="p-10 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sequence</label>
                      <input required type="number" value={isModalOpen ? newItem.s_no : editingItem.s_no} onChange={e => (isModalOpen ? setNewItem : setEditingItem)(prev => ({ ...prev, s_no: parseInt(e.target.value) }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Time Block</label>
                      <input required type="text" value={isModalOpen ? newItem.time : editingItem.time} onChange={e => (isModalOpen ? setNewItem : setEditingItem)(prev => ({ ...prev, time: e.target.value }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 font-medium" placeholder="e.g. 09:00 AM" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Duration</label>
                    <input required type="text" value={isModalOpen ? newItem.duration : editingItem.duration} onChange={e => (isModalOpen ? setNewItem : setEditingItem)(prev => ({ ...prev, duration: e.target.value }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 font-medium" placeholder="e.g. 15 Mins" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Session Description</label>
                    <input required type="text" value={isModalOpen ? newItem.event_transit : editingItem.event_transit} onChange={e => (isModalOpen ? setNewItem : setEditingItem)(prev => ({ ...prev, event_transit: e.target.value }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 font-medium" placeholder="e.g. Welcome Address" />
                  </div>
                  <div className="pt-6 flex gap-4">
                    <button type="button" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }} className="flex-1 py-5 bg-slate-100 text-slate-500 font-bold uppercase tracking-widest rounded-[1.5rem] hover:bg-slate-200 transition-colors">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-5 bg-indigo-600 text-white font-bold uppercase tracking-widest rounded-[1.5rem] border-b-4 border-indigo-800 shadow-xl hover:bg-indigo-700 transition-all">{isSubmitting ? 'Syncing...' : 'Save Session'}</button>
                  </div>
               </form>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
