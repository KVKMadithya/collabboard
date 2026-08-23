import React, { useState, useEffect, useRef } from 'react';
import { Folder, CheckCircle, Clock, Users, Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function Dashboard() {
  // --- STATE: DASHBOARD DATA ---
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: { projects: 0, completedTasks: 0, overdue: 0, team: 0 },
    activity: [],
    distribution: []
  });

  // --- STATE: AI WIDGET ---
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { id: 1, sender: 'ai', text: 'Hi! I am your AI assistant. I can summarize your projects or help track tasks.' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll AI chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isGenerating]);

  // --- FETCH REAL DASHBOARD DATA ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Replace with your actual backend endpoint when ready
        const response = await fetch('http://localhost:5000/api/dashboard/stats');
        
        if (response.ok) {
          const data = await response.json();
          setDashboardData(data);
        } else {
          // Fallback structure if endpoint isn't built yet, keeping 0s
          setDashboardData({
            stats: { projects: 0, completedTasks: 0, overdue: 0, team: 0 },
            activity: [{ name: 'Mon', tasks: 0 }, { name: 'Tue', tasks: 0 }, { name: 'Wed', tasks: 0 }],
            distribution: [{ name: 'No Data', value: 1 }]
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  // --- CHART COLORS ---
  const COLORS = ['#A855F7', '#14B8A6', '#F97316', '#3B82F6'];

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 w-full animate-fade-in">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT/MIDDLE COLUMN */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* KPI STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#121629] p-5 rounded-2xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 text-purple-400"><Folder size={20}/></div>
              <p className="text-gray-400 text-sm">Total Projects</p>
              <p className="text-3xl font-bold mt-1 text-white">{dashboardData.stats.projects}</p>
            </div>
            
            <div className="bg-[#121629] p-5 rounded-2xl border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.1)]">
              <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center mb-4 text-teal-400"><CheckCircle size={20}/></div>
              <p className="text-gray-400 text-sm">Tasks Completed</p>
              <p className="text-3xl font-bold mt-1 text-white">{dashboardData.stats.completedTasks}</p>
            </div>
            
            <div className="bg-[#121629] p-5 rounded-2xl border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4 text-orange-400"><Clock size={20}/></div>
              <p className="text-gray-400 text-sm">Overdue Tasks</p>
              <p className="text-3xl font-bold mt-1 text-white">{dashboardData.stats.overdue}</p>
            </div>
            
            <div className="bg-[#121629] p-5 rounded-2xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 text-blue-400"><Users size={20}/></div>
              <p className="text-gray-400 text-sm">Team Members</p>
              <p className="text-3xl font-bold mt-1 text-white">{dashboardData.stats.team}</p>
            </div>
          </div>

          {/* CHARTS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[320px]">
            {/* Line Chart */}
            <div className="bg-[#121629] border border-white/5 rounded-2xl p-5 flex flex-col">
              <h3 className="font-bold text-white mb-4">Project Activity</h3>
              <div className="flex-1 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.activity}>
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Line type="monotone" dataKey="tasks" stroke="#A855F7" strokeWidth={3} dot={{ r: 4, fill: '#A855F7' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="bg-[#121629] border border-white/5 rounded-2xl p-5 flex flex-col">
              <h3 className="font-bold text-white mb-4">Task Distribution</h3>
              <div className="flex-1 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dashboardData.distribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {dashboardData.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI WIDGET */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-gradient-to-b from-[#2A2356] to-[#121629] border border-purple-500/30 rounded-2xl p-5 flex flex-col h-[450px]">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-[#FF2D88]"/> AI Assistant
              </h3>
              <span className="px-2 py-0.5 bg-[#FF2D88]/20 text-[#FF2D88] text-xs rounded-full border border-[#FF2D88]/30">Live</span>
            </div>
            
            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar">
              {aiMessages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'ai' && (
                    <div className="w-6 h-6 rounded flex items-center justify-center text-[#FF2D88] bg-[#FF2D88]/10 mt-1 flex-shrink-0">
                      <Bot size={14} />
                    </div>
                  )}
                  <div className={`text-sm p-2.5 rounded-xl max-w-[85%] ${
                    msg.sender === 'user' ? 'bg-[#FF2D88] text-white' : 'bg-white/10 text-gray-200 border border-white/5'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex items-center gap-2 text-gray-400 text-xs">
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
                placeholder="Ask AI anything..." 
                className="w-full bg-[#0A0D14] border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-[#FF2D88] transition-colors text-white"
              />
              <button 
                type="submit"
                disabled={isGenerating || !aiInput.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 w-9 bg-[#FF2D88] hover:bg-[#ff2d88]/80 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors"
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