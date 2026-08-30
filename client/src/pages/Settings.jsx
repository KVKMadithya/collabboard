import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Mail, Palette, Bot, Globe, Shield, Check, Save, AlertCircle 
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English (US)' },
  { code: 'si', label: 'Sinhala (සිංහල)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'zh-CN', label: 'Chinese (中文)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'ko', label: 'Korean (한국어)' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'pt', label: 'Portuguese (Português)' },
  { code: 'ru', label: 'Russian (Русский)' },
];

const TIMEZONES = [
  { value: 'UTC (GMT+0:00)', label: 'UTC (GMT+0:00)' },
  { value: 'America/Los_Angeles (PST/PDT)', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'America/New_York (EST/EDT)', label: 'America/New_York (EST/EDT)' },
  { value: 'Europe/London (GMT/BST)', label: 'Europe/London (GMT/BST)' },
  { value: 'Asia/Colombo (GMT+5:30)', label: 'Asia/Colombo (GMT+5:30)' },
  { value: 'Asia/Singapore (SGT)', label: 'Asia/Singapore (SGT)' },
  { value: 'Australia/Sydney (AEST/AEDT)', label: 'Australia/Sydney (AEST/AEDT)' },
];

// READ LOCAL STORAGE IMMEDIATELY
const savedPrefs = JSON.parse(localStorage.getItem('collab_preferences') || '{}');

export default function Settings() {
  const [activeTab, setActiveTab] = useState('account');
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);

  // 1. Email & Password Management States
  const [emailData, setEmailData] = useState({ currentEmail: '', newEmail: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // 2. Preferences States (Initialized with saved data)
  const [appearance, setAppearance] = useState({ 
    accentColor: savedPrefs.accentColor || '#FF2D88', 
    pinSidebarByDefault: savedPrefs.pinSidebarByDefault || false 
  });
  const [aiConfig, setAiConfig] = useState({ 
    responseStyle: savedPrefs.responseStyle || 'Concise', 
    customGreeting: savedPrefs.customGreeting || 'How can I help with your board today?' 
  });
  const [regional, setRegional] = useState({ 
    language: savedPrefs.language || 'en', 
    timezone: savedPrefs.timezone || 'Asia/Colombo (GMT+5:30)' 
  });
  const [security, setSecurity] = useState({ 
    defaultShareRole: savedPrefs.defaultShareRole || 'view', 
    twoFactorEnabled: savedPrefs.twoFactorEnabled || false 
  });

  // Track initial mount to prevent the translation glitch
  const isInitialMount = useRef(true);
  const originalLanguage = savedPrefs.language || 'en';

  // --- INITIAL LOAD: FETCH DATA ---
  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem('collab_token');
      const storedUser = localStorage.getItem('userInfo');
      
      if (storedUser) {
        setEmailData(prev => ({ ...prev, currentEmail: JSON.parse(storedUser).email || '' }));
      }

      if (!token) return;

      try {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.preferences) {
          // Fully sync local state with the database
          setAppearance(prev => ({ ...prev, accentColor: data.preferences.accentColor || prev.accentColor }));
          setAiConfig(prev => ({ ...prev, responseStyle: data.preferences.responseStyle || prev.responseStyle, customGreeting: data.preferences.customGreeting || prev.customGreeting }));
          setRegional(prev => ({ ...prev, language: data.preferences.language || prev.language, timezone: data.preferences.timezone || prev.timezone }));
          setSecurity(prev => ({ ...prev, defaultShareRole: data.preferences.defaultShareRole || prev.defaultShareRole, twoFactorEnabled: data.preferences.twoFactorEnabled ?? prev.twoFactorEnabled }));
          
          // Keep local storage up to date with the DB
          localStorage.setItem('collab_preferences', JSON.stringify(data.preferences));
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // --- LIVE THEME UPDATER ---
  useEffect(() => {
    document.documentElement.style.setProperty('--theme-accent', appearance.accentColor);
  }, [appearance.accentColor]);

  // --- LIVE TRANSLATION PREVIEW (Glitch Fixed) ---
  useEffect(() => {
    // 🛑 Prevent Google from firing a double-translation on page load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const triggerTranslation = () => {
      const select = document.querySelector('.goog-te-combo');
      if (select && select.value !== regional.language) {
        select.value = regional.language;
        select.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    };
    const timeoutId = setTimeout(triggerTranslation, 300);
    return () => clearTimeout(timeoutId);
  }, [regional.language]);

  // --- LEGITIMATE MASTER SAVE HANDLER ---
  const handleSave = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });
    setIsSaving(true);
    const token = localStorage.getItem('collab_token');

    try {
      // 1. Secure Email Update
      if (emailData.newEmail && emailData.newEmail !== emailData.currentEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailData.newEmail)) throw new Error("Please enter a valid email address.");

        const emailRes = await fetch('http://localhost:5000/api/users/email', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ newEmail: emailData.newEmail })
        });
        const emailJson = await emailRes.json();
        if (!emailRes.ok) throw new Error(emailJson.message || "Failed to update email.");
        
        setEmailData(prev => ({ ...prev, currentEmail: emailData.newEmail, newEmail: '' }));
        const storedUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
        localStorage.setItem('userInfo', JSON.stringify({ ...storedUser, email: emailData.newEmail }));
      }

      // 2. Secure Password Update
      if (passwordData.currentPassword || passwordData.newPassword) {
        if (!passwordData.currentPassword) throw new Error("Current password is required to set a new one.");
        if (passwordData.newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
        if (passwordData.newPassword !== passwordData.confirmPassword) throw new Error("New passwords do not match.");
        
        const passRes = await fetch('http://localhost:5000/api/users/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ 
            currentPassword: passwordData.currentPassword, 
            newPassword: passwordData.newPassword 
          })
        });
        const passJson = await passRes.json();
        if (!passRes.ok) throw new Error(passJson.message || "Failed to update password. Check your current password.");
        
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }

      // 3. Update General Settings (Preferences)
      const preferencesPayload = {
        accentColor: appearance.accentColor,
        pinSidebarByDefault: appearance.pinSidebarByDefault,
        customGreeting: aiConfig.customGreeting,
        responseStyle: aiConfig.responseStyle,
        language: regional.language,
        timezone: regional.timezone,
        defaultShareRole: security.defaultShareRole,
        twoFactorEnabled: security.twoFactorEnabled
      };

      const prefRes = await fetch('http://localhost:5000/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferences: preferencesPayload })
      });
      
      if (!prefRes.ok) throw new Error("Failed to save application preferences.");
      
      localStorage.setItem('collab_preferences', JSON.stringify(preferencesPayload));

      // 4. Lock in Translation Cookies Globally
      const hostname = window.location.hostname;
      if (regional.language === 'en') {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${hostname}; path=/;`;
      } else {
        document.cookie = `googtrans=/en/${regional.language}; path=/;`;
        document.cookie = `googtrans=/en/${regional.language}; domain=${hostname}; path=/;`;
      }

      setStatusMessage({ type: 'success', text: 'All settings saved successfully!' });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);

    } catch (err) {
      console.error("Save Error:", err);
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Email & Password', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'regional', label: 'Language & Region', icon: Globe },
    { id: 'security', label: 'Security & Access', icon: Shield },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-theme-bg text-theme-text p-6 overflow-hidden transition-colors duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-theme-border flex-shrink-0 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-xs text-theme-muted mt-1">
            Manage your security credentials and app preferences
          </p>
        </div>

        {statusMessage.text && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium animate-in fade-in ${
            statusMessage.type === 'error' 
              ? 'bg-red-500/10 border border-red-500/20 text-red-500' 
              : 'bg-[#00FF66]/10 border border-[#00FF66]/20 text-[#00FF66]'
          }`}>
            {statusMessage.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            <span>{statusMessage.text}</span>
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
                style={isActive ? { backgroundColor: 'var(--theme-accent)' } : {}}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-left whitespace-nowrap ${
                  isActive
                    ? 'text-white shadow-lg font-bold'
                    : 'text-theme-muted hover:text-theme-text hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-theme-panel border border-theme-border rounded-2xl p-6 overflow-y-auto min-h-0 premium-scrollbar">
          <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
            
            {/* 1. EMAIL & PASSWORD */}
            {activeTab === 'account' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-base font-bold text-theme-text mb-4 flex items-center gap-2">
                    <Mail size={18} style={{ color: 'var(--theme-accent)' }} />
                    Email Address Management
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-theme-muted block mb-1">Current Email</label>
                      <input
                        type="email"
                        autoComplete="off"
                        value={emailData.currentEmail}
                        disabled
                        className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-muted cursor-not-allowed opacity-70"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-theme-muted block mb-1">New Email Address</label>
                      <input
                        type="email"
                        autoComplete="off"
                        value={emailData.newEmail}
                        onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                        className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-text focus:outline-none focus:border-theme-accent transition-colors"
                        placeholder="Enter new email to update"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-theme-border" />

                <div>
                  <h2 className="text-base font-bold text-theme-text mb-4 flex items-center gap-2">
                    <Lock size={18} style={{ color: 'var(--theme-accent)' }} />
                    Password Reset
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-theme-muted block mb-1">Current Password</label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-text focus:outline-none focus:border-theme-accent transition-colors"
                        placeholder="Required to change password"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-theme-muted block mb-1">New Password</label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-text focus:outline-none focus:border-theme-accent transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-theme-muted block mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-text focus:outline-none focus:border-theme-accent transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h2 className="text-base font-bold text-theme-text mb-4 flex items-center gap-2">
                  <Palette size={18} style={{ color: 'var(--theme-accent)' }} />
                  Theme & Layout
                </h2>

                <div>
                  <label className="text-xs text-theme-muted block mb-2">Custom Accent Color</label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-theme-border shadow-sm cursor-pointer hover:scale-105 transition-transform">
                      <input
                        type="color"
                        value={appearance.accentColor}
                        onChange={(e) => setAppearance({ ...appearance, accentColor: e.target.value })}
                        className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-theme-text">Pick any color</p>
                      <p className="text-xs text-theme-muted uppercase tracking-widest">{appearance.accentColor}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. AI ASSISTANT */}
            {activeTab === 'ai' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h2 className="text-base font-bold text-theme-text mb-4 flex items-center gap-2">
                  <Bot size={18} style={{ color: 'var(--theme-accent)' }} />
                  AI Assistant Settings
                </h2>

                <div>
                  <label className="text-xs text-theme-muted block mb-1">Response Style</label>
                  <select
                    value={aiConfig.responseStyle}
                    onChange={(e) => setAiConfig({ ...aiConfig, responseStyle: e.target.value })}
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-text focus:outline-none focus:border-theme-accent transition-colors"
                  >
                    <option value="Concise">Concise & Direct</option>
                    <option value="Detailed Code">Detailed & Analytical</option>
                    <option value="Creative">Creative Brainstorming</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-theme-muted block mb-1">Custom Greeting Phrase</label>
                  <input
                    type="text"
                    value={aiConfig.customGreeting}
                    onChange={(e) => setAiConfig({ ...aiConfig, customGreeting: e.target.value })}
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-text focus:outline-none focus:border-theme-accent transition-colors"
                    placeholder="e.g. How can I help with your board today?"
                  />
                </div>
              </div>
            )}

            {/* 4. LANGUAGE & REGION */}
            {activeTab === 'regional' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h2 className="text-base font-bold text-theme-text mb-4 flex items-center gap-2">
                  <Globe size={18} style={{ color: 'var(--theme-accent)' }} />
                  Language & Regional Rules
                </h2>

                <div>
                  <label className="text-xs text-theme-muted block mb-1">Application Language</label>
                  <select
                    value={regional.language}
                    onChange={(e) => setRegional({ ...regional, language: e.target.value })}
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-text focus:outline-none focus:border-theme-accent transition-colors"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-theme-muted block mb-1">App Timezone</label>
                  <select
                    value={regional.timezone}
                    onChange={(e) => setRegional({ ...regional, timezone: e.target.value })}
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-text focus:outline-none focus:border-theme-accent transition-colors"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 5. SECURITY & ACCESS */}
            {activeTab === 'security' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h2 className="text-base font-bold text-theme-text mb-4 flex items-center gap-2">
                  <Shield size={18} style={{ color: 'var(--theme-accent)' }} />
                  Security & Sharing
                </h2>

                <div>
                  <label className="text-xs text-theme-muted block mb-1">Default Share Role</label>
                  <select
                    value={security.defaultShareRole}
                    onChange={(e) => setSecurity({ ...security, defaultShareRole: e.target.value })}
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-text focus:outline-none focus:border-theme-accent transition-colors"
                  >
                    <option value="view">View Only</option>
                    <option value="edit">Can Edit</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-theme-bg border border-theme-border flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-xs font-medium text-theme-text">Two-Factor Authentication (2FA)</p>
                    <p className="text-[10px] text-theme-muted mt-0.5">Secure your account with authenticator apps</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={security.twoFactorEnabled}
                      onChange={(e) => setSecurity({ ...security, twoFactorEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div 
                      style={{ backgroundColor: security.twoFactorEnabled ? 'var(--theme-accent)' : 'var(--theme-border)' }}
                      className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-6 border-t border-theme-border flex justify-end mt-8">
              <button
                type="submit"
                disabled={isSaving}
                style={{ backgroundColor: 'var(--theme-accent)' }}
                className="text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 hover:opacity-90 active:scale-95 shadow-lg disabled:opacity-50"
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}