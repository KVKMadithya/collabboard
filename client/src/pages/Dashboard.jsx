import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, CheckCircle, Clock, Users, Sparkles, 
  Send, Bot, Loader2, Briefcase 
} from 'lucide-react';
import { AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useProject } from '../context/ProjectContext'; 

export default function Dashboard() {
  const { activeProject } = useProject();
  const navigate = useNavigate();

  // --- STATE: DASHBOARD DATA ---
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: { totalTasks: 0, completedTasks: 0, overdue: 0, team: 0, totalNotes: 0 },
    activity: [],
    distribution: []
  });

  // --- STATE: AI WIDGET ---
  const [aiInput, setAiInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Load the custom greeting from settings
  const savedPrefs = JSON.parse(localStorage.getItem('collab_preferences')) || {};
  const greetingLine = savedPrefs.customGreeting || 'Hi! I am your AI assistant. How can I help you manage this workspace today?';
  
  const [aiMessages, setAiMessages] = useState([
    { id: 1, sender: 'ai', text: greetingLine }
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isGenerating]);

  // --- FETCH REAL DASHBOARD DATA ---
  useEffect(() => {
    if (!activeProject) {
      setIsLoading(false);
      return;
    }

    const fetchRealData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('collab_token');
        const headers = { Authorization: `Bearer ${token}` };
        const projectId = activeProject._id;

        const [tasksRes, membersRes, notesRes] = await Promise.all([
          fetch(`http://localhost:5000/api/tasks?projectId=${projectId}`, { headers }),
          fetch(`http://localhost:5000/api/members?projectId=${projectId}`, { headers }),
          fetch(`http://localhost:5000/api/notes?projectId=${projectId}`, { headers })
        ]);

        const tasks = tasksRes.ok ? await tasksRes.json() : [];
        const members = membersRes.ok ? await membersRes.json() : [];
        const notes = notesRes.ok ? await notesRes.json() : [];

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        
        const now = new Date();
        const overdueTasks = tasks.filter(t => {
          if (!t.dueDate || t.status === 'done') return false;
          return new Date(t.dueDate) < now;
        }).length;

        const dist = [
          { name: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: '#3B82F6' },
          { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: '#A855F7' },
          { name: 'In Review', value: tasks.filter(t => t.status === 'in-review').length, color: '#F97316' }, 
          { name: 'Done', value: completedTasks, color: 'var(--theme-accent)' } 
        ].filter(d => d.value > 0); 

        if (dist.length === 0) {
          dist.push({ name: 'No Tasks Found', value: 1, color: 'var(--theme-border)' }); 
        }

        const activityMap = {};
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (let i = 0; i < 7; i++) {
          let d = new Date();
          d.setDate(d.getDate() + i);
          activityMap[days[d.getDay()]] = 0;
        }

        tasks.forEach(t => {
          if (t.dueDate && t.status !== 'done') {
            const taskDate = new Date(t.dueDate);
            const diffTime = taskDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0 && diffDays < 7) {
              activityMap[days[taskDate.getDay()]] += 1;
            }
          }
        });

        const activity = Object.keys(activityMap).map(key => ({ name: key, Due: activityMap[key] }));

        setDashboardData({
          stats: { totalTasks, completedTasks, overdue: overdueTasks, team: members.length, totalNotes: notes.length },
          distribution: dist,
          activity
        });

      } catch (error) {
        console.error('Failed to aggregate dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealData();
  }, [activeProject]);

  // --- AI CHAT LOGIC ---
  const handleAiSubmit = async (e) => {
    e.preventDefault();
    const messageText = aiInput.trim();
    if (!messageText || isGenerating) return;

    const userMsg = { id: Date.now(), sender: 'user', text: messageText };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setIsGenerating(true);

    try {
      const response = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Server Error');

      setAiMessages((prev) => [
        ...prev, 
        { id: Date.now() + 1, sender: 'ai', text: data.reply || "No reply received." }
      ]);
    } catch (error) {
      setAiMessages((prev) => [
        ...prev, 
        { id: Date.now() + 1, sender: 'ai', text: `⚠️ ${error.message}` }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- RENDER 1: NO PROJECT SELECTED ---
  if (!activeProject && !isLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center animate-fade-in p-8">
        <div className="max-w-md w-full bg-theme-panel p-8 rounded-[2rem] border border-theme-border shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B28CC] to-theme-accent rounded-full mx-auto flex items-center justify-center mb-6 shadow-[0_0_20px_var(--theme-accent)]">
            <Briefcase size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-theme-text mb-2">No Workspace Active</h2>
          <p className="text-sm text-theme-muted mb-6">
            Please select a project from the top menu or create a new workspace to view analytics.
          </p>
          <button 
            onClick={() => navigate('/members')}
            style={{ backgroundColor: 'var(--theme-accent)' }}
            className="w-full text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:opacity-90 active:scale-95"
          >
            Go to Workspaces
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER 2: LOADING ---
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-theme-accent animate-spin" />
      </div>
    );
  }

  // --- RENDER 3: REAL DASHBOARD ---
  return (
    <div className="p-4 sm:p-8 w-full max-w-7xl mx-auto animate-fade-in">
      
      {/* Title Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-text tracking-tight">Overview</h1>
        <p className="text-theme-muted text-sm mt-1">
          Live analytics for <strong className="text-theme-accent">{activeProject.name}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT/MIDDLE COLUMN */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* KPI STAT CARDS (Now with premium gradients and accents!) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-theme-panel p-5 rounded-2xl border border-theme-border border-t-4 border-t-purple-500 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 text-purple-500 shadow-sm"><Folder size={20}/></div>
              <p className="text-theme-muted text-xs font-bold uppercase tracking-wider relative z-10">Total Tasks</p>
              <p className="text-3xl font-black mt-1 text-theme-text relative z-10">{dashboardData.stats.totalTasks}</p>
            </div>
            
            <div className="bg-theme-panel p-5 rounded-2xl border border-theme-border border-t-4 border-t-teal-500 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-all"></div>
              <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center mb-4 text-teal-500 shadow-sm"><CheckCircle size={20}/></div>
              <p className="text-theme-muted text-xs font-bold uppercase tracking-wider relative z-10">Completed</p>
              <p className="text-3xl font-black mt-1 text-theme-text relative z-10">{dashboardData.stats.completedTasks}</p>
            </div>
            
            <div className="bg-theme-panel p-5 rounded-2xl border border-theme-border border-t-4 border-t-orange-500 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all"></div>
              <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4 text-orange-500 shadow-sm"><Clock size={20}/></div>
              <p className="text-theme-muted text-xs font-bold uppercase tracking-wider relative z-10">Overdue</p>
              <p className={`text-3xl font-black mt-1 relative z-10 ${dashboardData.stats.overdue > 0 ? 'text-red-500' : 'text-theme-text'}`}>
                {dashboardData.stats.overdue}
              </p>
            </div>
            
            <div className="bg-theme-panel p-5 rounded-2xl border border-theme-border border-t-4 border-t-blue-500 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 text-blue-500 shadow-sm"><Users size={20}/></div>
              <p className="text-theme-muted text-xs font-bold uppercase tracking-wider relative z-10">Team Members</p>
              <p className="text-3xl font-black mt-1 text-theme-text relative z-10">{dashboardData.stats.team}</p>
            </div>
          </div>

          {/* CHARTS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[340px]">
            
            {/* Beautiful Area Chart Update */}
            <div className="bg-theme-panel border border-theme-border shadow-sm rounded-2xl p-5 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: 'var(--theme-accent)' }}></div>
              <h3 className="font-bold text-theme-text mb-6">Upcoming Deadlines (7 Days)</h3>
              <div className="flex-1 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData.activity} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--theme-accent)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--theme-accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border)" opacity={0.5} />
                    <XAxis dataKey="name" stroke="var(--theme-muted)" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: 'var(--theme-muted)' }} dy={10} />
                    <YAxis stroke="var(--theme-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: 'var(--theme-muted)' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--theme-panel)', border: '1px solid var(--theme-border)', borderRadius: '12px', color: 'var(--theme-text)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                      itemStyle={{ color: 'var(--theme-text)', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="Due" stroke="var(--theme-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorDue)" activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--theme-accent)' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="bg-theme-panel border border-theme-border shadow-sm rounded-2xl p-5 flex flex-col">
              <h3 className="font-bold text-theme-text mb-4">Task Status Distribution</h3>
              <div className="flex-1 w-full h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={dashboardData.distribution} 
                      innerRadius={65} 
                      outerRadius={95} 
                      paddingAngle={5} 
                      dataKey="value" 
                      stroke="none"
                    >
                      {dashboardData.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--theme-panel)', border: '1px solid var(--theme-border)', borderRadius: '12px', color: 'var(--theme-text)' }} 
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center text for Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-theme-text">{dashboardData.stats.totalTasks}</span>
                  <span className="text-[10px] uppercase font-bold text-theme-muted mt-1">Tasks</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI WIDGET */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-theme-panel border border-theme-border rounded-2xl p-5 flex flex-col h-[525px] shadow-lg relative overflow-hidden">
            
            {/* Elegant AI Header */}
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-theme-border flex-shrink-0">
              <h3 className="font-bold text-theme-text flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--theme-accent)', color: '#fff' }}>
                  <Sparkles size={14} />
                </div>
                AI Assistant
              </h3>
              <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider rounded-md border border-green-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Live
              </span>
            </div>
            
            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 premium-scrollbar">
              {aiMessages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0" style={{ backgroundColor: 'var(--theme-accent)' }}>
                      <Bot size={14} />
                    </div>
                  )}
                  
                  {/* 🛑 FIX: The User Bubbles now perfectly sync with the chosen Custom Theme! */}
                  <div 
                    style={msg.sender === 'user' ? { backgroundColor: 'var(--theme-accent)' } : {}}
                    className={`text-sm p-3 rounded-2xl max-w-[85%] leading-relaxed shadow-sm ${
                      msg.sender === 'user' 
                        ? 'text-white rounded-tr-sm' 
                        : 'bg-black/5 dark:bg-white/5 text-theme-text border border-theme-border rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex items-center gap-2 text-theme-muted text-xs ml-9">
                  <Loader2 size={12} className="animate-spin text-theme-accent" /> AI is thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Form with dynamic theme color */}
            <form onSubmit={handleAiSubmit} className="relative mt-auto flex-shrink-0">
              <input 
                type="text" 
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask AI about this workspace..." 
                className="w-full bg-theme-bg border border-theme-border rounded-xl py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 transition-colors text-theme-text placeholder-theme-muted shadow-inner"
                style={{ '--tw-ring-color': 'var(--theme-accent)' }}
              />
              <button 
                type="submit"
                disabled={isGenerating || !aiInput.trim()}
                style={{ backgroundColor: 'var(--theme-accent)' }}
                className="absolute right-1.5 top-1.5 bottom-1.5 w-10 hover:opacity-90 disabled:opacity-50 rounded-lg flex items-center justify-center transition-all shadow-md active:scale-95"
              >
                <Send size={14} className="text-white ml-0.5" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}