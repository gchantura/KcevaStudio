import { useState, useEffect, MouseEvent, ChangeEvent } from 'react';
import { MusicComposition, SavedProject } from '../types';
import { Save, Download, Upload, Trash2, FolderOpen, Check, Copy, X, Clock, Music } from 'lucide-react';

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  composition: MusicComposition;
  onLoadProject: (composition: MusicComposition) => void;
}

const STORAGE_KEY = 'cpp_music_studio_saved_projects_v1';

export function SaveProjectModal({
  isOpen,
  onClose,
  composition,
  onLoadProject,
}: SaveProjectModalProps) {
  const [saveName, setSaveName] = useState(composition.title || 'My Project');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load saved projects from localStorage
  const loadSavedList = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setSavedProjects(JSON.parse(data));
      }
    } catch (e) {
      console.error('Failed to parse saved projects:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSaveName(composition.title || 'My Project');
      loadSavedList();
      setSaveSuccess(false);
    }
  }, [isOpen, composition]);

  if (!isOpen) return null;

  const handleSaveToBrowser = () => {
    try {
      const existing = [...savedProjects];
      const newSavedItem: SavedProject = {
        id: `saved_${Date.now()}`,
        name: saveName || 'Untitled Song',
        updatedAt: Date.now(),
        composition: {
          ...composition,
          title: saveName || composition.title,
        },
      };

      const updated = [newSavedItem, ...existing.filter((p) => p.name !== saveName)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSavedProjects(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleDeleteSaved = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    const updated = savedProjects.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedProjects(updated);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(composition, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${(composition.title || 'project').toLowerCase().replace(/\s+/g, '_')}_project.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.melodySequence && parsed.drumPattern) {
            onLoadProject(parsed);
            onClose();
          } else {
            alert('Invalid project JSON structure.');
          }
        } catch (err) {
          alert('Failed to parse JSON project file.');
        }
      };
    }
  };

  return (
    <div className="studio-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="studio-modal border rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-project-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h2 id="save-project-modal-title" className="text-base font-bold">Save & Project Manager</h2>
              <p className="text-xs text-slate-400">Save to your browser library or backup to JSON file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Project Save Bar */}
        <div className="studio-inset p-4 rounded-xl border space-y-3">
          <label className="block text-xs font-semibold text-slate-300">Save Current Project</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Project Name..."
              className="studio-input flex-1 border rounded-xl px-3 py-2 text-sm focus:border-emerald-500 font-medium"
            />
            <button
              onClick={handleSaveToBrowser}
              className={`flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition shadow-md ${
                saveSuccess
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save to Library</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Offline Backup Tools (.json file) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleDownloadJson}
            className="studio-inset flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Download Project File (.json)</span>
          </button>

          <label className="studio-inset flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium cursor-pointer transition">
            <Upload className="w-4 h-4 text-purple-400" />
            <span>Import Project (.json)</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>

        {/* Saved Projects Library */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Saved Projects Library ({savedProjects.length})</span>
            <span className="text-[11px] text-slate-500 font-mono">Stored in Browser LocalStorage</span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {savedProjects.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs font-mono">
                No saved projects yet. Click "Save to Library" above to save your first track!
              </div>
            ) : (
              savedProjects.map((p) => {
                const dateStr = new Date(p.updatedAt).toLocaleDateString();
                const timeStr = new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onLoadProject(p.composition);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-850 border border-slate-800/80 hover:border-emerald-500/40 cursor-pointer transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-900 text-emerald-400 border border-slate-800 group-hover:border-emerald-500/30">
                        <Music className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>{p.composition.genre}</span>
                          <span>•</span>
                          <span>{p.composition.tempo} BPM</span>
                          <span>•</span>
                          <span>{p.composition.key} {p.composition.scale}</span>
                          <span>•</span>
                          <span>{dateStr} {timeStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadProject(p.composition);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-[11px] font-bold rounded-lg transition"
                      >
                        Load
                      </button>
                      <button
                        onClick={(e) => handleDeleteSaved(p.id, e)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                        title="Delete saved project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
