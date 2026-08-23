import { useState, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TopBar({ user, onSignOut }) {
  const navigate = useNavigate();
  
  // 1. Enforce Dark Mode as the default unless explicitly set to light
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('collab_theme');
    return savedTheme === 'light' ? false : true;
  });

  const [greeting, setGreeting] = useState('Welcome Back');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // 2. Strictly enforce the DOM class
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      localStorage.setItem('collab_theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('collab_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  return (
    <header className="flex justify-between items-center mb-10 font-sans tracking-wide transition-colors duration-300">
      
      {/* --- Left Side: Dynamic Greeting --- */}
      <div>
        <h1 className="text-3xl font-light text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
          {greeting},{' '}
          <span className="text-[#FF2D88] font-semibold">
            {user ? user.firstName : 'Visitor'}
          </span>{' '}
          👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 font-light transition-colors duration-300">
          {user 
            ? 'You have 3 Notes Updated Since Yesterday' 
            : 'Viewing in read-only mode. Please sign in to make edits.'}
        </p>
      </div>

      {/* --- Right Side: Actions & Profile --- */}
      <div className="flex items-center gap-5">
        
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-[#121629] p-2.5 rounded-full border border-gray-200 dark:border-white/5 transition-all duration-500 hover:scale-110 hover:shadow-[0_0_15px_rgba(255,45,136,0.1)] active:rotate-90"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Action Button */}
        {user && (
          <button 
            onClick={() => navigate('/notes', { state: { openModal: true } })}
            className="bg-gradient-to-r from-[#FF2D88] to-[#FF7A00] text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-lg shadow-[#FF2D88]/20 ml-2"
          >
            <span>+</span> New notes <ChevronDown size={16} />
          </button>
        )}
        
        {/* Notification Bell */}
        <button className="relative text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:scale-110 ml-2">
          <Bell size={22} />
          {user && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#FF2D88] border-2 border-white dark:border-[#060813] rounded-full shadow-[0_0_8px_rgba(255,45,136,0.8)] transition-colors duration-300"></span>
          )}
        </button>

        {/* --- Authentication State Toggle --- */}
        <div className="flex items-center pl-6 border-l border-gray-200 dark:border-white/10 ml-2 transition-colors duration-300">
          {user ? (
            <div className="flex items-center gap-3">
              
              {/* Clickable Profile Section */}
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 p-2 rounded-xl transition-all hover:scale-[1.02]"
                onClick={() => navigate('/profile')}
                title="Go to User Profile"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-transparent hover:ring-gray-300 dark:hover:ring-white/20 transition-all overflow-hidden">
                  {user.profilePic ? (
                    <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'
                  )}
                </div>
                <div className="text-sm hidden sm:block">
                  <p className="text-gray-900 dark:text-white font-medium tracking-wide transition-colors duration-300">{user.firstName} {user.lastName}</p>
                  <p className="text-[#00FF66] text-xs font-light mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse"></span> Online
                  </p>
                </div>
              </div>

              {/* Dedicated Sign Out Button */}
              <button 
                onClick={onSignOut}
                className="text-gray-500 hover:text-[#FF2D88] p-2 rounded-xl hover:bg-[#FF2D88]/10 transition-all ml-1 group"
                title="Sign Out"
              >
                <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>

            </div>
          ) : (
            <button 
              onClick={() => navigate('/auth')}
              className="bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white px-7 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}