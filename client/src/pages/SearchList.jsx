import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Search, CheckSquare, StickyNote, User, 
  ChevronRight, AlertCircle, Briefcase, ExternalLink, Loader2
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const HighlightMatch = ({ text = '', query = '' }) => {
  if (!query.trim() || typeof text !== 'string') return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  
  return (
    <>
      {parts.map((part, index) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={index} className="bg-theme-accent/20 text-theme-accent font-bold px-0.5 rounded shadow-sm">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default function SearchList() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const { activeProject } = useProject();

  // --- STATE ---
  const [results, setResults] = useState({ tasks: [], notes: [], members: [] });
  const [isInitialLoad, setIsInitialLoad] = useState(false); // For the full skeleton loader
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false); // For the tiny header spinner
  const [error, setError] = useState(null);
  
  // --- DEBOUNCE LOGIC (The Performance Fix) ---
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    // Wait 300ms after the user stops typing before updating the real search query
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    // If they type again before 300ms, cancel the timer
    return () => clearTimeout(handler);
  }, [query]);

  // --- THE FETCH ENGINE ---
  useEffect(() => {
    const abortController = new AbortController();

    const fetchSearchResults = async () => {
      // If query is empty, reset immediately
      if (!debouncedQuery.trim() || !activeProject) {
        setResults({ tasks: [], notes: [], members: [] });
        setIsInitialLoad(false);
        setIsBackgroundFetching(false);
        return;
      }

      // If we already have results, just do a soft background fetch. Otherwise, hard load.
      const hasExistingResults = results.tasks.length > 0 || results.notes.length > 0 || results.members.length > 0;
      if (!hasExistingResults) {
        setIsInitialLoad(true);
      } else {
        setIsBackgroundFetching(true);
      }
      
      setError(null);

      try {
        const token = localStorage.getItem('collab_token');
        const response = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(debouncedQuery)}&projectId=${activeProject._id}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || "Search route failed.");
        }

        const data = await response.json();
        setResults({
          tasks: data.tasks || [],
          notes: data.notes || [],
          members: data.members || []
        });

      } catch (err) {
        if (err.name === 'AbortError') return; 
        console.error("Search error:", err);
        setError(err.message || "An error occurred while searching. Please try again.");
      } finally {
        setIsInitialLoad(false);
        setIsBackgroundFetching(false);
      }
    };

    fetchSearchResults();

    return () => abortController.abort(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, activeProject]); // Only run when the DEBOUNCED query changes

  // --- RENDERS ---
  if (!activeProject) {
    return (
      <div className="flex-1 w-full flex items-center justify-center p-8 animate-fade-in">
        <div className="max-w-md text-center bg-theme-panel p-10 rounded-[2rem] border border-theme-border shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-[#FF2D88]/20">
            <Briefcase size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-theme-text mb-2">No Workspace Selected</h2>
          <p className="text-theme-muted text-sm mb-6">
            Please select a workspace from the sidebar to search within it.
          </p>
          <button 
            onClick={() => navigate('/members')}
            className="w-full bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] text-white py-3.5 rounded-xl font-bold shadow-[0_4px_14px_rgba(255,45,136,0.3)] hover:opacity-90 transition-all hover:-translate-y-0.5"
          >
            Go to Workspaces
          </button>
        </div>
      </div>
    );
  }

  const totalResults = results.tasks.length + results.notes.length + results.members.length;

  return (
    <div className="p-4 sm:p-8 w-full max-w-5xl mx-auto animate-fade-in pb-10 h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-theme-text tracking-tight flex items-center gap-3">
            <Search className="text-theme-accent" size={32} /> 
            Search Results
            {isBackgroundFetching && <Loader2 size={20} className="text-theme-accent animate-spin ml-2" />}
          </h1>
          {query && !isInitialLoad && (
            <p className="text-theme-muted text-sm mt-2 font-medium">
              Found <span className="text-theme-text font-bold">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} for <span className="text-theme-accent bg-theme-accent/10 px-2 py-0.5 rounded font-bold shadow-sm">"{query}"</span> in {activeProject.name}
            </p>
          )}
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-center gap-3 text-red-500 shadow-sm animate-fade-in mb-6">
          <AlertCircle size={20} className="flex-shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {/* HARD LOADING STATE (Skeletons only on first stroke) */}
      {isInitialLoad ? (
        <div className="space-y-8 animate-pulse">
          {[1, 2].map((group) => (
            <div key={group} className="bg-theme-panel rounded-2xl border border-theme-border p-6 shadow-sm">
              <div className="w-32 h-6 bg-black/10 dark:bg-white/10 rounded mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="w-full h-16 bg-black/5 dark:bg-white/5 rounded-xl"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      
      /* EMPTY STATE */
      ) : totalResults === 0 && !error && debouncedQuery.trim() ? (
        <div className="bg-theme-panel border border-theme-border p-16 rounded-[2rem] text-center shadow-sm mt-10">
          <div className="w-24 h-24 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search size={40} className="text-theme-muted" />
          </div>
          <h3 className="text-xl font-bold text-theme-text mb-2">No matches found</h3>
          <p className="text-theme-muted text-sm max-w-sm mx-auto leading-relaxed">
            We couldn't find anything matching <strong className="text-theme-text">"{query}"</strong>. Check your spelling or try broader keywords.
          </p>
        </div>
      
      /* RESULTS RENDER */
      ) : (
        <div className={`space-y-8 transition-opacity duration-300 ${isBackgroundFetching ? 'opacity-50' : 'opacity-100'}`}>
          
          {/* MEMBERS */}
          {results.members.length > 0 && (
            <div className="bg-theme-panel rounded-2xl border border-theme-border p-6 shadow-sm">
              <h3 className="font-bold text-theme-text flex items-center gap-2 mb-5 uppercase text-xs tracking-wider">
                <User size={16} className="text-blue-500" /> Team Members ({results.members.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.members.map(member => (
                  <Link 
                    key={member._id} 
                    to={`/user/${member._id}`} 
                    className="flex items-center justify-between p-4 rounded-xl bg-theme-bg border border-theme-border hover:border-blue-500/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-theme-accent flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-inner flex-shrink-0">
                        {member.profilePic 
                          ? <img src={member.profilePic} alt="avatar" className="w-full h-full object-cover"/> 
                          : member.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-bold text-theme-text group-hover:text-blue-500 transition-colors truncate">
                          <HighlightMatch text={`${member.firstName} ${member.lastName}`} query={query} />
                        </p>
                        <p className="text-xs text-theme-muted mt-0.5 truncate">
                          <HighlightMatch text={member.email} query={query} />
                        </p>
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-theme-muted flex-shrink-0 group-hover:text-blue-500 group-hover:scale-110 transition-all opacity-0 group-hover:opacity-100 mr-2" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* TASKS */}
          {results.tasks.length > 0 && (
            <div className="bg-theme-panel rounded-2xl border border-theme-border p-6 shadow-sm">
              <h3 className="font-bold text-theme-text flex items-center gap-2 mb-5 uppercase text-xs tracking-wider">
                <CheckSquare size={16} className="text-teal-500" /> Tasks ({results.tasks.length})
              </h3>
              <div className="flex flex-col gap-3">
                {results.tasks.map(task => (
                  <Link 
                    key={task._id} 
                    to={`/tasks/${task._id}`} 
                    className="flex items-center justify-between p-4 rounded-xl bg-theme-bg border border-theme-border hover:border-teal-500/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-bold text-theme-text group-hover:text-teal-500 transition-colors truncate">
                        <HighlightMatch text={task.title} query={query} />
                      </p>
                      <p className="text-xs text-theme-muted mt-1 truncate">
                        {task.description ? <HighlightMatch text={task.description} query={query} /> : 'No description provided.'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-teal-500/10 transition-colors flex-shrink-0">
                      <ChevronRight size={16} className="text-theme-muted group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* NOTES */}
          {results.notes.length > 0 && (
            <div className="bg-theme-panel rounded-2xl border border-theme-border p-6 shadow-sm">
              <h3 className="font-bold text-theme-text flex items-center gap-2 mb-5 uppercase text-xs tracking-wider">
                <StickyNote size={16} className="text-orange-500" /> Notes ({results.notes.length})
              </h3>
              <div className="flex flex-col gap-3">
                {results.notes.map(note => (
                  <Link 
                    key={note._id} 
                    to="/notes" 
                    className="flex items-center justify-between p-4 rounded-xl bg-theme-bg border border-theme-border hover:border-orange-500/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-bold text-theme-text group-hover:text-orange-500 transition-colors truncate">
                        <HighlightMatch text={note.title} query={query} />
                      </p>
                      <p className="text-xs text-theme-muted mt-1 truncate">
                        {note.content ? <HighlightMatch text={note.content} query={query} /> : 'Empty note.'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-orange-500/10 transition-colors flex-shrink-0">
                      <ChevronRight size={16} className="text-theme-muted group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}