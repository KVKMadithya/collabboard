import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import ViewProfile from './pages/ViewProfile'; 
import Notes from './pages/Notes';
import Dashboard from './pages/Dashboard';
import AiAssistant from './pages/AiAssistant';
import Calendar from './pages/Calendar';
import Reports from './pages/Reports'; 
import Tasks from './pages/Tasks';
import Members from './pages/Members'; 
import GitFeed from './pages/GitFeed'; 
import SearchList from './pages/SearchList';
import Settings from './pages/Settings';
import ProgressionMap from './pages/ProgressionMap';
import Starred from './pages/Starred';
import Whiteboard from './pages/Whiteboard'; // 👈 NEW: Imported the Real-Time Whiteboard component

// Task Architecture
import TaskForm from './pages/TaskForm';
import TaskDetail from './pages/TaskDetail';
import Timeline from './pages/Timeline';

// Global Contexts
import { ThemeProvider } from './context/ThemeContext';
import { ProjectProvider } from './context/ProjectContext'; 

// 🛑 SYNCHRONOUS BOOT SEQUENCE
// Runs instantly on hard refresh to prevent pink flashes
const initializeGlobalState = () => {
  try {
    const prefs = JSON.parse(localStorage.getItem('collab_preferences') || '{}');
    
    // 1. Instant Color Injection
    if (prefs.accentColor) {
      document.documentElement.style.setProperty('--theme-accent', prefs.accentColor);
    }
    
    // 2. Aggressive Translation Cookie
    if (prefs.language && prefs.language !== 'en') {
      document.cookie = `googtrans=/en/${prefs.language}; path=/`;
      if (typeof window !== 'undefined') {
        document.cookie = `googtrans=/en/${prefs.language}; domain=${window.location.hostname}; path=/`;
      }
    } else {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      if (typeof window !== 'undefined') {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;
      }
    }
  } catch (e) {
    console.error("Boot sequence error", e);
  }
};
initializeGlobalState();

const DashboardLayout = ({ user, onSignOut }) => {
  return (
    <div className="flex h-screen bg-theme-bg text-theme-text overflow-hidden transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col px-10 py-8 overflow-y-auto custom-scrollbar">
        <TopBar 
          user={user} 
          onSignOut={onSignOut}
        />
        <div className="flex-1 flex flex-col min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- GLOBAL TRANSLATE ENGINE SETUP ---
  useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(script);

      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          autoDisplay: false 
        }, 'google_translate_element');
      };
    }
  }, []);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('collab_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);

        if (userData.preferences) {
          localStorage.setItem('collab_preferences', JSON.stringify(userData.preferences));
          
          if (userData.preferences.accentColor) {
            document.documentElement.style.setProperty('--theme-accent', userData.preferences.accentColor);
          }
          
          if (userData.preferences.language && userData.preferences.language !== 'en') {
            document.cookie = `googtrans=/en/${userData.preferences.language}; path=/`;
          }
        }
      } else {
        localStorage.removeItem('collab_token');
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('collab_token');
    localStorage.removeItem('collab_preferences'); 
    document.documentElement.style.setProperty('--theme-accent', '#FF2D88'); 
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; 
    setUser(null); 
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-theme-bg items-center justify-center text-theme-text font-sans transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-theme-border border-t-theme-accent rounded-full animate-spin"></div>
          <p className="text-theme-muted text-sm tracking-wide transition-colors duration-300">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ProjectProvider user={user}> 
        <BrowserRouter>
          
          <div id="google_translate_element" className="hidden"></div>
          
          <Routes>
            <Route path="/auth" element={
              user ? <Navigate to="/" /> : <Auth onLoginSuccess={checkAuthStatus} />
            } />

            <Route element={
              user ? <DashboardLayout user={user} onSignOut={handleSignOut} /> : <Navigate to="/auth" />
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/board" element={<Tasks />} />
              <Route path="/tasks/new" element={<TaskForm />} />
              <Route path="/tasks/:id" element={<TaskDetail />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/profile" element={<Profile user={user} toggleRefresh={checkAuthStatus} />} />
              <Route path="/user/:id" element={<ViewProfile />} /> 
              <Route path="/notes" element={<Notes user={user} />} />
              <Route path="/ai-assistant" element={<AiAssistant />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/reports" element={<Reports />} /> 
              <Route path="/members" element={<Members />} /> 
              <Route path="/git" element={<GitFeed user={user} />} />
              <Route path="/search" element={<SearchList />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/progression" element={<ProgressionMap />} />
              <Route path="/starred" element={<Starred />} />
              
              {/* 🛑 NEW ROUTE: Real-Time Whiteboard & Gesture AI */}
              <Route path="/whiteboard" element={<Whiteboard />} />
            </Route>

          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </ThemeProvider>
  );
}

export default App;