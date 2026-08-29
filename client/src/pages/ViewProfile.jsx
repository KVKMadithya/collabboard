import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, CheckSquare, Users, MessageSquare, UserPlus, 
  UserCheck, MapPin, ArrowLeft, Loader2, Palette
} from 'lucide-react';

export default function ViewProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [viewedUser, setViewedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interactive UI State
  const [isFollowing, setIsFollowing] = useState(false);
  const [userRating, setUserRating] = useState(0); 
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Background Animation State
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [activeTheme, setActiveTheme] = useState('galaxy');

  const themes = {
    galaxy: { orb1: 'bg-[#FF2D88]/40', orb2: 'bg-[#FF7A00]/30', liquid: 'bg-[#3B28CC]/60' },
    ocean: { orb1: 'bg-[#00FF66]/40', orb2: 'bg-[#00D2FF]/30', liquid: 'bg-[#3A7BD5]/60' },
    sunset: { orb1: 'bg-[#FF4B2B]/40', orb2: 'bg-[#FF416C]/30', liquid: 'bg-[#FFD200]/50' },
    aurora: { orb1: 'bg-[#00FFD1]/40', orb2: 'bg-[#7B2CBF]/30', liquid: 'bg-[#390099]/50' }
  };
  const currentTheme = themes[activeTheme];

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('collab_token');
        const response = await fetch(`http://localhost:5000/api/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('User not found');
        const data = await response.json();
        
        setViewedUser(data);
        setIsFollowing(data.isFollowedByMe || false);
        setUserRating(data.myRating || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [id]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const handleToggleFollow = async () => {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch(`http://localhost:5000/api/users/${id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to follow');
      
      const data = await response.json();
      
      // Update the UI securely with real data from the database
      setIsFollowing(data.isFollowing);
      setViewedUser(prev => ({
        ...prev,
        stats: { ...prev.stats, followers: data.followersCount }
      }));
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRateUser = async (ratingValue) => {
    try {
      const token = localStorage.getItem('collab_token');
      const response = await fetch(`http://localhost:5000/api/users/${id}/rate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ rating: ratingValue })
      });

      if (!response.ok) throw new Error('Failed to rate');
      const data = await response.json();

      // Securely lock in the UI updates
      setUserRating(data.myRating);
      setViewedUser(prev => ({
        ...prev,
        stats: { ...prev.stats, rating: data.averageRating }
      }));
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return <div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin text-[#FF2D88] w-8 h-8" /></div>;
  }

  if (error || !viewedUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-white">
        <h2 className="text-2xl font-bold mb-4">User Not Found</h2>
        <button onClick={() => navigate(-1)} className="text-[#FF2D88] flex items-center gap-2">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col font-sans pb-10 px-4 sm:px-8 animate-fade-in">
      
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 w-fit"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="w-full bg-[#121629] rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 relative">
        
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

        <div className="px-8 sm:px-16 pb-12 relative bg-[#121629]">
          
          <div className="absolute -top-20 left-8 sm:left-16 z-20">
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] p-1.5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <div className="w-full h-full bg-[#060813] rounded-full flex items-center justify-center border-[6px] border-[#121629] overflow-hidden">
                {viewedUser.profilePic ? (
                  <img src={viewedUser.profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl font-bold text-white">{viewedUser.name ? viewedUser.name.charAt(0).toUpperCase() : 'U'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-24 flex flex-col lg:flex-row justify-between items-start gap-10">
            <div className="flex-1">
              <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">{viewedUser.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-gray-400 text-base mt-3">
                <span className="font-medium text-gray-300">{viewedUser.role || 'Member'}</span> 
                <span className="text-gray-600 hidden sm:inline">•</span> 
                <span className="flex items-center gap-1.5"><MapPin size={16}/> {viewedUser.university || 'No university specified'}</span>
              </div>
              <p className="text-gray-500 text-sm mt-2">{viewedUser.email}</p>
            </div>

            <div className="w-full lg:w-96 flex flex-col gap-8">
              <div className="flex justify-between items-center bg-[#0A0D14] p-6 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex flex-col items-center">
                  <p className="text-white font-bold text-2xl flex items-center gap-1.5"><Star size={20} className="text-[#FFC107] fill-[#FFC107]" /> {viewedUser.stats?.rating || "0.0"}</p>
                  <p className="text-gray-500 text-xs uppercase tracking-widest mt-1.5">Rating</p>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="flex flex-col items-center">
                  <p className="text-white font-bold text-2xl flex items-center gap-1.5"><CheckSquare size={20} className="text-[#00FF66]" /> {viewedUser.stats?.tasksCompleted || 0}</p>
                  <p className="text-gray-500 text-xs uppercase tracking-widest mt-1.5">Tasks</p>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="flex flex-col items-center">
                  <p className="text-white font-bold text-2xl flex items-center gap-1.5"><Users size={20} className="text-[#3B28CC]" /> {viewedUser.stats?.followers || 0}</p>
                  <p className="text-gray-500 text-xs uppercase tracking-widest mt-1.5">Followers</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <button 
                    onClick={handleToggleFollow}
                    disabled={isUpdating}
                    className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                      isFollowing 
                      ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10' 
                      : 'bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] text-white hover:opacity-90 shadow-[#FF2D88]/20 hover:-translate-y-0.5'
                    }`}
                  >
                    {isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />} 
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                    <MessageSquare size={18} /> Message
                  </button>
                </div>

                <div className="bg-[#0A0D14] border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Rate {viewedUser.name?.split(' ')[0]}</p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={28}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        onClick={() => handleRateUser(star)}
                        fill={star <= (hoveredStar || userRating) ? "currentColor" : "none"}
                        className={`cursor-pointer transition-all hover:scale-110 ${
                          star <= (hoveredStar || userRating) ? "text-[#FFC107]" : "text-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}