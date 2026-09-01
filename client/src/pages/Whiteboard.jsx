import React, { useRef, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useProject } from '../context/ProjectContext';
import { 
  Pencil, Eraser, Trash2, Hand, MousePointer, 
  Loader2, Palette, Maximize2, Minimize2,
  ZoomIn, ZoomOut, RotateCcw, Users, Scaling
} from 'lucide-react';

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function Whiteboard() {
  const { activeProject, user } = useProject(); 

  // --- REFS ---
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const gesturePointerRef = useRef(null); 

  // --- STATE ---
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#FF2D88');
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  // Zoom & Scale
  const [scale, setScale] = useState(1);

  // Gesture State
  const [isGestureMode, setIsGestureMode] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  // Multiplayer Live State
  const [liveCursors, setLiveCursors] = useState({});
  const [activeUsers, setActiveUsers] = useState([]);
  
  // High-Precision Tracking Contexts
  const lastPos = useRef({ x: 0, y: 0 });
  const isPinchingRef = useRef(false);
  const smoothedPos = useRef({ x: 0, y: 0 });

  // --- DRAWING STATE REF --- 
  const drawStateRef = useRef({ color, brushSize, isEraser, scale });
  useEffect(() => {
    drawStateRef.current = { color, brushSize, isEraser, scale };
  }, [color, brushSize, isEraser, scale]);

  const broadcastCursor = useCallback((x, y) => {
    if (!socketRef.current || !user) return;
    socketRef.current.emit('cursor-move', {
      projectId: activeProject._id,
      userId: user._id,
      name: user.firstName,
      color: drawStateRef.current.color,
      x, y
    });
  }, [activeProject, user]);

  // --- 1. BULLETPROOF SOCKET CONNECTION ---
  useEffect(() => {
    if (!activeProject || !user) return;

    // FIX 1: Explicit transports ensure connection stability on deployed platforms (Vercel/Railway)
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10
    });
    
    socketRef.current = socket;

    // FIX 2: Only join the board AFTER the socket physically connects to survive React strict mode & drops
    socket.on('connect', () => {
      socket.emit('join-board', { 
        projectId: activeProject._id, 
        user: { _id: user._id, name: user.firstName, color: drawStateRef.current.color }
      });
      // FIX 3: Instantly broadcast an "off-screen" cursor so the user immediately shows up in the top bar for everyone else
      broadcastCursor(-9999, -9999);
    });

    // FIX 4: Bulletproof payload handling (checks if backend nested the data or sent it raw)
    socket.on('draw-line', (payload) => {
      const data = payload.drawingData || payload; 
      drawOnCanvas(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.isEraser, false);
    });

    socket.on('clear-board', () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    socket.on('cursor-move', (data) => {
      // Don't render the cursor if it's our initial "ghost" presence broadcast
      if (data.x !== -9999) {
        setLiveCursors(prev => ({ ...prev, [data.userId]: data }));
      }
      
      // Update active users (and automatically sync their color if they change their pen color!)
      setActiveUsers(prev => {
        const existingUser = prev.find(u => u._id === data.userId);
        if (!existingUser) {
          return [...prev, { _id: data.userId, name: data.name, color: data.color }];
        }
        if (existingUser.color !== data.color) {
          return prev.map(u => u._id === data.userId ? { ...u, color: data.color } : u);
        }
        return prev;
      });
    });

    // Clean up connections if user leaves project
    return () => {
      socket.disconnect();
    };
  }, [activeProject, user, broadcastCursor]);

  // --- 2. INITIALIZE CANVAS BACKGROUND ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // --- 3. CORE DRAWING ENGINE ---
  const drawOnCanvas = (x0, y0, x1, y1, strokeColor, strokeSize, erase, emit = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = erase ? '#FFFFFF' : strokeColor; 
    ctx.lineWidth = erase ? strokeSize * 4 : strokeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    ctx.stroke();
    ctx.closePath();

    if (!emit || !socketRef.current) return;

    socketRef.current.emit('draw-line', {
      projectId: activeProject._id,
      drawingData: { x0, y0, x1, y1, color: strokeColor, size: strokeSize, isEraser: erase }
    });
  };

  // --- 4. ACCURATE SCALED COORDINATE MAPPING ---
  const getCanvasCoords = useCallback((screenX, screenY, currentScale = scale) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    return {
      x: (screenX - rect.left) / currentScale,
      y: (screenY - rect.top) / currentScale
    };
  }, [scale]);

  const handleMouseDown = (e) => {
    if (isGestureMode) return;
    setIsDrawing(true);
    lastPos.current = getCanvasCoords(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (isGestureMode) return;
    const currentPos = getCanvasCoords(e.clientX, e.clientY);
    broadcastCursor(currentPos.x, currentPos.y);

    if (!isDrawing) return;
    drawOnCanvas(lastPos.current.x, lastPos.current.y, currentPos.x, currentPos.y, color, brushSize, isEraser, true);
    lastPos.current = currentPos;
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleClearBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (socketRef.current) socketRef.current.emit('clear-board', activeProject._id);
  };

  // --- 5. PINCH-TO-ZOOM / FIT TO SCREEN ENGINE ---
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = -e.deltaY * 0.003; 
      setScale((prev) => Math.min(Math.max(0.10, prev + zoomFactor), 3.0));
    }
  };

  const handleZoom = (delta) => setScale((prev) => Math.min(Math.max(0.10, prev + delta), 3.0));
  const resetZoom = () => setScale(1);

  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const newScale = Math.min((clientWidth - 80) / 2400, (clientHeight - 180) / 1600);
    setScale(Math.max(0.10, newScale));
  }, []);

  useEffect(() => {
    const timer = setTimeout(fitToScreen, 150);
    return () => clearTimeout(timer);
  }, [isExpanded, fitToScreen]);

  // --- 6. ADVANCED GESTURE TRACKING ---
  useEffect(() => {
    if (!isGestureMode) {
      if (gesturePointerRef.current) gesturePointerRef.current.style.opacity = '0';
      return;
    }

    let isMounted = true;

    const initMediaPipe = async () => {
      setIsCameraReady(false);
      setCameraError(null);

      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');

        if (!isMounted) return;

        const HandsClass = window.Hands;
        const CameraClass = window.Camera;

        handsRef.current = new HandsClass({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        handsRef.current.setOptions({
          maxNumHands: 1, 
          modelComplexity: 1, 
          minDetectionConfidence: 0.8, 
          minTrackingConfidence: 0.9
        });

        handsRef.current.onResults((results) => {
          if (!canvasRef.current || !containerRef.current || !isMounted) return;
          const container = containerRef.current;
          const { color: curColor, brushSize: curSize, isEraser: curEraser, scale: curScale } = drawStateRef.current;
          
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            const wrist = landmarks[0];
            const middleMCP = landmarks[9];

            const containerRect = container.getBoundingClientRect();
            const screenX = containerRect.left + (1 - indexTip.x) * containerRect.width;
            const screenY = containerRect.top + indexTip.y * containerRect.height;

            const rawCanvasCoords = getCanvasCoords(screenX, screenY, curScale);
            const targetX = rawCanvasCoords.x;
            const targetY = rawCanvasCoords.y;

            const dx = targetX - smoothedPos.current.x;
            const dy = targetY - smoothedPos.current.y;
            const distance = Math.hypot(dx, dy);
            
            let alpha = 0.45; 
            if (distance > 40) alpha = 0.8; 
            else if (distance < 5) alpha = 0.2; 

            smoothedPos.current.x = smoothedPos.current.x === 0 ? targetX : smoothedPos.current.x + dx * alpha;
            smoothedPos.current.y = smoothedPos.current.y === 0 ? targetY : smoothedPos.current.y + dy * alpha;

            const currentX = smoothedPos.current.x;
            const currentY = smoothedPos.current.y;

            const handScale = Math.hypot(middleMCP.x - wrist.x, middleMCP.y - wrist.y);
            const pinchDistance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y, (indexTip.z - thumbTip.z) * 1.5);
            const pinchRatio = pinchDistance / handScale;

            if (!isPinchingRef.current && pinchRatio < 0.15) {
              isPinchingRef.current = true;
              lastPos.current = { x: currentX, y: currentY };
            } else if (isPinchingRef.current && pinchRatio > 0.25) {
              isPinchingRef.current = false;
            }

            const isPinchActive = isPinchingRef.current;
            broadcastCursor(currentX, currentY);

            if (isPinchActive) {
              drawOnCanvas(lastPos.current.x, lastPos.current.y, currentX, currentY, curColor, curSize, curEraser, true);
              lastPos.current = { x: currentX, y: currentY };
            }

            if (gesturePointerRef.current) {
              const ptr = gesturePointerRef.current;
              ptr.style.opacity = '1';
              ptr.style.left = `${currentX * curScale}px`;
              ptr.style.top = `${currentY * curScale}px`;
              ptr.style.transform = 'translate(-50%, -50%)';
              
              const pointerSize = isPinchActive ? (curEraser ? curSize * 4 : curSize) * curScale : 18;
              ptr.style.width = `${pointerSize}px`;
              ptr.style.height = `${pointerSize}px`;
              
              if (isPinchActive) {
                ptr.style.backgroundColor = curEraser ? '#FFFFFF' : curColor;
                ptr.style.border = curEraser ? '1px solid #E5E7EB' : 'none';
                ptr.style.boxShadow = 'none';
              } else {
                ptr.style.backgroundColor = 'transparent';
                ptr.style.border = `2px solid ${curColor}`;
                ptr.style.boxShadow = `0 0 10px ${curColor}`;
              }
            }
          } else {
            if (gesturePointerRef.current) gesturePointerRef.current.style.opacity = '0';
          }
        });

        if (videoRef.current) {
          cameraRef.current = new CameraClass(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsRef.current && isMounted) {
                await handsRef.current.send({ image: videoRef.current });
              }
            },
            width: 640, height: 480
          });

          await cameraRef.current.start();
          if (isMounted) setIsCameraReady(true);
        }
      } catch (err) {
        if (isMounted) setCameraError("Camera access or AI model failed.");
      }
    };

    initMediaPipe();

    return () => {
      isMounted = false;
      if (cameraRef.current) { try { cameraRef.current.stop(); } catch (e) {} cameraRef.current = null; }
      if (handsRef.current) { try { handsRef.current.close(); } catch (e) {} handsRef.current = null; }
      setIsCameraReady(false);
    };
  }, [isGestureMode, getCanvasCoords, broadcastCursor]); 

  if (!activeProject) return null;

  return (
    <div className={`transition-all duration-300 ${
      isExpanded 
        ? 'fixed top-0 left-0 w-screen h-screen z-[99999] bg-[#0A0D14] flex flex-col m-0 p-0 overflow-hidden animate-fade-in' 
        : 'w-full h-full flex flex-col relative animate-fade-in gap-4'
    }`}>
      
      {/* 🚀 SMART HEADER BAR */}
      {isExpanded ? (
        <div className="absolute top-6 left-6 right-6 flex items-start justify-between z-[200] pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-theme-panel/90 backdrop-blur-xl border border-theme-border px-4 py-2 rounded-full shadow-2xl">
            <Users size={16} className="text-[#00FF66]" />
            <span className="text-sm font-bold text-theme-text">{activeUsers.length + 1} Online</span>
            <div className="flex -space-x-2 ml-3">
              <div className="w-8 h-8 rounded-full bg-theme-accent flex items-center justify-center text-xs font-bold text-white border-2 border-theme-bg z-10" title="You">You</div>
              {activeUsers.map(u => (
                <div key={u._id} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-theme-bg" style={{ backgroundColor: u.color || '#3B82F6' }} title={u.name}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
          
          <div className="pointer-events-auto flex items-center gap-3">
            <button onClick={() => setIsExpanded(false)} className="flex items-center gap-2 bg-theme-panel/90 backdrop-blur-xl border border-theme-border px-5 py-2.5 rounded-xl text-sm font-bold text-theme-text hover:border-theme-accent transition-all shadow-2xl">
              <Minimize2 size={18} /> Collapse
            </button>
            <div className="flex bg-theme-panel/90 backdrop-blur-xl border border-theme-border rounded-xl p-1 shadow-2xl">
              <button onClick={() => setIsGestureMode(false)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${!isGestureMode ? 'bg-theme-accent text-white shadow-sm' : 'text-theme-muted hover:text-theme-text'}`}><MousePointer size={16} /> Standard</button>
              <button onClick={() => setIsGestureMode(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isGestureMode ? 'bg-[#3B82F6] text-white shadow-sm' : 'text-theme-muted hover:text-theme-text'}`}><Hand size={16} /> Gesture AI</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-end justify-between flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-theme-text tracking-tight flex items-center gap-3">
              Collaborative Whiteboard
            </h1>
            <p className="text-theme-muted text-sm mt-1">
              Live syncing strictly across <span className="font-bold text-theme-text">{activeProject.name}</span> members.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-theme-panel border border-theme-border px-3 py-1.5 rounded-full shadow-sm h-[40px]">
              <Users size={14} className="text-[#00FF66]" />
              <span className="text-xs font-bold text-theme-text">{activeUsers.length + 1} Online</span>
              <div className="flex -space-x-2 ml-2">
                <div className="w-6 h-6 rounded-full bg-theme-accent flex items-center justify-center text-[10px] font-bold text-white border-2 border-theme-bg z-10" title="You">You</div>
                {activeUsers.map(u => (
                  <div key={u._id} className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-theme-bg" style={{ backgroundColor: u.color || '#3B82F6' }} title={u.name}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setIsExpanded(true)} className="flex items-center gap-2 bg-theme-panel border border-theme-border px-4 py-2 rounded-xl text-sm font-bold text-theme-text hover:border-theme-accent transition-all shadow-sm h-[40px]">
              <Maximize2 size={16} /> Expand
            </button>
            <div className="flex bg-theme-panel border border-theme-border rounded-xl p-1 shadow-sm h-[40px]">
              <button onClick={() => setIsGestureMode(false)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${!isGestureMode ? 'bg-theme-accent text-white shadow-sm' : 'text-theme-muted hover:text-theme-text'}`}><MousePointer size={14} /> Standard</button>
              <button onClick={() => setIsGestureMode(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isGestureMode ? 'bg-[#3B82F6] text-white shadow-sm' : 'text-theme-muted hover:text-theme-text'}`}><Hand size={14} /> Gesture AI</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 RESPONSIVE SCROLLABLE CANVAS WRAPPER */}
      <div className={`flex-1 relative flex flex-col overflow-hidden ${!isExpanded ? 'bg-[#0A0D14] border border-theme-border rounded-2xl shadow-inner' : 'bg-transparent'}`}>
        
        {/* STATIONARY WEBCAM OVERLAY */}
        {isGestureMode && (
          <div className={`absolute right-6 w-48 h-36 bg-black rounded-xl overflow-hidden border-2 border-[#3B82F6] shadow-2xl z-[200] flex flex-col pointer-events-none ${isExpanded ? 'top-24' : 'top-4'}`}>
            {!isCameraReady && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#3B82F6] bg-black/80 z-20">
                <Loader2 size={24} className="animate-spin mb-2" />
                <span className="text-xs font-bold">Waking AI...</span>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-black/90 z-20 text-center p-2">
                <span className="text-xs font-bold">{cameraError}</span>
              </div>
            )}
            <video ref={videoRef} className="w-full h-full object-cover transform -scale-x-100" playsInline muted />
            <div className="absolute bottom-2 left-0 w-full text-center z-30 pointer-events-none">
              <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">Pinch to Draw</span>
            </div>
          </div>
        )}

        <div 
          ref={containerRef}
          onWheel={handleWheel}
          className="flex-1 w-full h-full overflow-auto custom-scrollbar"
        >
          <div className="min-w-full min-h-full flex items-center justify-center p-10">
            <div 
              style={{ width: `${2400 * scale}px`, height: `${1600 * scale}px` }}
              className="relative flex-shrink-0 shadow-2xl bg-white rounded-md overflow-hidden"
            >
              <canvas
                ref={canvasRef}
                width={2400} height={1600}
                style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseOut={handleMouseUp}
                className={`absolute top-0 left-0 w-[2400px] h-[1600px] block touch-none ${isGestureMode ? 'cursor-none' : 'cursor-crosshair'}`}
              />

              {/* 🚀 HIGH-PERFORMANCE DOM GESTURE POINTER */}
              <div 
                ref={gesturePointerRef}
                className="absolute rounded-full pointer-events-none z-40 ease-out transition-all duration-75"
                style={{ opacity: 0 }}
              />

              {/* LIVE MULTIPLAYER CURSORS */}
              {Object.values(liveCursors).map(cur => {
                if (cur.userId === user._id) return null; 
                return (
                  <div key={cur.userId} 
                    style={{ left: `${cur.x * scale}px`, top: `${cur.y * scale}px`, transition: 'all 0.1s linear' }}
                    className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-1/2"
                  >
                    <MousePointer size={18} fill={cur.color} className="text-white drop-shadow-md" style={{ color: cur.color }} />
                    <span className="absolute left-4 top-4 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm text-white" style={{ backgroundColor: cur.color }}>
                      {cur.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 🚀 SLEEK, WIDE, ANCHORED BOTTOM TOOLBAR */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-theme-panel/95 backdrop-blur-xl border border-theme-border px-6 py-2.5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-6 z-[200] w-max select-none">
          
          <div className="flex items-center gap-2 pr-6 border-r border-theme-border">
            <Palette size={16} className="text-theme-muted mr-1" />
            {['#FF2D88', '#3B82F6', '#14B8A6', '#F59E0B', '#111827'].map(c => (
              <button key={c} onClick={() => { setColor(c); setIsEraser(false); }}
                className={`w-6 h-6 rounded-full transition-transform ${color === c && !isEraser ? 'scale-125 border-2 border-white shadow-md' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={color} onChange={(e) => { setColor(e.target.value); setIsEraser(false); }} className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 overflow-hidden ml-1" />
          </div>

          <div className="flex items-center gap-2 pr-6 border-r border-theme-border">
            <button onClick={() => setIsEraser(false)} className={`p-2 rounded-lg transition-all ${!isEraser ? 'bg-theme-bg text-theme-text shadow-sm' : 'text-theme-muted hover:bg-black/5 dark:hover:bg-white/5'}`} title="Pen Tool">
              <Pencil size={18} />
            </button>
            <button onClick={() => setIsEraser(true)} className={`p-2 rounded-lg transition-all ${isEraser ? 'bg-theme-bg text-theme-text shadow-sm' : 'text-theme-muted hover:bg-black/5 dark:hover:bg-white/5'}`} title="Eraser">
              <Eraser size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3 pr-6 border-r border-theme-border w-[140px]">
            <span className="w-1.5 h-1.5 rounded-full bg-theme-muted"></span>
            <input type="range" min="2" max="30" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="flex-1 accent-theme-accent cursor-pointer" />
            <span className="w-3 h-3 rounded-full bg-theme-muted"></span>
          </div>

          <div className="flex items-center gap-1 pr-6 border-r border-theme-border">
            <button onClick={() => handleZoom(-0.10)} className="p-1.5 rounded-lg text-theme-muted hover:text-theme-text hover:bg-black/5" title="Zoom Out"><ZoomOut size={16} /></button>
            <span className="text-xs font-mono font-bold w-12 text-center text-theme-text">{Math.round(scale * 100)}%</span>
            <button onClick={() => handleZoom(0.10)} className="p-1.5 rounded-lg text-theme-muted hover:text-theme-text hover:bg-black/5" title="Zoom In"><ZoomIn size={16} /></button>
            <button onClick={fitToScreen} className="p-1.5 rounded-lg text-theme-muted hover:text-theme-text hover:bg-black/5 ml-1" title="Fit to Screen"><Scaling size={16} /></button>
            <button onClick={resetZoom} className="p-1.5 rounded-lg text-theme-muted hover:text-theme-text hover:bg-black/5" title="Reset to 100%"><RotateCcw size={14} /></button>
          </div>

          <button onClick={handleClearBoard} className="flex items-center gap-2 p-2 px-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors font-bold text-sm">
            <Trash2 size={16} /> Clear
          </button>
        </div>
      </div>
    </div>
  );
}