import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 Added for the "Go to Workspaces" button
import {
  FolderKanban, UploadCloud, CheckCircle2,
  FileText, MoreVertical, Pencil, Trash2, X, Plus,
  UploadCloud as CloudIcon, Clock, Download, Check, AlertCircle, Briefcase
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports`;
const FILE_BASE = 'http://127.0.0.1:5000';

const COLOR_OPTIONS = ['#A855F7', '#EC4899', '#F43F5E', '#3B82F6', '#10B981', '#F59E0B'];

// --- Display Helpers ---
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
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
      isDoc ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
    }`}>
      <FileText size={18} />
    </div>
  );
}

const getDoc = (mod, kind) => {
  if (kind === 'proposal') return mod?.proposal;
  if (kind === 'final') return mod?.finalReport;
  return mod?.dataReport;
};

const kindLabel = (kind) => (kind === 'proposal' ? 'Project Proposal' : kind === 'final' ? 'Final Report' : 'Data Report');

export default function Reports() {
  // --- Context & Navigation ---
  const { activeProject } = useProject(); 
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [openMenu, setOpenMenu] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Upload panel state
  const [uploadModuleId, setUploadModuleId] = useState(null);
  const [docType, setDocType] = useState('proposal');
  const [pendingFile, setPendingFile] = useState(null);

  // Add module form state
  const [newModule, setNewModule] = useState({ name: '', description: '', color: COLOR_OPTIONS[1], requireFinal: true });

  // Inline rename state
  const [renamingModuleId, setRenamingModuleId] = useState(null);
  const [renamingDocKey, setRenamingDocKey] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmUpload, setConfirmUpload] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const [highlightKey, setHighlightKey] = useState(null);
  const docSlotRefs = useRef({});
  const highlightTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const authHeaders = (extra = {}) => {
    const token = localStorage.getItem('collab_token');
    return { Authorization: `Bearer ${token}`, ...extra };
  };

  // 🛑 Fetch logic synced with Active Project
  useEffect(() => {
    if (activeProject) {
      fetchModules();
    } else {
      setModules([]);
      setIsLoading(false);
    }
  }, [activeProject]);

  const fetchModules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_BASE, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setModules(data);
      }
    } catch (err) {
      console.error('Failed to fetch report modules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 🛑 SANDBOX FILTER: Only process reports that belong to the active workspace
  const activeProjectReports = modules.filter(m => {
    if (!activeProject) return false;
    const projId = typeof m.project === 'string' ? m.project : m.project?._id;
    return projId === activeProject._id;
  });

  // Auto-select the first module for the upload panel
  useEffect(() => {
    if (activeProjectReports.length > 0 && !uploadModuleId) {
      setUploadModuleId(activeProjectReports[0]._id);
    }
  }, [activeProjectReports, uploadModuleId]);

  // Derived stats strictly for the sandboxed project
  const totalModules = activeProjectReports.length;
  const proposalsUploaded = activeProjectReports.filter(m => m.proposal).length;
  const finalsUploaded = activeProjectReports.filter(m => m.finalReport).length;
  const dataReportsUploaded = activeProjectReports.filter(m => m.dataReport).length;

  const recentlyUploaded = activeProjectReports
    .flatMap(m => [
      m.proposal && { ...m.proposal, module: m.name, kind: 'proposal', moduleId: m._id },
      m.finalReport && { ...m.finalReport, module: m.name, kind: 'final', moduleId: m._id },
      m.dataReport && { ...m.dataReport, module: m.name, kind: 'data', moduleId: m._id },
    ])
    .filter(Boolean)
    .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
    .slice(0, 4);

  // --- Module Actions ---
  const handleCreateModule = async () => {
    if (!newModule.name.trim() || !activeProject) return;
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          projectId: activeProject._id, // Explicitly link to current workspace
          name: newModule.name.trim(),
          description: newModule.description.trim(),
          color: newModule.color,
          requireFinal: newModule.requireFinal,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setModules(prev => [...prev, created]);
        setUploadModuleId(created._id);
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

  // --- Document Actions ---
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

  const stageFile = (file) => {
    if (file) setPendingFile(file);
  };

  const uploadFile = async (moduleId, kind, file) => {
    if (!moduleId || !file) return false;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', kind);
      const res = await fetch(`${API_BASE}/${moduleId}/upload`, {
        method: 'POST',
        headers: authHeaders(),
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
      setUploadError(message);
      return false;
    } catch (err) {
      setUploadError('Could not reach the server. Please try again.');
      return false;
    }
  };

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

  const handleRecentClick = (f) => {
    const key = `${f.moduleId}-${f.kind}`;
    const el = docSlotRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.clearTimeout(highlightTimeoutRef.current);
    setHighlightKey(key);
    highlightTimeoutRef.current = window.setTimeout(() => setHighlightKey(null), 450);
  };

  // --- RENDER 1: NO PROJECT SELECTED (SANDBOX WALL) ---
  if (!activeProject && !isLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center animate-fade-in p-8">
        <div className="max-w-md w-full bg-theme-panel p-8 rounded-[2rem] border border-theme-border shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#3B28CC] to-[#FF2D88] rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-[#FF2D88]/20">
            <Briefcase size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-theme-text mb-2">No Workspace Active</h2>
          <p className="text-sm text-theme-muted mb-6">
            Please select a project from the top menu or create a new workspace to view its reports.
          </p>
          <button 
            onClick={() => navigate('/members')}
            style={{ backgroundColor: 'var(--theme-accent)' }}
            className="w-full hover:opacity-90 text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(255,45,136,0.3)]"
          >
            Go to Workspaces
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER 2: WORKSPACE REPORTS ---
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-theme-border border-t-theme-accent rounded-full animate-spin" />
          <p className="text-sm text-theme-muted">Loading workspace reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-7xl mx-auto animate-fade-in text-theme-text pb-10"
      onClick={() => setOpenMenu(null)}
    >
      {/* --- Header --- */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">{activeProject?.name} Reports</h1>
          <p className="text-sm text-theme-muted">
            Workspace repository for <span className="font-semibold text-theme-text">project proposals</span>,{' '}
            <span className="font-semibold text-theme-text">final reports</span> and{' '}
            <span className="font-semibold text-theme-text">data reports</span>.
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
          className="bg-theme-accent hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all hover:-translate-y-0.5 flex-shrink-0"
        >
          <Plus size={18} /> Add new reports
        </button>
      </div>

      {/* --- Stat Cards --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-theme-panel border border-theme-border rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500"><FolderKanban size={20} /></div>
          <div>
            <h3 className="text-2xl font-bold">{totalModules}</h3>
            <p className="text-xs text-theme-muted font-bold uppercase tracking-wider">Module Reports</p>
          </div>
        </div>
        <div className="bg-theme-panel border border-theme-border rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><UploadCloud size={20} /></div>
          <div>
            <h3 className="text-2xl font-bold">{proposalsUploaded}</h3>
            <p className="text-xs text-theme-muted font-bold uppercase tracking-wider">Proposals</p>
          </div>
        </div>
        <div className="bg-theme-panel border border-theme-border rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500"><CheckCircle2 size={20} /></div>
          <div>
            <h3 className="text-2xl font-bold">{finalsUploaded}</h3>
            <p className="text-xs text-theme-muted font-bold uppercase tracking-wider">Final reports</p>
          </div>
        </div>
        <div className="bg-theme-panel border border-theme-border rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500"><FileText size={20} /></div>
          <div>
            <h3 className="text-2xl font-bold">{dataReportsUploaded}</h3>
            <p className="text-xs text-theme-muted font-bold uppercase tracking-wider">Data reports</p>
          </div>
        </div>
      </div>

      {/* --- Main Grid: Modules (left) + Upload panel (right) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT: Module list */}
        <div className="lg:col-span-2 space-y-5">
          {activeProjectReports.length === 0 && (
            <div className="border-2 border-dashed border-theme-border rounded-xl py-16 text-center text-theme-muted flex flex-col items-center justify-center">
              <FolderKanban size={40} className="mb-3 opacity-20" />
              <p className="text-sm font-medium text-theme-text">This workspace has no reports yet.</p>
              <p className="text-xs mt-1">Click "Add new reports" to create a module and start tracking documents.</p>
            </div>
          )}

          {activeProjectReports.map((m) => {
            const total = 3;
            const done = (m.proposal ? 1 : 0) + (m.finalReport ? 1 : 0) + (m.dataReport ? 1 : 0);

            return (
              <div key={m._id} className="bg-theme-panel border border-theme-border rounded-xl p-5 shadow-sm relative group transition-all hover:border-theme-accent/30">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 shadow-sm" style={{ backgroundColor: m.color }} />
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
                            className="bg-theme-bg border border-theme-accent rounded-lg px-2 py-1 text-sm font-bold focus:outline-none w-56 text-theme-text"
                          />
                          <button onClick={(e) => { e.stopPropagation(); commitRenameModule(m._id); }} className="text-green-500 hover:text-green-600 p-1 bg-green-500/10 rounded-md"><Check size={15} /></button>
                          <button onClick={(e) => { e.stopPropagation(); cancelRenameModule(); }} className="text-theme-muted hover:text-red-500 p-1 bg-black/5 dark:bg-white/5 rounded-md"><X size={15} /></button>
                        </div>
                      ) : (
                        <h4 className="font-bold text-base text-theme-text">{m.name} Reports</h4>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-theme-muted">{m.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-2 w-28">
                      <div className="flex-1 h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden border border-theme-border">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(done / total) * 100}%`, backgroundColor: m.color }}
                        />
                      </div>
                      <span className="text-[11px] text-theme-muted font-bold">{done}/{total}</span>
                    </div>
                    
                    {/* Because of the sandbox, everyone viewing this CAN edit it */}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `module-${m._id}` ? null : `module-${m._id}`); }}
                        className="text-theme-muted hover:text-theme-text p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenu === `module-${m._id}` && (
                        <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-9 w-44 bg-theme-panel border border-theme-border rounded-xl shadow-2xl overflow-hidden z-20 text-sm animate-in fade-in slide-in-from-top-2">
                          <button
                            onClick={() => handleRenameModule(m._id)}
                            className="w-full flex items-center gap-2 px-4 py-3 text-theme-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          >
                            <Pencil size={14} /> Rename
                          </button>
                          <button
                            onClick={() => { setConfirmDelete({ type: 'module', id: m._id, name: m.name }); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={14} /> Delete module
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(() => {
                  const docSlot = (kind, label, doc) => (
                    <div
                      key={kind}
                      ref={(el) => { docSlotRefs.current[`${m._id}-${kind}`] = el; }}
                      className={`flex-1 min-w-0 bg-theme-bg border border-theme-border rounded-lg p-3 flex items-center justify-between gap-2 transition-all hover:border-theme-muted/50 ${
                        highlightKey === `${m._id}-${kind}` ? 'ring-2 ring-theme-accent bg-theme-accent/10 shadow-lg' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileBadge doc={doc} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-theme-muted font-bold uppercase tracking-wider mb-0.5">{label}</p>
                          {renamingDocKey === `${m._id}-${kind}` ? (
                            <div className="flex items-center gap-1">
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
                                className="bg-theme-panel border border-theme-accent rounded-md px-2 py-0.5 text-sm font-medium focus:outline-none w-full min-w-0 text-theme-text"
                              />
                              <button onClick={(e) => { e.stopPropagation(); commitRenameDoc(m._id, kind); }} className="text-green-500 hover:text-green-600 p-1 flex-shrink-0 bg-green-500/10 rounded"><Check size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); cancelRenameDoc(); }} className="text-theme-muted hover:text-red-500 p-1 flex-shrink-0 bg-black/5 dark:bg-white/5 rounded"><X size={14} /></button>
                            </div>
                          ) : (
                            <p className="text-sm font-bold truncate text-theme-text">{doc.name}</p>
                          )}
                          <p className="text-[11px] text-theme-muted mt-0.5">{formatFileSize(doc.size)} · {timeAgo(doc.uploadedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadDoc(m._id, kind); }}
                          title="Download"
                          className="text-theme-muted hover:text-theme-text p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                          <Download size={15} />
                        </button>
                        
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `${m._id}-${kind}` ? null : `${m._id}-${kind}`); }} className="text-theme-muted hover:text-theme-text p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <MoreVertical size={15} />
                          </button>
                          {openMenu === `${m._id}-${kind}` && (
                            <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-9 w-36 bg-theme-panel border border-theme-border rounded-xl shadow-2xl overflow-hidden z-20 text-sm animate-in fade-in slide-in-from-top-2">
                              <button onClick={() => handleRenameDoc(m._id, kind)} className="w-full flex items-center gap-2 px-3 py-2.5 text-theme-text hover:bg-black/5 dark:hover:bg-white/5"><Pencil size={13} /> Rename</button>
                              <button onClick={() => { setConfirmDelete({ type: 'doc', moduleId: m._id, kind, name: doc.name }); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-red-500 hover:bg-red-500/10"><Trash2 size={13} /> Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  const slots = [
                    m.proposal && docSlot('proposal', 'Project Proposal', m.proposal),
                    m.finalReport && docSlot('final', 'Final Report', m.finalReport),
                    m.dataReport && docSlot('data', 'Data Report', m.dataReport),
                  ].filter(Boolean);

                  if (slots.length === 0) {
                    return (
                      <div className="bg-theme-bg border border-theme-border rounded-lg p-4 flex items-center gap-3 text-theme-muted">
                        <div className="w-9 h-9 rounded-lg border-2 border-dashed border-theme-border flex items-center justify-center flex-shrink-0"><Plus size={16} /></div>
                        <p className="text-sm">No reports uploaded yet. Team members can use the panel to add documents.</p>
                      </div>
                    );
                  }

                  return <div className="flex flex-col sm:flex-row gap-3 mt-4">{slots}</div>;
                })()}
              </div>
            );
          })}
        </div>

        {/* RIGHT: Upload panel + recently uploaded */}
        <div className="space-y-8" onClick={(e) => e.stopPropagation()}>
          <div className="bg-theme-panel border border-theme-border rounded-2xl p-6 shadow-sm relative overflow-hidden">

            <h2 className="text-lg font-bold mb-1 text-theme-text">Upload a document</h2>
            <p className="text-xs text-theme-muted mb-5">Attach documents securely to your workspace reports.</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-1.5 block">Authorized Reports</label>
                <select
                  value={uploadModuleId ?? ''}
                  onChange={(e) => setUploadModuleId(e.target.value)}
                  disabled={activeProjectReports.length === 0}
                  className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-theme-accent appearance-none cursor-pointer disabled:opacity-50 text-theme-text shadow-inner"
                >
                  {activeProjectReports.length === 0 && <option value="">No modules yet</option>}
                  {activeProjectReports.map(m => <option key={m._id} value={m._id}>{m.name} Report</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-1.5 block">Document type</label>
                <div className="grid grid-cols-3 gap-2 bg-theme-bg p-1 rounded-xl border border-theme-border">
                  <button
                    onClick={() => setDocType('proposal')}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                      docType === 'proposal' ? 'bg-theme-panel text-theme-accent shadow border border-theme-border' : 'text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    Proposal
                  </button>
                  <button
                    onClick={() => setDocType('final')}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                      docType === 'final' ? 'bg-theme-panel text-theme-accent shadow border border-theme-border' : 'text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    Final Report
                  </button>
                  <button
                    onClick={() => setDocType('data')}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                      docType === 'data' ? 'bg-theme-panel text-theme-accent shadow border border-theme-border' : 'text-theme-muted hover:text-theme-text'
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
                  isDragging ? 'border-theme-accent bg-theme-accent/5' : 'border-theme-border hover:border-theme-accent/50 bg-theme-bg'
                }`}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white mb-3 shadow-md" style={{ backgroundColor: 'var(--theme-accent)' }}>
                  <CloudIcon size={22} />
                </div>
                <p className="text-sm font-medium text-theme-text">
                  {pendingFile ? pendingFile.name : 'Drag & drop file here'}
                </p>
                <p className="text-xs text-theme-muted mt-1">
                  {pendingFile ? 'Selected · click "Upload document" to confirm' : 'or click to browse · PDF, DOC, DOCX'}
                </p>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleBrowse} className="hidden" />
              </div>

              <button
                onClick={handleConfirmUpload}
                disabled={!pendingFile || !uploadModuleId}
                style={{ backgroundColor: 'var(--theme-accent)' }}
                className="w-full hover:opacity-90 disabled:opacity-50 text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                <UploadCloud size={18} /> Upload document
              </button>
              {uploadError && (
                <div className="flex items-center justify-center gap-1 text-xs text-red-500 mt-2 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                  <AlertCircle size={14} /> {uploadError}
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4 text-theme-text">Workspace Activity</h2>
            <div className="space-y-2">
              {recentlyUploaded.map((f, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRecentClick(f)}
                  className="w-full flex items-center gap-3 bg-theme-panel border border-theme-border rounded-xl p-3 text-left hover:border-theme-accent/50 transition-all hover:shadow-sm"
                >
                  <FileBadge doc={f} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate text-theme-text">{f.name}</p>
                    <p className="text-[11px] text-theme-muted flex items-center gap-1 mt-0.5">
                      {f.module} <span className="mx-0.5">·</span> <Clock size={10} /> {timeAgo(f.uploadedAt)}
                    </p>
                  </div>
                </button>
              ))}
              {recentlyUploaded.length === 0 && (
                <div className="border border-theme-border bg-theme-bg rounded-xl py-8 text-center text-theme-muted">
                  <p className="text-sm">No recent activity.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- Add Module Modal --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div
            className="bg-theme-panel border border-theme-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-bold text-theme-text">Track a new report</h2>
              <button onClick={() => setShowAddModal(false)} className="text-theme-muted hover:text-red-500 p-1 bg-black/5 dark:bg-white/5 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-theme-muted mb-6">Create a slot for <strong className="text-theme-text">{activeProject?.name}</strong> proposals and final reports.</p>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-1.5 block">REPORT TITLE</label>
                <input
                  type="text"
                  value={newModule.name}
                  onChange={(e) => setNewModule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Mobile App Deployment"
                  className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-accent shadow-inner transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-1.5 block">Description</label>
                <textarea
                  value={newModule.description}
                  onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Briefly describe the scope of this report..."
                  rows={2}
                  className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-accent resize-none shadow-inner transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-2 block">Icon color</label>
                <div className="flex items-center gap-3">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewModule(prev => ({ ...prev, color: c }))}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm"
                      style={{ backgroundColor: c, boxShadow: newModule.color === c ? `0 0 0 2px var(--theme-panel), 0 0 0 4px ${c}` : 'none' }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-theme-bg border border-theme-border rounded-xl">
                <span className="text-sm text-theme-text font-bold">Require a final report</span>
                <button
                  onClick={() => setNewModule(prev => ({ ...prev, requireFinal: !prev.requireFinal }))}
                  className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors shadow-inner ${newModule.requireFinal ? 'justify-end' : 'bg-black/10 dark:bg-white/10 justify-start'}`}
                  style={newModule.requireFinal ? { backgroundColor: 'var(--theme-accent)' } : {}}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-sm block" />
                </button>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-theme-muted border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateModule}
                  disabled={!newModule.name.trim()}
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <Plus size={16} /> Create
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
            className="bg-theme-panel border border-theme-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-theme-text mb-2">
              Delete {confirmDelete.type === 'module' ? 'report module' : 'document'}?
            </h2>
            <p className="text-sm text-theme-muted mb-6">
              <span className="text-theme-text font-bold block mb-1">{confirmDelete.name}</span>
              {confirmDelete.type === 'module'
                ? 'All uploaded files linked to this module will be permanently deleted.'
                : 'This document will be permanently deleted.'} This cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-theme-muted border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedDelete}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Confirm Replace Modal --- */}
      {confirmUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleCancelReplace}>
          <div
            className="bg-theme-panel border border-theme-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-theme-text mb-2">Replace existing file?</h2>
            <p className="text-sm text-theme-muted mb-6">
              <span className="text-theme-text font-bold block mb-1">{confirmUpload.moduleName}</span>
              This already has a {kindLabel(confirmUpload.kind)} attached:<br/>
              <span className="text-theme-text font-medium">{confirmUpload.existingName}</span>. 
              <br/><br/>
              Uploading <span className="text-theme-text font-medium">{confirmUpload.file?.name}</span> will overwrite the old file permanently.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelReplace}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-theme-muted border border-theme-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedReplace}
                style={{ backgroundColor: 'var(--theme-accent)' }}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <UploadCloud size={16} /> Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}