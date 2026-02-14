
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
      // Auto-adjust serial numbers if they are out of sync or contain gaps
      const needsSync = data.some((item, index) => item.s_no !== index + 1);
      
      if (needsSync && isSuperAdmin) {
        const syncedData = data.map((item, index) => ({
          ...item,
          s_no: index + 1
        }));
        
        // Update database with normalized sequence
        try {
          const { error: syncError } = await supabase
            .from('schedule')
            .upsert(syncedData);
          
          if (!syncError) {
            setSchedule(syncedData);
          } else {
            setSchedule(data);
          }
        } catch (e) {
          console.error("Sync failed:", e);
          setSchedule(data);
        }
      } else {
        setSchedule(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const targetSNo = newItem.s_no || 1;
      const existingAtOrAfter = schedule.filter(item => item.s_no >= targetSNo);

      // If we are inserting in the middle, we need to shift others
      if (existingAtOrAfter.length > 0) {
        const updates = existingAtOrAfter.map(item => ({
          ...item,
          s_no: item.s_no + 1
        }));
        
        const { error: shiftError } = await supabase
          .from('schedule')
          .upsert(updates);
        
        if (shiftError) throw shiftError;
      }

      const { data, error } = await supabase
        .from('schedule')
        .insert([{
          s_no: targetSNo,
          time: newItem.time,
          event_transit: newItem.event_transit,
          duration: newItem.duration
        }])
        .select();

      if (error) throw error;

      if (data) {
        // Refresh local state to ensure all S.Nos are correct
        await fetchSchedule();
        setIsModalOpen(false);
        setNewItem({ 
          s_no: (schedule.length > 0 ? Math.max(...schedule.map(s => s.s_no)) : 0) + 1, 
          time: '', 
          event_transit: '', 
          duration: '' 
        });
      }
    } catch (err) {
      console.error("Error adding schedule row:", err);
      alert("Failed to add row. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !editingItem.id || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('schedule')
        .update({
          s_no: editingItem.s_no,
          time: editingItem.time,
          event_transit: editingItem.event_transit,
          duration: editingItem.duration
        })
        .eq('id', editingItem.id)
        .select();

      if (error) throw error;
      
      if (data) {
        // Refetch to handle any manual S.No. changes that might create gaps
        await fetchSchedule();
        setIsEditModalOpen(false);
        setEditingItem({});
      }
    } catch (err) {
      console.error("Error updating schedule row:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (item: ScheduleItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const triggerInsertBefore = (item: ScheduleItem) => {
    setNewItem({
      s_no: item.s_no,
      time: '',
      event_transit: '',
      duration: ''
    });
    setIsModalOpen(true);
  };

  const triggerInsertAfter = (item: ScheduleItem) => {
    setNewItem({
      s_no: item.s_no + 1,
      time: '',
      event_transit: '',
      duration: ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm("Are you sure you want to delete this schedule row? S.No. of all subsequent rows will be automatically adjusted to maintain the sequence.")) return;
    
    const { error } = await supabase.from('schedule').delete().eq('id', id);
    if (!error) {
      // Re-fetch will trigger the auto-sync logic to fix the gaps left by the deletion
      await fetchSchedule();
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add Editable Heading
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate-800
    
    const splitHeading = doc.splitTextToSize(pdfHeading, 180);
    doc.text(splitHeading, 105, 20, { align: 'center' });
    
    // Generate Table
    autoTable(doc, {
      startY: 20 + (splitHeading.length * 7),
      head: [['S.No.', 'Time', 'Duration', 'Event / Transit']],
      body: schedule.map((item, index) => [index + 1, item.time, item.duration, item.event_transit]),
      headStyles: { 
        fillColor: [79, 70, 229], // Indigo-600
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: { 
        fontSize: 9,
        textColor: [51, 65, 85] // Slate-700
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] // Slate-50
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 }
      },
      theme: 'striped',
      margin: { top: 20, left: 14, right: 14 }
    });
    
    doc.save('IIT-M_Event_Schedule.pdf');
    setIsPdfModalOpen(false);
  };

  if (loading && schedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Loading Schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Event Schedule</h2>
          <p className="text-slate-500">Chronological timeline of the IIT-M Talk sessions and transitions.</p>
        </div>
        <div className="flex items-center space-x-3">
          {isSuperAdmin && (
            <>
              <button 
                onClick={() => setIsPdfModalOpen(true)}
                className="bg-white text-indigo-600 border border-indigo-200 px-6 py-2.5 rounded-xl font-bold shadow-sm hover:bg-indigo-50 transition-all flex items-center space-x-2"
              >
                <span>📄</span>
                <span>Download PDF</span>
              </button>
              <button 
                onClick={() => {
                  setNewItem({ s_no: schedule.length + 1, time: '', event_transit: '', duration: '' });
                  setIsModalOpen(true);
                }}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all border-b-4 border-indigo-800 active:translate-y-0.5 active:border-b-0"
              >
                + Add Schedule Row
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 w-24">S.No.</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 w-48">Time</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 w-40">Duration</th>
                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">Event / Transit</th>
                {isSuperAdmin && <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest w-48 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedule.length > 0 ? schedule.map((item, index) => (
                <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-6 py-5 font-bold text-slate-400 border-r border-slate-50">{index + 1}</td>
                  <td className="px-6 py-5 font-bold text-slate-800 border-r border-slate-50">{item.time}</td>
                  <td className="px-6 py-5 text-slate-500 font-bold border-r border-slate-50">{item.duration}</td>
                  <td className="px-6 py-5 text-slate-700 border-r border-slate-50 font-medium">{item.event_transit}</td>
                  {isSuperAdmin && (
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center space-x-3">
                        <button 
                          onClick={() => triggerInsertBefore(item)}
                          className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-green-600 hover:text-white transition-all border border-green-100"
                          title="Insert New Row Before This"
                        >
                          Ins ↑
                        </button>
                        <button 
                          onClick={() => triggerInsertAfter(item)}
                          className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-green-600 hover:text-white transition-all border border-green-100"
                          title="Insert New Row After This"
                        >
                          Ins ↓
                        </button>
                        <button 
                          onClick={() => handleEditClick(item)}
                          className="text-indigo-400 hover:text-indigo-600 transition-colors"
                          title="Edit Row"
                        >
                          <span className="text-xl">✏️</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Delete Row"
                        >
                          <span className="text-xl">🗑️</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={isSuperAdmin ? 5 : 4} className="px-6 py-24 text-center">
                    <div className="text-4xl mb-4">📅</div>
                    <p className="text-slate-400 italic font-medium">Schedule has not been populated yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Insert Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Insert Schedule Row</h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleAddRow} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">S.No. (Auto-adjusting)</label>
                  <input 
                    required
                    type="number" 
                    value={newItem.s_no}
                    onChange={e => setNewItem(prev => ({ ...prev, s_no: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Time</label>
                  <input 
                    required
                    autoFocus
                    type="text" 
                    placeholder="e.g. 10:30 AM"
                    value={newItem.time}
                    onChange={e => setNewItem(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Duration</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. 45 mins"
                  value={newItem.duration}
                  onChange={e => setNewItem(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Event / Transit</label>
                <input 
                  required
                  type="text" 
                  placeholder="Session name or transit details"
                  value={newItem.event_transit}
                  onChange={e => setNewItem(prev => ({ ...prev, event_transit: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3 font-bold rounded-2xl transition-all shadow-lg active:scale-95 border-b-4 ${isSubmitting ? 'bg-slate-300 border-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-800'}`}
                >
                  {isSubmitting ? 'Shifting & Saving...' : 'Insert Row'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Schedule Row</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingItem({}); }} className="hover:bg-white/10 p-2 rounded-xl transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleUpdateRow} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">S.No.</label>
                  <input 
                    required
                    type="number" 
                    value={editingItem.s_no || 0}
                    onChange={e => setEditingItem(prev => ({ ...prev, s_no: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Time</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. 10:30 AM"
                    value={editingItem.time || ''}
                    onChange={e => setEditingItem(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Duration</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. 45 mins"
                  value={editingItem.duration || ''}
                  onChange={e => setEditingItem(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Event / Transit</label>
                <input 
                  required
                  type="text" 
                  placeholder="Session name or transit details"
                  value={editingItem.event_transit || ''}
                  onChange={e => setEditingItem(prev => ({ ...prev, event_transit: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => { setIsEditModalOpen(false); setEditingItem({}); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3 font-bold rounded-2xl transition-all shadow-lg active:scale-95 border-b-4 ${isSubmitting ? 'bg-slate-300 border-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-800'}`}
                >
                  {isSubmitting ? 'Updating...' : 'Update Row'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Generation Modal (Edit Heading) */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Download Schedule PDF</h2>
              <button onClick={() => setIsPdfModalOpen(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">PDF Document Heading</label>
                <textarea 
                  value={pdfHeading}
                  onChange={e => setPdfHeading(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                  placeholder="Enter the title for your PDF document..."
                />
                <p className="mt-2 text-xs text-slate-400 italic">You can edit the heading above before finalizing the download.</p>
              </div>

              <div className="pt-4 flex space-x-3">
                <button 
                  onClick={() => setIsPdfModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={generatePDF}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 border-b-4 border-indigo-800"
                >
                  Finalize & Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
