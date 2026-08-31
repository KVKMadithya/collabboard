import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Circle, Crown, MoreVertical, 
  Search, Plus, Shield, Loader2, CheckCircle2, Lock, Briefcase, Trash2
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

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
  const { activeProject, isLeader, fetchProjects } = useProject();
  const navigate = useNavigate(); // 👈 Added navigation hook

  // Mode state: 'roster' vs 'create-project'
  const [isCreatingMode, setIsCreatingMode] = useState(false);

  // Project Creation State
  const [newProjectName, setNewProjectName] = useState('');
  const [nameStatus, setNameStatus] = useState('idle'); 
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Member Management State
  const [members, setMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  
  // Invite System State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('Frontend Developer');
  const [isSearching, setIsSearching] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null);

  // Member Action Menu State (for removal)
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);

  // Live Name Validation for New Project
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects`, {
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
        setIsCreatingMode(false);
        await fetchProjects(); 
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

  // Fetch members when active project changes
  useEffect(() => {
    if (activeProject && !isCreatingMode) {
      fetchProjectMembers();
    }
  }, [activeProject, isCreatingMode]);

  const fetchProjectMembers = async () => {
    if (!activeProject) return;
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

  // Live Backend Search for Invites
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
        searchResults.length > 0 && setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSendInvite = async () => {
    if (!selectedUser || !activeProject) return;
    setInviteStatus('sending');

    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members/invite`, {
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

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members/role`, {
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
        setMembers(members.map(m => m._id === memberId ? { ...m, role: newRole } : m));
      } else {
        const err = await response.json();
        alert(err.message);
      }
    } catch (error) {
      console.error("Failed to update role", error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members/remove`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          projectId: activeProject._id, 
          memberId: memberId
        })
      });

      if (response.ok) {
        setMembers(members.filter(m => m._id !== memberId));
        setRemovingMemberId(null);
      } else {
        const err = await response.json();
        alert(err.message);
      }
    } catch (error) {
      console.error("Failed to remove member", error);
    }
  };

  const getRoleColor = (role) => {
    if (role === 'Fullstack/Leader') return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (role === 'Frontend Developer') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (role === 'Backend Developer') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (role === 'UI/UX Designer') return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30'; 
  };

  // -------------------------------------------------------------
  // RENDER VIEW 1: CREATE PROJECT 
  // -------------------------------------------------------------
  if (!activeProject || isCreatingMode) {
    return (
      <div className="flex-1 w-full flex items-center justify-center animate-fade-in p-8 relative">
        {activeProject && (
          <button 
            onClick={() => setIsCreatingMode(false)}
            className="absolute top-6 left-6 text-xs font-bold text-gray-400 hover:text-white bg-white/5 px-4 py-2 rounded-xl border border-white/10 transition-colors"
          >
            ← Back to active workspace
          </button>
        )}
        <div className="max-w-md w-full bg-white dark:bg-[#121629] p-8 rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-[#FF2D88]/20">
            <Briefcase size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Workspace</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Start a brand new project where you will be assigned as the Team Leader.
          </p>
          
          <div className="relative mb-6 text-left">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Workspace Name</label>
            <input 
              type="text" 
              placeholder="e.g. Project Apollo"
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

  // -------------------------------------------------------------
  // RENDER VIEW 2: COMMAND CENTER ROSTER
  // -------------------------------------------------------------
  const onlineCount = Math.floor(members.length * 0.4) || 1; 

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col animate-fade-in text-gray-900 dark:text-white" style={{ height: 'calc(100vh - 120px)' }}>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 flex-1 min-h-0">
        
        {/* --- LEFT SIDE --- */}
        <div className="lg:col-span-2 flex flex-col min-h-0 pr-2">
          
          <div className="mb-8 flex-shrink-0 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1 tracking-tight">{activeProject.name} Team</h1>
              <p className="text-sm font-medium text-[#FF2D88]">
                {members.length} Members <span className="text-gray-500 dark:text-gray-400 ml-2">CollaBoard workspace</span>
              </p>
            </div>
            
            <button 
              onClick={() => setIsCreatingMode(true)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus size={14} className="text-[#FF2D88]" /> New Project
            </button>
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
                <div key={member._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-[#121629] hover:bg-gray-50 dark:hover:bg-[#1a1f36] border border-gray-200 dark:border-white/5 rounded-2xl transition-all shadow-sm group gap-4 relative">
                  
                  {/* 🛑 CLICKABLE PROFILE ROUTING SECTION */}
                  <div 
                    onClick={() => navigate(`/user/${member._id}`)} 
                    className="flex items-center gap-4 cursor-pointer flex-1 group/avatar"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-[#FF2D88] flex items-center justify-center text-white font-bold text-lg shadow-md overflow-hidden transform group-hover/avatar:scale-105 transition-transform duration-300">
                      {member.profilePic ? <img src={member.profilePic} alt={member.name} className="w-full h-full object-cover"/> : (member.name ? member.name.charAt(0).toUpperCase() : 'U')}
                    </div>
                    <div>
                      <h4 className="font-bold text-[15px] group-hover/avatar:text-[#FF2D88] transition-colors duration-200">{member.name || 'Unknown User'}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-1">{member.email}</p>
                      {member.university && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 uppercase tracking-wider font-semibold">
                          {member.university}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-0 border-gray-100 dark:border-white/5 pt-3 sm:pt-0">
                    
                    {/* Role Management */}
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

                    <div className="flex items-center gap-4 text-center relative">
                      <div className="hidden md:block">
                        <p className="text-sm font-bold">{Math.floor(Math.random() * 20)}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">Tasks</p>
                      </div>

                      {/* LEADER REMOVE MEMBER BUTTON & POP-IN MENU */}
                      {isLeader && member.role !== 'Fullstack/Leader' && (
                        <div className="relative">
                          <button 
                            onClick={() => setActiveMenuId(activeMenuId === member._id ? null : member._id)}
                            className="text-gray-400 hover:text-[#FF2D88] transition-colors p-1.5 rounded-lg hover:bg-white/5"
                          >
                            <MoreVertical size={18}/>
                          </button>

                          {activeMenuId === member._id && (
                            <div className="absolute right-0 top-full mt-2 w-44 bg-[#0A0D14] border border-white/10 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in">
                              <button 
                                onClick={() => {
                                  setRemovingMemberId(member._id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left text-xs font-bold text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                              >
                                <Trash2 size={14} /> Remove Member
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Confirmation Modal Pop-in for Removal */}
                  {removingMemberId === member._id && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 rounded-2xl flex items-center justify-between px-6 animate-in fade-in">
                      <p className="text-xs font-medium text-white">Remove <strong>{member.name}</strong> from project?</p>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleRemoveMember(member._id)}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => setRemovingMemberId(null)}
                          className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        </div>

        {/* --- RIGHT SIDE: INVITE PANEL --- */}
        <div className="relative flex flex-col space-y-8 overflow-y-auto premium-scrollbar pb-4 pr-2">
          
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
                {searchQuery.length > 1 && !isSearching && searchResults.length === 0 && !selectedUser && isLeader && (
                  <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl p-3 z-50 text-center text-sm text-gray-500">
                    No verified users found.
                  </div>
                )}
              </div>

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

          {/* Project Hierarchy Legend */}
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
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}