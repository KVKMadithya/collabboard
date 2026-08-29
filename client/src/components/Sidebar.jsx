import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, StickyNote, CheckSquare, Calendar, 
  TrendingUp, Users, GitBranch, Bot, FileText, Settings,
  Share2, Star, LayoutTemplate, CheckCircle2, Search, Pin
} from 'lucide-react';
import ShareModal from './ShareModal';

export default function Sidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false); // Modal State
  
  const isExpanded = isHovered || isPinned;

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: 'Notes', icon: <StickyNote size={20} />, path: '/notes' },
    { name: 'Tasks', icon: <CheckSquare size={20} />, path: '/board' },
    { name: 'Calendar', icon: <Calendar size={20} />, path: '/calendar' },
    { name: 'Progression', icon: <TrendingUp size={20} />, path: '/progression' },
    { name: 'Members', icon: <Users size={20} />, path: '/members' },
    // 🛑 FIX: Updated path to match the new GitFeed route
    { name: 'Git Feed', icon: <GitBranch size={20} />, path: '/git' }, 
    { name: 'AI Assistant', icon: <Bot size={20} />, path: '/ai-assistant' }, 
    { name: 'Reports', icon: <FileText size={20} />, path: '/reports' },
    { name: 'Settings', icon: <Settings size={20} />, path: '/settings' },
  ];

  const favorites = [
    { name: 'Shared with me', icon: <Share2 size={20} />, path: '/shared', isAction: true },
    { name: 'Starred', icon: <Star size={20} />, path: '/starred' },
    { name: 'Templates', icon: <LayoutTemplate size={20} />, path: '/templates' },
  ];

  const handleFavoriteClick = (e, item) => {
    if (item.isAction) {
      e.preventDefault(); // Prevents route navigation
      setIsShareOpen(true); // Triggers Share Modal
    }
  };

  return (
    <>
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        // 🛑 THEME FIX: Using theme-panel and theme-border
        className={`fixed lg:relative z-40 h-screen bg-theme-panel/95 backdrop-blur-2xl border-r border-theme-border flex flex-col text-theme-text font-sans transition-all duration-400 ease-in-out ${
          isExpanded ? 'w-64' : 'w-[84px]'
        }`}
      >
        
        {/* --- Brand Header --- */}
        <div className="p-6 pb-4 flex flex-col gap-6 overflow-hidden">
          
          <div className="flex items-center justify-between text-2xl font-bold text-theme-text whitespace-nowrap">
            <div className="flex items-center gap-3">
              <span className="text-[#FF2D88] drop-shadow-[0_0_8px_rgba(255,45,136,0.5)]">📌</span> 
              <span className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                CollabBoard
              </span>
            </div>
            
            <button 
              onClick={() => setIsPinned(!isPinned)}
              className={`transition-all duration-300 hover:scale-110 flex-shrink-0 ${
                isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none absolute right-0'
              }`}
              title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
            >
              <Pin 
                size={18} 
                className={`transition-colors duration-300 ${isPinned ? 'text-[#FF2D88] fill-[#FF2D88]/20' : 'text-theme-muted hover:text-theme-text'}`} 
              />
            </button>
          </div>
          
          {/* Search Bar */}
          <div className={`bg-theme-bg rounded-xl flex items-center border border-theme-border transition-all duration-300 ${
            isExpanded ? 'p-2.5 px-3 shadow-inner' : 'p-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer justify-center'
          }`}>
            <Search size={18} className="text-theme-muted flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Search..." 
              className={`bg-transparent border-none outline-none text-sm text-theme-text placeholder-theme-muted transition-all duration-300 ${
                isExpanded ? 'w-full ml-3 opacity-100' : 'w-0 ml-0 opacity-0'
              }`}
            />
          </div>
        </div>

        {/* --- Main Menu --- */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 premium-scrollbar">
          
          <p className={`text-[10px] font-bold text-theme-muted mb-3 px-2 uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
            isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden m-0'
          }`}>
            Main Menu
          </p>

          <ul className="space-y-1.5 mb-8">
            {menuItems.map((item) => (
              <li key={item.name}>
                <NavLink 
                  to={item.path}
                  title={!isExpanded ? item.name : ""} 
                  className={({ isActive }) => 
                    `flex items-center px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive 
                        ? 'text-[#FF2D88] bg-black/5 dark:bg-white/5 shadow-[inset_3px_0_0_0_#FF2D88]' 
                        : 'text-theme-muted hover:text-theme-text hover:bg-black/5 dark:hover:bg-white/5 hover:scale-[1.02]'
                    }`
                  }
                >
                  <div className="flex-shrink-0 transition-transform duration-300 hover:rotate-6">
                    {item.icon}
                  </div>
                  <span className={`transition-all duration-300 whitespace-nowrap ${
                    isExpanded ? 'opacity-100 ml-4 translate-x-0' : 'opacity-0 w-0 overflow-hidden m-0 -translate-x-4'
                  }`}>
                    {item.name}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>

          {/* --- Favorites --- */}
          <p className={`text-[10px] font-bold text-theme-muted mb-3 px-2 uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
            isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden m-0'
          }`}>
            Favorites
          </p>

          <ul className="space-y-1.5 mb-4">
            {favorites.map((item) => (
              <li key={item.name}>
                <NavLink 
                  to={item.path}
                  onClick={(e) => handleFavoriteClick(e, item)}
                  title={!isExpanded ? item.name : ""}
                  className={({ isActive }) => 
                    `flex items-center px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive && !item.isAction
                        ? 'text-[#FF2D88] bg-black/5 dark:bg-white/5 shadow-[inset_3px_0_0_0_#FF2D88]' 
                        : 'text-theme-muted hover:text-theme-text hover:bg-black/5 dark:hover:bg-white/5 hover:scale-[1.02]'
                    }`
                  }
                >
                  <div className="flex-shrink-0 transition-transform duration-300 hover:rotate-6">
                    {item.icon}
                  </div>
                  <span className={`transition-all duration-300 whitespace-nowrap ${
                    isExpanded ? 'opacity-100 ml-4 translate-x-0' : 'opacity-0 w-0 overflow-hidden m-0 -translate-x-4'
                  }`}>
                    {item.name}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* --- Sync Status --- */}
        <div className="p-5 border-t border-theme-border bg-theme-bg/50">
          <div className={`flex items-center ${isExpanded ? 'justify-start gap-3' : 'justify-center'} transition-all duration-300`}>
            <div className="bg-[#00FF66]/10 p-1.5 rounded-full flex-shrink-0 shadow-[0_0_10px_rgba(0,255,102,0.2)]">
              <CheckCircle2 size={18} className="text-[#00FF66]" />
            </div>
            <div className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${
              isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
            }`}>
              <p className="text-theme-text text-xs font-medium tracking-wide">All changes synced</p>
              <p className="text-theme-muted text-[10px] mt-0.5 uppercase tracking-wider">Just now</p>
            </div>
          </div>
        </div>

      </aside>

      {/* Shareable Link Modal */}
      <ShareModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
      />
    </>
  );
}