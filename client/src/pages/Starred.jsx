import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, LayoutGrid, List as ListIcon, Search, 
  CheckSquare, StickyNote, FolderKanban, Loader2, 
  ArrowRight, XCircle
} from 'lucide-react';

export default function Starred() {
  const navigate = useNavigate();

  // --- STATE ---
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // --- FETCH STARRED ITEMS ---
  const fetchStarredItems = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch('http://localhost:5000/api/users/starred', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch starred items');
      
      const data = await response.json();
      
      // Flatten the categorized data into a single, unified feed
      const unifiedFeed = [
        ...(data.tasks || []).map(t => ({ ...t, itemType: 'task' })),
        ...(data.notes || []).map(n => ({ ...n, itemType: 'note' })),
        ...(data.reports || []).map(r => ({ ...r, itemType: 'report' }))
      ].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

      setItems(unifiedFeed);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStarredItems();
  }, []);

  // --- OPTIMISTIC UN-STAR LOGIC ---
  const handleUnstar = async (e, id, type) => {
    e.stopPropagation();
    
    // 1. Optimistically remove from UI
    setItems(prev => prev.filter(item => item._id !== id));

    // 2. Call backend to sync
    try {
      const token = localStorage.getItem('collab_token');
      // We route to the specific endpoint depending on the item type
      const endpoint = type === 'task' 
        ? `http://localhost:5000/api/tasks/${id}/star`
        : `http://localhost:5000/api/${type}s/${id}/star`; // Extensible for notes/reports

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to unstar');
    } catch (err) {
      console.error(err);
      fetchStarredItems(); // Revert on failure
    }
  };

  // --- FILTERING ENGINE ---
  const filteredItems = items.filter(item => {
    const matchesTab = activeTab === 'all' || item.itemType === activeTab;
    const matchesSearch = (item.title || item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // --- ITEM CARD GENERATOR ---
  const renderCard = (item) => {
    const isGrid = viewMode === 'grid';
    
    // Determine visuals based on item type
    let icon, typeColor, label, link;
    if (item.itemType === 'task') {
      icon = <CheckSquare size={isGrid ? 20 : 16} />;
      typeColor = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      label = 'Task';
      link = `/tasks/${item._id}`;
    } else if (item.itemType === 'note') {
      icon = <StickyNote size={isGrid ? 20 : 16} />;
      typeColor = 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      label = 'Note';
      link = `/notes`; // Or specific note link
    } else {
      icon = <FolderKanban size={isGrid ? 20 : 16} />;
      typeColor = 'text-green-500 bg-green-500/10 border-green-500/20';
      label = 'Report';
      link = `/reports`;
    }

    return (
      <div 
        key={item._id}
        onClick={() => navigate(link)}
        className={`group bg-theme-panel border border-theme-border hover:border-theme-accent/50 rounded-2xl cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md ${
          isGrid ? 'p-6 flex flex-col hover:-translate-y-1' : 'p-4 flex items-center gap-4'
        }`}
      >
        {/* Card Header / Left Icon */}
        <div className={`flex ${isGrid ? 'justify-between items-start mb-4' : 'items-center gap-4 w-1/4 min-w-[200px]'}`}>
          <div className={`flex items-center justify-center rounded-xl border ${typeColor} ${isGrid ? 'w-12 h-12' : 'w-10 h-10 flex-shrink-0'}`}>
            {icon}
          </div>
          {!isGrid && (
             <div className="flex flex-col">
               <span className="text-[10px] font-bold uppercase tracking-wider text-theme-muted">{label}</span>
               <span className="font-bold text-theme-text truncate">{item.title || item.name}</span>
             </div>
          )}
          {isGrid && (
            <button 
              onClick={(e) => handleUnstar(e, item._id, item.itemType)}
              className="p-2 text-yellow-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Remove from Starred"
            >
              <Star size={18} className="fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] group-hover:hidden" />
              <XCircle size={18} className="hidden group-hover:block" />
            </button>
          )}
        </div>

        {/* Card Body / Middle Content */}
        <div className={`${isGrid ? 'flex-1 mb-6' : 'flex-1 px-4 border-l border-theme-border'}`}>
          {isGrid && <h3 className="font-bold text-lg text-theme-text mb-2 line-clamp-1">{item.title || item.name}</h3>}
          <p className="text-sm text-theme-muted line-clamp-2">
            {item.description || item.content || 'No additional details provided.'}
          </p>
        </div>

        {/* Card Footer / Right Actions */}
        <div className={`flex items-center ${isGrid ? 'justify-between pt-4 border-t border-theme-border' : 'justify-end gap-4 min-w-[150px]'}`}>
          <span className="text-xs font-medium text-theme-muted bg-theme-bg px-2.5 py-1 rounded-md border border-theme-border">
            {item.project?.name || 'Personal'}
          </span>
          {!isGrid && (
            <button 
              onClick={(e) => handleUnstar(e, item._id, item.itemType)}
              className="p-2 text-yellow-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Star size={18} className="fill-yellow-400 group-hover:hidden" />
              <XCircle size={18} className="hidden group-hover:block" />
            </button>
          )}
          {isGrid && <ArrowRight size={16} className="text-theme-muted group-hover:text-theme-accent transition-colors group-hover:translate-x-1" />}
        </div>
      </div>
    );
  };

  // --- RENDERS ---
  if (isLoading) {
    return (
      <div className="w-full h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-theme-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col animate-fade-in text-theme-text pb-8 overflow-y-auto custom-scrollbar">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 flex-shrink-0 pt-2">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight mb-2">
            <Star size={28} className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.4)]" />
            Favorites
          </h1>
          <p className="text-sm text-theme-muted">
            Your personalized collection of starred tasks, notes, and reports across all workspaces.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Search favorites..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-theme-panel border border-theme-border text-theme-text px-4 py-2.5 pl-10 rounded-xl text-sm focus:outline-none focus:border-theme-accent transition-colors shadow-sm"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted" />
          </div>

          {/* View Toggles */}
          <div className="flex bg-theme-panel border border-theme-border rounded-xl p-1 shadow-sm w-full sm:w-auto justify-center">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-theme-bg text-theme-text shadow-sm' : 'text-theme-muted hover:text-theme-text'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-theme-bg text-theme-text shadow-sm' : 'text-theme-muted hover:text-theme-text'}`}
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-2 mb-8 flex-shrink-0">
        {[
          { id: 'all', label: 'All Items' },
          { id: 'task', label: 'Tasks' },
          { id: 'note', label: 'Notes' },
          { id: 'report', label: 'Reports' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)} 
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 border ${
              activeTab === tab.id 
                ? 'bg-theme-accent text-white border-theme-accent shadow-md shadow-theme-accent/20' 
                : 'bg-theme-panel text-theme-muted border-theme-border hover:bg-theme-bg hover:text-theme-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl mb-6 flex items-center gap-2">
          <XCircle size={18} /> {error}
        </div>
      )}

      {/* EMPTY STATE */}
      {filteredItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-theme-border rounded-3xl bg-theme-panel/50">
          <div className="w-20 h-20 bg-theme-bg rounded-full flex items-center justify-center mb-4 border border-theme-border shadow-sm">
            <Star size={32} className="text-theme-muted opacity-50" />
          </div>
          <h3 className="text-lg font-bold text-theme-text mb-1">No favorites found</h3>
          <p className="text-sm text-theme-muted max-w-sm">
            You haven't starred any {activeTab !== 'all' ? activeTab + 's' : 'items'} yet. Click the star icon on any task, note, or report to add it here.
          </p>
        </div>
      ) : (
        /* ITEM GRID/LIST */
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          : "flex flex-col gap-4"
        }>
          {filteredItems.map(renderCard)}
        </div>
      )}
    </div>
  );
}