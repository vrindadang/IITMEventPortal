
import React, { useState, useEffect } from 'react';
import { Task, ScheduleItem, User, GalleryItem } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';

interface GalleryProps {
  tasks: Task[];
  schedule: ScheduleItem[];
  currentUser: User;
}

const Gallery: React.FC<GalleryProps> = ({ tasks, schedule, currentUser }) => {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Upload State
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Edit State
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);

  const isSuperAdmin = currentUser.role === 'super-admin';

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setGalleryItems(data);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview || !selectedTaskId) return;

    setUploading(true);
    
    const { data: galleryData, error: galleryError } = await supabase
      .from('gallery')
      .insert([{
        task_id: selectedTaskId,
        schedule_item_id: selectedScheduleId || null,
        uploaded_by: currentUser.name,
        photo_data: photoPreview
      }])
      .select();

    if (!galleryError && galleryData) {
      const task = tasks.find(t => t.id === selectedTaskId);
      if (task) {
        const updatedAttachments = [...(task.attachments || []), photoPreview];
        await supabase
          .from('tasks')
          .update({ attachments: updatedAttachments })
          .eq('id', selectedTaskId);
      }
      
      await fetchGallery();
      setIsModalOpen(false);
      resetForm();
    }
    setUploading(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setUploading(true);
    const { error } = await supabase
      .from('gallery')
      .update({
        task_id: selectedTaskId,
        schedule_item_id: selectedScheduleId || null
      })
      .eq('id', editingItem.id);

    if (!error) {
      // Logic for updating task attachments would go here if needed, 
      // but simpler to just refresh gallery for association change.
      await fetchGallery();
      setIsEditModalOpen(false);
      setEditingItem(null);
      resetForm();
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm("Are you sure you want to delete this photo from the gallery?")) return;

    const { error } = await supabase
      .from('gallery')
      .delete()
      .eq('id', id);

    if (!error) {
      setGalleryItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const openEditModal = (item: GalleryItem) => {
    setEditingItem(item);
    setSelectedTaskId(item.task_id);
    setSelectedScheduleId(item.schedule_item_id || '');
    setPhotoPreview(item.photo_data);
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setPhotoPreview(null);
    setSelectedTaskId('');
    setSelectedScheduleId('');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-black tracking-[0.3em] text-[10px] uppercase">Syncing Gallery...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-classy-serif text-[3.8rem] text-slate-900 leading-tight tracking-tight">Event Gallery</h2>
          <p className="text-slate-500 font-medium text-lg">Visual documentation of tasks and event transitions.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#4361ee] text-white px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center space-x-3 border-b-4 border-indigo-800"
        >
          <span className="text-lg">📸</span>
          <span>Upload Photo</span>
        </button>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] w-28">S.No.</th>
                <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Task / Event</th>
                <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Photo uploaded by</th>
                <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Attachment</th>
                <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Display Photo</th>
                <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {galleryItems.length > 0 ? galleryItems.map((item, index) => {
                const task = tasks.find(t => t.id === item.task_id);
                const event = schedule.find(s => s.id === item.schedule_item_id);
                return (
                  <tr key={item.id} className="hover:bg-indigo-50/20 transition-all group">
                    <td className="px-10 py-8 font-classy-serif text-xl text-slate-300">#{(index + 1).toString().padStart(2, '0')}</td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col space-y-1">
                        <span className="font-classy-serif text-[1.8rem] text-slate-900 tracking-tight leading-tight group-hover:text-indigo-900 transition-colors">
                          {task?.title || 'Unknown Task'}
                        </span>
                        {event && (
                          <span className="text-[10px] text-[#4361ee] font-black uppercase tracking-[0.1em]">
                            @ {event.event_transit.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-black text-indigo-600 border border-indigo-200">
                          {item.uploaded_by.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-xs font-bold text-slate-600 tracking-tight">{item.uploaded_by}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IMAGE_DATA.JPG</span>
                    </td>
                    <td className="px-10 py-8">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md transition-transform hover:scale-110 group-hover:shadow-lg">
                        <img 
                          src={item.photo_data} 
                          alt="Thumbnail" 
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewImage(item.photo_data)}
                        />
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center justify-center space-x-3">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          title="Edit Association"
                        >
                          ✏️
                        </button>
                        {isSuperAdmin && (
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            title="Delete Photo"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-10 py-32 text-center">
                    <div className="text-7xl mb-6 opacity-10">📸</div>
                    <p className="text-slate-400 font-medium italic text-lg">No photos uploaded to the gallery yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-lg md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-8 bg-indigo-950 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold uppercase tracking-[0.15em]">Upload Evidence</h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleUpload} className="p-10 space-y-8">
              <div className="flex flex-col items-center">
                {photoPreview ? (
                  <div className="relative w-full aspect-video rounded-[2rem] overflow-hidden border-4 border-indigo-50 group shadow-lg">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="w-full aspect-video rounded-[2rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all shadow-inner">
                    <span className="text-5xl mb-3">📤</span>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Select Visual Proof</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Associate Task</label>
                  <select 
                    required
                    value={selectedTaskId}
                    onChange={e => setSelectedTaskId(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select associated task...</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Link to Roadmap Event</label>
                  <select 
                    value={selectedScheduleId}
                    onChange={e => setSelectedScheduleId(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="">No event link</option>
                    {schedule.map(s => (
                      <option key={s.id} value={s.id}>{s.time} - {s.event_transit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="flex-1 py-5 bg-slate-100 text-slate-500 font-bold uppercase tracking-widest rounded-2xl transition-colors hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={uploading || !photoPreview || !selectedTaskId}
                  className={`flex-1 py-5 font-bold uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 border-b-4 transition-all ${uploading ? 'bg-slate-300 border-slate-400 cursor-not-allowed' : 'bg-[#4361ee] text-white border-indigo-800 hover:bg-indigo-700'}`}
                >
                  {uploading ? 'Syncing...' : 'Save to Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-lg md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-8 bg-indigo-950 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold uppercase tracking-[0.15em]">Modify Association</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingItem(null); resetForm(); }} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-10 space-y-8">
              <div className="w-full aspect-video rounded-[2rem] overflow-hidden border-4 border-indigo-50 shadow-lg">
                <img src={editingItem.photo_data} alt="Editing" className="w-full h-full object-cover" />
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Associate Task</label>
                  <select 
                    required
                    value={selectedTaskId}
                    onChange={e => setSelectedTaskId(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium appearance-none cursor-pointer"
                  >
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Link to Roadmap Event</label>
                  <select 
                    value={selectedScheduleId}
                    onChange={e => setSelectedScheduleId(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="">No event link</option>
                    {schedule.map(s => (
                      <option key={s.id} value={s.id}>{s.time} - {s.event_transit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => { setIsEditModalOpen(false); setEditingItem(null); resetForm(); }}
                  className="flex-1 py-5 bg-slate-100 text-slate-500 font-bold uppercase tracking-widest rounded-2xl transition-colors hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={uploading || !selectedTaskId}
                  className={`flex-1 py-5 font-bold uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 border-b-4 transition-all ${uploading ? 'bg-slate-300 border-slate-400 cursor-not-allowed' : 'bg-[#4361ee] text-white border-indigo-800 hover:bg-indigo-700'}`}
                >
                  {uploading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 bg-slate-950/90 backdrop-blur-xl animate-fadeIn cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-0 right-0 m-4 md:m-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-[210] border border-white/10 backdrop-blur-md"
            >
              <span className="text-2xl block leading-none">✕</span>
            </button>
            <img 
              src={previewImage} 
              alt="Full Preview" 
              className="max-w-full max-h-full object-contain rounded-[2.5rem] shadow-2xl animate-slideUp cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
