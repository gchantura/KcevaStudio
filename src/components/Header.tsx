import { useState } from 'react';
import { MusicComposition, ViewTab } from '../types';
import { NOTE_NAMES } from '../audio/musicTheory';
import { audioDsp } from '../audio/dspEngine';
import {
  Play,
  Square,
  Volume2,
  VolumeX,
  Download,
  Disc3,
  Trash2,
  PlusCircle,
  Save,
  Plus,
  Minus,
  Keyboard,
  Film,
  Music,
  Piano,
  Sparkles,
  Sliders,
  Headphones,
  FolderOpen,
  PanelLeftClose,
  PanelLeft,
  CheckCircle2,
} from 'lucide-react';

interface HeaderProps {
  composition: MusicComposition;
  isPlaying: boolean;
  activeTab: ViewTab;
  isSidebarCollapsed?: boolean;
  isAutosaving?: boolean;
  onToggleSidebar?: () => void;
  onTabChange: (tab: ViewTab) => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onUpdateComposition: (comp: MusicComposition) => void;

  onOpenClearModal: () => void;
  onOpenNewModal: () => void;
  onOpenSaveModal: () => void;
  onOpenExportModal: () => void;
  onOpenShortcutsModal?: () => void;
}

export function Header({
  composition,
  isPlaying,
  activeTab,
  isSidebarCollapsed,
  isAutosaving,
  onToggleSidebar,
  onTabChange,
  onTogglePlay,
  onStop,
  onUpdateComposition,
  onOpenClearModal,
  onOpenNewModal,
  onOpenSaveModal,
  onOpenExportModal,
  onOpenShortcutsModal,
}: HeaderProps) {
  const [masterVol, setMasterVol] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const handleTempoChange = (newTempo: number) => {
    const clamped = Math.max(40, Math.min(220, newTempo));
    onUpdateComposition({ ...composition, tempo: clamped });
  };

  const handleKeyChange = (newKey: string) => {
    onUpdateComposition({ ...composition, key: newKey });
  };

  const handleStepsCountChange = (newCount: number) => {
    function resizeArray<T>(arr: T[], defaultVal: T): T[] {
      const copy = [...(arr || [])];
      while (copy.length < newCount) copy.push(defaultVal);
      return copy.slice(0, newCount);
    }
    const updated: MusicComposition = {
      ...composition,
      stepsCount: newCount,
      melodySequence: resizeArray(composition.melodySequence, null),
      bassSequence: resizeArray(composition.bassSequence, null),
      chordSequence: resizeArray(composition.chordSequence, null),
      drumPattern: {
        kick: resizeArray(composition.drumPattern.kick, false),
        snare: resizeArray(composition.drumPattern.snare, false),
        hihat: resizeArray(composition.drumPattern.hihat, false),
        openHat: resizeArray(composition.drumPattern.openHat, false),
        perc: resizeArray(composition.drumPattern.perc, false),
      },
    };
    onUpdateComposition(updated);
  };

  const handleVolumeChange = (vol: number) => {
    setMasterVol(vol);
    setIsMuted(vol === 0);
    audioDsp.setMasterVolume(vol);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioDsp.setMasterVolume(masterVol || 0.8);
    } else {
      setIsMuted(true);
      audioDsp.setMasterVolume(0);
    }
  };

  // Minimal tab config — single accent, no rainbow
  const STUDIO_TABS = [
    { id: 'timeline', icon: Film, label: 'Timeline' },
    { id: 'studio', icon: Music, label: 'Sequencer' },
    { id: 'piano_roll', icon: Piano, label: 'Piano Roll' },
    { id: 'sound_explorer', icon: Sparkles, label: 'Sounds' },
    { id: 'mixer', icon: Sliders, label: 'Mixer' },
    { id: 'dj_deck', icon: Headphones, label: 'DJ Deck' },
    { id: 'presets', icon: FolderOpen, label: 'Presets' },
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800/80 sticky top-0 z-40">
      <div className="px-3 py-1.5 space-y-1.5 w-full">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Brand + sidebar toggle */}
          <div className="flex items-center gap-2">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                title={isSidebarCollapsed ? 'Show Tracks' : 'Hide Tracks'}
                className="p-1 rounded text-slate-400 hover:text-slate-200 transition"
              >
                {isSidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <Disc3 className={`w-4 h-4 text-slate-400 ${isPlaying ? 'animate-spin' : ''}`} />
              <span className="text-sm font-black tracking-tight text-slate-200">
                Kceva <span className="text-slate-500 font-medium text-xs">Studio</span>
              </span>
              {isAutosaving && (
                <span className="flex items-center gap-0.5 text-[9px] font-mono text-slate-500">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  saved
                </span>
              )}
            </div>
          </div>

          {/* Center: Transport + Controls */}
          <div className="flex items-center gap-2 bg-slate-900/60 px-2 py-1 border border-slate-800/60 rounded">
            {/* Play */}
            <button
              onClick={onTogglePlay}
              className={`px-4 py-1.5 font-bold text-xs font-mono flex items-center gap-1.5 rounded transition active:scale-95 ${
                isPlaying
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              {isPlaying ? 'STOP' : 'PLAY'}
            </button>

            {/* BPM */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-800/60">
              <span className="text-[10px] font-mono text-slate-500">BPM</span>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded">
                <button
                  onClick={() => handleTempoChange(composition.tempo - 2)}
                  className="px-1.5 py-1 text-slate-500 hover:text-slate-200 text-xs"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="px-1.5 font-mono font-bold text-slate-200 text-xs min-w-7.5 text-center">
                  {composition.tempo}
                </span>
                <button
                  onClick={() => handleTempoChange(composition.tempo + 2)}
                  className="px-1.5 py-1 text-slate-500 hover:text-slate-200 text-xs"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Key — fixed with proper option color */}
            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-800/60">
              <span className="text-[10px] font-mono text-slate-500">KEY</span>
              <select
                value={composition.key}
                onChange={(e) => handleKeyChange(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-sky-600 cursor-pointer"
                style={{ colorScheme: 'dark' }}
              >
                {NOTE_NAMES.map((k) => (
                  <option key={k} value={k} className="bg-slate-900 text-slate-200">
                    {k}
                  </option>
                ))}
              </select>
            </div>

            {/* Steps */}
            <div className="hidden md:flex items-center gap-0.5 pl-2 border-l border-slate-800/60">
              {[16, 32, 64, 128].map((steps) => (
                <button
                  key={steps}
                  onClick={() => handleStepsCountChange(steps)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition ${
                    composition.stepsCount === steps
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {steps}
                </button>
              ))}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-800/60">
              <button onClick={toggleMute} className="text-slate-500 hover:text-slate-200">
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : masterVol}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 h-1 bg-slate-800 accent-slate-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenNewModal}
              aria-label="New project"
              title="New project"
              className="p-1.5 text-slate-400 hover:text-slate-200 transition hover:bg-slate-800/60"
            >
              <PlusCircle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenSaveModal}
              aria-label="Save project"
              title="Save project"
              className="p-1.5 text-slate-400 hover:text-slate-200 transition hover:bg-slate-800/60"
            >
              <Save className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenExportModal}
              aria-label="Export audio"
              title="Export audio"
              className="p-1.5 text-slate-400 hover:text-slate-200 transition hover:bg-slate-800/60"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {onOpenShortcutsModal && (
              <button
                onClick={onOpenShortcutsModal}
                className="px-2 py-1 text-slate-500 hover:text-slate-200 text-xs font-mono transition flex items-center gap-1 hover:bg-slate-800/60 rounded"
                title="Keyboard Shortcuts (?)"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onOpenClearModal}
              className="p-1 text-slate-500 hover:text-red-400 transition rounded hover:bg-slate-800/60"
              title="Clear / Reset"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab Strip — clean, monochrome, minimal */}
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {STUDIO_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as ViewTab)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition whitespace-nowrap rounded-sm ${
                  isActive
                    ? 'bg-slate-800 text-white border-b-2 border-sky-500'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                }`}
              >
                <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-600'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
