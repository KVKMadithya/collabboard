import React, { useState, useEffect } from 'react';
import { 
  Users, Circle, Crown, MoreVertical, 
  Search, Plus, Shield, Loader2, CheckCircle2
} from 'lucide-react';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Invite System State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('Editor');
  const [isSearching, setIsSearching] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null);

  // Fetch actual members on component mount
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch('http://localhost:5000/api/members', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to fetch members", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LIVE BACKEND SEARCH LOGIC ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      // Only search if the user has typed at least 2 characters
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const token = localStorage.getItem('collab_token');
          // Calls the search endpoint we created in the backend
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
    }, 300); // Debounce: Waits 300ms after you stop typing before hitting the DB

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // --- SEND INVITE LOGIC ---
  const handleSendInvite = async () => {
    if (!selectedUser) return;
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
          roleOffered: selectedRole 
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

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF2D88] animate-spin" />
      </div>
    );
  }

  // Live Stats calculations
  const onlineCount = Math.floor(members.length * 0.4) || 0; // Keeping mock online count for visual purposes
  const adminCount = members.filter(m => m.role === 'Admin').length || 1;

  return (
    <div className="p-8 w-full max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col animate-fade-in text-gray-900 dark:text-white">
      
      {/* THE FIX: We put everything inside the master grid so the right column aligns to the absolute top */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 flex-1 min-h-0">
        
        {/* --- LEFT SIDE: HEADER, STATS, & MEMBER LIST --- */}
        <div className="lg:col-span-2 flex flex-col min-h-0 pr-2">
          
          {/* 1. Header (Moved inside the left column) */}
          <div className="mb-8 flex-shrink-0">
            <h1 className="text-2xl font-bold mb-1">Members</h1>
            <p className="text-sm font-medium text-[#FF2D88]">
              {members.length} Members <span className="text-gray-500 dark:text-gray-400 ml-2">CollaBoard workspace</span>
            </p>
          </div>

          {/* 2. Stats Cards (Moved inside the left column) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 flex-shrink-0">
            <div className="bg-white dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl p-5 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500"><Users size={20}/></div>
              <div>
                <h3 className="text-xl font-bold">{members.length}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Total members</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl p-5 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500"><Circle fill="currentColor" size={14}/></div>
              <div>
                <h3 className="text-xl font-bold">{onlineCount}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Online now</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl p-5 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500"><Crown size={20}/></div>
              <div>
                <h3 className="text-xl font-bold">{adminCount}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Admins</p>
              </div>
            </div>
          </div>

          {/* 3. The Member List (Scrolls independently of the header/stats) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pb-4">
            {members.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">No members found.</p>
            ) : (
              members.map((member, idx) => (
                <div key={member._id || idx} className="flex items-center justify-between p-4 bg-white dark:bg-[#0A0D14] hover:bg-gray-50 dark:hover:bg-[#121629] border border-gray-200 dark:border-white/5 rounded-xl transition-colors shadow-sm group">
                  
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-[#FF2D88] flex items-center justify-center text-white font-bold shadow-md">
                      {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm">{member.name || 'Unknown User'}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider uppercase ${
                          member.role === 'Admin' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' : 
                          member.role === 'Viewer' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 
                          'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        }`}>
                          {member.role || 'Editor'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{member.email}</p>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-8 text-center">
                    <div>
                      <p className="text-sm font-bold">{Math.floor(Math.random() * 20)}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tasks Done</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{Math.floor(Math.random() * 10)}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100 p-2">
                      <MoreVertical size={18}/>
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

        {/* --- RIGHT SIDE: INVITE PANEL & ROLES (Now perfectly aligned to the top) --- */}
        <div className="space-y-10 overflow-y-auto custom-scrollbar pb-4 pr-2">
          
          {/* Invite Form */}
          <div className="bg-white dark:bg-transparent p-6 dark:p-0 rounded-2xl border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
            <h2 className="text-lg font-bold mb-1">Invite a member</h2>
            <p className="text-xs text-[#FF2D88] font-medium mb-5">Add someone new to CollaBoard</p>
            
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
                    className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors"
                  />
                  {isSearching && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#FF2D88] animate-spin" />}
                </div>

                {/* LIVE SEARCH DROPDOWN */}
                {searchResults.length > 0 && !selectedUser && (
                  <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    {searchResults.map(user => (
                      <div 
                        key={user._id}
                        onClick={() => {
                          setSelectedUser(user);
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex flex-col border-b border-gray-100 dark:border-white/5 last:border-0"
                      >
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* No Results Fallback */}
                {searchQuery.length > 1 && !isSearching && searchResults.length === 0 && !selectedUser && (
                  <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl p-3 z-50 text-center text-sm text-gray-500">
                    No users found.
                  </div>
                )}
              </div>

              {/* Role Selector */}
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#0A0D14] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#FF2D88] appearance-none cursor-pointer"
              >
                <option value="Admin">Admin</option>
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
              </select>

              {/* Send Button */}
              <button 
                onClick={handleSendInvite}
                disabled={!selectedUser || inviteStatus === 'sending'}
                className="w-full mt-2 bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] hover:opacity-90 disabled:opacity-50 text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)] flex items-center justify-center gap-2"
              >
                {inviteStatus === 'sending' ? <Loader2 size={18} className="animate-spin"/> :
                 inviteStatus === 'success' ? <CheckCircle2 size={18} /> :
                 <Plus size={18} />}
                
                {inviteStatus === 'success' ? 'Invite Sent!' : 'Send Invite'}
              </button>
            </div>
          </div>

          {/* Roles Legend */}
          <div className="bg-white dark:bg-transparent p-6 dark:p-0 rounded-2xl border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
            <h2 className="text-lg font-bold mb-6">Roles and Permissions</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-bold text-sm">Admin</h4>
                  <span className="bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] px-2 py-0.5 rounded font-bold">1</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Full access, manage members & settings</p>
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-bold text-sm">Editor</h4>
                  <span className="bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] px-2 py-0.5 rounded font-bold">3</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Create & edit notes, tasks & board</p>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-bold text-sm">Viewer</h4>
                  <span className="bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] px-2 py-0.5 rounded font-bold">1</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Read only access to the board</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}