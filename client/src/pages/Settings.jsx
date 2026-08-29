import React, { useState } from 'react';
import { 
  User, Palette, Bot, Bell, Shield, Check, Save, 
  Globe, Laptop, Key, Sparkles, Moon
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Form States
  const [profile, setProfile] = useState({
    displayName: 'Iruni Weerakkody',
    email: 'iruni@collabboard.io',
    role: 'Frontend Developer',
    bio: 'Building real-time collaboration tools for developers.'
  });

  const [appearance, setAppearance] = useState({
    accentColor: '#FF2D88',
    pinSidebarByDefault: false,
    compactMode: false
  });

  const [aiConfig, setAiConfig] = useState({
    responseStyle: 'Concise',
    customGreeting: 'Meow! How can I help with your board today?',
    temperature: 0.5
  });

  const [regional, setRegional] = useState({
    timezone: 'Asia/Colombo (GMT+5:30)',
    slHolidayAlerts: true,
    taskDueReminders: true
  });

  const [security, setSecurity] = useState({
    defaultShareRole: 'view',
    twoFactorEnabled: false
  });

  const handleSave = (e) => {
    e.preventDefault();
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile & Account', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'regional', label: 'Notifications & Region', icon: Bell },
    { id: 'security', label: 'Security & Access', icon: Shield },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#0A0B14] text-white p-6 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-xs text-gray-400 mt-1">Manage your account, preferences, and AI controls</p>
        </div>

        {/* Save Notification Toast */}
        {showSavedToast && (
          <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-4 py-2 rounded-xl text-xs font-medium animate-in fade-in">
            <Check size={16} />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      {/* Main Settings Container */}
      <div className="flex flex-col md:flex-row flex-1 gap-6 min-h-0 overflow-hidden">
        
        {/* Navigation Sidebar Tabs */}
        <div className="w-full md:w-64 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto flex-shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-left whitespace-nowrap ${
                  isActive
                    ? 'bg-[#FF2D88] text-white shadow-lg shadow-[#FF2D88]/20 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-[#121629]'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[#060813] border border-white/10 rounded-2xl p-6 overflow-y-auto min-h-0">
          <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
            
            {/* 1. PROFILE & ACCOUNT */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <User size={18} className="text-[#FF2D88]" />
                  Profile Details
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                      className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF2D88]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF2D88]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Team Role Tag</label>
                  <input
                    type="text"
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                    className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF2D88]"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Public Bio</label>
                  <textarea
                    rows={3}
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full bg-[#121629] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#FF2D88] resize-none"
                  />
                </div>
              </div>
            )}

            {/* 2. APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Palette size={18} className="text-[#FF2D88]" />
                  Theme & Layout
                </h2>

                <div>
                  <label className="text-xs text-gray-400 block mb-2">Accent Color Theme</label>
                  <div className="flex items-center gap-3">
                    {['#FF2D88', '#00F0FF', '#A855F7', '#22C55E'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setAppearance({ ...appearance, accentColor: color })}
                        style={{ backgroundColor: color }}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          appearance.accentColor === color ? 'border-white scale-110' : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#121629] cursor-pointer">
                    <span className="text-xs font-medium text-gray-200">Pin Sidebar by default</span>
                    <input
                      type="checkbox"
                      checked={appearance.pinSidebarByDefault}
                      onChange={(e) => setAppearance({ ...appearance, pinSidebarByDefault: e.target.checked })}
                      className="accent-[#FF2D88] w-4 h-4 rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 3. AI ASSISTANT */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Bot size={18} className="text-[#FF2D88]" />
                  AI Assistant Settings
                </h2>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Response Style</label>
                  <select
                    value={aiConfig.responseStyle}
                    onChange={(e) => setAiConfig({ ...aiConfig, responseStyle: e.target.value })}
                    className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF2D88]"
                  >
                    <option value="Concise">Concise & Direct (Fastest)</option>
                    <option value="Detailed Code">Detailed Code & Step-by-Step</option>
                    <option value="Creative">Creative Brainstorming</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Custom Greeting Phrase</label>
                  <input
                    type="text"
                    value={aiConfig.customGreeting}
                    onChange={(e) => setAiConfig({ ...aiConfig, customGreeting: e.target.value })}
                    className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF2D88]"
                  />
                </div>
              </div>
            )}

            {/* 4. NOTIFICATIONS & REGION */}
            {activeTab === 'regional' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Bell size={18} className="text-[#FF2D88]" />
                  Regional & Reminder Rules
                </h2>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">App Timezone</label>
                  <select
                    value={regional.timezone}
                    onChange={(e) => setRegional({ ...regional, timezone: e.target.value })}
                    className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF2D88]"
                  >
                    <option value="Asia/Colombo (GMT+5:30)">Asia/Colombo (GMT+5:30)</option>
                    <option value="UTC (GMT+0:00)">UTC (GMT+0:00)</option>
                    <option value="America/New_York (GMT-5:00)">America/New_York (GMT-5:00)</option>
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#121629] cursor-pointer">
                    <span className="text-xs font-medium text-gray-200">Sri Lanka Public & Poya Day Reminders</span>
                    <input
                      type="checkbox"
                      checked={regional.slHolidayAlerts}
                      onChange={(e) => setRegional({ ...regional, slHolidayAlerts: e.target.checked })}
                      className="accent-[#FF2D88] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#121629] cursor-pointer">
                    <span className="text-xs font-medium text-gray-200">Task Due Notifications</span>
                    <input
                      type="checkbox"
                      checked={regional.taskDueReminders}
                      onChange={(e) => setRegional({ ...regional, taskDueReminders: e.target.checked })}
                      className="accent-[#FF2D88] w-4 h-4 rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 5. SECURITY & ACCESS */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Shield size={18} className="text-[#FF2D88]" />
                  Security & Sharing Defaults
                </h2>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Default Link Permission for Shared Boards</label>
                  <select
                    value={security.defaultShareRole}
                    onChange={(e) => setSecurity({ ...security, defaultShareRole: e.target.value })}
                    className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF2D88]"
                  >
                    <option value="view">View Only</option>
                    <option value="edit">Can Edit</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-[#121629] border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white">Two-Factor Authentication (2FA)</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Secure your account with an authenticator app</p>
                  </div>
                  <button
                    type="button"
                    className="bg-white/10 hover:bg-white/20 text-xs text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Configure
                  </button>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-6 border-t border-white/10 flex justify-end">
              <button
                type="submit"
                className="bg-[#FF2D88] hover:bg-[#FF2D88]/80 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-[#FF2D88]/20"
              >
                <Save size={16} />
                <span>Save Changes</span>
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}