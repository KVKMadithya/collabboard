import React, { useState, useEffect } from 'react';
import { 
  Users, Circle, Crown, MoreVertical, 
  Search, Plus, Shield, Loader2, CheckCircle2, Lock, Briefcase
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

// Define the exact technical roles from our backend
const TECHNICAL_ROLES = [
  'Frontend Developer', 
  'Backend Developer', 
  'UI/UX Designer', 
  'Database Administrator', 
  'DevOps Engineer', 
  'QA Tester',
  'Viewer'
];

export default function Members() {
  // Global Brain Context
  const { activeProject, isLeader, fetchProjects } = useProject();

  // View 1: Project Creation State
  const [newProjectName, setNewProjectName] = useState('');
  const [nameStatus, setNameStatus] = useState('idle'); // idle, checking, available, taken
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // View 2: Member Management State
  const [members, setMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  
  // Invite System State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('Frontend Developer');
  const [isSearching, setIsSearching] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null);

  // ==========================================
  // VIEW 1 LOGIC: PROJECT CREATION
  // ==========================================
  
  // Live Name Validation
  useEffect(() => {
    const checkName = async () => {
      if (newProjectName.trim().length < 3) {
        setNameStatus('idle');
        return;
      }
      setNameStatus('checking');
      try {
        const token = localStorage.getItem('collab_token');
        const res = await fetch(`http://localhost:5000/api/projects/check?name=${newProjectName}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setNameStatus(data.available ? 'available' : 'taken');
      } catch (err) {
        setNameStatus('idle');
      }
    };

    const delay = setTimeout(checkName, 500);
    return () => clearTimeout(delay);
  }, [newProjectName]);

  const handleCreateProject = async () => {
    if (nameStatus !== 'available') return;
    setIsCreatingProject(true);
    try {
      const token = localStorage.getItem('collab_token');
      const res = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newProjectName })
      });
      if (res.ok) {
        setNewProjectName('');
        setNameStatus('idle');
        await fetchProjects(); // Tells the global brain to refresh and auto-select the new project!
      } else {
        const errorData = await res.json();
        alert(errorData.message);
      }
    } catch (err) {
      alert('Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // ==========================================
  // VIEW 2 LOGIC: COMMAND CENTER
  // ==========================================

  // Fetch actual project members when activeProject changes
  useEffect(() => {
    if (activeProject) {
      fetchProjectMembers();
    }
  }, [activeProject]);

  const fetchProjectMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch(`http://localhost:5000/api/members?projectId=${activeProject._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to fetch members", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Live Backend Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const token = localStorage.getItem('collab_token');
          const res = await fetch(`http://localhost:5000/api/members/search?q=${searchQuery}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
          }
        } catch (err) {
          console.error("Search failed:", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Send Invite
  const handleSendInvite = async () => {
    if (!selectedUser || !activeProject) return;
    setInviteStatus('sending');

    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch('http://localhost:5000/api/members/invite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          recipientId: selectedUser._id, 
          roleOffered: selectedRole,
          projectId: activeProject._id
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to send invite');
      }
      
      setInviteStatus('success');
      setTimeout(() => {
        setInviteStatus(null);
        setSelectedUser(null);
        setSearchQuery('');
      }, 3000);

    } catch (error) {
      alert(error.message);
      setInviteStatus('error');
    }
  };

  // Update Role (Leader Only)
  const handleRoleChange = async (memberId, newRole) => {
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch('http://localhost:5000/api/members/role', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          projectId: activeProject._id, 
          memberId: memberId,
          newRole: newRole
        })
      });

      if (response.ok) {
        // Update local UI state to reflect the new role immediately
        setMembers(members.map(m => m._id === memberId ? { ...m, role: newRole } : m));
      } else {
        const err = await response.json();
        alert(err.message);
      }
    } catch (error) {
      console.error("Failed to update role", error);
    }
  };

  // Helper to colorize roles
  const getRoleColor = (role) => {
    if (role === 'Fullstack/Leader') return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (role === 'Frontend Developer') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (role === 'Backend Developer') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (role === 'UI/UX Designer') return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30'; // Default
  };

  // ==========================================
  // RENDER VIEW 1: NO PROJECT ACTIVE
  // ==========================================
  if (!activeProject) {
    return (
      <div className="flex-1 w-full flex items-center justify-center animate-fade-in p-8">
        <div className="max-w-md w-full bg-white dark:bg-[#121629] p-8 rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-[#FF2D88]/20">
            <Briefcase size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Workspace</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            You don't have an active project. Initialize a new workspace to start collaborating and inviting your team.
          </p>
          
          <div className="relative mb-6 text-left">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Workspace Name</label>
            <input 
              type="text" 
              placeholder="e.g. Project Odyssey"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors text-gray-900 dark:text-white pr-10"
            />
            <div className="absolute right-4 top-9">
              {nameStatus === 'checking' && <Loader2 size={16} className="text-gray-400 animate-spin" />}
              {nameStatus === 'available' && <CheckCircle2 size={16} className="text-green-500" />}
              {nameStatus === 'taken' && <Lock size={16} className="text-red-500" title="Name taken" />}
            </div>
            {nameStatus === 'taken' && <p className="text-xs text-red-500 mt-1">This name is already in use.</p>}
          </div>

          <button 
            onClick={handleCreateProject}
            disabled={nameStatus !== 'available' || isCreatingProject}
            className="w-full bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] hover:opacity-90 disabled:opacity-50 text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)] flex items-center justify-center gap-2"
          >
            {isCreatingProject ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            Initialize Workspace
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER VIEW 2: COMMAND CENTER
  // ==========================================
  const onlineCount = Math.floor(members.length * 0.4) || 1; 

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col animate-fade-in text-gray-900 dark:text-white" style={{ height: 'calc(100vh - 120px)' }}>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 flex-1 min-h-0">
        
        {/* --- LEFT SIDE: HEADER, STATS, & MEMBER ROSTER --- */}
        <div className="lg:col-span-2 flex flex-col min-h-0 pr-2">
          
          <div className="mb-8 flex-shrink-0">
            <h1 className="text-3xl font-bold mb-1 tracking-tight">{activeProject.name} Team</h1>
            <p className="text-sm font-medium text-[#FF2D88]">
              {members.length} Members <span className="text-gray-500 dark:text-gray-400 ml-2">CollaBoard workspace</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 flex-shrink-0">
            <div className="bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500"><Users size={22}/></div>
              <div>
                <h3 className="text-2xl font-bold">{members.length}</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Total members</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500"><Circle fill="currentColor" size={16}/></div>
              <div>
                <h3 className="text-2xl font-bold">{onlineCount}</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Online now</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#FF2D88]/10 flex items-center justify-center text-[#FF2D88]"><Crown size={22}/></div>
              <div>
                <h3 className="text-2xl font-bold">1</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Team Leader</p>
              </div>
            </div>
          </div>

          {/* Member Roster List */}
          <div className="flex-1 overflow-y-auto premium-scrollbar space-y-3 pb-4">
            {isLoadingMembers ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#FF2D88]" /></div>
            ) : members.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">No members found.</p>
            ) : (
              members.map((member) => (
                <div key={member._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-[#121629] hover:bg-gray-50 dark:hover:bg-[#1a1f36] border border-gray-200 dark:border-white/5 rounded-2xl transition-all shadow-sm group gap-4">
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-[#FF2D88] flex items-center justify-center text-white font-bold text-lg shadow-md overflow-hidden">
                      {member.profilePic ? <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover"/> : (member.name ? member.name.charAt(0).toUpperCase() : 'U')}
                    </div>
                    <div>
                      <h4 className="font-bold text-[15px]">{member.name || 'Unknown User'}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-1">{member.email}</p>
                      {member.university && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 uppercase tracking-wider font-semibold">
                          {member.university}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-0 border-gray-100 dark:border-white/5 pt-3 sm:pt-0">
                    
                    {/* DYNAMIC ROLE RENDERER */}
                    {isLeader && member.role !== 'Fullstack/Leader' ? (
                      <select 
                        value={member.role}
                        onChange={(e) => handleRoleChange(member._id, e.target.value)}
                        className={`text-[11px] px-3 py-1.5 rounded-lg font-bold tracking-wider uppercase border cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/20 transition-all ${getRoleColor(member.role)}`}
                      >
                        {TECHNICAL_ROLES.map(role => (
                          <option key={role} value={role} className="bg-gray-900 text-white">{role}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-[10px] px-3 py-1.5 rounded-lg border font-bold tracking-wider uppercase ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                    )}

                    <div className="flex items-center gap-6 text-center">
                      <div className="hidden md:block">
                        <p className="text-sm font-bold">{Math.floor(Math.random() * 20)}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">Tasks</p>
                      </div>
                      <button className="text-gray-400 hover:text-[#FF2D88] transition-colors p-1 opacity-0 group-hover:opacity-100">
                        <MoreVertical size={18}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- RIGHT SIDE: INVITE PANEL (Locked for non-leaders) --- */}
        <div className="relative flex flex-col space-y-8 overflow-y-auto premium-scrollbar pb-4 pr-2">
          
          {/* Glass Overlay Lock if not leader */}
          {!isLeader && (
            <div className="absolute inset-0 z-10 bg-white/50 dark:bg-[#060813]/60 backdrop-blur-[3px] rounded-2xl flex flex-col items-center justify-center p-8 text-center border border-white/10 shadow-2xl">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <Shield size={32} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Action Restricted</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Only the designated Team Leader of <strong>{activeProject.name}</strong> has permission to send invites and modify technical roles.
              </p>
            </div>
          )}

          {/* Invite Form */}
          <div className="bg-white dark:bg-transparent p-6 dark:p-0 rounded-2xl shadow-sm dark:shadow-none">
            <h2 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">Invite a member</h2>
            <p className="text-xs text-[#FF2D88] font-medium mb-6">Add developers to {activeProject.name}</p>
            
            <div className="space-y-4 relative">
              {/* LIVE SEARCH BAR */}
              <div className="relative">
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search user by email or name..."
                    value={selectedUser ? selectedUser.email : searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedUser(null);
                    }}
                    disabled={!isLeader}
                    className="w-full bg-gray-50 dark:bg-[#121629] border border-gray-200 dark:border-white/5 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-[#FF2D88] focus:ring-1 focus:ring-[#FF2D88] transition-all"
                  />
                  {isSearching && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#FF2D88] animate-spin" />}
                </div>

                {/* LIVE SEARCH DROPDOWN */}
                {searchResults.length > 0 && !selectedUser && isLeader && (
                  <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    {searchResults.map(user => (
                      <div 
                        key={user._id}
                        onClick={() => {
                          setSelectedUser(user);
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-gray-100 dark:border-white/5 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-[#FF2D88] flex-shrink-0 flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                          {user.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover"/> : user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{user.name}</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">{user.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* No Results Fallback */}
                {searchQuery.length > 1 && !isSearching && searchResults.length === 0 && !selectedUser && isLeader && (
                  <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl p-3 z-50 text-center text-sm text-gray-500">
                    No verified users found.
                  </div>
                )}
              </div>

              {/* Technical Role Selector */}
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={!isLeader}
                className="w-full bg-gray-50 dark:bg-[#121629] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#FF2D88] appearance-none cursor-pointer transition-colors"
              >
                {TECHNICAL_ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              <button 
                onClick={handleSendInvite}
                disabled={!selectedUser || inviteStatus === 'sending' || !isLeader}
                className="w-full mt-2 bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] hover:opacity-90 disabled:opacity-50 disabled:hover:opacity-50 text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)] flex items-center justify-center gap-2"
              >
                {inviteStatus === 'sending' ? <Loader2 size={18} className="animate-spin"/> :
                 inviteStatus === 'success' ? <CheckCircle2 size={18} /> :
                 <Plus size={18} />}
                
                {inviteStatus === 'success' ? 'Invite Sent!' : 'Send Invite'}
              </button>
            </div>
          </div>

          {/* Technical Roles Legend */}
          <div className="bg-white dark:bg-transparent p-6 dark:p-0 rounded-2xl shadow-sm dark:shadow-none mt-8 border-t border-gray-100 dark:border-white/5 pt-8">
            <h2 className="text-sm font-bold mb-4 text-gray-500 uppercase tracking-widest">Project Hierarchy</h2>
            <div className="space-y-4">
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                <div>
                  <h4 className="font-bold text-sm text-purple-600 dark:text-purple-400">Team Leader</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Full access, manages roles & invites.</p>
                </div>
                <Crown size={16} className="text-purple-500" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <div>
                  <h4 className="font-bold text-sm text-blue-600 dark:text-blue-400">Core Developers</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Frontend, Backend, Database Admins.</p>
                </div>
                <div className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div></div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-pink-500/5 border border-pink-500/10">
                <div>
                  <h4 className="font-bold text-sm text-pink-600 dark:text-pink-400">Creative & Support</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">UI/UX, QA Testers, DevOps.</p>
                </div>
                <div className="w-4 h-4 rounded bg-pink-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div></div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}