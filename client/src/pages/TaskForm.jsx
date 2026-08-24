import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Tag, Calendar as CalendarIcon, 
  Users, UploadCloud, Loader2, Check
} from 'lucide-react';

export default function TaskForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Automatically grab the status from the URL if we clicked a specific column's "Add Task" button
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
    startDate: '', // Crucial for Timeline
    dueDate: ''    // Crucial for Calendar
  });

  const [selectedFiles, setSelectedFiles] = useState([]);

  // --- MOCK DATA (Replace with actual API calls later) ---
  const AVAILABLE_TAGS = ['UI/UX', 'Frontend', 'Backend', 'Database', 'Logic', 'DevOps', 'Bug'];
  
  // Once your Members page is done, you will fetch these from your MongoDB Users collection
  const MOCK_TEAM = [
    { name: 'Kavindu', initials: 'K' },
    { name: 'Iruni', initials: 'I' },
    { name: 'Rashmika', initials: 'R' },
    { name: 'Pramod', initials: 'P' }
  ];

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
      const isAssigned = prev.assignees.some(a => a.name === member.name);
      return {
        ...prev,
        assignees: isAssigned
          ? prev.assignees.filter(a => a.name !== member.name)
          : [...prev.assignees, member]
      };
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      // Convert FileList to Array and append to existing files
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      // NOTE: In the future, to send files, we will need to change this to a FormData object (multipart/form-data)
      // For now, we are sending the JSON text data to ensure the task creates properly.
      const response = await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create task');
      
      // Navigate back to the Kanban board upon success
      navigate('/board');
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col animate-fade-in text-gray-900 dark:text-white overflow-y-auto custom-scrollbar">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/board')}
            className="p-2.5 bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white shadow-sm transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#FF2D88]/10 dark:bg-[#FF2D88]/20 flex items-center justify-center text-[#FF2D88]">
                <Plus size={18} />
              </span>
              Create New Task
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Add details, assign team members, and set timeline dates.
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
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* TWO-COLUMN FORM LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
        
        {/* LEFT COLUMN: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#121629] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Task Title *</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors"
              placeholder="e.g. Architect the MongoDB Schema for Users"
            />

            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6 mb-2 block">Description</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors min-h-[200px] resize-y custom-scrollbar"
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
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                    formData.tags.includes(tag) 
                      ? 'bg-[#FF2D88]/10 text-[#FF2D88] border-[#FF2D88]' 
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
              <UploadCloud size={14}/> Attachments
            </label>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative group">
              <input 
                type="file" 
                multiple 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
              <div className="w-12 h-12 bg-[#FF2D88]/10 text-[#FF2D88] rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud size={24} />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">SVG, PNG, JPG or PDF (max. 10MB)</p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-[#0A0D14] p-3 rounded-lg border border-gray-200 dark:border-white/5">
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[80%]">{file.name}</span>
                    <button type="button" onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
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
                className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] appearance-none cursor-pointer"
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
                className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] appearance-none cursor-pointer"
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
                className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF2D88] text-gray-600 dark:text-gray-300"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Due Date</label>
              <input 
                type="date" 
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF2D88] text-gray-600 dark:text-gray-300"
              />
            </div>
          </div>

          {/* Assignees */}
          <div className="bg-white dark:bg-[#121629] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users size={14}/> Assign Team Members
            </label>
            
            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
              {MOCK_TEAM.map(member => {
                const isSelected = formData.assignees.some(a => a.name === member.name);
                return (
                  <div 
                    key={member.name}
                    onClick={() => handleAssigneeToggle(member)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-[#FF2D88]/10 border-[#FF2D88]' 
                        : 'bg-gray-50 dark:bg-[#0A0D14] border-gray-200 dark:border-white/5 hover:border-[#FF2D88]/50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-[#FF2D88] flex items-center justify-center text-xs text-white font-bold">
                      {member.initials}
                    </div>
                    <span className={`text-sm font-medium flex-1 ${isSelected ? 'text-[#FF2D88]' : 'text-gray-700 dark:text-gray-300'}`}>
                      {member.name}
                    </span>
                    {isSelected && <Check size={16} className="text-[#FF2D88]" />}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}