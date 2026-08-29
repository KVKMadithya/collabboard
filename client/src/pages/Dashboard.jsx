import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, CheckCircle, Clock, Users, Sparkles, 
  Send, Bot, Loader2, Briefcase, FileText 
} from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useProject } from '../context/ProjectContext'; // 👈 Global Brain Integration

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
  const [aiMessages, setAiMessages] = useState([
    { id: 1, sender: 'ai', text: `Hi! I am your AI assistant. How can I help you manage this workspace today?` }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll AI chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isGenerating]);

  // --- 🛑 FETCH REAL DASHBOARD DATA ---
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

        // 🚀 Fetch all real data in parallel for maximum speed
        const [tasksRes, membersRes, notesRes] = await Promise.all([
          fetch(`http://localhost:5000/api/tasks?projectId=${projectId}`, { headers }),
          fetch(`http://localhost:5000/api/members?projectId=${projectId}`, { headers }),
          fetch(`http://localhost:5000/api/notes?projectId=${projectId}`, { headers })
        ]);

        const tasks = tasksRes.ok ? await tasksRes.json() : [];
        const members = membersRes.ok ? await membersRes.json() : [];
        const notes = notesRes.ok ? await notesRes.json() : [];

        // --- 1. CRUNCH KPI STATS ---
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        
        const now = new Date();
        const overdueTasks = tasks.filter(t => {
          if (!t.dueDate || t.status === 'done') return false;
          return new Date(t.dueDate) < now;
        }).length;

        // --- 2. CRUNCH TASK DISTRIBUTION (For Donut Chart) ---
        const dist = [
          { name: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: '#3B82F6' },       // Blue
          { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: '#A855F7' }, // Purple
          { name: 'In Review', value: tasks.filter(t => t.status === 'in-review').length, color: '#F97316' },     // Orange
          { name: 'Done', value: completedTasks, color: '#14B8A6' }                                               // Teal
        ].filter(d => d.value > 0); // Only show slices that have tasks

        if (dist.length === 0) {
          dist.push({ name: 'No Tasks Found', value: 1, color: '#1e293b' }); // Fallback
        }

        // --- 3. CRUNCH DEADLINE ACTIVITY (For Line Chart) ---
        // Generates data for upcoming 7 days
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
            
            // If task is due in the next 7 days, plot it
            if (diffDays >= 0 && diffDays < 7) {
              activityMap[days[taskDate.getDay()]] += 1;
            }
          }
        });

        const activity = Object.keys(activityMap).map(key => ({ name: key, Due: activityMap[key] }));

        // Save to state
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
        <div className="max-w-md w-full bg-white dark:bg-[#121629] p-8 rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-[#FF2D88]/20">
            <Briefcase size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Workspace Active</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Please select a project from the top menu or create a new workspace to view analytics.
          </p>
          <button 
            onClick={() => navigate('/members')}
            className="w-full bg-gradient-to-r from-[#FF2D88] to-[#D91E6D] hover:opacity-90 text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)]"
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
        <Loader2 className="w-8 h-8 text-[#FF2D88] animate-spin" />
      </div>
    );
  }

  // --- RENDER 3: REAL DASHBOARD ---
  return (
    <div className="p-4 sm:p-8 w-full max-w-7xl mx-auto animate-fade-in">
      
      {/* Title Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Live analytics for <strong className="text-[#FF2D88]">{activeProject.name}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT/MIDDLE COLUMN */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* KPI STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-white dark:bg-[#121629] p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 text-purple-500"><Folder size={20}/></div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Total Tasks</p>
              <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{dashboardData.stats.totalTasks}</p>
            </div>
            
            <div className="bg-white dark:bg-[#121629] p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center mb-4 text-teal-500"><CheckCircle size={20}/></div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Completed</p>
              <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{dashboardData.stats.completedTasks}</p>
            </div>
            
            <div className="bg-white dark:bg-[#121629] p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4 text-orange-500"><Clock size={20}/></div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Overdue</p>
              <p className={`text-3xl font-bold mt-1 ${dashboardData.stats.overdue > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                {dashboardData.stats.overdue}
              </p>
            </div>
            
            <div className="bg-white dark:bg-[#121629] p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 text-blue-500"><Users size={20}/></div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Team Members</p>
              <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{dashboardData.stats.team}</p>
            </div>
          </div>

          {/* CHARTS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[320px]">
            
            {/* Line Chart */}
            <div className="bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Upcoming Deadlines (7 Days)</h3>
              <div className="flex-1 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.activity} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Line type="monotone" dataKey="Due" stroke="#FF2D88" strokeWidth={3} dot={{ r: 4, fill: '#FF2D88' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="bg-white dark:bg-[#121629] border border-gray-200 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Task Status Distribution</h3>
              <div className="flex-1 w-full h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={dashboardData.distribution} 
                      innerRadius={65} 
                      outerRadius={90} 
                      paddingAngle={5} 
                      dataKey="value" 
                      stroke="none"
                    >
                      {dashboardData.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center text for Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.stats.totalTasks}</span>
                  <span className="text-[10px] uppercase font-bold text-gray-500">Tasks</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI WIDGET */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-gradient-to-b from-[#2A2356] to-[#121629] border border-purple-500/30 rounded-2xl p-5 flex flex-col h-[480px] shadow-lg">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-[#FF2D88]"/> AI Assistant
              </h3>
              <span className="px-2 py-0.5 bg-[#FF2D88]/20 text-[#FF2D88] text-[10px] font-bold uppercase tracking-wider rounded-md border border-[#FF2D88]/30">Live</span>
            </div>
            
            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar">
              {aiMessages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'ai' && (
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-[#FF2D88] bg-[#FF2D88]/10 mt-1 flex-shrink-0 border border-[#FF2D88]/20">
                      <Bot size={14} />
                    </div>
                  )}
                  <div className={`text-sm p-3 rounded-xl max-w-[85%] leading-relaxed ${
                    msg.sender === 'user' ? 'bg-gradient-to-br from-[#FF2D88] to-[#D91E6D] text-white shadow-md' : 'bg-white/10 text-gray-200 border border-white/10 backdrop-blur-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex items-center gap-2 text-gray-400 text-xs ml-8">
                  <Loader2 size={12} className="animate-spin text-[#FF2D88]" /> AI is thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Form */}
            <form onSubmit={handleAiSubmit} className="relative mt-auto flex-shrink-0">
              <input 
                type="text" 
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask AI about this workspace..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors text-white placeholder-gray-500"
              />
              <button 
                type="submit"
                disabled={isGenerating || !aiInput.trim()}
                className="absolute right-2 top-2 bottom-2 w-10 bg-[#FF2D88] hover:bg-[#D91E6D] disabled:opacity-50 rounded-lg flex items-center justify-center transition-colors shadow-sm"
              >
                <Send size={14} className="ml-0.5 text-white" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}