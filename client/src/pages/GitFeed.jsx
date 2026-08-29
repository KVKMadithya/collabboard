import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitCommit, GitBranch, Link as LinkIcon, 
  Loader2, AlertCircle, ExternalLink, Calendar, 
  BarChart2, Clock, Briefcase
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { useProject } from '../context/ProjectContext';

// 🛑 100% FOOLPROOF FIX: Custom GitHub Icon component
const GithubIcon = ({ size = 24, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.94-.81 1.76-1 2.73C8.93 18.25 8 19 6 19c-1.5 0-2-1-2-1" />
  </svg>
);

export default function GitFeed({ user }) {
  const { activeProject, fetchProjects } = useProject();
  const navigate = useNavigate();

  // --- STATE ---
  const [commits, setCommits] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Linking State
  const [repoInput, setRepoInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [localRepo, setLocalRepo] = useState(activeProject?.githubRepo || null);

  // Sync local state when active project changes
  useEffect(() => {
    setLocalRepo(activeProject?.githubRepo || null);
    setCommits([]);
    setError(null);
  }, [activeProject]);

  // --- FETCH REAL GITHUB DATA ---
  useEffect(() => {
    const fetchCommits = async () => {
      if (!activeProject || !localRepo) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('collab_token');
        const response = await fetch(`http://localhost:5000/api/github/commits?projectId=${activeProject._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch commits');
        }

        setCommits(data);
        generateChartData(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommits();
  }, [activeProject, localRepo]);

  // --- LINK REPOSITORY LOGIC ---
  const handleLinkRepo = async (e) => {
    e.preventDefault();
    if (!repoInput.trim()) return;

    setIsLinking(true);
    setError(null);

    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch(`http://localhost:5000/api/projects/${activeProject._id}/github`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ githubRepo: repoInput })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to link repository');

      // Update UI instantly
      setLocalRepo(data.githubRepo);
      await fetchProjects(); // Refresh global context silently
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLinking(false);
    }
  };

  // --- DATA PROCESSING FOR CHARTS ---
  const generateChartData = (commitData) => {
    // Generate an array of the last 7 days
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return { 
        rawDate: d.toISOString().split('T')[0], 
        displayDate: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        commits: 0 
      };
    }).reverse();

    // Map commits to the days
    commitData.forEach(commit => {
      const commitDate = new Date(commit.date).toISOString().split('T')[0];
      const dayData = last7Days.find(d => d.rawDate === commitDate);
      if (dayData) {
        dayData.commits += 1;
      }
    });

    setChartData(last7Days);
  };

  // --- UTILS ---
  // 🛑 FIX: Safely extract the ID whether the leader is populated (an object) or just an ID string
  const isLeader = (activeProject?.leader?._id || activeProject?.leader) === user?._id;

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDifference = Math.round((date - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference === 0) {
      const hours = Math.round((date - new Date()) / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.round((date - new Date()) / (1000 * 60));
        return `${Math.abs(minutes)}m ago`;
      }
      return `${Math.abs(hours)}h ago`;
    }
    return rtf.format(daysDifference, 'day');
  };

  // --- RENDER 1: NO PROJECT ACTIVE ---
  if (!activeProject && !isLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center animate-fade-in p-8">
        <div className="max-w-md w-full bg-white dark:bg-[#121629] p-8 rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-[#FF2D88]/20">
            <Briefcase size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Workspace Active</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Please select a project from the top menu to view its GitHub feed.
          </p>
          <button 
            onClick={() => navigate('/members')}
            className="w-full bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] text-white py-3.5 rounded-xl font-bold transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)] hover:opacity-90"
          >
            Go to Workspaces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 w-full max-w-7xl mx-auto animate-fade-in pb-10 h-full overflow-y-auto premium-scrollbar">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <GithubIcon className="text-[#FF2D88]" size={32} /> Repository Feed
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Tracking live commits for <strong className="text-[#FF2D88]">{activeProject?.name}</strong>
          </p>
        </div>
        {localRepo && isLeader && (
          <button 
            onClick={() => { setLocalRepo(null); setCommits([]); }}
            className="text-xs text-gray-500 hover:text-red-500 transition-colors border border-gray-200 dark:border-white/10 px-4 py-2 rounded-xl"
          >
            Unlink Repository
          </button>
        )}
      </div>

      {/* --- RENDER 2: NO REPO LINKED --- */}
      {!localRepo ? (
        <div className="w-full max-w-2xl mx-auto mt-10">
          <div className="bg-white dark:bg-[#121629] rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-2xl p-10 text-center relative overflow-hidden">
            
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#FF2D88]/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="w-20 h-20 bg-gray-100 dark:bg-black/40 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-200 dark:border-white/10 relative z-10">
              <GithubIcon size={36} className="text-gray-900 dark:text-white" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 relative z-10">Connect GitHub</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-md mx-auto relative z-10">
              Paste your repository URL below to sync your team's live commit history and track development progress instantly.
            </p>

            {isLeader ? (
              <form onSubmit={handleLinkRepo} className="relative z-10 flex flex-col gap-4">
                <div className="relative">
                  <LinkIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="https://github.com/owner/repo" 
                    className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors text-gray-900 dark:text-white"
                    required
                  />
                </div>
                {error && <p className="text-xs text-red-500 flex items-center gap-1 justify-center"><AlertCircle size={14}/> {error}</p>}
                
                <button 
                  type="submit"
                  disabled={isLinking}
                  className="w-full bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] text-white py-4 rounded-xl font-bold text-sm shadow-[0_4px_14px_rgba(255,45,136,0.3)] hover:opacity-90 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLinking ? <Loader2 size={18} className="animate-spin" /> : 'Connect Repository'}
                </button>
              </form>
            ) : (
              <div className="bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 p-4 rounded-xl text-sm font-medium relative z-10">
                Only the Team Leader can link a repository. Please ask them to connect the GitHub feed.
              </div>
            )}
          </div>
        </div>

      ) : (

        /* --- RENDER 3: GITHUB FEED ACTIVE --- */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT: TIMELINE */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <GitBranch className="text-gray-400" size={18} /> Commit History
            </h3>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#121629] rounded-2xl border border-gray-200 dark:border-white/5">
                <Loader2 className="w-10 h-10 text-[#FF2D88] animate-spin mb-4" />
                <p className="text-gray-500 text-sm font-medium">Syncing with GitHub...</p>
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col items-center text-center">
                <AlertCircle size={32} className="text-red-500 mb-3" />
                <h4 className="text-red-500 font-bold mb-1">Sync Failed</h4>
                <p className="text-red-400/80 text-sm">{error}</p>
              </div>
            ) : commits.length === 0 ? (
              <div className="bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/5 rounded-2xl p-10 text-center">
                <p className="text-gray-500">No commits found in this repository yet.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-gray-200 dark:border-white/10 ml-4 space-y-8 pb-10">
                {commits.map((commit, idx) => (
                  <div key={commit.sha} className="relative pl-8 group">
                    {/* Timeline Node */}
                    <div className="absolute -left-[11px] top-1 w-5 h-5 bg-white dark:bg-[#121629] border-4 border-[#FF2D88] rounded-full group-hover:scale-125 transition-transform duration-300 shadow-[0_0_10px_rgba(255,45,136,0.3)]"></div>
                    
                    {/* Commit Card */}
                    <div className="bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/5 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white leading-relaxed mb-3 break-words">
                            {commit.message}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-xs">
                            <div className="flex items-center gap-2">
                              {commit.avatarUrl ? (
                                <img src={commit.avatarUrl} alt="author" className="w-5 h-5 rounded-full border border-gray-200 dark:border-white/10" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold">
                                  {commit.authorName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="font-medium text-gray-700 dark:text-gray-300">{commit.authorName}</span>
                            </div>
                            <span className="text-gray-400 flex items-center gap-1">
                              <Clock size={12} /> {getRelativeTime(commit.date)}
                            </span>
                            <span className="bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded font-mono border border-gray-200 dark:border-white/5">
                              {commit.sha.substring(0, 7)}
                            </span>
                          </div>
                        </div>
                        
                        <a 
                          href={commit.commitUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 hover:bg-[#FF2D88]/10 text-gray-400 hover:text-[#FF2D88] flex items-center justify-center transition-colors flex-shrink-0"
                          title="View on GitHub"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: ANALYTICS & REPO INFO */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            
            {/* Repo Card */}
            <div className="bg-gradient-to-br from-[#121629] to-[#0A0D14] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF2D88]/10 rounded-full blur-[50px]"></div>
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
                  <GithubIcon className="text-white" size={24} />
                </div>
                <span className="bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#00FF66] rounded-full animate-pulse"></span> Connected
                </span>
              </div>

              <h3 className="text-white font-bold text-lg mb-1 relative z-10">{localRepo}</h3>
              <p className="text-gray-400 text-xs flex items-center gap-1.5 mb-6 relative z-10">
                <GitCommit size={14} /> {commits.length} commits synced
              </p>

              <a 
                href={`https://github.com/${localRepo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2 relative z-10"
              >
                Open in GitHub <ExternalLink size={16} />
              </a>
            </div>

            {/* Activity Chart */}
            <div className="bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col h-[300px]">
              <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <BarChart2 className="text-[#FF2D88]" size={18} /> Push Activity (7 Days)
              </h3>
              
              <div className="flex-1 w-full relative">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF2D88" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#FF2D88" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="displayDate" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} 
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="commits" 
                        stroke="#FF2D88" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorCommits)" 
                        activeDot={{ r: 6, fill: '#FF2D88', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    No data to chart
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}