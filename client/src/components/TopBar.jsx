import { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, LogOut, Sun, Moon, Check, X, Loader2, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Global Contexts
import { useTheme } from '../context/ThemeContext';
import { useProject } from '../context/ProjectContext'; // 👈 The Global Brain

export default function TopBar({ user, onSignOut }) {
  const navigate = useNavigate();
  
  const { isDarkMode, toggleTheme } = useTheme();
  const { projects, activeProject, switchProject, fetchProjects } = useProject(); // 👈 Accessing our sandbox logic

  const [greeting, setGreeting] = useState('Welcome Back');
  
  // Dropdown States
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [isNotifLoading, setIsNotifLoading] = useState(false);

  // Refs for closing dropdowns when clicking outside
  const notifRef = useRef(null);
  const projectRef = useRef(null);

  // Set Greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('collab_token');
      if (!token) return;
      const response = await fetch('http://localhost:5000/api/members/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Optional: Poll every 30 seconds for new invites
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifDropdown(false);
      if (projectRef.current && !projectRef.current.contains(event.target)) setShowProjectDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Accept/Decline Logic
  const handleResponse = async (notificationId, action) => {
    setIsNotifLoading(true);
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch(`http://localhost:5000/api/members/notifications/${notificationId}/respond`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action }) // 'accept' or 'declined'
      });

      if (!response.ok) throw new Error('Action failed');

      // Remove the processed invite from the local state
      setNotifications(prev => prev.filter(n => n._id !== notificationId));

      // 🚀 IF ACCEPTED: Tell the Global Context to fetch the user's projects again so the new group appears!
      if (action === 'accept') {
        await fetchProjects();
      }

    } catch (err) {
      alert("Failed to process invitation.");
    } finally {
      setIsNotifLoading(false);
    }
  };

  const pendingCount = notifications.filter(n => n.status === 'pending').length;

  return (
    <header className="flex justify-between items-center mb-10 font-sans tracking-wide transition-colors duration-300 relative z-40">
      
      {/* --- Left Side: Dynamic Greeting & Project Context --- */}
      <div>
        <h1 className="text-3xl font-light text-theme-text flex items-center gap-2 transition-colors duration-300">
          {greeting},{' '}
          <span className="text-[#FF2D88] font-semibold">
            {user ? user.firstName : 'Visitor'}
          </span>
        </h1>
        <p className="text-sm text-theme-muted mt-1.5 font-light transition-colors duration-300">
          {activeProject 
            ? `Currently viewing workspace: ${activeProject.name}` 
            : 'Select or create a workspace to begin collaborating.'}
        </p>
      </div>

      {/* --- Right Side: Actions & Profile --- */}
      <div className="flex items-center gap-4">
        
        {/* 1. PROJECT SWITCHER DROPDOWN */}
        {user && (
          <div className="relative" ref={projectRef}>
            <button 
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="flex items-center gap-2 bg-theme-panel border border-theme-border hover:border-[#FF2D88]/50 text-theme-text px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
            >
              <Briefcase size={16} className="text-[#FF2D88]"/> 
              <span className="max-w-[120px] truncate">
                {activeProject ? activeProject.name : 'Select Project'}
              </span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${showProjectDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showProjectDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-theme-panel border border-theme-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-2 space-y-1 max-h-64 overflow-y-auto premium-scrollbar">
                  {projects.length === 0 ? (
                    <p className="text-xs text-theme-muted p-3 text-center">No projects found. Go to Members to create one.</p>
                  ) : (
                    projects.map(proj => (
                      <button
                        key={proj._id}
                        onClick={() => {
                          switchProject(proj._id);
                          setShowProjectDropdown(false);
                        }}
                        className={`w-full text-left flex flex-col p-3 rounded-lg transition-colors ${activeProject?._id === proj._id ? 'bg-[#FF2D88]/10 text-[#FF2D88]' : 'hover:bg-black/5 dark:hover:bg-white/5 text-theme-text'}`}
                      >
                        <span className="font-bold text-sm">{proj.name}</span>
                        <span className="text-[10px] uppercase tracking-wider opacity-70">
                          {proj.leader === user._id ? 'Leader' : 'Member'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t border-theme-border p-2">
                  <button onClick={() => { navigate('/members'); setShowProjectDropdown(false); }} className="w-full text-center text-xs font-bold text-[#FF2D88] hover:bg-[#FF2D88]/10 py-2 rounded-lg transition-colors">
                    + Manage Workspaces
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. THEME TOGGLE */}
        <button 
          onClick={toggleTheme}
          className="text-theme-muted hover:text-theme-text bg-theme-panel p-2.5 rounded-full border border-theme-border transition-all duration-500 hover:scale-110 hover:shadow-[0_0_15px_rgba(255,45,136,0.1)] active:rotate-90"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* 3. NOTIFICATION BELL & DROPDOWN */}
        {user && (
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                if (!showNotifDropdown) fetchNotifications(); // Refresh when opening
              }}
              className="relative text-theme-muted hover:text-theme-text bg-theme-panel p-2.5 rounded-full border border-theme-border transition-all hover:scale-110"
            >
              <Bell size={20} />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF2D88] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-theme-bg">
                  {pendingCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 top-full mt-3 w-80 bg-theme-panel border border-theme-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-theme-border flex items-center justify-between bg-black/5 dark:bg-white/5">
                  <h4 className="font-bold text-sm text-theme-text">Invites</h4>
                  {pendingCount > 0 && <span className="text-[10px] bg-[#FF2D88]/10 text-[#FF2D88] px-2 py-0.5 rounded font-bold">{pendingCount} New</span>}
                </div>

                <div className="max-h-80 overflow-y-auto premium-scrollbar p-2 space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-theme-muted text-center py-8">You're all caught up!</p>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif._id} className="p-3 bg-black/5 dark:bg-[#0A0D14] border border-theme-border rounded-xl space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-[#FF2D88] flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {notif.sender?.name ? notif.sender.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="text-[11px] text-theme-muted mt-0.5 leading-snug">
                              <span className="font-bold text-theme-text">{notif.sender?.name}</span> invited you to join <strong className="text-[#FF2D88]">{notif.project?.name}</strong>.
                            </p>
                            <span className="inline-block mt-1 bg-white/10 dark:bg-white/5 text-theme-text text-[10px] px-2 py-0.5 rounded border border-theme-border font-medium">
                              Role: {notif.roleOffered}
                            </span>
                          </div>
                        </div>

                        {notif.status === 'pending' ? (
                          <div className="flex items-center gap-2 pt-1">
                            <button 
                              onClick={() => handleResponse(notif._id, 'accept')}
                              disabled={isNotifLoading}
                              className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-600 dark:text-green-400 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              {isNotifLoading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14} />} Accept
                            </button>
                            <button 
                              onClick={() => handleResponse(notif._id, 'declined')}
                              disabled={isNotifLoading}
                              className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <X size={14} /> Decline
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-theme-muted tracking-wider block text-center bg-black/5 dark:bg-white/5 py-1.5 rounded-lg">
                            {notif.status}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. USER PROFILE TOGGLE */}
        <div className="flex items-center pl-4 border-l border-theme-border ml-2 transition-colors duration-300">
          {user ? (
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-xl transition-all hover:scale-[1.02]"
                onClick={() => navigate('/profile')}
                title="Go to User Profile"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-transparent hover:ring-theme-muted transition-all overflow-hidden">
                  {user.profilePic ? (
                    <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'
                  )}
                </div>
                <div className="text-sm hidden sm:block">
                  <p className="text-theme-text font-medium tracking-wide">{user.firstName} {user.lastName}</p>
                  <p className="text-[#00FF66] text-xs font-light mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse"></span> Online
                  </p>
                </div>
              </div>

              <button 
                onClick={onSignOut}
                className="text-theme-muted hover:text-[#FF2D88] p-2 rounded-xl hover:bg-[#FF2D88]/10 transition-all ml-1 group"
                title="Sign Out"
              >
                <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/auth')}
              className="bg-theme-panel border border-theme-border hover:border-[#FF2D88]/50 text-theme-text px-7 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}