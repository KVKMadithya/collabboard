import React, { useState, useEffect } from 'react';
import { Folder, CheckCircle, Clock, Users, Sparkles, Send } from 'lucide-react';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  // Simulate fetching real stats from your backend
  useEffect(() => {
    setTimeout(() => {
      setDashboardData({
        stats: { projects: 12, completedTasks: 87, overdue: 4, team: 6 }
      });
      setIsLoading(false);
    }, 800);
  }, []);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 w-full animate-fade-in">
      
      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT/MIDDLE COLUMN (Takes up 8/12 grid space on large screens) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* KPI STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#121629] p-5 rounded-2xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 text-purple-400"><Folder size={20}/></div>
              <p className="text-gray-400 text-sm">Total Projects</p>
              <p className="text-3xl font-bold mt-1 text-white">{dashboardData.stats.projects}</p>
            </div>
            
            <div className="bg-[#121629] p-5 rounded-2xl border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.1)] group hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center mb-4 text-teal-400"><CheckCircle size={20}/></div>
              <p className="text-gray-400 text-sm">Tasks Completed</p>
              <p className="text-3xl font-bold mt-1 text-white">{dashboardData.stats.completedTasks}</p>
            </div>
            
            <div className="bg-[#121629] p-5 rounded-2xl border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)] group hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4 text-orange-400"><Clock size={20}/></div>
              <p className="text-gray-400 text-sm">Overdue Tasks</p>
              <p className="text-3xl font-bold mt-1 text-white">{dashboardData.stats.overdue}</p>
            </div>
            
            <div className="bg-[#121629] p-5 rounded-2xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] group hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 text-blue-400"><Users size={20}/></div>
              <p className="text-gray-400 text-sm">Team Members</p>
              <p className="text-3xl font-bold mt-1 text-white">{dashboardData.stats.team}</p>
            </div>
          </div>

          {/* CHARTS PLACEHOLDER ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[320px]">
            <div className="bg-[#121629] border border-white/5 rounded-2xl p-5 flex flex-col">
              <h3 className="font-bold text-white mb-4">Project Activity</h3>
              <div className="flex-1 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 border border-white/5 text-sm">Line Chart Area</div>
            </div>
            <div className="bg-[#121629] border border-white/5 rounded-2xl p-5 flex flex-col">
              <h3 className="font-bold text-white mb-4">Task Distribution</h3>
              <div className="flex-1 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 border border-white/5 text-sm">Donut Chart Area</div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (Takes up 4/12 grid space on large screens) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* AI ASSISTANT WIDGET */}
          <div className="bg-gradient-to-b from-[#2A2356] to-[#121629] border border-purple-500/30 rounded-2xl p-5 flex flex-col h-[450px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400"/> AI Assistant
              </h3>
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">Beta</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-end text-sm text-gray-300 mb-4 space-y-3">
              <div className="bg-white/10 p-3 rounded-xl border border-white/5 self-start max-w-[85%] leading-relaxed">
                Hi! I'm your AI assistant. I can help you with your notes, tasks, summaries and project insights.
              </div>
            </div>
            
            <div className="relative mt-auto">
              <input 
                type="text" 
                placeholder="Ask AI anything..." 
                className="w-full bg-[#0A0D14] border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white"
              />
              <button className="absolute right-1.5 top-1.5 bottom-1.5 w-9 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center transition-colors">
                <Send size={14} className="ml-0.5 text-white" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}