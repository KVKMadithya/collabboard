import React, { useState, useEffect } from 'react';
import { 
  Lock, Mail, Palette, Bot, Globe, Shield, Check, Save 
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'si', label: 'Sinhala (සිංහල)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'zh', label: 'Chinese (中文)' },
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
  { value: 'America/Chicago (CST/CDT)', label: 'America/Chicago (CST/CDT)' },
  { value: 'America/New_York (EST/EDT)', label: 'America/New_York (EST/EDT)' },
  { value: 'Europe/London (GMT/BST)', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris (CET/CEST)', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Asia/Dubai (GST)', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata (IST)', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Colombo (GMT+5:30)', label: 'Asia/Colombo (GMT+5:30)' },
  { value: 'Asia/Singapore (SGT)', label: 'Asia/Singapore (SGT)' },
  { value: 'Asia/Tokyo (JST)', label: 'Asia/Tokyo (JST)' },
  { value: 'Australia/Sydney (AEST/AEDT)', label: 'Australia/Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland (NZST/NZDT)', label: 'Pacific/Auckland (NZST/NZDT)' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('account');
  const [showSavedToast, setShowSavedToast] = useState(false);

  // 1. Email & Password Management States
  const [emailData, setEmailData] = useState({
    currentEmail: '',
    newEmail: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 2. Appearance & Custom Color
  const [appearance, setAppearance] = useState({
    accentColor: '#FF2D88', 
    pinSidebarByDefault: false,
  });

  // 3. AI Assistant
  const [aiConfig, setAiConfig] = useState({
    responseStyle: 'Concise',
    customGreeting: 'Meow! How can I help with your board today?',
  });

  // 4. Regional & Language
  const [regional, setRegional] = useState({
    language: 'en',
    timezone: 'Asia/Colombo (GMT+5:30)',
    slHolidayAlerts: true,
  });

  // 5. Security Access
  const [security, setSecurity] = useState({
    defaultShareRole: 'view',
    twoFactorEnabled: false
  });

  // Get current logged-in user's email
  useEffect(() => {
    const storedUser = localStorage.getItem('userInfo');

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        setEmailData(prev => ({
          ...prev,
          currentEmail: parsedUser.email || ''
        }));
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
  }, []);

  // Save Handler
  const handleSave = async (e) => {
    e.preventDefault();
    
    const payload = {
      emailData,
      passwordData,
      preferences: {
        ...appearance,
        ...aiConfig,
        ...regional,
        ...security
      }
    };
    
    console.log("Saving to backend...", payload);
    // Add your API fetch/axios call here 

    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const tabs = [
    { id: 'account', label: 'Email & Password', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'regional', label: 'Language & Region', icon: Globe },
    { id: 'security', label: 'Security & Access', icon: Shield },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#0A0B14] text-white p-6 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your security credentials and app preferences
          </p>
        </div>

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
                style={isActive ? { backgroundColor: appearance.accentColor } : {}}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-left whitespace-nowrap ${
                  isActive
                    ? 'text-white shadow-lg font-bold'
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
            
            {/* 1. EMAIL & PASSWORD */}
            {activeTab === 'account' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Mail 
                      size={18} 
                      style={{ color: appearance.accentColor }} 
                    />
                    Email Address Management
                  </h2>

                  <div className="space-y-4">

                    {/* Current Email */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        Current Email
                      </label>

                      <input
                        type="email"
                        autoComplete="off"
                        value={emailData.currentEmail}
                        disabled
                        className="w-full bg-[#121629]/50 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-gray-500 cursor-not-allowed"
                      />
                    </div>

                    {/* New Email */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        New Email Address
                      </label>

                      <input
                        type="email"
                        autoComplete="off"
                        value={emailData.newEmail}
                        onChange={(e) =>
                          setEmailData({
                            ...emailData,
                            newEmail: e.target.value
                          })
                        }
                        className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                        placeholder="Enter new email"
                      />
                    </div>

                  </div>
                </div>

                <hr className="border-white/5" />

                {/* Password Reset */}
                <div>
                  <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Lock 
                      size={18} 
                      style={{ color: appearance.accentColor }} 
                    />
                    Password Reset
                  </h2>

                  <div className="space-y-4">

                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        Current Password
                      </label>

                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value
                          })
                        }
                        className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">
                          New Password
                        </label>

                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value
                            })
                          }
                          className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">
                          Confirm New Password
                        </label>

                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              confirmPassword: e.target.value
                            })
                          }
                          className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                        />
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Palette 
                    size={18} 
                    style={{ color: appearance.accentColor }} 
                  />
                  Theme & Layout
                </h2>

                <div>
                  <label className="text-xs text-gray-400 block mb-2">
                    Custom Accent Color
                  </label>

                  <div className="flex items-center gap-4">

                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg cursor-pointer hover:scale-105 transition-transform">

                      <input
                        type="color"
                        value={appearance.accentColor}
                        onChange={(e) =>
                          setAppearance({
                            ...appearance,
                            accentColor: e.target.value
                          })
                        }
                        className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                      />

                    </div>

                    <div>
                      <p className="text-sm font-medium text-white">
                        Pick any color
                      </p>

                      <p className="text-xs text-gray-400 uppercase tracking-widest">
                        {appearance.accentColor}
                      </p>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* 3. AI ASSISTANT */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Bot 
                    size={18} 
                    style={{ color: appearance.accentColor }} 
                  />
                  AI Assistant Settings
                </h2>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Response Style
                  </label>

                  <select
                    value={aiConfig.responseStyle}
                    onChange={(e) =>
                      setAiConfig({
                        ...aiConfig,
                        responseStyle: e.target.value
                      })
                    }
                    className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="Concise">
                      Concise & Direct
                    </option>

                    <option value="Detailed Code">
                      Detailed & Analytical
                    </option>

                    <option value="Creative">
                      Creative Brainstorming
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Custom Greeting Phrase
                  </label>

                  <input
                    type="text"
                    value={aiConfig.customGreeting}
                    onChange={(e) =>
                      setAiConfig({
                        ...aiConfig,
                        customGreeting: e.target.value
                      })
                    }
                    className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                    placeholder="e.g. How can I help with your board today?"
                  />
                </div>
              </div>
            )}

            {/* 4. LANGUAGE & REGION */}
            {activeTab === 'regional' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Globe 
                    size={18} 
                    style={{ color: appearance.accentColor }} 
                  />
                  Language & Regional Rules
                </h2>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Application Language
                  </label>

                  <select
                    value={regional.language}
                    onChange={(e) =>
                      setRegional({
                        ...regional,
                        language: e.target.value
                      })
                    }
                    className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                  >
                    {LANGUAGES.map(lang => (
                      <option 
                        key={lang.code} 
                        value={lang.code}
                      >
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    App Timezone
                  </label>

                  <select
                    value={regional.timezone}
                    onChange={(e) =>
                      setRegional({
                        ...regional,
                        timezone: e.target.value
                      })
                    }
                    className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                  >
                    {TIMEZONES.map(tz => (
                      <option 
                        key={tz.value} 
                        value={tz.value}
                      >
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 5. SECURITY & ACCESS */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Shield 
                    size={18} 
                    style={{ color: appearance.accentColor }} 
                  />
                  Security & Sharing
                </h2>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Default Share Role
                  </label>

                  <select
                    value={security.defaultShareRole}
                    onChange={(e) =>
                      setSecurity({
                        ...security,
                        defaultShareRole: e.target.value
                      })
                    }
                    className="w-full bg-[#121629] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="view">
                      View Only
                    </option>

                    <option value="edit">
                      Can Edit
                    </option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-[#121629] border border-white/5 flex items-center justify-between">

                  <div>
                    <p className="text-xs font-medium text-white">
                      Two-Factor Authentication (2FA)
                    </p>

                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Secure your account with authenticator apps
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">

                    <input
                      type="checkbox"
                      checked={security.twoFactorEnabled}
                      onChange={(e) =>
                        setSecurity({
                          ...security,
                          twoFactorEnabled: e.target.checked
                        })
                      }
                      className="sr-only peer"
                    />

                    <div 
                      style={{
                        backgroundColor:
                          security.twoFactorEnabled
                            ? appearance.accentColor
                            : '#374151'
                      }}
                      className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                    />

                  </label>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-6 border-t border-white/10 flex justify-end mt-8">

              <button
                type="submit"
                style={{
                  backgroundColor: appearance.accentColor
                }}
                className="text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 hover:opacity-90 active:scale-95 shadow-lg"
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