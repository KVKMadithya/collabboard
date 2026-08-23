import React, { useState } from 'react';
import { X, Copy, Check, Share2, ExternalLink } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, boardId = '' }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Dynamically uses current domain (localhost in dev, live domain in production)
  const shareUrl = `${window.location.origin}/dashboard${boardId ? `?boardId=${boardId}` : ''}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-[#121629] border border-white/10 rounded-2xl p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF2D88]/20 flex items-center justify-center text-[#FF2D88]">
              <Share2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold">Shared Dashboard Access</h2>
              <p className="text-xs text-gray-400">Share this project with your team</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-5 space-y-3">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Shareable Project Link
          </label>
          <div className="flex items-center gap-2 bg-[#0A0B14] p-2 rounded-xl border border-white/10">
            <input 
              type="text" 
              readOnly 
              value={shareUrl} 
              className="flex-1 bg-transparent px-2 text-xs sm:text-sm text-gray-200 focus:outline-none select-all truncate"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-[#FF2D88] hover:bg-[#FF2D88]/80 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-gray-400">Anyone with this link can view this board</span>
          <button
            onClick={() => window.open(shareUrl, '_blank')}
            className="flex items-center gap-1.5 text-xs text-[#FF2D88] hover:underline transition-all"
          >
            <span>Open Link</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}