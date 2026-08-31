import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, Loader2, CheckCircle2, Circle, AlertCircle, 
  FolderKanban, ZoomIn, ZoomOut, Focus 
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { apiFetch } from '../utils/api'; // 👈 NEW: Using centralized API utility

export default function ProgressionMap() {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');

  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- CAMERA ENGINE STATE (PAN & ZOOM) ---
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  const CANVAS_WIDTH = 2000;
  const CANVAS_HEIGHT = 1400;
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;

  // --- 1. FETCH DATA STRICTLY FOR THE ACTIVE WORKSPACE ---
  useEffect(() => {
    if (!activeProject) {
      setIsLoading(false);
      return;
    }

    const fetchProgressionData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 👈 NEW: Cleaned up using centralized apiFetch
        const [membersData, tasksData] = await Promise.all([
          apiFetch(`/api/members?projectId=${activeProject._id}`),
          apiFetch(`/api/tasks?projectId=${activeProject._id}`)
        ]);

        setMembers(Array.isArray(membersData) ? membersData : []);
        setTasks(Array.isArray(tasksData) ? tasksData : []);
      } catch (err) {
        setError(err.message || "Failed to connect to backend engine");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressionData();
  }, [activeProject]);

  // --- 2. INITIAL CAMERA FOCUS ---
  const resetCamera = () => {
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      setPan({
        x: (cw - CANVAS_WIDTH) / 2,
        y: (ch - CANVAS_HEIGHT) / 2
      });
      setZoom(1);
    }
  };

  useEffect(() => {
    if (!isLoading && activeProject) resetCamera();
  }, [isLoading, activeProject]);

  // --- 3. MOUSE WHEEL ZOOM & PINCH FUNCTIONALITY ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomSensitivity = 0.002;
      const delta = -e.deltaY * zoomSensitivity;
      
      setZoom(prev => Math.min(Math.max(0.3, prev + delta), 2.5));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isLoading]);

  // --- 4. PANNING (CLICK & DRAG) LOGIC ---
  const handlePointerDown = (e) => {
    if (e.target.closest('.no-pan')) return;
    setIsDraggingMap(true);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingMap) return;
    setPan(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY
    }));
  };

  const handlePointerUp = (e) => {
    setIsDraggingMap(false);
    try { e.target.releasePointerCapture(e.pointerId); } catch (_) {}
  };

  // --- 5. THE SPIDER WEB COORDINATE ENGINE ---
  const memberCoords = {};
  const taskCoords = {};
  const unassignedTasks = [];
  const assignedTasks = [];

  const getAssigneeId = (assignee) => typeof assignee === 'object' && assignee !== null ? assignee._id : assignee;

  tasks.forEach(t => {
    if (!t.assignees || t.assignees.length === 0) unassignedTasks.push(t);
    else assignedTasks.push(t);
  });

  const memberRadius = 350;
  members.forEach((m, i) => {
    const angle = (i / members.length) * 2 * Math.PI - Math.PI / 2;
    memberCoords[m._id] = {
      x: centerX + Math.cos(angle) * memberRadius,
      y: centerY + Math.sin(angle) * memberRadius,
      angle: angle,
      totalAssigned: 0,
      totalDone: 0
    };
  });

  assignedTasks.forEach(t => {
    t.assignees.forEach(a => {
      const aId = getAssigneeId(a);
      if (memberCoords[aId]) {
        memberCoords[aId].totalAssigned += 1;
        if (t.status === 'done') memberCoords[aId].totalDone += 1;
      }
    });
  });

  const unassignedRadius = 180;
  unassignedTasks.forEach((t, i) => {
    const angle = (i / unassignedTasks.length) * 2 * Math.PI;
    taskCoords[t._id] = {
      x: centerX + Math.cos(angle) * unassignedRadius,
      y: centerY + Math.sin(angle) * unassignedRadius,
    };
  });

  const tasksByMember = {};
  members.forEach(m => tasksByMember[m._id] = []);
  
  assignedTasks.forEach(t => {
    if (t.assignees.length === 1) {
      const mId = getAssigneeId(t.assignees[0]);
      if (tasksByMember[mId]) tasksByMember[mId].push(t);
    }
  });

  assignedTasks.forEach((t, i) => {
    if (t.assignees.length === 1) {
      const mId = getAssigneeId(t.assignees[0]);
      const mPos = memberCoords[mId];
      if (mPos) {
        const tIndex = (tasksByMember[mId] || []).findIndex(x => x._id === t._id);
        const tCount = (tasksByMember[mId] || []).length;
        const spread = Math.PI * 0.8;
        const baseAngle = mPos.angle;
        const angleOffset = tCount <= 1 ? 0 : (tIndex / (tCount - 1)) * spread - (spread / 2);
        const finalAngle = baseAngle + angleOffset;
        
        taskCoords[t._id] = {
          x: mPos.x + Math.cos(finalAngle) * 160,
          y: mPos.y + Math.sin(finalAngle) * 160
        };
      }
    } else {
      let sumX = 0, sumY = 0, validCount = 0;
      t.assignees.forEach(a => {
        const aId = getAssigneeId(a);
        if (memberCoords[aId]) {
          sumX += memberCoords[aId].x;
          sumY += memberCoords[aId].y;
          validCount++;
        }
      });
      if (validCount > 0) {
        const cx = sumX / validCount;
        const cy = sumY / validCount;
        const scatterRadius = validCount > 1 ? 40 + (i * 8) : 0;
        const scatterAngle = i * 2.4; 
        taskCoords[t._id] = {
          x: cx + Math.cos(scatterAngle) * scatterRadius,
          y: cy + Math.sin(scatterAngle) * scatterRadius
        };
      }
    }
  });

  if (!activeProject && !isLoading) {
    return (
      <div className="flex-1 w-full h-[calc(100vh-80px)] flex items-center justify-center animate-fade-in p-8">
        <div className="max-w-md w-full bg-theme-panel p-8 rounded-[2rem] border border-theme-border shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-[#FF2D88]/20">
            <Briefcase size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-theme-text mb-2">No Workspace Active</h2>
          <p className="text-sm text-theme-muted mb-6">
            Please select a project from the top menu or create a new workspace to view its Progression Web.
          </p>
          <button 
            onClick={() => navigate('/members')}
            style={{ backgroundColor: 'var(--theme-accent)' }}
            className="w-full hover:opacity-90 text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-md"
          >
            Go to Workspaces
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-80px)] w-full flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-theme-accent animate-spin" />
        <p className="text-sm text-theme-muted font-medium tracking-wide">Mapping progression web...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-80px)] w-full flex items-center justify-center p-8">
        <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl flex items-center gap-4 text-red-500 max-w-lg">
          <AlertCircle size={24} />
          <div>
            <h3 className="font-bold">Engine Failure</h3>
            <p className="text-sm opacity-80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`w-full h-[calc(100vh-80px)] bg-theme-bg overflow-hidden relative font-sans touch-none transition-colors ${
        isDraggingMap ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gentleFloat {
          0% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-8px) translateX(4px); }
          66% { transform: translateY(4px) translateX(-4px); }
          100% { transform: translateY(0px) translateX(0px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px 0px var(--theme-accent); }
          50% { box-shadow: 0 0 40px 10px var(--theme-accent); }
        }
        .organic-float { animation: gentleFloat 8s ease-in-out infinite; }
        .organic-float-delay-1 { animation: gentleFloat 9s ease-in-out infinite 1s; }
        .organic-float-delay-2 { animation: gentleFloat 10s ease-in-out infinite 2s; }
        .core-pulse { animation: pulseGlow 4s ease-in-out infinite; }
      `}} />

      <div 
        className="absolute transform-gpu transition-transform duration-75 ease-out origin-center"
        style={{ 
          width: `${CANVAS_WIDTH}px`, 
          height: `${CANVAS_HEIGHT}px`,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          backgroundImage: 'radial-gradient(var(--theme-border) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {unassignedTasks.map(t => {
            const pos = taskCoords[t._id];
            if (!pos) return null;
            return (
              <line
                key={`line-u-${t._id}`}
                x1={centerX} y1={centerY}
                x2={pos.x} y2={pos.y}
                className="stroke-theme-muted"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.3"
              />
            );
          })}

          {members.map(m => {
            const pos = memberCoords[m._id];
            if (!pos) return null;
            return (
              <line
                key={`line-m-${m._id}`}
                x1={centerX} y1={centerY}
                x2={pos.x} y2={pos.y}
                className="stroke-theme-border"
                strokeWidth="2"
                opacity="0.6"
              />
            );
          })}

          {assignedTasks.map(t => {
            const tPos = taskCoords[t._id];
            if (!tPos) return null;
            const isDone = t.status === 'done';

            return t.assignees.map(a => {
              const aId = getAssigneeId(a);
              const mPos = memberCoords[aId];
              if (!mPos) return null;
              
              return (
                <line
                  key={`line-t-${t._id}-${aId}`}
                  x1={mPos.x} y1={mPos.y}
                  x2={tPos.x} y2={tPos.y}
                  stroke={isDone ? 'var(--theme-accent)' : 'currentColor'}
                  className={isDone ? 'opacity-50' : 'text-theme-muted opacity-20'}
                  strokeWidth={isDone ? '2' : '1.5'}
                  strokeDasharray={isDone ? 'none' : '4 4'}
                />
              );
            });
          })}
        </svg>

        <div 
          className="no-pan absolute z-10 flex flex-col items-center justify-center w-36 h-36 rounded-full core-pulse cursor-pointer transition-transform hover:scale-105"
          style={{ 
            backgroundColor: 'var(--theme-accent)',
            left: `${centerX}px`, top: `${centerY}px`, 
            transform: 'translate(-50%, -50%)' 
          }}
          onClick={() => navigate('/board')}
        >
          <FolderKanban size={32} className="text-white mb-2" />
          <span className="text-white font-bold text-sm px-4 text-center leading-tight">
            {activeProject.name}
          </span>
          <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
            Workspace
          </span>
        </div>

        {members.map((m, idx) => {
          const pos = memberCoords[m._id];
          if (!pos) return null;
          
          const progressPercent = pos.totalAssigned === 0 
            ? 0 
            : Math.round((pos.totalDone / pos.totalAssigned) * 100);
          
          const floatClass = idx % 3 === 0 ? 'organic-float' : idx % 3 === 1 ? 'organic-float-delay-1' : 'organic-float-delay-2';
          const isOnline = m.isOnline || m._id === currentUser._id;

          return (
            <div
              key={m._id}
              className={`absolute z-20 flex flex-col items-center w-40 ${floatClass}`}
              style={{ left: `${pos.x}px`, top: `${pos.y}px`, marginLeft: '-80px', marginTop: '-40px' }}
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-[#FF2D88] flex items-center justify-center text-white text-xl font-bold border-4 border-theme-bg shadow-xl overflow-hidden z-10">
                  {m.profilePic ? <img src={m.profilePic} alt={m.name} className="w-full h-full object-cover"/> : m.name.charAt(0).toUpperCase()}
                </div>
                
                {isOnline && (
                  <div className="absolute bottom-0 right-1 w-4 h-4 bg-[#00FF66] border-[3px] border-theme-bg rounded-full z-30 shadow-[0_0_8px_rgba(0,255,102,0.6)]" title="Online" />
                )}
                
                <div 
                  className="absolute -top-2 -right-4 w-9 h-9 rounded-full bg-theme-panel border-2 border-theme-border flex items-center justify-center text-[10px] font-bold shadow-lg transition-colors z-20 text-theme-text"
                  style={progressPercent === 100 ? { borderColor: 'var(--theme-accent)', color: 'var(--theme-accent)' } : {}}
                >
                  {progressPercent}%
                </div>
              </div>

              <div className="bg-theme-panel/80 backdrop-blur-md border border-theme-border mt-3 px-3 py-2 rounded-xl shadow-lg flex flex-col items-center text-center w-full">
                <span className="text-theme-text text-xs font-bold truncate w-full">{m.name}</span>
                <span className="text-theme-muted text-[9px] uppercase tracking-wider font-bold mt-0.5 truncate w-full">
                  {pos.totalDone}/{pos.totalAssigned} Tasks Done
                </span>
              </div>
            </div>
          );
        })}

        {tasks.map((t, idx) => {
          const pos = taskCoords[t._id];
          if (!pos) return null;
          
          const isDone = t.status === 'done';
          const floatClass = idx % 2 === 0 ? 'organic-float-delay-1' : 'organic-float-delay-2';

          return (
            <div
              key={t._id}
              className={`no-pan absolute z-30 flex flex-col items-center w-36 cursor-pointer ${floatClass} group`}
              style={{ left: `${pos.x}px`, top: `${pos.y}px`, marginLeft: '-72px', marginTop: '-20px' }}
              onClick={() => navigate(`/tasks/${t._id}`)}
            >
              <div 
                className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 group-hover:scale-110 shadow-lg backdrop-blur-md border-2 ${
                  isDone 
                    ? 'bg-white text-black font-bold shadow-[0_0_20px_var(--theme-accent)]' 
                    : 'bg-theme-bg/80 border-theme-border border-dashed text-theme-muted hover:text-theme-text hover:border-theme-accent/50'
                }`}
                style={isDone ? { borderColor: 'var(--theme-accent)' } : {}}
              >
                {isDone ? <CheckCircle2 size={14} style={{ color: 'var(--theme-accent)' }} /> : <Circle size={14} className="opacity-50" />}
                <span className="text-[10px] font-bold truncate max-w-[90px]">
                  {t.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-6 right-6 z-50 flex items-center bg-theme-panel border border-theme-border rounded-xl shadow-2xl p-1 gap-1">
        <button 
          className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-theme-muted hover:text-theme-text transition-colors"
          onClick={() => setZoom(prev => Math.max(0.3, prev - 0.2))}
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <div className="w-px h-6 bg-theme-border mx-1"></div>
        <button 
          className="px-3 py-1 text-[11px] font-bold text-theme-text hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
          onClick={resetCamera}
          title="Reset View"
        >
          <Focus size={16} className="inline-block mr-1.5" />
          {Math.round(zoom * 100)}%
        </button>
        <div className="w-px h-6 bg-theme-border mx-1"></div>
        <button 
          className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-theme-muted hover:text-theme-text transition-colors"
          onClick={() => setZoom(prev => Math.min(2.5, prev + 0.2))}
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
      </div>

    </div>
  );
}