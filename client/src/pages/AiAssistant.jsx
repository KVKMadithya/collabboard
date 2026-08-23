import { useState } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

export default function AiAssistant() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Meow! How can I help with your board today?' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

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
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden text-white pr-6 pb-4">
      {/* AI Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-white/10 mb-4 flex-shrink-0">
        <Bot className="w-7 h-7 text-[#FF2D88]" />
        <h1 className="text-xl font-bold">AI Assistant</h1>
      </div>

      {/* Scrollable Message List */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-lg bg-[#FF2D88]/20 flex items-center justify-center text-[#FF2D88] flex-shrink-0">
                <Bot size={18} />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.sender === 'user'
                  ? 'bg-[#FF2D88] text-white'
                  : 'bg-[#121629] border border-white/10 text-gray-200'
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
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin text-[#FF2D88]" />
            <span>AI is typing...</span>
          </div>
        )}
      </div>

      {/* Pinned Input Bar */}
      <form onSubmit={handleSend} className="flex gap-2 bg-[#121629] p-2 rounded-xl border border-white/10 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI anything..."
          className="flex-1 bg-transparent px-3 text-sm text-white focus:outline-none placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={isGenerating || !input.trim()}
          className="bg-[#FF2D88] hover:bg-[#ff2d88]/80 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}