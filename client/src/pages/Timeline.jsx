import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, GitCommit, Plus, ArrowLeft, ArrowRight, 
  Loader2, AlertCircle, User, ArrowUpDown, Check, Briefcase, Calendar, X, Edit2
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { apiFetch } from '../utils/api'; // 👈 NEW: Using centralized API utility

export default function Timeline() {
  const navigate = useNavigate();
  const { activeProject } = useProject();

  // --- STATE ---
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- FILTERS & DROPDOWNS ---
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [filterAssignee, setFilterAssignee] = useState('all');

  // --- INLINE EDIT STATE ---
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editDates, setEditDates] = useState({ startDate: '', dueDate: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  // --- TIMELINE DATE STATE ---
  const [currentDate, setCurrentDate] = useState(new Date()); 

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
      // 👈 NEW: Cleaned up fetch using the utility
      const data = await apiFetch(`/api/tasks?projectId=${activeProject._id}`);
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setIsLoading(false);
    }
  };

  // --- INLINE DATE UPDATE LOGIC ---
  const handleUpdateDates = async (taskId) => {
    if (editDates.startDate && editDates.dueDate && new Date(editDates.startDate) > new Date(editDates.dueDate)) {
      alert("Start Date cannot be later than Due Date.");
      return;
    }

    setIsUpdating(true);
    try {
      // 👈 NEW: Cleaned up PUT request using the utility
      const updatedTask = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          startDate: editDates.startDate || null, 
          dueDate: editDates.dueDate || null 
        })
      });
      
      setTasks(tasks.map(t => t._id === taskId ? updatedTask : t));
      setEditingTaskId(null);
    } catch (err) {
      alert(err.message || 'Error saving task dates');
    } finally {
      setIsUpdating(false);
    }
  };

  // --- DATE MATH & GRID CALCULATION ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
  const currentDay = today.getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Safe Assignee Extractor
  const getAssigneeName = (a) => typeof a === 'object' && a !== null ? a.name : a;

  // --- DATA PROCESSING ---
  const uniqueAssignees = [...new Set(
    tasks.flatMap(t => t.assignees?.map(a => getAssigneeName(a)) || [])
  )].filter(Boolean);

  const processedTasks = [...tasks]
    .filter(task => {
      if (filterAssignee === 'all') return true;
      if (filterAssignee === 'unassigned') return !task.assignees || task.assignees.length === 0;
      return task.assignees?.some(a => getAssigneeName(a) === filterAssignee);
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

  // --- STATUS COLORS ---
  const statusColors = {
    'todo': 'bg-purple-500',
    'in-progress': 'bg-blue-500',
    'in-review': 'bg-yellow-500',
    'done': 'bg-green-500'
  };

  // Calculates exactly where the task bar should sit on the CSS Grid
  const getGridPosition = (task) => {
    let start = 1;
    let end = 2;

    const sDate = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
    const eDate = task.dueDate ? new Date(task.dueDate) : null;

    if (sDate) {
      if (sDate.getMonth() === currentDate.getMonth() && sDate.getFullYear() === currentDate.getFullYear()) start = sDate.getDate();
      else if (sDate < currentDate) start = 1;
      else if (sDate > currentDate) return { display: 'none' };
    }

    if (eDate) {
      if (eDate.getMonth() === currentDate.getMonth() && eDate.getFullYear() === currentDate.getFullYear()) end = eDate.getDate() + 1; 
      else if (eDate > currentDate) end = daysInMonth + 1;
      else if (eDate < currentDate) return { display: 'none' };
    } else {
      end = start + 3;
      if (end > daysInMonth + 1) end = daysInMonth + 1;
    }

    return { gridColumn: `${start} / ${end}` };
  };

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
            Please select a project from the top menu or create a new workspace to view the timeline.
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

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF2D88] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-7xl mx-auto animate-fade-in" onClick={() => setActiveDropdown(null)}>
      
      <style dangerouslySetInnerHTML={{__html: `
        .glass-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .glass-scroll::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
        .glass-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
        .glass-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 45, 136, 0.5); }
      `}} />

      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {activeProject.name} <span className="font-light opacity-80">Timeline</span>
          </h1>
          <p className="text-sm font-medium text-[#FF2D88] mt-1">
            {processedTasks.length} sandboxed tasks • Timeline View • Live sync active
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-[#0A0D14]/80 backdrop-blur-xl p-1 rounded-xl border border-gray-200 dark:border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_10px_rgba(255,255,255,0.02)]">
            <button 
              onClick={() => navigate('/board')} 
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5"
            >
              <LayoutGrid size={16} /> Board
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 bg-[#FF2D88] text-white shadow-[0_0_15px_rgba(255,45,136,0.4)]">
              <GitCommit size={16} /> Timeline
            </button>
          </div>

          <div className="w-px h-8 bg-gray-300 dark:bg-white/10 mx-1"></div>

          {/* Assignee Filter Dropdown */}
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee'); }} className={`flex items-center gap-2 bg-white dark:bg-[#121629] border hover:bg-gray-50 dark:hover:bg-white/5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeDropdown === 'assignee' || filterAssignee !== 'all' ? 'border-[#FF2D88] text-[#FF2D88] dark:text-[#FF2D88] shadow-sm' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 shadow-sm'}`}>
              <User size={16} /> {filterAssignee === 'all' ? 'Assignee' : filterAssignee}
            </button>
            {activeDropdown === 'assignee' && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-1.5 flex flex-col gap-0.5">
                  <button onClick={() => setFilterAssignee('all')} className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">All Members {filterAssignee === 'all' && <Check size={14} className="text-[#FF2D88]" />}</button>
                  <button onClick={() => setFilterAssignee('unassigned')} className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">Unassigned {filterAssignee === 'unassigned' && <Check size={14} className="text-[#FF2D88]" />}</button>
                  {uniqueAssignees.length > 0 && <div className="h-px bg-gray-200 dark:bg-white/10 my-1 mx-2"></div>}
                  {uniqueAssignees.map(name => (
                    <button key={name} onClick={() => setFilterAssignee(name)} className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">{name} {filterAssignee === name && <Check size={14} className="text-[#FF2D88]" />}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'sort' ? null : 'sort'); }} className={`flex items-center gap-2 bg-white dark:bg-[#121629] border hover:bg-gray-50 dark:hover:bg-white/5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeDropdown === 'sort' || sortBy !== 'newest' ? 'border-[#FF2D88] text-[#FF2D88] dark:text-[#FF2D88] shadow-sm' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 shadow-sm'}`}>
              <ArrowUpDown size={16} /> Sort
            </button>
            {activeDropdown === 'sort' && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-1.5 flex flex-col gap-0.5">
                  <button onClick={() => setSortBy('newest')} className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">Newest First {sortBy === 'newest' && <Check size={14} className="text-[#FF2D88]" />}</button>
                  <button onClick={() => setSortBy('oldest')} className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">Oldest First {sortBy === 'oldest' && <Check size={14} className="text-[#FF2D88]" />}</button>
                  <button onClick={() => setSortBy('priority')} className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">Highest Priority {sortBy === 'priority' && <Check size={14} className="text-[#FF2D88]" />}</button>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => navigate('/tasks/new')} className="bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)] hover:-translate-y-0.5 ml-2">
            <Plus size={18} /> New task
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400 p-4 rounded-xl mb-4 flex items-center gap-2 flex-shrink-0 shadow-sm">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* TIMELINE CONTROL BAR */}
      <div className="flex items-center justify-between bg-white dark:bg-[#121629] p-4 rounded-t-2xl border border-b-0 border-gray-200 dark:border-white/10 flex-shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-4 bg-gray-50 dark:bg-[#0A0D14] rounded-lg p-1 border border-gray-200 dark:border-white/5">
          <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-md transition-colors text-gray-600 dark:text-gray-400"><ArrowLeft size={16}/></button>
          <span className="text-sm font-bold w-32 text-center text-gray-900 dark:text-white">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={handleNextMonth} className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-md transition-colors text-gray-600 dark:text-gray-400"><ArrowRight size={16}/></button>
        </div>

        {/* Status Legend */}
        <div className="hidden md:flex items-center gap-5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div> Done</span>
          <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div> In Progress</span>
          <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div> In Review</span>
          <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div> To Do</span>
          <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div> Overdue</span>
        </div>
      </div>

      {/* GANTT CHART CONTAINER */}
      <div className="flex-1 bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-b-2xl overflow-hidden flex flex-col shadow-sm">
        <div className="flex flex-1 overflow-y-auto overflow-x-auto glass-scroll relative">
          <div className="min-w-[1200px] w-full flex flex-col">
            
            {/* Header Row (Days 1 - 31) */}
            <div className="flex border-b border-gray-200 dark:border-white/10 sticky top-0 z-30 bg-white/95 dark:bg-[#121629]/95 backdrop-blur-sm">
              <div className="w-80 min-w-[320px] p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-white/10 sticky left-0 z-40 bg-white dark:bg-[#121629] flex items-center justify-between">
                <span>Task</span>
                <span className="text-[10px] text-gray-400 font-normal normal-case italic opacity-80">Hover to edit dates</span>
              </div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(40px, 1fr))` }}>
                {daysArray.map(day => (
                  <div key={day} className={`p-4 text-center text-xs font-bold border-r border-gray-100 dark:border-white/5 flex flex-col items-center justify-center ${isCurrentMonth && day === currentDay ? 'bg-[#FF2D88]/10 text-[#FF2D88]' : 'text-gray-500 dark:text-gray-400'}`}>
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Content Rows */}
            <div className="flex-1 relative pb-20">
              
              {/* "Today" Vertical Marker Line */}
              {isCurrentMonth && (
                <div 
                  className="absolute top-0 bottom-0 z-10 border-l-2 border-[#FF2D88]/50 shadow-[0_0_10px_rgba(255,45,136,0.3)] pointer-events-none"
                  style={{ 
                    left: `calc(320px + ((100% - 320px) / ${daysInMonth}) * ${currentDay - 1} + (((100% - 320px) / ${daysInMonth}) / 2))` 
                  }}
                >
                  <div className="absolute -top-3 -translate-x-1/2 bg-[#FF2D88] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Today
                  </div>
                </div>
              )}

              {processedTasks.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                  <p>No tasks found for this period.</p>
                </div>
              ) : (
                processedTasks.map((task) => (
                  <div key={task._id} className="flex border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group relative">
                    
                    {/* Left Sidebar Info */}
                    <div className="w-80 min-w-[320px] p-4 border-r border-gray-200 dark:border-white/10 sticky left-0 z-20 bg-white dark:bg-[#121629] group-hover:bg-gray-50 dark:group-hover:bg-[#1c2135] transition-colors flex items-center">
                      
                      {editingTaskId === task._id ? (
                        /* INLINE EDIT MODE */
                        <div className="flex flex-col gap-2 w-full animate-in fade-in">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-[#FF2D88] uppercase">Adjust Dates</span>
                            <div className="flex gap-1">
                              <button onClick={() => setEditingTaskId(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500"><X size={12}/></button>
                              <button onClick={() => handleUpdateDates(task._id)} disabled={isUpdating} className="p-1 bg-[#FF2D88] hover:bg-[#ff2d88]/90 text-white rounded">
                                {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12}/>}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="text-[9px] text-gray-500 uppercase block mb-0.5">Start</label>
                              <input 
                                type="date" 
                                value={editDates.startDate} 
                                onChange={(e) => setEditDates({...editDates, startDate: e.target.value})}
                                className="w-full text-xs p-1.5 bg-white dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded focus:border-[#FF2D88] focus:outline-none"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[9px] text-gray-500 uppercase block mb-0.5">Due</label>
                              <input 
                                type="date" 
                                value={editDates.dueDate} 
                                onChange={(e) => setEditDates({...editDates, dueDate: e.target.value})}
                                className="w-full text-xs p-1.5 bg-white dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded focus:border-[#FF2D88] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* NORMAL READ-ONLY MODE */
                        <div className="flex items-center justify-between w-full group/inner">
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${task.isOverdue ? 'bg-red-500' : statusColors[task.status] || 'bg-gray-500'} shadow-[0_0_8px_currentColor] opacity-80`}></div>
                            <div className="min-w-0">
                              <p onClick={() => navigate(`/tasks/${task._id}`)} className="text-sm font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-[#FF2D88] dark:hover:text-[#FF2D88] transition-colors leading-tight">
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Calendar size={10}/> 
                                  {task.startDate ? new Date(task.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '--'} - {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '--'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); // 👈 Prevents accidental clicks from bubbling
                              setEditingTaskId(task._id);
                              setEditDates({
                                startDate: task.startDate ? task.startDate.split('T')[0] : '',
                                dueDate: task.dueDate ? task.dueDate.split('T')[0] : ''
                              });
                            }}
                            className="p-1.5 text-gray-400 hover:text-[#FF2D88] hover:bg-[#FF2D88]/10 rounded-lg opacity-0 group-hover/inner:opacity-100 transition-all flex-shrink-0"
                            title="Adjust Dates"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right Grid Area (The Timeline Bar) */}
                    <div className="flex-1 grid py-2 relative" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(40px, 1fr))` }}>
                      {daysArray.map(day => (
                        <div key={`bg-${day}`} className="border-r border-gray-100/50 dark:border-white/5 row-start-1 h-full" style={{ gridColumnStart: day }}></div>
                      ))}

                      <div 
                        onClick={() => navigate(`/tasks/${task._id}`)}
                        className={`row-start-1 h-8 my-auto rounded-lg mx-1 cursor-pointer transition-all hover:brightness-110 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] z-10 flex items-center px-3 overflow-hidden ${task.isOverdue ? 'bg-red-500/80 hover:bg-red-500' : statusColors[task.status] || 'bg-gray-500/80'}`}
                        style={getGridPosition(task)}
                        title={`${task.title}\nStart: ${task.startDate ? new Date(task.startDate).toLocaleDateString() : 'N/A'}\nDue: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}`}
                      >
                        <span className="text-[11px] font-bold text-white truncate drop-shadow-md">
                          {task.title}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}