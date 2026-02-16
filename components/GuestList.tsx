
import React, { useState, useEffect, useMemo } from 'react';
import { User, Attendee } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';

interface GuestListProps {
  currentUser: User;
}

const GuestList: React.FC<GuestListProps> = ({ currentUser }) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [newAttendee, setNewAttendee] = useState<Partial<Attendee>>({ name: '', designation: '', organization: '', seating_category: 'General', count: '1' });
  const [isAddingSeatingCategory, setIsAddingSeatingCategory] = useState(false);
  const [customSeatingCategory, setCustomSeatingCategory] = useState('');
  
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const isSuperAdmin = currentUser.role === 'super-admin';
  const CAPACITY_LIMIT = 850;

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('attendees').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setAttendees(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAttendees(); }, []);

  const totalGuestCount = useMemo(() => {
    return attendees.reduce((acc, curr) => {
      const val = parseInt(curr.count);
      return acc + (isNaN(val) ? 1 : val);
    }, 0);
  }, [attendees]);

  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendee.name) return;
    const seatingVal = isAddingSeatingCategory ? (customSeatingCategory.trim() || 'General') : (newAttendee.seating_category || 'General');
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('attendees').insert([{ name: newAttendee.name, designation: newAttendee.designation || 'N/A', organization: newAttendee.organization || 'N/A', seating_category: seatingVal, count: newAttendee.count || '1', invited_by: currentUser.name }]).select();
      if (error) throw error;
      if (data) { setAttendees(prev => [data[0], ...prev]); setIsModalOpen(false); resetForm(); }
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendee || !editNameValue.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('attendees').update({ name: editNameValue.trim() }).eq('id', editingAttendee.id);
      if (error) throw error;
      setAttendees(prev => prev.map(a => a.id === editingAttendee.id ? { ...a, name: editNameValue.trim() } : a));
      setIsEditNameModalOpen(false);
      setEditingAttendee(null);
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  const handleDeleteAttendee = async (id: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm("Remove attendee?")) return;
    try {
      const { error } = await supabase.from('attendees').delete().eq('id', id);
      if (error) throw error;
      setAttendees(prev => prev.filter(a => a.id !== id));
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setNewAttendee({ name: '', designation: '', organization: '', seating_category: 'General', count: '1' });
    setIsAddingSeatingCategory(false);
    setCustomSeatingCategory('');
  };

  if (loading) return <div className="flex flex-col items-center justify-center min-h-[400px]"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" /><p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Syncing List...</p></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col space-y-2">
        <h2 className="font-classy-serif text-[3.5rem] text-[#1a1a1a] leading-tight">Attendees</h2>
        <p className="text-slate-500 font-medium text-lg">Guest registration & management.</p>
      </div>

      {/* Total Confirmed Highlight Card */}
      <div className="bg-[#1a1c3d] rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden transition-transform hover:scale-[1.01]">
        <p className="text-[11px] font-black text-indigo-300 uppercase tracking-[0.25em] mb-4">TOTAL CONFIRMED</p>
        <div className="flex items-baseline font-classy-serif">
          <span className="text-[5.5rem] font-normal leading-none">{totalGuestCount}</span>
          <span className="text-[3.5rem] text-indigo-400/50 mx-2">/</span>
          <span className="text-[3.5rem] text-indigo-400 font-light opacity-80">{CAPACITY_LIMIT}</span>
        </div>
      </div>

      {/* Add Guest Primary Button */}
      <button 
        onClick={() => setIsModalOpen(true)} 
        className="w-full bg-[#4361ee] text-white py-7 rounded-[2rem] font-bold text-sm tracking-[0.15em] uppercase shadow-[0_20px_40px_rgba(67,97,238,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
      >
        <span className="text-xl font-light">+</span> Add Guest
      </button>

      {/* Attendee List */}
      <div className="space-y-8">
        {attendees.length > 0 ? attendees.map((attendee) => (
          <div key={attendee.id} className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-[0_15px_45px_rgba(0,0,0,0.03)] group transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-start mb-8">
              <div className="space-y-2">
                <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">ENTRY MODE</p>
                <h4 className="font-classy-serif text-[2.2rem] text-[#1a1a1a] leading-tight group-hover:text-indigo-900 transition-colors">
                  {attendee.name}
                </h4>
                <p className="text-sm text-slate-400 font-medium">
                  {attendee.designation} @ {attendee.organization}
                </p>
              </div>
              <div className="bg-[#f5eefc] px-5 py-2 rounded-full border border-[#ece0f8]">
                <span className="text-[10px] font-black text-[#a855f7] uppercase tracking-[0.2em]">
                  {attendee.seating_category}
                </span>
              </div>
            </div>

            <div className="h-[1px] bg-slate-100 w-full mb-8"></div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">PAX:</span>
                <span className="font-classy-serif text-[2.4rem] text-[#1a1a1a]">{attendee.count}</span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { setEditingAttendee(attendee); setEditNameValue(attendee.name); setIsEditNameModalOpen(true); }} 
                  className="px-10 py-4 rounded-full border border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-[0.15em] hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                >
                  Edit
                </button>
                {isSuperAdmin && (
                  <button 
                    onClick={() => handleDeleteAttendee(attendee.id)} 
                    className="p-4 bg-[#fde4e9] text-[#f95d7e] rounded-full hover:bg-[#fad1d9] transition-all active:scale-95 shadow-sm"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          </div>
        )) : (
          <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
             <p className="text-slate-400 italic font-medium">No guests registered for this event yet.</p>
          </div>
        )}
      </div>

      {/* Modals - Standardized with App.tsx styling */}
      {(isModalOpen || isEditNameModalOpen) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-8 bg-indigo-950 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold uppercase tracking-widest">{isModalOpen ? 'Register Guest' : 'Modify Entry'}</h2>
              <button onClick={() => { setIsModalOpen(false); setIsEditNameModalOpen(false); resetForm(); }} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">✕</button>
            </div>
            
            <form onSubmit={isModalOpen ? handleAddAttendee : handleUpdateName} className="p-10 space-y-6">
              {isModalOpen ? (
                <>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Full Name</label>
                    <input required autoFocus type="text" value={newAttendee.name} onChange={e => setNewAttendee(prev => ({ ...prev, name: e.target.value }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder="e.g. Dr. Ramesh" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Designation</label>
                    <input type="text" value={newAttendee.designation} onChange={e => setNewAttendee(prev => ({ ...prev, designation: e.target.value }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder="e.g. Professor" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Organization</label>
                    <input type="text" value={newAttendee.organization} onChange={e => setNewAttendee(prev => ({ ...prev, organization: e.target.value }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder="e.g. IIT-M" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Category</label>
                      <select value={newAttendee.seating_category} onChange={e => setNewAttendee(prev => ({ ...prev, seating_category: e.target.value }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer font-medium">
                        <option value="General">General</option>
                        <option value="VIP">VIP</option>
                        <option value="Press">Press</option>
                        <option value="Faculty">Faculty</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Count (Pax)</label>
                      <input type="number" min="1" value={newAttendee.count} onChange={e => setNewAttendee(prev => ({ ...prev, count: e.target.value }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Modify Name</label>
                  <input required autoFocus type="text" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
                </div>
              )}
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => { setIsModalOpen(false); setIsEditNameModalOpen(false); resetForm(); }} className="flex-1 py-5 bg-slate-100 text-slate-500 font-bold uppercase tracking-widest rounded-2xl transition-colors hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-5 bg-indigo-600 text-white font-bold uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50">
                  {submitting ? 'Syncing...' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestList;
