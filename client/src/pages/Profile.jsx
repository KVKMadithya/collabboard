import React, { useState, useEffect } from 'react';
import { 
  Star, CheckSquare, Users, Edit3, MapPin, 
  Camera, Palette, X, UploadCloud, Loader2, AlertCircle, Mail
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Profile({ user, toggleRefresh }) {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [activeTheme, setActiveTheme] = useState('galaxy');
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Live Calculated Stats
  const [liveStats, setLiveStats] = useState({ rating: "0.0", tasksCompleted: 0, followers: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Form State
  const [editForm, setEditForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    role: user?.role || '',
    university: user?.university || '',
    profilePic: user?.profilePic || ''
  });

  const themes = {
    galaxy: { orb1: 'bg-[#FF2D88]/40', orb2: 'bg-[#FF7A00]/30', liquid: 'bg-[#3B28CC]/60' },
    ocean: { orb1: 'bg-[#00FF66]/40', orb2: 'bg-[#00D2FF]/30', liquid: 'bg-[#3A7BD5]/60' },
    sunset: { orb1: 'bg-[#FF4B2B]/40', orb2: 'bg-[#FF416C]/30', liquid: 'bg-[#FFD200]/50' },
    aurora: { orb1: 'bg-[#00FFD1]/40', orb2: 'bg-[#7B2CBF]/30', liquid: 'bg-[#390099]/50' }
  };
  const currentTheme = themes[activeTheme];

  // Sync edit form with user state when user prop updates or modal opens
  useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role || '',
        university: user.university || '',
        profilePic: user.profilePic || ''
      });
    }
  }, [user, isEditing]);

  // Handle ESC key press to close edit modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isEditing) {
        setIsEditing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing]);

  // Fetch live statistics for the logged-in user
  useEffect(() => {
    let isMounted = true;
    const fetchLiveStats = async () => {
      if (!user?._id) return;
      setIsLoadingStats(true);
      try {
        const token = localStorage.getItem('collab_token');
        const response = await fetch(`${API_URL}/api/users/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok && isMounted) {
          const data = await response.json();
          setLiveStats(data.stats || { rating: "0.0", tasksCompleted: 0, followers: 0 }); 
        }
      } catch (error) {
        console.error('Failed to fetch live stats:', error);
      } finally {
        if (isMounted) setIsLoadingStats(false);
      }
    };

    fetchLiveStats();
    return () => { isMounted = false; };
  }, [user?._id]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image file size must be less than 5MB.');
      return;
    }

    setFormError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm((prev) => ({ ...prev, profilePic: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setFormError('');

    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setIsEditing(false);
        if (toggleRefresh) toggleRefresh();
      } else {
        const errData = await response.json().catch(() => ({}));
        setFormError(errData.message || 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setFormError('Network error. Please check your connection.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col font-sans pb-10 px-4 sm:px-8 animate-fade-in">
      
      {/* --- Edit Profile Modal --- */}
      {isEditing && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in"
          onClick={(e) => e.target === e.currentTarget && setIsEditing(false)}
        >
          <div className="w-full max-w-lg bg-[#121629] rounded-2xl border border-white/10 shadow-2xl p-6 sm:p-8 relative zoom-in-95 animate-in">
            <button 
              onClick={() => setIsEditing(false)} 
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">Edit Profile</h3>
            
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-red-400 text-xs font-semibold">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-[#0A0D14] border-2 border-white/10 relative group shadow-inner">
                  {editForm.profilePic ? (
                    <img src={editForm.profilePic} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <Camera size={32} />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <UploadCloud className="text-white" size={24} />
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                <p className="text-xs text-gray-400 font-medium">Click avatar to upload new photo</p>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">First Name</label>
                  <input 
                    type="text" 
                    required
                    value={editForm.firstName} 
                    onChange={(e) => setEditForm({...editForm, firstName: e.target.value})} 
                    className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF2D88] outline-none transition-colors" 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Last Name</label>
                  <input 
                    type="text" 
                    required
                    value={editForm.lastName} 
                    onChange={(e) => setEditForm({...editForm, lastName: e.target.value})} 
                    className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF2D88] outline-none transition-colors" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Specialization / Role</label>
                <input 
                  type="text" 
                  value={editForm.role} 
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})} 
                  placeholder="e.g. Full-Stack Developer" 
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF2D88] outline-none transition-colors" 
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">University / Organization</label>
                <input 
                  type="text" 
                  value={editForm.university} 
                  onChange={(e) => setEditForm({...editForm, university: e.target.value})} 
                  placeholder="e.g. NSBM Green University" 
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#FF2D88] outline-none transition-colors" 
                />
              </div>

              <button 
                type="submit" 
                disabled={isUploading} 
                className="w-full bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] text-white py-3.5 rounded-xl mt-6 font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(255,45,136,0.3)] hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isUploading ? <Loader2 className="animate-spin" size={18}/> : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Full Page Profile Container --- */}
      <div className="w-full bg-[#121629] rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 relative">
        
        {/* --- Dynamic Interactive Theme Banner --- */}
        <div 
          className="relative h-64 sm:h-80 bg-[#0A0D14] overflow-hidden cursor-crosshair transition-colors duration-700 select-none" 
          onMouseMove={handleMouseMove}
        >
          <div className={`absolute top-0 left-0 w-72 h-72 rounded-full blur-[70px] mix-blend-screen transition-colors duration-700 ${currentTheme.orb1}`} />
          <div className={`absolute bottom-0 right-0 w-96 h-96 rounded-full blur-[90px] mix-blend-screen transition-colors duration-700 ${currentTheme.orb2}`} />
          <div 
            className={`absolute w-80 h-80 rounded-full blur-[60px] mix-blend-screen transition-all duration-500 ease-out pointer-events-none ${currentTheme.liquid}`} 
            style={{ left: `calc(${mousePos.x}% - 160px)`, top: `calc(${mousePos.y}% - 160px)` }} 
          />

          <div className="absolute top-6 right-6 flex items-center gap-3 bg-black/30 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full z-10 shadow-lg">
            <Palette size={16} className="text-gray-300" />
            <div className="flex gap-2">
              {Object.keys(themes).map((themeKey) => (
                <button 
                  key={themeKey} 
                  onClick={() => setActiveTheme(themeKey)} 
                  title={`${themeKey.charAt(0).toUpperCase() + themeKey.slice(1)} Theme`}
                  className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${activeTheme === themeKey ? 'ring-2 ring-white scale-110' : 'opacity-50'}`} 
                  style={{ background: themeKey === 'galaxy' ? '#FF2D88' : themeKey === 'ocean' ? '#00D2FF' : themeKey === 'sunset' ? '#FF416C' : '#00FFD1' }} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* --- Profile Overview Section --- */}
        <div className="px-6 sm:px-12 lg:px-16 pb-12 relative bg-[#121629]">
          
          <div className="absolute -top-20 left-6 sm:left-12 lg:left-16 z-20">
            <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] p-1.5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <div className="w-full h-full bg-[#060813] rounded-full flex items-center justify-center border-[6px] border-[#121629] overflow-hidden">
                {user.profilePic ? (
                  <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl sm:text-6xl font-bold text-white">
                    {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-20 sm:pt-24 flex flex-col lg:flex-row justify-between items-start gap-8">
            <div className="flex-1">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                {user.firstName} {user.lastName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-gray-400 text-sm sm:text-base mt-3">
                <span className="font-semibold text-gray-200">{user.role || 'Member'}</span> 
                <span className="text-gray-600 hidden sm:inline">•</span> 
                <span className="flex items-center gap-1.5 text-gray-400">
                  <MapPin size={16} className="text-[#FF2D88]" /> {user.university || 'No location set'}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-2 flex items-center gap-1.5">
                <Mail size={14} className="text-gray-500" /> {user.email}
              </p>
            </div>

            <div className="w-full lg:w-96 flex flex-col gap-6">
              
              {/* --- Live Stats --- */}
              <div className="flex justify-between items-center bg-[#0A0D14] p-5 sm:p-6 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex flex-col items-center flex-1">
                  <p className="text-white font-bold text-xl sm:text-2xl flex items-center gap-1.5">
                    <Star size={18} className="text-[#FFC107] fill-[#FFC107]" /> 
                    {isLoadingStats ? <Loader2 size={18} className="animate-spin text-gray-500"/> : (liveStats.rating || "0.0")}
                  </p>
                  <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest mt-1 font-semibold">Rating</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="flex flex-col items-center flex-1">
                  <p className="text-white font-bold text-xl sm:text-2xl flex items-center gap-1.5">
                    <CheckSquare size={18} className="text-[#00FF66]" /> 
                    {isLoadingStats ? <Loader2 size={18} className="animate-spin text-gray-500"/> : (liveStats.tasksCompleted || 0)}
                  </p>
                  <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest mt-1 font-semibold">Tasks</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="flex flex-col items-center flex-1">
                  <p className="text-white font-bold text-xl sm:text-2xl flex items-center gap-1.5">
                    <Users size={18} className="text-[#3B28CC]" /> 
                    {isLoadingStats ? <Loader2 size={18} className="animate-spin text-gray-500"/> : (liveStats.followers || 0)}
                  </p>
                  <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest mt-1 font-semibold">Followers</p>
                </div>
              </div>

              <button 
                onClick={() => setIsEditing(true)} 
                className="w-full bg-gradient-to-r from-[#FF2D88] to-[#3B28CC] text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)] hover:-translate-y-0.5"
              >
                <Edit3 size={18} /> Edit Account
              </button>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}