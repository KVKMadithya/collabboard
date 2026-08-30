import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, Loader2, Mic, MicOff, 
  Paperclip, X, Briefcase, Globe, FileText 
} from 'lucide-react';
import { useProject } from '../context/ProjectContext'; // 👈 Needed for Workspace Context

export default function AiAssistant() {
  const { activeProject } = useProject();
  
  // --- STATE ---
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMode, setChatMode] = useState('general'); // 'general' | 'workspace'
  
  // File Attachment State
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Voice Recognition State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Auto-scroll ref
  const messagesEndRef = useRef(null);

  // Load Preferences & Greeting
  const savedPrefs = JSON.parse(localStorage.getItem('collab_preferences') || '{}');
  const greetingLine = savedPrefs.customGreeting || 'Hello! How can I help with your board today?';
  
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: greetingLine }
  ]);

  // --- INITIALIZE SPEECH RECOGNITION ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInput(prev => prev + currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // --- SCROLL TO BOTTOM ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // --- HANDLERS ---
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (recognitionRef.current) {
        setInput(''); // Clear input for fresh dictation
        recognitionRef.current.start();
        setIsRecording(true);
      } else {
        alert("Your browser does not support Voice Recognition.");
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (PDF, DOCX, TXT)
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a PDF, DOCX, or TXT file.");
        return;
      }
      setAttachedFile(file);
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const messageText = input.trim();
    
    // Prevent sending empty messages unless there's a file attached
    if ((!messageText && !attachedFile) || isGenerating) return;

    // Create visually appealing UI message
    const userMsg = { 
      id: Date.now(), 
      sender: 'user', 
      text: messageText,
      fileName: attachedFile ? attachedFile.name : null 
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    const fileToSend = attachedFile; // Save reference before clearing UI
    removeFile();
    setIsGenerating(true);

    try {
      // 🛑 Construct FormData to handle Text + File + Context Data
      const formData = new FormData();
      formData.append('message', messageText);
      formData.append('mode', chatMode);
      
      if (chatMode === 'workspace' && activeProject) {
        formData.append('projectId', activeProject._id);
      }
      if (fileToSend) {
        formData.append('document', fileToSend);
      }

      const token = localStorage.getItem('collab_token');
      
      const response = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}` 
          // Do NOT set Content-Type here; browser sets it automatically for FormData
        },
        body: formData
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Server Error (${response.status})`);
      }

      setMessages((prev) => [
        ...prev, 
        { 
          id: Date.now() + 1, 
          sender: 'ai', 
          text: data.reply || "No reply received from AI." 
        }
      ]);

    } catch (error) {
      console.error("Fetch Error:", error);
      setMessages((prev) => [
        ...prev, 
        { id: Date.now() + 1, sender: 'ai', text: `⚠️ Connection failed: ${error.message}` }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden text-theme-text pr-6 pb-4 animate-fade-in">
      
      {/* --- HEADER & CONTEXT TOGGLE --- */}
      <div className="flex items-center justify-between pb-4 border-b border-theme-border mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-theme-accent/10 flex items-center justify-center text-theme-accent shadow-sm">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Assistant</h1>
            <p className="text-xs text-theme-muted mt-0.5">Your intelligent workspace companion</p>
          </div>
        </div>

        {/* Workspace vs General Mode Switch */}
        <div className="flex items-center bg-theme-panel border border-theme-border rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setChatMode('general')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              chatMode === 'general' ? 'bg-theme-bg text-theme-text shadow' : 'text-theme-muted hover:text-theme-text'
            }`}
          >
            <Globe size={14} /> General AI
          </button>
          <button
            onClick={() => {
              if (!activeProject) alert("Please select a workspace from the TopBar first!");
              else setChatMode('workspace');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              chatMode === 'workspace' ? 'bg-theme-accent text-white shadow' : 'text-theme-muted hover:text-theme-text'
            }`}
          >
            <Briefcase size={14} /> Workspace Brain
          </button>
        </div>
      </div>

      {/* --- CHAT HISTORY AREA --- */}
      <div className="flex-1 overflow-y-auto space-y-6 mb-4 pr-4 min-h-0 custom-scrollbar">
        {chatMode === 'workspace' && activeProject && (
          <div className="flex justify-center my-4">
            <span className="bg-theme-accent/10 text-theme-accent border border-theme-accent/20 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
              <Briefcase size={12} /> Connected to: {activeProject.name} Database
            </span>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            
            {/* AI Avatar */}
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-theme-panel border border-theme-border flex items-center justify-center text-theme-accent flex-shrink-0 mt-1 shadow-sm">
                <Bot size={16} />
              </div>
            )}
            
            {/* Message Bubble */}
            <div className={`flex flex-col max-w-[80%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-2xl px-5 py-3.5 text-sm shadow-sm leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-theme-accent text-white rounded-tr-sm'
                    : 'bg-theme-panel border border-theme-border text-theme-text rounded-tl-sm'
                }`}
              >
                {/* Display File Attachment in History */}
                {msg.fileName && (
                  <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg mb-2 text-xs font-medium border border-white/10">
                    <FileText size={14} /> {msg.fileName}
                  </div>
                )}
                {msg.text}
              </div>
            </div>

            {/* User Avatar */}
            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-1 border border-indigo-500/30 shadow-sm">
                <User size={16} />
              </div>
            )}
          </div>
        ))}
        
        {/* Loading Indicator */}
        {isGenerating && (
          <div className="flex gap-3 justify-start animate-in fade-in">
             <div className="w-8 h-8 rounded-full bg-theme-panel border border-theme-border flex items-center justify-center text-theme-accent flex-shrink-0 mt-1 shadow-sm">
                <Bot size={16} />
              </div>
            <div className="bg-theme-panel border border-theme-border rounded-2xl rounded-tl-sm px-5 py-3.5 flex items-center gap-3 text-theme-muted text-sm shadow-sm">
              <Loader2 size={16} className="animate-spin text-theme-accent" />
              <span>Analyzing data...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* --- INPUT AREA --- */}
      <div className="relative flex-shrink-0">
        
        {/* Staged File Indicator */}
        {attachedFile && (
          <div className="absolute -top-12 left-0 flex items-center gap-2 bg-theme-panel border border-theme-accent text-theme-text px-3 py-1.5 rounded-lg text-xs shadow-lg animate-in slide-in-from-bottom-2">
            <FileText size={14} className="text-theme-accent" />
            <span className="font-medium truncate max-w-[200px]">{attachedFile.name}</span>
            <button onClick={removeFile} className="text-theme-muted hover:text-red-500 ml-1 bg-black/5 dark:bg-white/5 rounded p-0.5 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 bg-theme-panel p-2.5 rounded-2xl border border-theme-border shadow-md relative focus-within:border-theme-accent transition-colors">
          
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-theme-muted hover:text-theme-accent hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors flex-shrink-0"
            title="Attach a document (PDF, DOCX, TXT)"
          >
            <Paperclip size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".pdf,.docx,.txt" 
            className="hidden" 
          />

          {/* Text Input */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={isRecording ? "Listening..." : chatMode === 'workspace' ? "Ask about your tasks, notes, or attached docs..." : "Ask AI anything..."}
            className={`flex-1 bg-transparent px-2 py-2.5 text-sm text-theme-text focus:outline-none placeholder-theme-muted resize-none max-h-32 custom-scrollbar ${
              isRecording ? 'text-red-500 animate-pulse' : ''
            }`}
            rows="1"
          />

          {/* Voice Dictation Button */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
              isRecording 
                ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30' 
                : 'text-theme-muted hover:text-theme-accent hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title={isRecording ? "Stop listening" : "Voice dictation"}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={isGenerating || (!input.trim() && !attachedFile)}
            className="bg-theme-accent hover:opacity-90 text-white p-2.5 rounded-xl transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center flex-shrink-0 shadow-sm"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

    </div>
  );
}