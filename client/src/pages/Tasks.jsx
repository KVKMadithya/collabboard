import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, GitCommit, Plus, MoreVertical, MessageSquare, 
  Paperclip, User, AlertCircle, Loader2,
  ArrowUpDown, Check, Briefcase
} from 'lucide-react';
import { useProject } from '../context/ProjectContext'; // 👈 Global Brain Integration

export default function Tasks() {
  const navigate = useNavigate();
  const { activeProject } = useProject(); // 👈 Pulls the active workspace

  // --- STATE ---
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [filterAssignee, setFilterAssignee] = useState('all');

  // --- DATA FETCHING (SANDBOXED TO PROJECT) ---
  useEffect(() => {
    if (activeProject) {
      fetchTasks();
    } else {
      setTasks([]);
      setIsLoading(false);
    }
  }, [activeProject]);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('collab_token');
      // 🛑 Fetch ONLY tasks tied to the active project
      const response = await fetch(`http://localhost:5000/api/tasks?projectId=${activeProject._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch tasks from server');
      const data = await response.json();
      setTasks(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ADVANCED FILTERING & SORTING ENGINE ---
  const uniqueAssignees = [...new Set(tasks.flatMap(t => t.assignees?.map(a => a.name) || []))].filter(Boolean);

  const processedTasks = [...tasks]
    .filter(task => {
      if (filterAssignee === 'all') return true;
      if (filterAssignee === 'unassigned') return !task.assignees || task.assignees.length === 0;
      return task.assignees?.some(a => a.name === filterAssignee);
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now());
      if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'priority') {
        const p = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return (p[b.priority] || 0) - (p[a.priority] || 0);
      }
      return 0;
    });

  // --- KANBAN CONFIGURATION ---
  const columns = [
    { id: 'todo', title: 'To do', color: '#A855F7', border: 'border-purple-500', bg: 'bg-purple-100 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
    { id: 'in-progress', title: 'In progress', color: '#3B82F6', border: 'border-blue-500', bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
    { id: 'in-review', title: 'In review', color: '#EAB308', border: 'border-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400' },
    { id: 'done', title: 'Done', color: '#22C55E', border: 'border-green-500', bg: 'bg-green-100 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400' }
  ];

  const getTasksByStatus = (statusId) => processedTasks.filter(task => task.status === statusId);

  // --- RENDER 1: NO PROJECT SELECTED ---
  if (!activeProject && !isLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center animate-fade-in p-8">
        <div className="max-w-md w-full bg-white dark:bg-[#121629] p-8 rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg">
            <Briefcase size={32} className="text-gray-500 dark:text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Workspace Active</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Please select a project from the top menu or create a new workspace to start managing tasks.
          </p>
          <button 
            onClick={() => navigate('/members')}
            className="w-full bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] hover:opacity-90 text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)]"
          >
            Go to Workspaces
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER 2: LOADING ---
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF2D88] animate-spin" />
      </div>
    );
  }

  // --- RENDER 3: ACTIVE KANBAN BOARD ---
  return (
    <div className="w-full flex flex-col animate-fade-in text-gray-900 dark:text-white" onClick={() => setActiveDropdown(null)}>
      
      {/* Custom Glassmorphic Scrollbar Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        .glass-scroll::-webkit-scrollbar { height: 8px; }
        .glass-scroll::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
        .glass-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
        .glass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 45, 136, 0.5); }
      `}} />

      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {activeProject.name} <span className="font-light opacity-80">Tasks</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {processedTasks.length} sandboxed tasks • {columns.length} columns • Live sync active
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* View Toggles (Board vs Timeline) */}
          <div className="flex bg-gray-100 dark:bg-[#0A0D14]/80 backdrop-blur-xl p-1 rounded-xl border border-gray-200 dark:border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_10px_rgba(255,255,255,0.02)]">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 bg-[#FF2D88] text-white shadow-[0_0_15px_rgba(255,45,136,0.4)]">
              <LayoutGrid size={16} /> Board
            </button>
            <button 
              onClick={() => navigate('/timeline')} 
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5"
            >
              <GitCommit size={16} /> Timeline
            </button>
          </div>

          <div className="w-px h-8 bg-gray-300 dark:bg-white/10 mx-1"></div>

          {/* Assignee Filter Dropdown */}
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee'); }} 
              className={`flex items-center gap-2 bg-white dark:bg-[#121629] border hover:bg-gray-50 dark:hover:bg-white/5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeDropdown === 'assignee' || filterAssignee !== 'all' 
                ? 'border-[#FF2D88] text-[#FF2D88] dark:text-[#FF2D88] shadow-sm' 
                : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 shadow-sm'
              }`}
            >
              <User size={16} /> {filterAssignee === 'all' ? 'Assignee' : filterAssignee}
            </button>
            
            {activeDropdown === 'assignee' && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-1.5 flex flex-col gap-0.5">
                  <button onClick={() => setFilterAssignee('all')} className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                    All Members {filterAssignee === 'all' && <Check size={14} className="text-[#FF2D88]" />}
                  </button>
                  <button onClick={() => setFilterAssignee('unassigned')} className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                    Unassigned {filterAssignee === 'unassigned' && <Check size={14} className="text-[#FF2D88]" />}
                  </button>
                  {uniqueAssignees.length > 0 && <div className="h-px bg-gray-200 dark:bg-white/10 my-1 mx-2"></div>}
                  {uniqueAssignees.map(name => (
                    <button key={name} onClick={() => setFilterAssignee(name)} className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                      {name} {filterAssignee === name && <Check size={14} className="text-[#FF2D88]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'sort' ? null : 'sort'); }} 
              className={`flex items-center gap-2 bg-white dark:bg-[#121629] border hover:bg-gray-50 dark:hover:bg-white/5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeDropdown === 'sort' || sortBy !== 'newest' 
                ? 'border-[#FF2D88] text-[#FF2D88] dark:text-[#FF2D88] shadow-sm' 
                : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 shadow-sm'
              }`}
            >
              <ArrowUpDown size={16} /> Sort
            </button>
            
            {activeDropdown === 'sort' && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-1.5 flex flex-col gap-0.5">
                  <button onClick={() => setSortBy('newest')} className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                    Newest First {sortBy === 'newest' && <Check size={14} className="text-[#FF2D88]" />}
                  </button>
                  <button onClick={() => setSortBy('oldest')} className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                    Oldest First {sortBy === 'oldest' && <Check size={14} className="text-[#FF2D88]" />}
                  </button>
                  <button onClick={() => setSortBy('priority')} className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                    Highest Priority {sortBy === 'priority' && <Check size={14} className="text-[#FF2D88]" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => navigate('/tasks/new')}
            className="bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)] hover:-translate-y-0.5 ml-2"
          >
            <Plus size={18} /> New task
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400 p-4 rounded-xl mb-4 flex items-center gap-2 flex-shrink-0 shadow-sm">
          <AlertCircle size={18} /> {error}. Please ensure the backend server is running.
        </div>
      )}

      {/* THE HOLY GRAIL HEIGHT CALCULATION FOR INFINITY SCROLL FIX */}
      <div 
        className="flex gap-6 overflow-x-auto pb-4 items-stretch glass-scroll"
        style={{ height: 'calc(100vh - 240px)', minHeight: '500px' }}
      >
        
        {columns.map((col) => {
          const colTasks = getTasksByStatus(col.id);
          
          return (
            <div key={col.id} className="min-w-[320px] w-[320px] h-full flex flex-col bg-gray-50 dark:bg-[#0A0D14] rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden">
              
              {/* COLUMN HEADER */}
              <div className={`p-4 border-t-4 ${col.border} flex items-center justify-between bg-white dark:bg-[#121629] flex-shrink-0 border-b border-gray-100 dark:border-transparent`}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: col.color }} />
                  <h3 className="font-bold text-gray-900 dark:text-white tracking-wide">{col.title}</h3>
                  <span className={`${col.bg} ${col.text} text-xs px-2.5 py-1 rounded-md font-bold`}>{colTasks.length}</span>
                </div>
              </div>

              {/* TASK LIST (Hidden internal scrollbar) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 opacity-50">
                    <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">No tasks yet.</p>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div 
                      key={task._id} 
                      onClick={() => navigate(`/tasks/${task._id}`)} 
                      className={`bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 border-l-4 ${col.border} rounded-xl p-4 cursor-pointer hover:border-gray-300 dark:hover:border-white/30 hover:-translate-y-1 transition-all duration-200 group shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex-shrink-0`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                          task.priority === 'High' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20' : 
                          task.priority === 'Medium' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20' : 
                          'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20'
                        }`}>
                          {task.priority || 'Normal'}
                        </span>
                        <button className="text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#FF2D88]">
                          <MoreVertical size={16}/>
                        </button>
                      </div>
                      
                      <h4 className="font-bold text-sm mb-2 text-gray-900 dark:text-white group-hover:text-[#FF2D88] transition-colors leading-snug">{task.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">{task.description}</p>
                      
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {task.tags.map(tag => (
                            <span key={tag} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-[10px] px-2 py-0.5 rounded font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-gray-400 dark:text-gray-500 text-xs pt-4 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-medium"><MessageSquare size={12}/> {task.commentsCount || 0}</span>
                          {task.attachmentsCount > 0 && (
                            <span className="flex items-center gap-1 font-medium"><Paperclip size={12}/> {task.attachmentsCount}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {task.assignees?.length > 0 && (
                            <div className="flex -space-x-1.5 mr-1">
                              {task.assignees.map((a, i) => (
                                <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-[#FF2D88] flex items-center justify-center text-[9px] text-white font-bold border-2 border-white dark:border-[#121629] overflow-hidden" title={a.name}>
                                  {a.profilePic ? <img src={a.profilePic} alt={a.name} className="w-full h-full object-cover"/> : (a.initials || a.name.charAt(0).toUpperCase())}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* BOTTOM COLUMN NEW TASK BUTTON */}
              <div className="mt-auto p-3 border-t border-gray-200 dark:border-white/5 bg-white dark:bg-[#121629] flex-shrink-0">
                <button 
                  onClick={() => navigate(`/tasks/new?status=${col.id}`)} 
                  className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[#FF2D88] dark:hover:text-[#FF2D88] hover:bg-pink-50 dark:hover:bg-[#FF2D88]/10 rounded-lg transition-colors border border-transparent"
                >
                  <Plus size={16} /> Add task
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}