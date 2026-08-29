import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Search, CheckSquare, StickyNote, User, 
  ChevronRight, AlertCircle, Briefcase, ExternalLink
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const HighlightMatch = ({ text = '', query = '' }) => {
  if (!query.trim() || typeof text !== 'string') return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  
  return (
    <>
      {parts.map((part, index) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={index} className="bg-[#FF2D88]/20 text-[#FF2D88] font-semibold px-0.5 rounded">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

// Helper for the frontend highlighter
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default function SearchList() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const [results, setResults] = useState({ tasks: [], notes: [], members: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchSearchResults = async () => {
      if (!query.trim() || !activeProject) {
        setResults({ tasks: [], notes: [], members: [] });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('collab_token');
        const response = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(query)}&projectId=${activeProject._id}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal
        });

        // 🛑 THE FIX: If it fails, actually try to read the backend error message!
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || "Search route not found. Did you add it to server.js?");
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
        setIsLoading(false);
      }
    };

    fetchSearchResults();

    return () => abortController.abort(); 
  }, [query, activeProject]);

  if (!activeProject) {
    return (
      <div className="flex-1 w-full flex items-center justify-center p-8 animate-fade-in">
        <div className="max-w-md text-center bg-theme-panel p-10 rounded-3xl border border-theme-border shadow-xl">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-[#FF2D88]/20">
            <Briefcase size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-theme-text mb-2">No Workspace Selected</h2>
          <p className="text-theme-muted text-sm mb-6">
            Please select a workspace from the sidebar to search within it.
          </p>
          <button 
            onClick={() => navigate('/members')}
            className="w-full bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] text-white py-3.5 rounded-xl font-bold shadow-[0_4px_14px_rgba(255,45,136,0.3)] hover:opacity-90 transition-all"
          >
            Go to Workspaces
          </button>
        </div>
      </div>
    );
  }

  const totalResults = results.tasks.length + results.notes.length + results.members.length;

  return (
    <div className="p-4 sm:p-8 w-full max-w-5xl mx-auto animate-fade-in pb-10 h-full overflow-y-auto premium-scrollbar">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-text tracking-tight flex items-center gap-3">
          <Search className="text-[#FF2D88]" size={32} /> Search Results
        </h1>
        {query && !isLoading && (
          <p className="text-theme-muted text-sm mt-2 font-medium">
            Found <span className="text-theme-text font-bold">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} for <span className="text-[#FF2D88] bg-[#FF2D88]/10 px-2 py-0.5 rounded font-bold">"{query}"</span> in {activeProject.name}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-center gap-3 text-red-500 shadow-sm animate-fade-in">
          <AlertCircle size={20} className="flex-shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-8 animate-pulse">
          {[1, 2].map((group) => (
            <div key={group} className="bg-theme-panel rounded-2xl border border-theme-border p-6">
              <div className="w-32 h-6 bg-black/10 dark:bg-white/10 rounded mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="w-full h-16 bg-black/5 dark:bg-white/5 rounded-xl"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      
      ) : totalResults === 0 && !error ? (
        <div className="bg-theme-panel border border-theme-border p-16 rounded-[2rem] text-center shadow-sm mt-10">
          <div className="w-24 h-24 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search size={40} className="text-theme-muted" />
          </div>
          <h3 className="text-xl font-bold text-theme-text mb-2">No matches found</h3>
          <p className="text-theme-muted text-sm max-w-sm mx-auto leading-relaxed">
            We couldn't find anything matching <strong className="text-theme-text">"{query}"</strong>. Check your spelling or try broader keywords.
          </p>
        </div>
      
      ) : (
        <div className="space-y-8">
          
          {results.members.length > 0 && (
            <div className="bg-theme-panel rounded-2xl border border-theme-border p-6 shadow-sm">
              <h3 className="font-bold text-theme-text flex items-center gap-2 mb-5 uppercase text-xs tracking-wider">
                <User size={16} className="text-[#3B82F6]" /> Team Members ({results.members.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.members.map(member => (
                  <Link 
                    key={member._id} 
                    to={`/user/${member._id}`} 
                    className="flex items-center justify-between p-4 rounded-xl bg-theme-bg border border-theme-border hover:border-[#3B82F6]/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-inner flex-shrink-0">
                        {member.profilePic 
                          ? <img src={member.profilePic} alt="avatar" className="w-full h-full object-cover"/> 
                          : member.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-theme-text group-hover:text-[#3B82F6] transition-colors">
                          <HighlightMatch text={`${member.firstName} ${member.lastName}`} query={query} />
                        </p>
                        <p className="text-xs text-theme-muted mt-0.5">
                          <HighlightMatch text={member.email} query={query} />
                        </p>
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-theme-muted group-hover:text-[#3B82F6] group-hover:scale-110 transition-all opacity-0 group-hover:opacity-100 mr-2" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.tasks.length > 0 && (
            <div className="bg-theme-panel rounded-2xl border border-theme-border p-6 shadow-sm">
              <h3 className="font-bold text-theme-text flex items-center gap-2 mb-5 uppercase text-xs tracking-wider">
                <CheckSquare size={16} className="text-[#14B8A6]" /> Tasks ({results.tasks.length})
              </h3>
              <div className="flex flex-col gap-3">
                {results.tasks.map(task => (
                  <Link 
                    key={task._id} 
                    to={`/tasks/${task._id}`} 
                    className="flex items-center justify-between p-4 rounded-xl bg-theme-bg border border-theme-border hover:border-[#14B8A6]/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-bold text-theme-text group-hover:text-[#14B8A6] transition-colors truncate">
                        <HighlightMatch text={task.title} query={query} />
                      </p>
                      <p className="text-xs text-theme-muted mt-1 truncate">
                        {task.description ? <HighlightMatch text={task.description} query={query} /> : 'No description provided.'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-[#14B8A6]/10 transition-colors flex-shrink-0">
                      <ChevronRight size={16} className="text-theme-muted group-hover:text-[#14B8A6] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.notes.length > 0 && (
            <div className="bg-theme-panel rounded-2xl border border-theme-border p-6 shadow-sm">
              <h3 className="font-bold text-theme-text flex items-center gap-2 mb-5 uppercase text-xs tracking-wider">
                <StickyNote size={16} className="text-[#F97316]" /> Notes ({results.notes.length})
              </h3>
              <div className="flex flex-col gap-3">
                {results.notes.map(note => (
                  <Link 
                    key={note._id} 
                    to="/notes" 
                    className="flex items-center justify-between p-4 rounded-xl bg-theme-bg border border-theme-border hover:border-[#F97316]/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-bold text-theme-text group-hover:text-[#F97316] transition-colors truncate">
                        <HighlightMatch text={note.title} query={query} />
                      </p>
                      <p className="text-xs text-theme-muted mt-1 truncate">
                        {note.content ? <HighlightMatch text={note.content} query={query} /> : 'Empty note.'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-[#F97316]/10 transition-colors flex-shrink-0">
                      <ChevronRight size={16} className="text-theme-muted group-hover:text-[#F97316] group-hover:translate-x-0.5 transition-all" />
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