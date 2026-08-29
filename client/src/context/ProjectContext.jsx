import React, { createContext, useContext, useState, useEffect } from 'react';

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

// Accept the globally logged-in user so we can cross-reference IDs
export const ProjectProvider = ({ children, user }) => {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('collab_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/projects/user', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        
        // Auto-select a project if one isn't active
        if (data.length > 0) {
          if (!activeProject || !data.some(p => p._id === activeProject._id)) {
            setActiveProject(data[0]);
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
  }, [user]); // Re-run if the user object loads or changes

  const switchProject = (projectId) => {
    const project = projects.find(p => p._id === projectId);
    if (project) {
      setActiveProject(project);
    }
  };

  // 🚀 THE MASTER KEY: Calculates if the logged-in user owns the active workspace
  const isLeader = activeProject && user ? activeProject.leader._id === user._id : false;

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      activeProject, 
      isLeader, // Instantly unlocks/locks UI elements across your app
      switchProject, 
      fetchProjects,
      isLoading 
    }}>
      {children}
    </ProjectContext.Provider>
  );
};