
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
        <p className="text-slate-500 font-medium">Loading Gallery...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Event Gallery</h2>
          <p className="text-slate-500">Visual documentation of tasks and event transitions.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center space-x-2 border-b-4 border-indigo-800"
        >
          <span>📸</span>
          <span>Upload Photo</span>
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">S.No.</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task / Event</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Photo uploaded by</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Attachment</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Photo</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {galleryItems.length > 0 ? galleryItems.map((item, index) => {
                const task = tasks.find(t => t.id === item.task_id);
                const event = schedule.find(s => s.id === item.schedule_item_id);
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">{task?.title || 'Unknown Task'}</span>
                        {event && <span className="text-[10px] text-indigo-500 font-black uppercase">@ {event.event_transit}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                          {item.uploaded_by.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-xs font-medium text-slate-600">{item.uploaded_by}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-slate-400">IMAGE_DATA.JPG</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm">
                        <img 
                          src={item.photo_data} 
                          alt="Thumbnail" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => setPreviewImage(item.photo_data)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                          title="Edit Association"
                        >
                          ✏️
                        </button>
                        {isSuperAdmin && (
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
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
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="text-6xl mb-4 opacity-10">📸</div>
                    <p className="text-slate-400 font-medium italic">No photos uploaded to the gallery yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Upload Event Evidence</h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="hover:bg-white/10 p-2 rounded-xl transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-6">
              <div className="flex flex-col items-center">
                {photoPreview ? (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-4 border-indigo-50 group">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="w-full aspect-video rounded-2xl border-4 border-dashed border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                    <span className="text-4xl mb-2">📤</span>
                    <span className="text-sm font-bold text-slate-500">Click to select photo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Relate to Task</label>
                  <select 
                    required
                    value={selectedTaskId}
                    onChange={e => setSelectedTaskId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  >
                    <option value="" disabled>Select the associated task...</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Link to Event (Optional)</label>
                  <select 
                    value={selectedScheduleId}
                    onChange={e => setSelectedScheduleId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  >
                    <option value="">No event link</option>
                    {schedule.map(s => (
                      <option key={s.id} value={s.id}>{s.time} - {s.event_transit}</option>
                    ))}
                  </select>
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
                  disabled={uploading || !photoPreview || !selectedTaskId}
                  className={`flex-1 py-4 font-bold rounded-2xl transition-all shadow-lg active:scale-95 border-b-4 ${uploading ? 'bg-slate-300 border-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-800'}`}
                >
                  {uploading ? 'Uploading...' : 'Save to Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-indigo-100">
            <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Association</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingItem(null); resetForm(); }} className="hover:bg-white/10 p-2 rounded-xl transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              <div className="w-full aspect-video rounded-2xl overflow-hidden border-4 border-indigo-50">
                <img src={editingItem.photo_data} alt="Editing" className="w-full h-full object-cover" />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Relate to Task</label>
                  <select 
                    required
                    value={selectedTaskId}
                    onChange={e => setSelectedTaskId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  >
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Link to Event (Optional)</label>
                  <select 
                    value={selectedScheduleId}
                    onChange={e => setSelectedScheduleId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  >
                    <option value="">No event link</option>
                    {schedule.map(s => (
                      <option key={s.id} value={s.id}>{s.time} - {s.event_transit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => { setIsEditModalOpen(false); setEditingItem(null); resetForm(); }}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={uploading || !selectedTaskId}
                  className={`flex-1 py-4 font-bold rounded-2xl transition-all shadow-lg active:scale-95 border-b-4 ${uploading ? 'bg-slate-300 border-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-800'}`}
                >
                  {uploading ? 'Updating...' : 'Update Association'}
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
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-slideUp cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
