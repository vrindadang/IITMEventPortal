
import React, { useState, useEffect } from 'react';
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
  
  // Form States
  const [newAttendee, setNewAttendee] = useState<Partial<Attendee>>({
    name: '',
    designation: '',
    organization: '',
    seating_category: '',
    def_touchpoint: ''
  });
  const [isAddingSeatingCategory, setIsAddingSeatingCategory] = useState(false);
  const [customSeatingCategory, setCustomSeatingCategory] = useState('');
  
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const isSuperAdmin = currentUser.role === 'super-admin';

  useEffect(() => {
    fetchAttendees();
  }, []);

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAttendees(data || []);
    } catch (err) {
      console.error("Error fetching attendees:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendee.name) return;

    const seatingVal = isAddingSeatingCategory 
      ? (customSeatingCategory.trim() || 'General') 
      : (newAttendee.seating_category || 'General');

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('attendees')
        .insert([{
          name: newAttendee.name,
          designation: newAttendee.designation || 'N/A',
          organization: newAttendee.organization || 'N/A',
          seating_category: seatingVal,
          def_touchpoint: newAttendee.def_touchpoint || 'N/A',
          invited_by: currentUser.name
        }])
        .select();

      if (error) throw error;
      
      if (data) {
        setAttendees(prev => [data[0], ...prev]);
        setIsModalOpen(false);
        resetForm();
      }
    } catch (err) {
      console.error("Error adding attendee:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendee || !editNameValue.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('attendees')
        .update({ name: editNameValue.trim() })
        .eq('id', editingAttendee.id);

      if (error) throw error;

      setAttendees(prev => prev.map(a => a.id === editingAttendee.id ? { ...a, name: editNameValue.trim() } : a));
      setIsEditNameModalOpen(false);
      setEditingAttendee(null);
    } catch (err) {
      console.error("Error updating attendee name:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttendee = async (id: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm("Are you sure you want to remove this confirmed attendee?")) return;

    try {
      const { error } = await supabase
        .from('attendees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAttendees(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Error deleting attendee:", err);
    }
  };

  const openEditNameModal = (attendee: Attendee) => {
    setEditingAttendee(attendee);
    setEditNameValue(attendee.name);
    setIsEditNameModalOpen(true);
  };

  const resetForm = () => {
    setNewAttendee({ 
      name: '', 
      designation: '', 
      organization: '',
      seating_category: '',
      def_touchpoint: ''
    });
    setIsAddingSeatingCategory(false);
    setCustomSeatingCategory('');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Syncing Guest List...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Confirmed Attendees</h2>
          <p className="text-slate-500">Official list of guests and delegates for the talk.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center space-x-2 border-b-4 border-indigo-800"
        >
          <span>👤</span>
          <span>Add Attendee</span>
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">S.No.</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Name</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Seating</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Touchpoint</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invited By</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendees.length > 0 ? attendees.map((attendee, index) => (
                <tr key={attendee.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-bold text-slate-400">{index + 1}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800 text-sm">{attendee.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600">{attendee.designation}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-500">{attendee.organization}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-wider">{attendee.seating_category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-slate-500 italic uppercase">{attendee.def_touchpoint}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                        {attendee.invited_by.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-xs font-bold text-indigo-600">{attendee.invited_by}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-3">
                      <button 
                        onClick={() => openEditNameModal(attendee)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                        title="Edit Name"
                      >
                        Edit Name
                      </button>
                      {isSuperAdmin && (
                        <button 
                          onClick={() => handleDeleteAttendee(attendee.id)}
                          className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-100"
                          title="Delete Attendee"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-6 py-24 text-center">
                    <div className="text-6xl mb-4 opacity-10">🎫</div>
                    <p className="text-slate-400 font-medium italic">The guest list is currently empty.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Attendee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Register Confirmed Attendee</h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="hover:bg-white/10 p-2 rounded-xl transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleAddAttendee} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={newAttendee.name}
                  onChange={e => setNewAttendee(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Designation</label>
                <input 
                  type="text" 
                  value={newAttendee.designation}
                  onChange={e => setNewAttendee(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="e.g. Senior Professor"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Organization</label>
                <input 
                  type="text" 
                  value={newAttendee.organization}
                  onChange={e => setNewAttendee(prev => ({ ...prev, organization: e.target.value }))}
                  placeholder="e.g. IIT Madras"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Seating Category</label>
                    <button 
                      type="button"
                      onClick={() => setIsAddingSeatingCategory(!isAddingSeatingCategory)}
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase"
                    >
                      {isAddingSeatingCategory ? 'Cancel' : '+ Add New'}
                    </button>
                  </div>
                  
                  {isAddingSeatingCategory ? (
                    <input 
                      autoFocus
                      type="text"
                      value={customSeatingCategory}
                      onChange={e => setCustomSeatingCategory(e.target.value)}
                      placeholder="Custom category..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                    />
                  ) : (
                    <div className="relative">
                      <select
                        value={newAttendee.seating_category}
                        onChange={e => setNewAttendee(prev => ({ ...prev, seating_category: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer pr-10"
                      >
                        <option value="">Select Category...</option>
                        <option value="VIP">VIP</option>
                        <option value="VVIP">VVIP</option>
                        <option value="Faculty">Faculty</option>
                        <option value="Student">Student</option>
                        <option value="Press">Press</option>
                        <option value="General">General</option>
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">DEF Touchpoint</label>
                  <input 
                    type="text" 
                    value={newAttendee.def_touchpoint}
                    onChange={e => setNewAttendee(prev => ({ ...prev, def_touchpoint: e.target.value }))}
                    placeholder="e.g. South Block"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting || !newAttendee.name}
                  className={`flex-1 py-4 font-bold rounded-2xl transition-all shadow-lg active:scale-95 border-b-4 ${submitting ? 'bg-slate-300 border-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-800'}`}
                >
                  {submitting ? 'Registering...' : 'Add to List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {isEditNameModalOpen && editingAttendee && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Attendee Name</h2>
              <button onClick={() => { setIsEditNameModalOpen(false); setEditingAttendee(null); }} className="hover:bg-white/10 p-2 rounded-xl transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleUpdateName} className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">New Full Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={editNameValue}
                  onChange={e => setEditNameValue(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => { setIsEditNameModalOpen(false); setEditingAttendee(null); }}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting || !editNameValue.trim()}
                  className={`flex-1 py-4 font-bold rounded-2xl transition-all shadow-lg active:scale-95 border-b-4 ${submitting ? 'bg-slate-300 border-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-800'}`}
                >
                  {submitting ? 'Updating...' : 'Update Name'}
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
