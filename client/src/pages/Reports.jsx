import React, { useState, useEffect, useRef } from 'react';
import {
  FolderKanban, UploadCloud, CheckCircle2, AlertTriangle,
  FileText, MoreVertical, Pencil, Trash2, X, Plus,
  UploadCloud as CloudIcon, Clock, Download, Check
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000/api/reports';
const FILE_BASE = 'http://127.0.0.1:5000';

const COLOR_OPTIONS = ['#A855F7', '#EC4899', '#F43F5E', '#3B82F6', '#10B981', '#F59E0B'];

// --- Small display helpers ---
const timeAgo = (dateInput) => {
  if (!dateInput) return '';
  const diffMs = Date.now() - new Date(dateInput).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr !== 1 ? 's' : ''} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day !== 1 ? 's' : ''} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} week${week !== 1 ? 's' : ''} ago`;
  const month = Math.floor(day / 30);
  return `${month} month${month !== 1 ? 's' : ''} ago`;
};

const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileKind = (doc) => {
  if (!doc) return 'pdf';
  if (doc.mimeType === 'application/pdf') return 'pdf';
  if (doc.mimeType?.includes('word') || doc.name?.toLowerCase().endsWith('.docx') || doc.name?.toLowerCase().endsWith('.doc')) return 'docx';
  return 'pdf';
};

function FileBadge({ doc }) {
  const isDoc = getFileKind(doc) === 'docx';
  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
      isDoc ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
    }`}>
      <FileText size={18} />
    </div>
  );
}

export default function Reports() {
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [openMenu, setOpenMenu] = useState(null); // `module-${id}` | `${id}-proposal` | `${id}-final` — only one open at a time
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Upload panel state
  const [uploadModuleId, setUploadModuleId] = useState(null);
  const [docType, setDocType] = useState('proposal'); // 'proposal' | 'final'
  const [pendingFile, setPendingFile] = useState(null);

  // Add module form state
  const [newModule, setNewModule] = useState({ name: '', description: '', color: COLOR_OPTIONS[1], requireFinal: true });

  // Inline rename state (module or doc name currently being edited)
  const [renamingModuleId, setRenamingModuleId] = useState(null);
  const [renamingDocKey, setRenamingDocKey] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Custom delete confirmation (replaces window.confirm)
  // shape: { type: 'module', id, name } | { type: 'doc', moduleId, kind, name }
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fileInputRef = useRef(null);

  const authHeaders = (extra = {}) => {
    const token = localStorage.getItem('collab_token');
    return { Authorization: `Bearer ${token}`, ...extra };
  };

  // --- Load modules (everyone signed in sees the same shared list) ---
  const fetchModules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_BASE, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setModules(data);
        if (data.length > 0) setUploadModuleId(prev => prev ?? data[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch report modules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchModules(); }, []);

  // --- Derived stats ---
  const totalModules = modules.length;
  const proposalsUploaded = modules.filter(m => m.proposal).length;
  const finalsUploaded = modules.filter(m => m.finalReport).length;
  const pendingFinals = modules.filter(m => m.requireFinal !== false && !m.finalReport).length;

  const recentlyUploaded = modules
    .flatMap(m => [
      m.proposal && { ...m.proposal, module: m.name, kind: 'proposal' },
      m.finalReport && { ...m.finalReport, module: m.name, kind: 'final' },
    ])
    .filter(Boolean)
    .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
    .slice(0, 4);

  // --- Module actions ---
  const handleCreateModule = async () => {
    if (!newModule.name.trim()) return;
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: newModule.name.trim(),
          description: newModule.description.trim(),
          color: newModule.color,
          requireFinal: newModule.requireFinal,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setModules(prev => [...prev, created]);
        setUploadModuleId(prev => prev ?? created._id);
        setNewModule({ name: '', description: '', color: COLOR_OPTIONS[1], requireFinal: true });
        setShowAddModal(false);
      }
    } catch (err) {
      console.error('Failed to create module:', err);
    }
  };

  const handleDeleteModule = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        setModules(prev => prev.filter(m => m._id !== id));
        setUploadModuleId(prev => (prev === id ? null : prev));
      }
    } catch (err) {
      console.error('Failed to delete module:', err);
    }
  };

  const handleRenameModule = (id) => {
    const mod = modules.find(m => m._id === id);
    setRenameValue(mod?.name || '');
    setRenamingModuleId(id);
    setOpenMenu(null);
  };

  const commitRenameModule = async (id) => {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingModuleId(null); return; }
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        const updated = await res.json();
        setModules(prev => prev.map(m => (m._id === id ? updated : m)));
      }
    } catch (err) {
      console.error('Failed to rename module:', err);
    }
    setRenamingModuleId(null);
  };

  const cancelRenameModule = () => {
    setRenamingModuleId(null);
    setRenameValue('');
  };

  // --- Document actions ---
  const handleDeleteDoc = async (moduleId, kind) => {
    try {
      const res = await fetch(`${API_BASE}/${moduleId}/${kind}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        const updated = await res.json();
        setModules(prev => prev.map(m => (m._id === moduleId ? updated : m)));
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  // Runs whichever delete is currently staged in confirmDelete, then closes the modal
  const handleConfirmedDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'module') {
      handleDeleteModule(confirmDelete.id);
    } else {
      handleDeleteDoc(confirmDelete.moduleId, confirmDelete.kind);
    }
    setConfirmDelete(null);
  };

  const handleRenameDoc = (moduleId, kind) => {
    const mod = modules.find(m => m._id === moduleId);
    const doc = kind === 'proposal' ? mod?.proposal : mod?.finalReport;
    setRenameValue(doc?.name || '');
    setRenamingDocKey(`${moduleId}-${kind}`);
    setOpenMenu(null);
  };

  const commitRenameDoc = async (moduleId, kind) => {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingDocKey(null); return; }
    try {
      const res = await fetch(`${API_BASE}/${moduleId}/${kind}/rename`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        const updated = await res.json();
        setModules(prev => prev.map(m => (m._id === moduleId ? updated : m)));
      }
    } catch (err) {
      console.error('Failed to rename file:', err);
    }
    setRenamingDocKey(null);
  };

  const cancelRenameDoc = () => {
    setRenamingDocKey(null);
    setRenameValue('');
  };

  // --- Upload flow: selecting a file only stages it; "Upload document" confirms ---
  const stageFile = (file) => {
    if (file) setPendingFile(file);
  };

  const handleConfirmUpload = async () => {
    if (!uploadModuleId || !pendingFile) return;
    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      formData.append('docType', docType);
      const res = await fetch(`${API_BASE}/${uploadModuleId}/upload`, {
        method: 'POST',
        headers: authHeaders(), // do NOT set Content-Type — browser sets the multipart boundary
        body: formData,
      });
      if (res.ok) {
        const updated = await res.json();
        setModules(prev => prev.map(m => (m._id === uploadModuleId ? updated : m)));
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error('Upload failed:', errBody.message);
      }
    } catch (err) {
      console.error('Failed to upload document:', err);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    stageFile(e.dataTransfer.files?.[0]);
  };

  const handleBrowse = (e) => {
    stageFile(e.target.files?.[0]);
  };

  const handleDownloadDoc = async (moduleId, kind) => {
    const mod = modules.find(m => m._id === moduleId);
    const doc = kind === 'proposal' ? mod?.proposal : mod?.finalReport;
    if (!doc) return;
    try {
      const res = await fetch(`${FILE_BASE}${doc.filePath}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download file:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-white/10 border-t-[#FF2D88] rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-7xl mx-auto h-full flex flex-col animate-fade-in text-white"
      onClick={() => setOpenMenu(null)}
    >

      {/* --- Header --- */}
      <div className="flex items-start justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold mb-1">Reports</h1>
          <p className="text-sm text-gray-400">
            Upload and manage <span className="font-semibold text-gray-200">project proposals</span> and{' '}
            <span className="font-semibold text-gray-200">final reports</span> for each module — visible and editable by everyone on the team
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
          className="bg-gradient-to-r from-purple-600 to-[#FF2D88] hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_4px_14px_rgba(255,45,136,0.3)] transition-all hover:-translate-y-0.5 flex-shrink-0"
        >
          <Plus size={18} /> Add new module
        </button>
      </div>

      {/* --- Stat Cards --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 flex-shrink-0">
        <div className="bg-[#121629] border border-white/10 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500"><FolderKanban size={20} /></div>
          <div>
            <h3 className="text-xl font-bold">{totalModules}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Modules tracked</p>
          </div>
        </div>
        <div className="bg-[#121629] border border-white/10 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><UploadCloud size={20} /></div>
          <div>
            <h3 className="text-xl font-bold">{proposalsUploaded}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Proposals uploaded</p>
          </div>
        </div>
        <div className="bg-[#121629] border border-white/10 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500"><CheckCircle2 size={20} /></div>
          <div>
            <h3 className="text-xl font-bold">{finalsUploaded}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Final reports uploaded</p>
          </div>
        </div>
        <div className="bg-[#121629] border border-white/10 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500"><AlertTriangle size={20} /></div>
          <div>
            <h3 className="text-xl font-bold">{pendingFinals}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pending final reports</p>
          </div>
        </div>
      </div>

      {/* --- Main Grid: Modules (left) + Upload panel (right) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">

        {/* LEFT: Module list */}
        <div className="lg:col-span-2 overflow-y-auto custom-scrollbar space-y-5 pb-4 pr-1">
          {modules.length === 0 && (
            <div className="border-2 border-dashed border-white/10 rounded-xl py-12 text-center text-gray-400">
              <p className="text-sm">No modules yet. Add one to start tracking proposals and final reports.</p>
            </div>
          )}

          {modules.map((m) => {
            const total = m.requireFinal === false ? 1 : 2;
            const done = (m.proposal ? 1 : 0) + (m.finalReport ? 1 : 0);
            return (
              <div key={m._id} className="bg-[#121629] border border-white/10 rounded-xl p-5 shadow-sm relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: m.color }} />
                    <div className="min-w-0">
                      {renamingModuleId === m._id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRenameModule(m._id);
                              if (e.key === 'Escape') cancelRenameModule();
                            }}
                            autoFocus
                            className="bg-[#121629] border border-[#FF2D88]/50 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none w-56"
                          />
                          <button onClick={(e) => { e.stopPropagation(); commitRenameModule(m._id); }} className="text-green-500 hover:text-green-400 p-1"><Check size={15} /></button>
                          <button onClick={(e) => { e.stopPropagation(); cancelRenameModule(); }} className="text-gray-400 hover:text-red-400 p-1"><X size={15} /></button>
                        </div>
                      ) : (
                        <h4 className="font-bold text-sm">{m.name}</h4>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-2 w-24">
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-[#FF2D88]"
                          style={{ width: `${(done / total) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium">{done}/{total}</span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `module-${m._id}` ? null : `module-${m._id}`); }}
                        className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenu === `module-${m._id}` && (
                        <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-9 w-44 bg-[#121629] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 text-sm">
                          <button
                            onClick={() => handleRenameModule(m._id)}
                            className="w-full flex items-center gap-2 px-4 py-3 text-gray-200 hover:bg-white/5 transition-colors"
                          >
                            <Pencil size={14} /> Rename module
                          </button>
                          <button
                            onClick={() => { setConfirmDelete({ type: 'module', id: m._id, name: m.name }); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-white/5 transition-colors"
                          >
                            <Trash2 size={14} /> Delete module
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Proposal slot */}
                  <div className="bg-[#121629] border border-white/5 rounded-lg p-3 flex items-center justify-between gap-2">
                    {m.proposal ? (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <FileBadge doc={m.proposal} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Project Proposal</p>
                            {renamingDocKey === `${m._id}-proposal` ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <input
                                  type="text"
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitRenameDoc(m._id, 'proposal');
                                    if (e.key === 'Escape') cancelRenameDoc();
                                  }}
                                  autoFocus
                                  className="bg-[#121629] border border-[#FF2D88]/50 rounded-md px-2 py-0.5 text-sm font-medium focus:outline-none w-full min-w-0"
                                />
                                <button onClick={(e) => { e.stopPropagation(); commitRenameDoc(m._id, 'proposal'); }} className="text-green-500 hover:text-green-400 p-1 flex-shrink-0"><Check size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); cancelRenameDoc(); }} className="text-gray-400 hover:text-red-400 p-1 flex-shrink-0"><X size={14} /></button>
                              </div>
                            ) : (
                              <p className="text-sm font-medium truncate">{m.proposal.name}</p>
                            )}
                            <p className="text-[11px] text-gray-500">{formatFileSize(m.proposal.size)} · Uploaded {timeAgo(m.proposal.uploadedAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadDoc(m._id, 'proposal'); }}
                            title="Download"
                            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <Download size={15} />
                          </button>
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `${m._id}-proposal` ? null : `${m._id}-proposal`); }} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                              <MoreVertical size={15} />
                            </button>
                            {openMenu === `${m._id}-proposal` && (
                              <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-9 w-36 bg-[#121629] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 text-sm">
                                <button onClick={() => handleRenameDoc(m._id, 'proposal')} className="w-full flex items-center gap-2 px-3 py-2.5 text-gray-200 hover:bg-white/5"><Pencil size={13} /> Rename</button>
                                <button onClick={() => { setConfirmDelete({ type: 'doc', moduleId: m._id, kind: 'proposal', name: m.proposal.name }); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-red-400 hover:bg-white/5"><Trash2 size={13} /> Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 text-gray-500 w-full">
                        <div className="w-9 h-9 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center flex-shrink-0"><Plus size={16} /></div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider">Project Proposal</p>
                          <p className="text-sm">Not uploaded yet</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Final report slot */}
                  {m.requireFinal !== false && (
                    <div className="bg-[#121629] border border-white/5 rounded-lg p-3 flex items-center justify-between gap-2">
                      {m.finalReport ? (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <FileBadge doc={m.finalReport} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Final Report</p>
                              {renamingDocKey === `${m._id}-final` ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <input
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') commitRenameDoc(m._id, 'final');
                                      if (e.key === 'Escape') cancelRenameDoc();
                                    }}
                                    autoFocus
                                    className="bg-[#121629] border border-[#FF2D88]/50 rounded-md px-2 py-0.5 text-sm font-medium focus:outline-none w-full min-w-0"
                                  />
                                  <button onClick={(e) => { e.stopPropagation(); commitRenameDoc(m._id, 'final'); }} className="text-green-500 hover:text-green-400 p-1 flex-shrink-0"><Check size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); cancelRenameDoc(); }} className="text-gray-400 hover:text-red-400 p-1 flex-shrink-0"><X size={14} /></button>
                                </div>
                              ) : (
                                <p className="text-sm font-medium truncate">{m.finalReport.name}</p>
                              )}
                              <p className="text-[11px] text-gray-500">{formatFileSize(m.finalReport.size)} · Uploaded {timeAgo(m.finalReport.uploadedAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownloadDoc(m._id, 'final'); }}
                              title="Download"
                              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <Download size={15} />
                            </button>
                            <div className="relative">
                              <button onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `${m._id}-final` ? null : `${m._id}-final`); }} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                <MoreVertical size={15} />
                              </button>
                              {openMenu === `${m._id}-final` && (
                                <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-9 w-36 bg-[#121629] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 text-sm">
                                  <button onClick={() => handleRenameDoc(m._id, 'final')} className="w-full flex items-center gap-2 px-3 py-2.5 text-gray-200 hover:bg-white/5"><Pencil size={13} /> Rename</button>
                                  <button onClick={() => { setConfirmDelete({ type: 'doc', moduleId: m._id, kind: 'final', name: m.finalReport.name }); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-red-400 hover:bg-white/5"><Trash2 size={13} /> Delete</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3 text-gray-500 w-full">
                          <div className="w-9 h-9 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center flex-shrink-0"><Plus size={16} /></div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider">Final Report</p>
                            <p className="text-sm">Not uploaded yet</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add module footer card */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
            className="w-full border-2 border-dashed border-white/10 rounded-xl py-6 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#FF2D88] hover:border-[#FF2D88]/40 transition-colors"
          >
            <span className="flex items-center gap-2 font-bold text-sm"><Plus size={16} /> Add a new module</span>
            <span className="text-xs">Track proposals and final reports for another module</span>
          </button>
        </div>

        {/* RIGHT: Upload panel + recently uploaded */}
        <div className="space-y-8 overflow-y-auto custom-scrollbar pb-4 pr-1" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#121629] border border-white/10 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-1">Upload a document</h2>
            <p className="text-xs text-gray-400 mb-5">Attach a proposal or final report to a module</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Module</label>
                <select
                  value={uploadModuleId ?? ''}
                  onChange={(e) => setUploadModuleId(e.target.value)}
                  disabled={modules.length === 0}
                  className="w-full bg-[#121629] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] appearance-none cursor-pointer disabled:opacity-50"
                >
                  {modules.length === 0 && <option value="">No modules yet</option>}
                  {modules.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Document type</label>
                <div className="grid grid-cols-2 gap-2 bg-[#121629] p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setDocType('proposal')}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-colors ${
                      docType === 'proposal' ? 'bg-gradient-to-r from-purple-600 to-[#FF2D88] text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Project Proposal
                  </button>
                  <button
                    onClick={() => setDocType('final')}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-colors ${
                      docType === 'final' ? 'bg-gradient-to-r from-purple-600 to-[#FF2D88] text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Final Report
                  </button>
                </div>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-[#FF2D88] bg-[#FF2D88]/5' : 'border-white/10 hover:border-[#FF2D88]/40'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-[#FF2D88] flex items-center justify-center text-white mb-3">
                  <CloudIcon size={22} />
                </div>
                <p className="text-sm font-medium">
                  {pendingFile ? pendingFile.name : 'Drag & drop file here'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {pendingFile ? 'Selected · click "Upload document" to confirm' : 'or click to browse · PDF, DOC, DOCX up to 25MB'}
                </p>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleBrowse} className="hidden" />
              </div>

              <button
                onClick={handleConfirmUpload}
                disabled={!pendingFile || !uploadModuleId}
                className="w-full bg-gradient-to-r from-purple-600 to-[#FF2D88] hover:opacity-90 disabled:opacity-50 text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)] flex items-center justify-center gap-2"
              >
                <UploadCloud size={18} /> Upload document
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4">Recently uploaded</h2>
            <div className="space-y-2">
              {recentlyUploaded.map((f, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-[#121629] border border-white/5 rounded-xl p-3">
                  <FileBadge doc={f} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      {f.module} <span className="mx-0.5">·</span> <Clock size={10} /> {timeAgo(f.uploadedAt)}
                    </p>
                  </div>
                </div>
              ))}
              {recentlyUploaded.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">Nothing uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- Add Module Modal --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div
            className="bg-[#121629] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-bold text-white">Add a new module</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-6">Track proposals and final reports for a new part of your project</p>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Module name</label>
                <input
                  type="text"
                  value={newModule.name}
                  onChange={(e) => setNewModule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Mobile App Development"
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF2D88]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Description</label>
                <textarea
                  value={newModule.description}
                  onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Briefly describe the scope of this module..."
                  rows={2}
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF2D88] resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">Icon & color</label>
                <div className="flex items-center gap-3">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewModule(prev => ({ ...prev, color: c }))}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c, boxShadow: newModule.color === c ? `0 0 0 2px #121629, 0 0 0 4px ${c}` : 'none' }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-200">Require a final report</span>
                <button
                  onClick={() => setNewModule(prev => ({ ...prev, requireFinal: !prev.requireFinal }))}
                  className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${newModule.requireFinal ? 'bg-[#FF2D88] justify-end' : 'bg-white/10 justify-start'}`}
                >
                  <span className="w-5 h-5 rounded-full bg-white block" />
                </button>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-300 border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateModule}
                  disabled={!newModule.name.trim()}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-[#FF2D88] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Create module
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Confirm Delete Modal --- */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div
            className="bg-[#121629] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-2">
              Delete {confirmDelete.type === 'module' ? 'module' : 'file'}?
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              <span className="text-gray-200 font-medium">{confirmDelete.name}</span>
              {confirmDelete.type === 'module'
                ? ' and its uploaded files will be permanently deleted. This can\'t be undone.'
                : ' will be permanently deleted. This can\'t be undone.'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-300 border border-white/10 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedDelete}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}