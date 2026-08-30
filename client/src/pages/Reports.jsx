import React, { useState, useEffect, useRef } from 'react';
import {
  FolderKanban, UploadCloud, CheckCircle2,
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

// Looks up the right file field for a doc kind — 'proposal' | 'final' | 'data'
const getDoc = (mod, kind) => {
  if (kind === 'proposal') return mod?.proposal;
  if (kind === 'final') return mod?.finalReport;
  return mod?.dataReport;
};

const kindLabel = (kind) => (kind === 'proposal' ? 'Project Proposal' : kind === 'final' ? 'Final Report' : 'Data Report');

export default function Reports() {
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [openMenu, setOpenMenu] = useState(null); // `module-${id}` | `${id}-proposal` | `${id}-final` — only one open at a time
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Upload panel state
  const [uploadModuleId, setUploadModuleId] = useState(null);
  const [docType, setDocType] = useState('proposal'); // 'proposal' | 'final' | 'data'
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

  // Confirmation shown when the chosen module + doc type already has a file —
  // shape: { moduleId, kind, file, existingName, moduleName }
  const [confirmUpload, setConfirmUpload] = useState(null);

  // Set whenever an upload request fails, so the panel can show *why*
  // instead of silently doing nothing.
  const [uploadError, setUploadError] = useState(null);

  // Clicking a "Recently uploaded" item scrolls to and flashes the matching
  // doc slot in the module list below. Keyed by `${moduleId}-${kind}`.
  const [highlightKey, setHighlightKey] = useState(null);
  const docSlotRefs = useRef({});
  const highlightTimeoutRef = useRef(null);

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
  const dataReportsUploaded = modules.filter(m => m.dataReport).length;

  const recentlyUploaded = modules
    .flatMap(m => [
      m.proposal && { ...m.proposal, module: m.name, kind: 'proposal', moduleId: m._id },
      m.finalReport && { ...m.finalReport, module: m.name, kind: 'final', moduleId: m._id },
      m.dataReport && { ...m.dataReport, module: m.name, kind: 'data', moduleId: m._id },
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
    const doc = getDoc(mod, kind);
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

  // Shared upload call — the backend deletes whatever was in that slot and
  // saves the new file, so this works whether or not one already exists.
  const uploadFile = async (moduleId, kind, file) => {
    if (!moduleId || !file) return false;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', kind);
      const res = await fetch(`${API_BASE}/${moduleId}/upload`, {
        method: 'POST',
        headers: authHeaders(), // do NOT set Content-Type — browser sets the multipart boundary
        body: formData,
      });
      if (res.ok) {
        const updated = await res.json();
        setModules(prev => prev.map(m => (m._id === moduleId ? updated : m)));
        setUploadError(null);
        return true;
      }
      const errBody = await res.json().catch(() => ({}));
      const message = errBody.message || `Upload failed (HTTP ${res.status})`;
      console.error('Upload failed:', message);
      setUploadError(message);
      return false;
    } catch (err) {
      console.error('Failed to upload document:', err);
      setUploadError('Could not reach the server. Please try again.');
      return false;
    }
  };

  // Clicking "Upload document" — if that module's slot is already occupied,
  // stage a confirmation instead of uploading right away. Confirming replaces
  // the file; canceling leaves the existing file untouched.
  const handleConfirmUpload = () => {
    if (!uploadModuleId || !pendingFile) return;
    setUploadError(null);
    const mod = modules.find(m => m._id === uploadModuleId);
    const existing = getDoc(mod, docType);

    if (existing) {
      setConfirmUpload({
        moduleId: uploadModuleId,
        kind: docType,
        file: pendingFile,
        existingName: existing.name,
        moduleName: mod?.name || '',
      });
      return;
    }
    performUpload(uploadModuleId, docType, pendingFile);
  };

  // Actually sends the file — used both for a fresh upload and after the
  // replace confirmation is accepted.
  const performUpload = async (moduleId, kind, file) => {
    const ok = await uploadFile(moduleId, kind, file);
    if (ok) {
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmedReplace = () => {
    if (!confirmUpload) return;
    performUpload(confirmUpload.moduleId, confirmUpload.kind, confirmUpload.file);
    setConfirmUpload(null);
  };

  const handleCancelReplace = () => {
    // Leave the existing file exactly as it is — just drop the staged file.
    setConfirmUpload(null);
    setPendingFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    stageFile(e.dataTransfer.files?.[0]);
  };

  const handleBrowse = (e) => {
    stageFile(e.target.files?.[0]);
  };

  // Shared download — takes a doc object directly (name + filePath) so it
  // works both for a module's doc slot and for the Recently Uploaded feed.
  const downloadFile = async (doc) => {
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

  const handleDownloadDoc = async (moduleId, kind) => {
    const mod = modules.find(m => m._id === moduleId);
    const doc = getDoc(mod, kind);
    await downloadFile(doc);
  };

  // Clicking a "Recently uploaded" item — scroll to that file's card in the
  // module list and flash-highlight it twice so it's easy to spot.
  const handleRecentClick = (f) => {
    const key = `${f.moduleId}-${f.kind}`;
    const el = docSlotRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.clearTimeout(highlightTimeoutRef.current);
    setHighlightKey(key);
    highlightTimeoutRef.current = window.setTimeout(() => setHighlightKey(null), 450);
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
            Upload and manage <span className="font-semibold text-gray-200">project proposals</span>,{' '}
            <span className="font-semibold text-gray-200">final reports</span> and{' '}
            <span className="font-semibold text-gray-200">data reports</span> for each report — visible and editable by everyone on the team
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
          className="bg-gradient-to-r from-purple-600 to-[#FF2D88] hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_4px_14px_rgba(255,45,136,0.3)] transition-all hover:-translate-y-0.5 flex-shrink-0"
        >
          <Plus size={18} /> Add new reports
        </button>
      </div>

      {/* --- Stat Cards --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 flex-shrink-0">
        <div className="bg-[#121629] border border-white/10 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500"><FolderKanban size={20} /></div>
          <div>
            <h3 className="text-xl font-bold">{totalModules}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Module Reports</p>
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
          <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500"><FileText size={20} /></div>
          <div>
            <h3 className="text-xl font-bold">{dataReportsUploaded}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Data reports uploaded</p>
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
            const total = 3;
            const done = (m.proposal ? 1 : 0) + (m.finalReport ? 1 : 0) + (m.dataReport ? 1 : 0);
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
                        <h4 className="font-bold text-sm">{m.name} Reports</h4>
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
                            <Pencil size={14} /> Rename
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

                {(() => {
                  // Renders one doc's card — only called for docs that actually exist.
                  const docSlot = (kind, label, doc) => (
                    <div
                      key={kind}
                      ref={(el) => { docSlotRefs.current[`${m._id}-${kind}`] = el; }}
                      className={`flex-1 min-w-0 bg-[#121629] border border-white/5 rounded-lg p-3 flex items-center justify-between gap-2 ${
                        highlightKey === `${m._id}-${kind}` ? 'reports-highlight-flash' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileBadge doc={doc} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
                          {renamingDocKey === `${m._id}-${kind}` ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitRenameDoc(m._id, kind);
                                  if (e.key === 'Escape') cancelRenameDoc();
                                }}
                                autoFocus
                                className="bg-[#121629] border border-[#FF2D88]/50 rounded-md px-2 py-0.5 text-sm font-medium focus:outline-none w-full min-w-0"
                              />
                              <button onClick={(e) => { e.stopPropagation(); commitRenameDoc(m._id, kind); }} className="text-green-500 hover:text-green-400 p-1 flex-shrink-0"><Check size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); cancelRenameDoc(); }} className="text-gray-400 hover:text-red-400 p-1 flex-shrink-0"><X size={14} /></button>
                            </div>
                          ) : (
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                          )}
                          <p className="text-[11px] text-gray-500">{formatFileSize(doc.size)} · Uploaded {timeAgo(doc.uploadedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadDoc(m._id, kind); }}
                          title="Download"
                          className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <Download size={15} />
                        </button>
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `${m._id}-${kind}` ? null : `${m._id}-${kind}`); }} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                            <MoreVertical size={15} />
                          </button>
                          {openMenu === `${m._id}-${kind}` && (
                            <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-9 w-36 bg-[#121629] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 text-sm">
                              <button onClick={() => handleRenameDoc(m._id, kind)} className="w-full flex items-center gap-2 px-3 py-2.5 text-gray-200 hover:bg-white/5"><Pencil size={13} /> Rename</button>
                              <button onClick={() => { setConfirmDelete({ type: 'doc', moduleId: m._id, kind, name: doc.name }); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-red-400 hover:bg-white/5"><Trash2 size={13} /> Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  // Only include slots that actually have a file — the bar
                  // evenly divides among however many are present (1, 2, or 3).
                  const slots = [
                    m.proposal && docSlot('proposal', 'Project Proposal', m.proposal),
                    m.finalReport && docSlot('final', 'Final Report', m.finalReport),
                    m.dataReport && docSlot('data', 'Data Report', m.dataReport),
                  ].filter(Boolean);

                  if (slots.length === 0) {
                    return (
                      <div className="bg-[#121629] border border-white/5 rounded-lg p-4 flex items-center gap-3 text-gray-500">
                        <div className="w-9 h-9 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center flex-shrink-0"><Plus size={16} /></div>
                        <p className="text-sm">No reports uploaded yet — use the panel to add a Project Proposal, Final Report, or Data Report.</p>
                      </div>
                    );
                  }

                  return <div className="flex flex-col sm:flex-row gap-3">{slots}</div>;
                })()}
              </div>
            );
          })}

          {/* Add module footer card */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
            className="w-full border-2 border-dashed border-white/10 rounded-xl py-6 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#FF2D88] hover:border-[#FF2D88]/40 transition-colors"
          >
            <span className="flex items-center gap-2 font-bold text-sm"><Plus size={16} /> Add new reports</span>
            <span className="text-xs">Track proposals, final reports and data reports for another report</span>
          </button>
        </div>

        {/* RIGHT: Upload panel + recently uploaded */}
        <div className="space-y-8 overflow-y-auto custom-scrollbar pb-4 pr-1" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#121629] border border-white/10 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-1">Upload a document</h2>
            <p className="text-xs text-gray-400 mb-5">Attach a proposal, final report, or data report to a report</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Report</label>
                <select
                  value={uploadModuleId ?? ''}
                  onChange={(e) => setUploadModuleId(e.target.value)}
                  disabled={modules.length === 0}
                  className="w-full bg-[#121629] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF2D88] appearance-none cursor-pointer disabled:opacity-50"
                >
                  {modules.length === 0 && <option value="">No modules yet</option>}
                  {modules.map(m => <option key={m._id} value={m._id}>{m.name} Report</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Document type</label>
                <div className="grid grid-cols-3 gap-2 bg-[#121629] p-1 rounded-xl border border-white/10">
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
                  <button
                    onClick={() => setDocType('data')}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-colors ${
                      docType === 'data' ? 'bg-gradient-to-r from-purple-600 to-[#FF2D88] text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Data Report
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
              {uploadError && (
                <p className="text-xs text-red-400 text-center -mt-2">{uploadError}</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4">Recently uploaded</h2>
            <div className="space-y-2">
              {recentlyUploaded.map((f, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRecentClick(f)}
                  className="w-full flex items-center gap-3 bg-[#121629] border border-white/5 rounded-xl p-3 text-left hover:border-white/20 hover:bg-white/5 transition-colors"
                >
                  <FileBadge doc={f} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      {f.module} <span className="mx-0.5">·</span> <Clock size={10} /> {timeAgo(f.uploadedAt)}
                    </p>
                  </div>
                </button>
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
              <h2 className="text-lg font-bold text-white">Add a new report</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-6">Track proposals, final reports, and data reports for a new part of your project</p>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">MODULE REPORT</label>
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
                  placeholder="Briefly describe the scope of this report..."
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
                  <Plus size={16} /> Create report
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

      {/* --- Confirm Replace Modal (shown when the chosen slot already has a file) --- */}
      {confirmUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleCancelReplace}>
          <div
            className="bg-[#121629] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-2">Replace existing file?</h2>
            <p className="text-sm text-gray-400 mb-6">
              <span className="text-gray-200 font-medium">{confirmUpload.moduleName} Report</span> already has a{' '}
              {kindLabel(confirmUpload.kind)} —{' '}
              <span className="text-gray-200 font-medium">{confirmUpload.existingName}</span>. Uploading{' '}
              <span className="text-gray-200 font-medium">{confirmUpload.file?.name}</span> will replace it.
              This can&apos;t be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelReplace}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-300 border border-white/10 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedReplace}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-[#FF2D88] hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <UploadCloud size={16} /> Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fast multi-flash highlight animation used to draw attention to a doc
          slot when jumping to it from "Recently uploaded" */}
      <style>{`
        @keyframes reportsHighlightFlash {
          0%, 100% { background-color: transparent; box-shadow: none; }
          50% { background-color: rgba(255, 45, 136, 0.22); box-shadow: 0 0 0 2px rgba(255, 45, 136, 0.65); }
        }
        .reports-highlight-flash {
          animation: reportsHighlightFlash 0.18s ease-in-out 2;
        }
      `}</style>
    </div>
  );
}