import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, Edit2, Users, Calendar, 
  Paperclip, ShieldAlert, Tag, Loader2, AlertCircle, Clock, X, Save, Trash2
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { apiFetch } from '../utils/api'; // 👈 Centralized API utility

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLeader } = useProject(); 
  
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Decode JWT to get the actual logged-in user's ID
  const token = localStorage.getItem('collab_token');
  let currentUserId = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUserId = payload.id || payload._id;
    } catch (e) {
      console.error("Invalid token format");
    }
  }

  useEffect(() => {
    const fetchTask = async () => {
      try {
        // 👈 Replaced localhost fetch with apiFetch
        const data = await apiFetch(`/api/tasks/${id}`);
        setTask(data);
        
        // Populate the edit form with current data
        setEditForm({
          title: data.title,
          description: data.description,
          priority: data.priority,
          status: data.status,
          startDate: data.startDate ? data.startDate.split('T')[0] : '',
          dueDate: data.dueDate ? data.dueDate.split('T')[0] : ''
        });
      } catch (err) {
        setError(err.message || 'Task not found or server error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [id]);

  const handleSaveChanges = async () => {
    setIsUpdating(true);
    try {
      // 👈 Replaced localhost fetch with apiFetch
      const updatedTask = await apiFetch(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      
      setTask(updatedTask);
      setIsEditing(false); // Close edit mode on success
    } catch (err) {
      alert(err.message || 'Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkAsDone = async () => {
    setIsUpdating(true);
    try {
      // 👈 Replaced localhost fetch with apiFetch
      await apiFetch(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'done' })
      });
      
      navigate('/board');
    } catch (err) {
      alert(err.message || 'Failed to mark task as done');
      setIsUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    const confirmDelete = window.confirm("Are you sure you want to discard and delete this task? This action cannot be undone.");
    if (!confirmDelete) return;

    setIsUpdating(true);
    try {
      // 👈 Replaced localhost fetch with apiFetch
      await apiFetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
      
      navigate('/board');
    } catch (err) {
      alert(err.message || 'Failed to delete task');
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF2D88] animate-spin" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-8 w-full max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400 p-6 rounded-2xl flex items-center gap-3">
          <AlertCircle size={24} /> 
          <div>
            <h3 className="font-bold text-lg">Error loading task</h3>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
        <button onClick={() => navigate('/board')} className="mt-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors w-fit">
          <ArrowLeft size={16} /> Back to Board
        </button>
      </div>
    );
  }

  const isAssigned = task.assignees?.some(a => a._id === currentUserId);
  const canCompleteTask = isAssigned || isLeader;

  return (
    <div className="p-8 w-full max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col animate-fade-in text-gray-900 dark:text-white overflow-y-auto custom-scrollbar">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 flex-shrink-0">
        <div className="flex items-start gap-4 w-full md:w-auto">
          <button 
            onClick={() => navigate('/board')}
            className="p-2.5 mt-1 bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-[#FF2D88]/50 shadow-sm transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {isEditing ? (
                <select 
                  value={editForm.priority}
                  onChange={(e) => setEditForm({...editForm, priority: e.target.value})}
                  className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md border bg-gray-50 dark:bg-[#0A0D14] border-gray-200 dark:border-white/10 focus:outline-none focus:border-[#FF2D88]"
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
              ) : (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-md border ${
                  task.priority === 'High' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30' :
                  task.priority === 'Medium' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30' :
                  'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30'
                }`}>
                  {task.priority || 'Normal'} Priority
                </span>
              )}

              {isEditing ? (
                <select 
                  value={editForm.status}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md border bg-gray-50 dark:bg-[#0A0D14] border-gray-200 dark:border-white/10 focus:outline-none focus:border-[#FF2D88]"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="in-review">In Review</option>
                  <option value="done">Done</option>
                </select>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-md border border-gray-200 dark:border-white/10">
                  Status: {task.status.replace('-', ' ')}
                </span>
              )}
            </div>
            
            {isEditing ? (
              <input 
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                className="text-2xl md:text-3xl font-bold leading-tight w-full bg-transparent border-b-2 border-dashed border-gray-300 dark:border-white/20 focus:outline-none focus:border-[#FF2D88] pb-1 transition-colors"
              />
            ) : (
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">{task.title}</h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    status: task.status,
                    startDate: task.startDate ? task.startDate.split('T')[0] : '',
                    dueDate: task.dueDate ? task.dueDate.split('T')[0] : ''
                  });
                }}
                className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                <X size={16} /> Cancel
              </button>
              <button 
                onClick={handleSaveChanges}
                disabled={isUpdating}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(34,197,94,0.3)]"
              >
                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center gap-2 bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 hover:border-[#FF2D88]/50 hover:text-[#FF2D88] px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm group"
            >
              <Edit2 size={16} className="group-hover:scale-110 transition-transform" /> Edit Task
            </button>
          )}
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8 flex-1">
        
        {/* LEFT COLUMN: Main Information */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white dark:bg-[#121629] p-6 md:p-8 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Edit2 size={16}/> Description
            </h3>
            
            {isEditing ? (
              <textarea 
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                className="w-full min-h-[200px] bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors resize-y custom-scrollbar"
                placeholder="Add task details..."
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {task.description || <span className="italic opacity-60">No description provided for this task.</span>}
              </div>
            )}

            {task.tags?.length > 0 && !isEditing && (
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Tag size={14}/> Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map(tag => (
                    <span key={tag} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs px-3 py-1.5 rounded-lg font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#121629] p-6 md:p-8 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Check size={16}/> Subtasks & Checklist
            </h3>
            <div className="space-y-2">
              {task.subtasks?.length > 0 ? (
                task.subtasks.map((st, i) => (
                  <label key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-[#0A0D14] p-4 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-white/10 cursor-pointer transition-colors">
                    <input type="checkbox" className="accent-[#FF2D88] w-4 h-4 rounded border-gray-300" defaultChecked={st.completed} disabled={isEditing} />
                    <span className={`text-sm font-medium ${st.completed ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'}`}>{st.title}</span>
                  </label>
                ))
              ) : (
                <div className="bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/5 rounded-xl p-6 text-center border-dashed">
                    <p className="text-sm text-gray-500">No subtasks defined.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Metadata & Actions */}
        <div className="space-y-6">
          
          <div className="bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-2xl p-6 space-y-6 shadow-sm">
            <div>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-3 flex items-center gap-2"><Users size={16}/> Assignees</span>
              <div className="flex flex-wrap gap-2">
                {task.assignees?.map((person, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/5 rounded-full px-3 py-1.5" title={person.name}>
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-[#FF2D88] flex items-center justify-center text-[10px] text-white font-bold shadow-sm overflow-hidden">
                      {person.profilePic ? <img src={person.profilePic} alt={person.name} className="w-full h-full object-cover"/> : (person.initials || person.name.charAt(0))}
                    </div>
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-bold">{person.name}</span>
                  </div>
                )) || <span className="text-sm text-gray-500 italic">Unassigned</span>}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-white/5">
              <div>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-2"><Calendar size={14}/> Start Date</span>
                {isEditing ? (
                  <input 
                    type="date" 
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({...editForm, startDate: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF2D88]"
                  />
                ) : (
                  <div className="bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/5 rounded-lg px-4 py-2.5">
                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                      {task.startDate ? new Date(task.startDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-2"><Clock size={14}/> Due Date</span>
                {isEditing ? (
                  <input 
                    type="date" 
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({...editForm, dueDate: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF2D88]"
                  />
                ) : (
                  <div className="bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/5 rounded-lg px-4 py-2.5">
                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <button className="w-full bg-gray-50 dark:bg-[#0A0D14] hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-white py-3 rounded-xl text-sm transition-colors border border-gray-200 dark:border-white/10 flex justify-center items-center gap-2 font-bold shadow-sm">
              <Paperclip size={16} /> View Attachments ({task.attachmentsCount || 0})
            </button>
            
            <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-3">
              {canCompleteTask ? (
                <button 
                  onClick={handleMarkAsDone}
                  disabled={isUpdating || task.status === 'done' || isEditing}
                  className="w-full bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] hover:opacity-90 disabled:opacity-50 disabled:hover:scale-100 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)] hover:shadow-[0_4px_20px_rgba(255,45,136,0.5)] hover:-translate-y-0.5 flex justify-center items-center gap-2"
                >
                  {isUpdating ? <Loader2 size={18} className="animate-spin"/> : <Check size={18} />}
                  {task.status === 'done' ? 'Completed' : 'Mark as Done'}
                </button>
              ) : (
                <div className="relative group">
                  <button disabled className="w-full bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 py-3 rounded-xl text-sm font-bold border border-gray-200 dark:border-white/5 cursor-not-allowed flex justify-center items-center gap-2">
                    <ShieldAlert size={16} /> Action Restricted
                  </button>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-gray-900 dark:bg-[#0A0D14] text-xs text-white dark:text-gray-300 p-3 rounded-xl text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/10 z-50">
                    You must be assigned to this task or be the Team Leader to mark it as complete.
                  </div>
                </div>
              )}

              <button 
                onClick={handleDeleteTask}
                disabled={isUpdating}
                className="w-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 py-3 rounded-xl text-sm font-bold transition-colors flex justify-center items-center gap-2"
              >
                <Trash2 size={16} />
                Delete Task
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}