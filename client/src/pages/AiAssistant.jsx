import { useState } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

export default function AiAssistant() {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 🛑 THE FIX: Get the greeting and declare the messages state properly!
  const savedPrefs = JSON.parse(localStorage.getItem('collab_preferences')) || {};
  const greetingLine = savedPrefs.customGreeting || 'Meow! How can I help with your board today?';
  
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: greetingLine } // The AI says hello first!
  ]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const messageText = input.trim();
    if (!messageText || isGenerating) return;

    const userMsg = { id: Date.now(), sender: 'user', text: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    try {
      const response = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = 
          typeof data.error === 'string' ? data.error :
          data.error?.message || data.message || `Server Error (${response.status})`;
        
        throw new Error(errorMessage);
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
        { id: Date.now() + 1, sender: 'ai', text: `⚠️ ${error.message}` }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden text-theme-text pr-6 pb-4">
      {/* AI Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-theme-border mb-4 flex-shrink-0">
        <Bot className="w-7 h-7 text-theme-accent" />
        <h1 className="text-xl font-bold">AI Assistant</h1>
      </div>

      {/* Scrollable Message List */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 min-h-0 premium-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-lg bg-theme-accent/20 flex items-center justify-center text-theme-accent flex-shrink-0">
                <Bot size={18} />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-theme-accent text-white'
                  : 'bg-theme-panel border border-theme-border text-theme-text'
              }`}
            >
              {msg.text}
            </div>
            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <User size={18} />
              </div>
            )}
          </div>
        ))}
        {isGenerating && (
          <div className="flex items-center gap-2 text-theme-muted text-sm">
            <Loader2 size={16} className="animate-spin text-theme-accent" />
            <span>AI is typing...</span>
          </div>
        )}
      </div>

      {/* Pinned Input Bar */}
      <form onSubmit={handleSend} className="flex gap-2 bg-theme-panel p-2 rounded-xl border border-theme-border flex-shrink-0 shadow-sm">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI anything..."
          className="flex-1 bg-transparent px-3 text-sm text-theme-text focus:outline-none placeholder-theme-muted"
        />
        <button
          type="submit"
          disabled={isGenerating || !input.trim()}
          className="bg-theme-accent hover:opacity-80 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}