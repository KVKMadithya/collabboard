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
import Tasks from './pages/Tasks';
import Members from './pages/Members'; 
import GitFeed from './pages/GitFeed'; // 👈 NEW: Imported the GitFeed page

// Task Architecture
import TaskForm from './pages/TaskForm';
import TaskDetail from './pages/TaskDetail';
import Timeline from './pages/Timeline';

// Global Contexts
import { ThemeProvider } from './context/ThemeContext';
import { ProjectProvider } from './context/ProjectContext'; 

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
    setUser(null); 
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-theme-bg items-center justify-center text-theme-text font-sans transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-theme-border border-t-[#FF2D88] rounded-full animate-spin"></div>
          <p className="text-theme-muted text-sm tracking-wide transition-colors duration-300">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ProjectProvider user={user}> 
        <BrowserRouter>
          <Routes>

            <Route path="/auth" element={
              user ? <Navigate to="/" /> : <Auth onLoginSuccess={checkAuthStatus} />
            } />

            <Route element={
              user ? <DashboardLayout user={user} onSignOut={handleSignOut} /> : <Navigate to="/auth" />
            }>
              <Route path="/" element={<Dashboard />} />

              {/* Core Task & Project Management Routes */}
              <Route path="/board" element={<Tasks />} />
              <Route path="/tasks/new" element={<TaskForm />} />
              <Route path="/tasks/:id" element={<TaskDetail />} />
              <Route path="/timeline" element={<Timeline />} />

              {/* Other App Features */}
              <Route path="/profile" element={<Profile user={user} toggleRefresh={checkAuthStatus} />} />
              <Route path="/user/:id" element={<ViewProfile />} /> 
              <Route path="/notes" element={<Notes user={user} />} />
              <Route path="/ai-assistant" element={<AiAssistant />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/members" element={<Members />} /> 
              <Route path="/git" element={<GitFeed user={user} />} /> {/* 👈 NEW: Added the GitFeed route */}
            </Route>

          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </ThemeProvider>
  );
}

export default App;