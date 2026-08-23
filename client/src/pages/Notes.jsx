import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, ArrowUpDown, LayoutGrid, List as ListIcon, 
  MoreVertical, Bookmark, Plus, Clock, Trash2, X
} from 'lucide-react';

const CATEGORIES = {
  Idea: { color: '#8B5CF6', bg: 'bg-[#8B5CF6]/10', border: 'border-[#8B5CF6]/30', text: 'text-[#8B5CF6]', dot: 'bg-[#8B5CF6]' },
  Urgent: { color: '#EF4444', bg: 'bg-[#EF4444]/10', border: 'border-[#EF4444]/30', text: 'text-[#EF4444]', dot: 'bg-[#EF4444]' },
  Task: { color: '#EAB308', bg: 'bg-[#EAB308]/10', border: 'border-[#EAB308]/30', text: 'text-[#EAB308]', dot: 'bg-[#EAB308]' },
  Note: { color: '#3B82F6', bg: 'bg-[#3B82F6]/10', border: 'border-[#3B82F6]/30', text: 'text-[#3B82F6]', dot: 'bg-[#3B82F6]' },
  Done: { color: '#22C55E', bg: 'bg-[#22C55E]/10', border: 'border-[#22C55E]/30', text: 'text-[#22C55E]', dot: 'bg-[#22C55E]' },
  Draft: { color: '#6B7280', bg: 'bg-[#6B7280]/10', border: 'border-[#6B7280]/30', text: 'text-[#6B7280]', dot: 'bg-[#6B7280]' }
};

// 👇 We accept the `user` prop so we can check permissions!
export default function Notes({ user }) {
  const [notes, setNotes] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const location = useLocation();

  // 👇 ADD THIS EFFECT to catch the trigger from the TopBar
  useEffect(() => {
    if (location.state?.openModal) {
      setIsAddModalOpen(true);
      // Immediately clear the router state so the modal doesn't pop open again if the user manually refreshes the page
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', category: 'Note' });
  const sortRef = useRef(null);

  // --- API Integrations ---

  // 1. Fetch Notes from MongoDB
  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch('http://127.0.0.1:5000/api/notes', {
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

  useEffect(() => {
    fetchNotes();
  }, []);

  // 2. Create Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch('http://127.0.0.1:5000/api/notes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(newNote)
      });
      
      if (response.ok) {
        const addedNote = await response.json();
        setNotes([addedNote, ...notes]); // Instantly add to UI
        setIsAddModalOpen(false);
        setNewNote({ title: '', content: '', category: 'Note' }); // Reset form
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
      const response = await fetch(`http://127.0.0.1:5000/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setNotes(notes.filter(note => note._id !== noteId)); // Instantly remove from UI
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNotes = notes.filter(note => activeFilter === 'All' ? true : note.category === activeFilter);

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);

    switch (sortBy) {
      case 'newest': return dateB - dateA;
      case 'oldest': return dateA - dateB;
      case 'urgency':
        const urgencyWeight = { 'Urgent': 6, 'Task': 5, 'Idea': 4, 'Note': 3, 'Draft': 2, 'Done': 1 };
        return urgencyWeight[b.category] - urgencyWeight[a.category];
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

  return (
    <div className="h-full w-full max-w-7xl mx-auto flex flex-col font-sans animate-fade-in relative">
      
      {/* --- Add Note Modal --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#121629] rounded-2xl border border-white/10 shadow-2xl p-6 relative">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">Create a New Note</h3>
            
            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400">Title</label>
                <input 
                  required type="text" value={newNote.title} onChange={(e) => setNewNote({...newNote, title: e.target.value})} 
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm mt-1 focus:border-[#FF2D88] outline-none" 
                  placeholder="What's on your mind?"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Category</label>
                <select 
                  value={newNote.category} onChange={(e) => setNewNote({...newNote, category: e.target.value})}
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm mt-1 focus:border-[#FF2D88] outline-none"
                >
                  {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400">Content</label>
                <textarea 
                  required rows="4" value={newNote.content} onChange={(e) => setNewNote({...newNote, content: e.target.value})} 
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm mt-1 focus:border-[#FF2D88] outline-none resize-none" 
                  placeholder="Elaborate on your task or idea..."
                ></textarea>
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-[#FF2D88] to-[#3B28CC] text-white py-3 rounded-lg mt-4 font-medium hover:opacity-90 transition-opacity">
                Post Note
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Header Section --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Your notes</h2>
          <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
            <span className="text-white font-medium">{notes.length} notes</span> • across {Object.keys(CATEGORIES).length} categories
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={sortRef}>
            <button onClick={() => setIsSortOpen(!isSortOpen)} className="flex items-center gap-2 bg-[#121629] border border-white/10 hover:bg-white/5 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
              <ArrowUpDown size={16} className="text-gray-400" /> Sort
            </button>
            {isSortOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#0A0D14] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-slide-down">
                <div className="p-1.5 flex flex-col">
                  {[
                    { id: 'newest', label: 'Newest First' },
                    { id: 'oldest', label: 'Oldest First' },
                    { id: 'urgency', label: 'Urgency First' },
                    { id: 'idea', label: 'Ideas First' }
                  ].map(option => (
                    <button key={option.id} onClick={() => { setSortBy(option.id); setIsSortOpen(false); }} className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${sortBy === option.id ? 'bg-[#FF2D88]/20 text-[#FF2D88] font-medium' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex bg-[#121629] border border-white/10 rounded-xl p-1">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}><LayoutGrid size={16} /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}><ListIcon size={16} /></button>
          </div>
        </div>
      </div>

      {/* --- Filter Pills --- */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button onClick={() => setActiveFilter('All')} className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-lg ${activeFilter === 'All' ? 'bg-gradient-to-r from-[#FF2D88] to-[#3B28CC] text-white shadow-[#FF2D88]/25 scale-105' : 'bg-[#121629] text-gray-400 border border-white/5 hover:bg-white/5'}`}>
          All notes
        </button>
        {Object.entries(CATEGORIES).map(([key, config]) => (
          <button key={key} onClick={() => setActiveFilter(key)} className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-300 border ${activeFilter === key ? `${config.bg} ${config.border} ${config.text} scale-105 shadow-lg` : 'bg-[#121629] border-white/5 text-gray-400 hover:bg-white/5'}`}>
            <span className={`w-2 h-2 rounded-full ${config.dot} ${activeFilter === key ? 'shadow-[0_0_8px_currentColor]' : ''}`}></span>{key}
          </button>
        ))}
      </div>

      {/* --- Notes Rendering Area --- */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#FF2D88]/20 border-t-[#FF2D88] rounded-full animate-spin"></div></div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10" : "flex flex-col gap-4 pb-10"}>
          
          {sortedNotes.map(note => {
            const cat = CATEGORIES[note.category] || CATEGORIES.Note;
            
            // 👇 Check if user has permission to delete this note
            const canDelete = user && (user._id === note.author?._id || user.role === 'Team Leader');
            const authorName = note.author ? `${note.author.firstName}` : 'Unknown';

            if (viewMode === 'grid') {
              return (
                <div key={note._id} className={`group relative flex flex-col p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cat.bg} ${cat.border} min-h-[220px]`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border ${cat.border} ${cat.text} backdrop-blur-md`}>{note.category}</span>
                    <div className="flex gap-2">
                      {canDelete && (
                        <button onClick={() => handleDeleteNote(note._id)} className="text-red-400 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100 p-1" title="Delete Note">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white leading-tight mb-2">{note.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">{note.content}</p>
                  </div>
                  
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${cat.text}`}>
                      <span>By {authorName} •</span> {getRelativeTime(note.createdAt)}
                    </div>
                    <Bookmark size={18} className={note.isBookmarked ? cat.text : "text-gray-500"} fill={note.isBookmarked ? "currentColor" : "none"} />
                  </div>
                </div>
              );
            } else {
              return (
                <div key={note._id} className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${cat.bg} ${cat.border}`}>
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.dot}`}></span>
                    <div className="w-24 flex-shrink-0 hidden sm:block"><span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border ${cat.border} ${cat.text}`}>{note.category}</span></div>
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="text-base font-bold text-white truncate">{note.title}</h3>
                      <p className="text-gray-400 text-sm truncate">{note.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="flex flex-col text-right">
                      <span className="text-xs text-white">By {authorName}</span>
                      <div className="flex items-center justify-end gap-1.5 text-xs text-gray-400"><Clock size={12} /><span>{getRelativeTime(note.createdAt)}</span></div>
                    </div>
                    {canDelete && (
                      <button onClick={() => handleDeleteNote(note._id)} className="text-red-400 hover:text-red-300 transition-colors p-1" title="Delete Note">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            }
          })}

          {/* Add Note Button Trigger */}
          <div onClick={() => setIsAddModalOpen(true)} className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 hover:border-[#FF2D88]/50 hover:bg-[#FF2D88]/5 cursor-pointer transition-all duration-300 group ${viewMode === 'grid' ? 'min-h-[220px] p-6' : 'p-4'}`}>
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF2D88] to-[#3B28CC] flex items-center justify-center text-white mb-3 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,45,136,0.4)] transition-all"><Plus size={24} /></div>
            <h3 className="text-white font-semibold mb-1">Add a note</h3>
            {viewMode === 'grid' && <p className="text-gray-500 text-xs text-center">Jot down an idea, task,<br/>or anything important.</p>}
          </div>

        </div>
      )}
    </div>
  );
}