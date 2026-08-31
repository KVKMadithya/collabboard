import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, ArrowUpDown, LayoutGrid, List as ListIcon, 
  MoreVertical, Bookmark, Plus, Clock, Trash2, X, Briefcase, Loader2 // 👈 FIXED: Loader2 added here
} from 'lucide-react';
import { useProject } from '../context/ProjectContext'; 

const CATEGORIES = {
  Idea: { color: '#8B5CF6', bg: 'bg-[#8B5CF6]/10', border: 'border-[#8B5CF6]/30', text: 'text-[#8B5CF6]', dot: 'bg-[#8B5CF6]' },
  Urgent: { color: '#EF4444', bg: 'bg-[#EF4444]/10', border: 'border-[#EF4444]/30', text: 'text-[#EF4444]', dot: 'bg-[#EF4444]' },
  Task: { color: '#EAB308', bg: 'bg-[#EAB308]/10', border: 'border-[#EAB308]/30', text: 'text-[#EAB308]', dot: 'bg-[#EAB308]' },
  Note: { color: '#3B82F6', bg: 'bg-[#3B82F6]/10', border: 'border-[#3B82F6]/30', text: 'text-[#3B82F6]', dot: 'bg-[#3B82F6]' },
  Done: { color: '#22C55E', bg: 'bg-[#22C55E]/10', border: 'border-[#22C55E]/30', text: 'text-[#22C55E]', dot: 'bg-[#22C55E]' },
  Draft: { color: '#6B7280', bg: 'bg-[#6B7280]/10', border: 'border-[#6B7280]/30', text: 'text-[#6B7280]', dot: 'bg-[#6B7280]' }
};

export default function Notes({ user }) {
  const { activeProject } = useProject(); 
  const navigate = useNavigate();
  const location = useLocation();

  const [notes, setNotes] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState(''); // 👈 NEW: Search State
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', category: 'Note' });
  const sortRef = useRef(null);

  // Catch TopBar trigger
  useEffect(() => {
    if (location.state?.openModal && activeProject) {
      setIsAddModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location, activeProject]);

  // --- API Integrations ---

  // 1. Fetch Notes (SANDBOXED)
  useEffect(() => {
    if (activeProject) {
      fetchNotes();
    } else {
      setNotes([]);
      setIsLoading(false);
    }
  }, [activeProject]);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch(`http://localhost:5000/api/notes?projectId=${activeProject._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Create Note (SANDBOXED)
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!activeProject) return;

    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ ...newNote, projectId: activeProject._id })
      });
      
      if (response.ok) {
        const addedNote = await response.json();
        setNotes([addedNote, ...notes]); 
        setIsAddModalOpen(false);
        setNewNote({ title: '', content: '', category: 'Note' }); 
      }
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  // 3. Delete Note
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch(`http://localhost:5000/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setNotes(notes.filter(note => note._id !== noteId)); 
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  // 4. Toggle Bookmark 
  const handleToggleBookmark = async (noteId, currentStatus) => {
    // Optimistic UI Update
    setNotes(notes.map(n => n._id === noteId ? { ...n, isBookmarked: !currentStatus } : n));
    try {
      const token = localStorage.getItem('collab_token');
      await fetch(`http://localhost:5000/api/notes/${noteId}`, {
        method: 'PUT', // Requires a PUT route in your backend to update isBookmarked
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ isBookmarked: !currentStatus })
      });
    } catch (error) {
      console.error("Failed to toggle bookmark", error);
    }
  };


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Filtering & Sorting ---
  const filteredNotes = notes.filter(note => {
    const matchesCategory = activeFilter === 'All' ? true : note.category === activeFilter;
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);

    switch (sortBy) {
      case 'newest': return dateB - dateA;
      case 'oldest': return dateA - dateB;
      case 'urgency':
        const urgencyWeight = { 'Urgent': 6, 'Task': 5, 'Idea': 4, 'Note': 3, 'Draft': 2, 'Done': 1 };
        return (urgencyWeight[b.category] || 0) - (urgencyWeight[a.category] || 0);
      case 'idea': return (a.category === 'Idea' ? -1 : 1);
      default: return 0;
    }
  });

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDifference = Math.round((date - new Date()) / (1000 * 60 * 60 * 24));
    if (daysDifference === 0) {
      const hoursDifference = Math.round((date - new Date()) / (1000 * 60 * 60));
      if (hoursDifference === 0) {
        const minutesDifference = Math.round((date - new Date()) / (1000 * 60));
        return `${Math.abs(minutesDifference)}m ago`;
      }
      return `${Math.abs(hoursDifference)}h ago`;
    }
    return rtf.format(daysDifference, 'day');
  };

  // --- RENDER 1: NO PROJECT SELECTED ---
  if (!activeProject && !isLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center animate-fade-in p-8">
        <div className="max-w-md w-full bg-white dark:bg-[#121629] p-8 rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-[#FF2D88]/20">
            <Briefcase size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Workspace Active</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Please select a project from the top menu or create a new workspace to view its notes.
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

  // --- RENDER 2: NOTES UI ---
  return (
    <div className="h-full w-full max-w-7xl mx-auto flex flex-col font-sans animate-fade-in relative px-4 lg:px-8 py-6 overflow-y-auto premium-scrollbar">
      
      {/* --- Add Note Modal --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#121629] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-[#FF2D88] transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Create a New Note</h3>
            <p className="text-xs font-bold text-[#FF2D88] uppercase tracking-wider mb-6">Posting to: {activeProject?.name}</p>
            
            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Title</label>
                <input 
                  required type="text" value={newNote.title} onChange={(e) => setNewNote({...newNote, title: e.target.value})} 
                  className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:border-[#FF2D88] focus:outline-none transition-colors" 
                  placeholder="What's on your mind?"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Category</label>
                <select 
                  value={newNote.category} onChange={(e) => setNewNote({...newNote, category: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:border-[#FF2D88] focus:outline-none transition-colors cursor-pointer"
                >
                  {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Content</label>
                <textarea 
                  required rows="4" value={newNote.content} onChange={(e) => setNewNote({...newNote, content: e.target.value})} 
                  className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:border-[#FF2D88] focus:outline-none transition-colors resize-y custom-scrollbar" 
                  placeholder="Elaborate on your task or idea..."
                ></textarea>
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] text-white py-3.5 rounded-xl mt-4 text-sm font-bold shadow-[0_4px_14px_rgba(255,45,136,0.3)] hover:opacity-90 transition-all hover:-translate-y-0.5 flex justify-center items-center gap-2">
                <Plus size={16} /> Post Note
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Header Section --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {activeProject?.name} <span className="font-light opacity-80">Notes</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 flex items-center gap-2">
            <span className="text-[#FF2D88] font-bold">{notes.length} sandboxed notes</span> • across {Object.keys(CATEGORIES).length} categories
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          
          {/* 🛑 NEW: Active Search Bar */}
          <div className="relative flex-1 sm:flex-none">
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-4 py-2.5 pl-10 rounded-xl text-sm focus:outline-none focus:border-[#FF2D88] transition-colors shadow-sm"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <div className="relative" ref={sortRef}>
            <button onClick={() => setIsSortOpen(!isSortOpen)} className="flex items-center gap-2 bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm">
              <ArrowUpDown size={16} className="text-gray-400" /> Sort
            </button>
            {isSortOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-1.5 flex flex-col">
                  {[
                    { id: 'newest', label: 'Newest First' },
                    { id: 'oldest', label: 'Oldest First' },
                    { id: 'urgency', label: 'Urgency First' },
                    { id: 'idea', label: 'Ideas First' }
                  ].map(option => (
                    <button key={option.id} onClick={() => { setSortBy(option.id); setIsSortOpen(false); }} className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${sortBy === option.id ? 'bg-pink-50 dark:bg-[#FF2D88]/10 text-[#FF2D88] font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex bg-gray-100 dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl p-1 shadow-inner">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><LayoutGrid size={16} /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}><ListIcon size={16} /></button>
          </div>
        </div>
      </div>

      {/* --- Filter Pills --- */}
      <div className="flex flex-wrap gap-2.5 mb-8 flex-shrink-0">
        <button onClick={() => setActiveFilter('All')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeFilter === 'All' ? 'bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] text-white shadow-md shadow-[#FF2D88]/20 scale-105' : 'bg-white dark:bg-[#121629] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
          All notes
        </button>
        {Object.entries(CATEGORIES).map(([key, config]) => (
          <button key={key} onClick={() => setActiveFilter(key)} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 border ${activeFilter === key ? `bg-white dark:bg-[#121629] ${config.border} ${config.text} scale-105 shadow-md` : 'bg-white dark:bg-[#121629] border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            <span className={`w-2 h-2 rounded-full ${config.dot} ${activeFilter === key ? 'shadow-[0_0_8px_currentColor]' : ''}`}></span>{key}
          </button>
        ))}
      </div>

      {/* --- Notes Rendering Area --- */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20 flex-1"><Loader2 className="animate-spin text-[#FF2D88] w-8 h-8" /></div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10" : "flex flex-col gap-4 pb-10"}>
          
          {/* Add Note Card Button */}
          <div onClick={() => setIsAddModalOpen(true)} className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-[#FF2D88]/50 hover:bg-[#FF2D88]/5 bg-gray-50/50 dark:bg-transparent cursor-pointer transition-all duration-300 group shadow-sm ${viewMode === 'grid' ? 'min-h-[220px] p-6' : 'p-6'}`}>
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] flex items-center justify-center text-white mb-3 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,45,136,0.4)] transition-all"><Plus size={24} /></div>
            <h3 className="text-gray-900 dark:text-white font-bold mb-1">Add a note</h3>
            {viewMode === 'grid' && <p className="text-gray-500 text-xs text-center">Jot down an idea, task,<br/>or anything important.</p>}
          </div>

          {sortedNotes.map(note => {
            const cat = CATEGORIES[note.category] || CATEGORIES.Note;
            
            // Permissions: Can delete if they authored it OR if they are the Team Leader
            const canDelete = user && (user._id === note.author?._id || user.role === 'Team Leader');
            const authorName = note.author ? `${note.author.firstName}` : 'Unknown';

            if (viewMode === 'grid') {
              return (
                <div key={note._id} className={`group relative flex flex-col p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl dark:bg-[#121629] bg-white ${cat.border} min-h-[220px]`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold ${cat.bg} border ${cat.border} ${cat.text}`}>{note.category}</span>
                    <div className="flex gap-2">
                      {canDelete && (
                        <button onClick={() => handleDeleteNote(note._id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 p-1.5" title="Delete Note">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-2">{note.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 leading-relaxed">{note.content}</p>
                  </div>
                  
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100 dark:border-white/5">
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${cat.text}`}>
                      <span>By {authorName} •</span> {getRelativeTime(note.createdAt)}
                    </div>
                    {/* 🛑 NEW: Interactive Bookmark Button */}
                    <button onClick={() => handleToggleBookmark(note._id, note.isBookmarked)} className="transition-transform hover:scale-110">
                      <Bookmark size={16} className={note.isBookmarked ? cat.text : "text-gray-400 hover:text-gray-600"} fill={note.isBookmarked ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={note._id} className={`group flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 hover:shadow-md bg-white dark:bg-[#121629] ${cat.border}`}>
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cat.dot} shadow-[0_0_8px_currentColor]`}></span>
                    <div className="w-28 flex-shrink-0 hidden sm:block"><span className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-bold ${cat.bg} border ${cat.border} ${cat.text}`}>{note.category}</span></div>
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{note.title}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm truncate mt-0.5">{note.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">By {authorName}</span>
                      <div className="flex items-center justify-end gap-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-1"><Clock size={12} /><span>{getRelativeTime(note.createdAt)}</span></div>
                    </div>
                    {canDelete && (
                      <button onClick={() => handleDeleteNote(note._id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-lg transition-colors" title="Delete Note">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            }
          })}

        </div>
      )}
    </div>
  );
}