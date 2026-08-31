import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Tag, Calendar as CalendarIcon, 
  Users, UploadCloud, Loader2, Check, AlertCircle, X, Briefcase
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

export default function TaskForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeProject } = useProject(); // 👈 Global Brain integration
  
  const initialStatus = searchParams.get('status') || 'todo';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: initialStatus,
    priority: 'Medium',
    tags: [],
    assignees: [],
    startDate: '', 
    dueDate: ''    
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]); // 👈 Replaces MOCK_TEAM
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  const AVAILABLE_TAGS = ['UI/UX', 'Frontend', 'Backend', 'Database', 'Logic', 'DevOps', 'Bug', 'Testing'];

  // --- FETCH ACTUAL TEAM MEMBERS ---
  useEffect(() => {
    if (activeProject) {
      const fetchMembers = async () => {
        setIsLoadingTeam(true);
        try {
          const token = localStorage.getItem('collab_token');
          const response = await fetch(`http://localhost:5000/api/members?projectId=${activeProject._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setTeamMembers(data);
          }
        } catch (err) {
          console.error("Failed to load team members", err);
        } finally {
          setIsLoadingTeam(false);
        }
      };
      fetchMembers();
    }
  }, [activeProject]);

  // --- HANDLERS ---
  const handleTagToggle = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag) 
        : [...prev.tags, tag]
    }));
  };

  const handleAssigneeToggle = (member) => {
    setFormData(prev => {
      const isAssigned = prev.assignees.some(a => a._id === member._id);
      return {
        ...prev,
        assignees: isAssigned
          ? prev.assignees.filter(a => a._id !== member._id)
          : [...prev.assignees, { _id: member._id, name: member.name, profilePic: member.profilePic }]
      };
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (selectedFiles.length + newFiles.length > 5) {
        setError("You can only upload a maximum of 5 attachments.");
        return;
      }
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeProject) {
      setError("You must select an active workspace to create a task.");
      return;
    }
    if (!formData.title.trim()) {
      setError("Task title is required.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('collab_token');
      
      // 🛑 Construct FormData for files + text + arrays + PROJECT ID
      const submitData = new FormData();
      submitData.append('projectId', activeProject._id);
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('status', formData.status);
      submitData.append('priority', formData.priority);
      if (formData.startDate) submitData.append('startDate', formData.startDate);
      if (formData.dueDate) submitData.append('dueDate', formData.dueDate);
      
      // Arrays must be stringified when sent via FormData
      submitData.append('tags', JSON.stringify(formData.tags));
      submitData.append('assignees', JSON.stringify(formData.assignees));

      // Append all physical files
      selectedFiles.forEach((file) => {
        submitData.append('attachments', file);
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/tasks`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}` 
          // Do NOT set Content-Type header when using FormData
        },
        body: submitData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to create task');
      }
      
      navigate('/board');
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  // --- RENDER NO PROJECT STATE ---
  if (!activeProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <Briefcase size={48} className="text-[#FF2D88] mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">No Workspace Selected</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Please select a workspace before creating a task.</p>
        <button onClick={() => navigate('/members')} className="text-[#FF2D88] font-bold text-sm hover:underline">Go to Workspaces</button>
      </div>
    );
  }

  // --- RENDER FORM ---
  return (
    <div className="p-8 w-full max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col animate-fade-in text-gray-900 dark:text-white overflow-y-auto custom-scrollbar">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/board')}
            className="p-2.5 bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-[#FF2D88] shadow-sm transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 tracking-tight">
              <span className="w-8 h-8 rounded-lg bg-[#FF2D88]/10 dark:bg-[#FF2D88]/20 flex items-center justify-center text-[#FF2D88]">
                <Plus size={18} />
              </span>
              Create New Task
            </h1>
            <p className="text-xs text-[#FF2D88] font-bold uppercase tracking-wider mt-1.5">
              Publishing to: {activeProject.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => navigate('/board')}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] hover:opacity-90 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)] flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save Task
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 flex items-center gap-2 flex-shrink-0">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* TWO-COLUMN FORM LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8 flex-1">
        
        {/* LEFT COLUMN: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white dark:bg-[#121629] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Task Title *</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors"
              placeholder="e.g. Architect the MongoDB Schema for Users"
            />

            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6 mb-2 block">Description</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors min-h-[200px] resize-y custom-scrollbar"
              placeholder="Provide a detailed breakdown of what needs to be done..."
            />
          </div>

          {/* Tags & Categories */}
          <div className="bg-white dark:bg-[#121629] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Tag size={14}/> Categories & Tags
            </label>
            <div className="flex flex-wrap gap-2.5">
              {AVAILABLE_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                    formData.tags.includes(tag) 
                      ? 'bg-[#FF2D88]/10 text-[#FF2D88] border-[#FF2D88]/30 shadow-sm' 
                      : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-[#FF2D88]/50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload Dropzone */}
          <div className="bg-white dark:bg-[#121629] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <UploadCloud size={14}/> Attachments (Max 5)
            </label>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl p-10 text-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative group">
              <input 
                type="file" 
                multiple 
                accept=".png,.jpg,.jpeg,.svg,.pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
              <div className="w-14 h-14 bg-[#FF2D88]/10 text-[#FF2D88] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud size={24} />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">SVG, PNG, JPG or PDF (max. 10MB)</p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-5 space-y-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-[#0A0D14] p-3 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[80%]">{file.name}</span>
                    <button type="button" onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500 bg-white dark:bg-white/5 p-1.5 rounded-lg transition-colors shadow-sm">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Settings & Metadata */}
        <div className="space-y-6">
          
          {/* Status & Priority */}
          <div className="bg-white dark:bg-[#121629] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Column Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#FF2D88] appearance-none cursor-pointer"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="in-review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Priority</label>
              <select 
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#FF2D88] appearance-none cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          {/* Timeline & Calendar Dates */}
          <div className="bg-white dark:bg-[#121629] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm space-y-5">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
              <CalendarIcon size={14}/> Schedule
            </label>
            
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Start Date (For Timeline)</label>
              <input 
                type="date" 
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] text-gray-600 dark:text-gray-300 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Due Date</label>
              <input 
                type="date" 
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] text-gray-600 dark:text-gray-300 cursor-pointer"
              />
            </div>
          </div>

          {/* Assignees - DYNAMICALLY LOADED FROM BACKEND */}
          <div className="bg-white dark:bg-[#121629] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col max-h-[400px]">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2 flex-shrink-0">
              <Users size={14}/> Assign Team Members
            </label>
            
            <div className="space-y-2 overflow-y-auto premium-scrollbar pr-2 flex-1">
              {isLoadingTeam ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-[#FF2D88] w-6 h-6" /></div>
              ) : teamMembers.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No team members found.</p>
              ) : (
                teamMembers.map(member => {
                  const isSelected = formData.assignees.some(a => a._id === member._id);
                  return (
                    <div 
                      key={member._id}
                      onClick={() => handleAssigneeToggle(member)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#FF2D88]/10 border-[#FF2D88]/50 shadow-sm' 
                          : 'bg-gray-50 dark:bg-[#0A0D14] border-gray-200 dark:border-white/5 hover:border-[#FF2D88]/30'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-[#FF2D88] flex items-center justify-center text-xs text-white font-bold overflow-hidden">
                        {member.profilePic ? <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover"/> : member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-sm font-bold flex-1 truncate ${isSelected ? 'text-[#FF2D88]' : 'text-gray-700 dark:text-gray-300'}`}>
                        {member.name}
                      </span>
                      {isSelected && <Check size={16} className="text-[#FF2D88]" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}