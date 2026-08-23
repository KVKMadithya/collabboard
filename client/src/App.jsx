import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Notes from './pages/Notes';

const DashboardLayout = ({ user, onSignOut }) => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#060813] text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col px-10 py-8 overflow-y-auto custom-scrollbar">
        <TopBar 
          user={user} 
          onSignOut={onSignOut}
        />
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const Placeholder = ({ title }) => (
  <div className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl h-96 flex items-center justify-center text-gray-500 text-xl transition-colors duration-300">
    {title} content will go here
  </div>
);

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
      <div className="flex h-screen w-full bg-gray-50 dark:bg-[#060813] items-center justify-center text-gray-900 dark:text-white font-sans transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-200 dark:border-white/10 border-t-[#FF2D88] rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm tracking-wide transition-colors duration-300">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        
        <Route path="/auth" element={
          user ? <Navigate to="/" /> : <Auth onLoginSuccess={checkAuthStatus} />
        } />

        <Route element={
          user ? <DashboardLayout user={user} onSignOut={handleSignOut} /> : <Navigate to="/auth" />
        }>
          <Route path="/" element={<Placeholder title="Dashboard" />} />
          <Route path="/board" element={<Placeholder title="Task Board" />} />
          <Route path="/profile" element={<Profile user={user} toggleRefresh={checkAuthStatus} />} />
          <Route path="/notes" element={<Notes user={user} />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;