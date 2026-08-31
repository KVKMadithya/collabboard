/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
// ... rest of the code

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children, user }) => {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. INSTANT LOAD: Grab the last active project from memory before the API even fires
  const [activeProject, setActiveProject] = useState(() => {
    try {
      const saved = localStorage.getItem('collab_active_project');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      return null;
    }
  });

  // 2. CACHE SYNC: Whenever activeProject changes, save it securely to local storage
  useEffect(() => {
    if (activeProject) {
      localStorage.setItem('collab_active_project', JSON.stringify(activeProject));
    } else {
      localStorage.removeItem('collab_active_project');
    }
  }, [activeProject]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('collab_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        
        if (data.length > 0) {
          // Check if our cached project actually exists in the freshly fetched database list
          const cachedProjectExists = activeProject && data.some(p => p._id === activeProject._id);
          
          if (!cachedProjectExists) {
            // Fallback: If no cache exists, select the first project the user belongs to
            setActiveProject(data[0]); 
          } else {
            // Update the cached project with the most up-to-date data from the database
            const freshProjectData = data.find(p => p._id === activeProject._id);
            setActiveProject(freshProjectData);
          }
        } else {
          setActiveProject(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch user projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Re-run if the user object loads or changes

  const switchProject = (projectId) => {
    const project = projects.find(p => p._id === projectId);
    if (project) {
      setActiveProject(project);
    }
  };

  // Calculates if the logged-in user owns the active workspace
  const isLeader = activeProject && user && activeProject.leader ? activeProject.leader._id === user._id : false;

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      activeProject, 
      isLeader, 
      switchProject, 
      fetchProjects,
      isProjectLoading: isLoading // Exposes the global loading state safely
    }}>
      {children}
    </ProjectContext.Provider>
  );
};