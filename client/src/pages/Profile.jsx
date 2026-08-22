import { useState } from 'react';
import { Star, CheckSquare, Users, Edit3, MessageSquare, UserPlus, MapPin, Camera, Palette, X, UploadCloud } from 'lucide-react';

// Accept a toggleRefresh function from App.jsx so we can reload data after editing
export default function Profile({ user, toggleRefresh }) {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [activeTheme, setActiveTheme] = useState('galaxy');
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // We set this to true for now. Later, if viewing someone else's profile, pass false.
  const isOwnProfile = true; 

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

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  // Convert image to Base64 for database storage
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, profilePic: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch('http://127.0.0.1:5000/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setIsEditing(false);
        if (toggleRefresh) toggleRefresh(); // Tell App.jsx to fetch the new data
      }
    } catch (error) {
      console.error('Failed to update profile');
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="h-full w-full max-w-7xl mx-auto flex flex-col font-sans">
      
      {/* --- Edit Profile Modal --- */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#121629] rounded-2xl border border-white/10 shadow-2xl p-6 relative">
            <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">Edit Profile</h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Pic Upload */}
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-[#0A0D14] border-2 border-white/10 relative group">
                  {editForm.profilePic ? (
                    <img src={editForm.profilePic} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <Camera size={32} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <UploadCloud className="text-white" size={24} />
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                <p className="text-xs text-gray-400">Click to upload picture</p>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-gray-400">First Name</label>
                  <input type="text" value={editForm.firstName} onChange={(e) => setEditForm({...editForm, firstName: e.target.value})} className="w-full bg-[#0A0D14] border border-white/10 rounded-lg px-3 py-2 text-white text-sm mt-1" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400">Last Name</label>
                  <input type="text" value={editForm.lastName} onChange={(e) => setEditForm({...editForm, lastName: e.target.value})} className="w-full bg-[#0A0D14] border border-white/10 rounded-lg px-3 py-2 text-white text-sm mt-1" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400">Specialization / Role</label>
                <input type="text" value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})} placeholder="e.g. AI Engineer" className="w-full bg-[#0A0D14] border border-white/10 rounded-lg px-3 py-2 text-white text-sm mt-1" />
              </div>

              <div>
                <label className="text-xs text-gray-400">University / Organization</label>
                <input type="text" value={editForm.university} onChange={(e) => setEditForm({...editForm, university: e.target.value})} placeholder="e.g. NSBM Green University" className="w-full bg-[#0A0D14] border border-white/10 rounded-lg px-3 py-2 text-white text-sm mt-1" />
              </div>

              <button type="submit" disabled={isUploading} className="w-full bg-[#FF2D88] text-white py-2.5 rounded-lg mt-4 font-medium hover:bg-[#FF2D88]/90 transition-colors">
                {isUploading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Full Page Profile Container --- */}
      <div className="w-full bg-[#121629] rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 relative">
        
        {/* --- Top Banner --- */}
        <div className="relative h-64 sm:h-80 bg-[#0A0D14] overflow-hidden cursor-crosshair transition-colors duration-700" onMouseMove={handleMouseMove}>
          <div className={`absolute top-0 left-0 w-72 h-72 rounded-full blur-[70px] mix-blend-screen transition-colors duration-700 ${currentTheme.orb1}`}></div>
          <div className={`absolute bottom-0 right-0 w-96 h-96 rounded-full blur-[90px] mix-blend-screen transition-colors duration-700 ${currentTheme.orb2}`}></div>
          <div className={`absolute w-80 h-80 rounded-full blur-[60px] mix-blend-screen transition-all duration-500 ease-out pointer-events-none ${currentTheme.liquid}`} style={{ left: `calc(${mousePos.x}% - 160px)`, top: `calc(${mousePos.y}% - 160px)` }}></div>

          <div className="absolute top-6 right-6 flex items-center gap-3 bg-black/20 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full z-10">
            <Palette size={16} className="text-gray-300" />
            <div className="flex gap-2">
              {Object.keys(themes).map((themeKey) => (
                <button key={themeKey} onClick={() => setActiveTheme(themeKey)} className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${activeTheme === themeKey ? 'ring-2 ring-white scale-110' : 'opacity-50'}`} style={{ background: themeKey === 'galaxy' ? '#FF2D88' : themeKey === 'ocean' ? '#00D2FF' : themeKey === 'sunset' ? '#FF416C' : '#00FFD1' }} />
              ))}
            </div>
          </div>
        </div>

        {/* --- Bottom Section --- */}
        <div className="px-8 sm:px-16 pb-12 relative bg-[#121629]">
          
          <div className="absolute -top-20 left-8 sm:left-16 z-20">
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] p-1.5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <div className="w-full h-full bg-[#060813] rounded-full flex items-center justify-center border-[6px] border-[#121629] overflow-hidden">
                {user.profilePic ? (
                  <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl font-bold text-white">{user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-24 flex flex-col lg:flex-row justify-between items-start gap-10">
            <div className="flex-1">
              <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">{user.firstName} {user.lastName}</h2>
              <div className="flex flex-wrap items-center gap-2 text-gray-400 text-base mt-3">
                <span className="font-medium text-gray-300">{user.role || 'Add a role'}</span> 
                <span className="text-gray-600 hidden sm:inline">•</span> 
                <span className="flex items-center gap-1.5"><MapPin size={16}/> {user.university || 'Add a university'}</span>
              </div>
              <p className="text-gray-500 text-sm mt-2">{user.email}</p>
            </div>

            <div className="w-full lg:w-96 flex flex-col gap-8">
              <div className="flex justify-between items-center bg-[#0A0D14] p-6 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex flex-col items-center">
                  <p className="text-white font-bold text-2xl flex items-center gap-1.5"><Star size={20} className="text-[#FFC107] fill-[#FFC107]" /> {user.stats?.rating || "0.0"}</p>
                  <p className="text-gray-500 text-xs uppercase tracking-widest mt-1.5">Rating</p>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="flex flex-col items-center">
                  <p className="text-white font-bold text-2xl flex items-center gap-1.5"><CheckSquare size={20} className="text-[#00FF66]" /> {user.stats?.tasksCompleted || 0}</p>
                  <p className="text-gray-500 text-xs uppercase tracking-widest mt-1.5">Tasks</p>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="flex flex-col items-center">
                  <p className="text-white font-bold text-2xl flex items-center gap-1.5"><Users size={20} className="text-[#3B28CC]" /> {user.stats?.followers || 0}</p>
                  <p className="text-gray-500 text-xs uppercase tracking-widest mt-1.5">Followers</p>
                </div>
              </div>

              <div className="space-y-3">
                {isOwnProfile ? (
                  <button onClick={() => setIsEditing(true)} className="w-full bg-gradient-to-r from-[#FF2D88] to-[#3B28CC] text-white py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-[#FF2D88]/20">
                    <Edit3 size={18} /> Edit Account
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors">
                      <UserPlus size={18} /> Follow
                    </button>
                    <button className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors">
                      <MessageSquare size={18} /> Review
                    </button>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}