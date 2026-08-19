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
  Moon,
  Sun,
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
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
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
    <header className="studio-header border-b sticky top-0 z-40">
      <div className="px-3 py-1.5 space-y-1.5 w-full">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Brand + sidebar toggle */}
          <div className="flex items-center gap-2">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                title={isSidebarCollapsed ? 'Show Tracks' : 'Hide Tracks'}
                className="studio-control studio-icon-button"
              >
                {isSidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <Disc3 className={`w-4 h-4 studio-label ${isPlaying ? 'animate-spin' : ''}`} />
              <span className="text-sm font-black tracking-tight studio-value">
                Kceva <span className="studio-label font-medium text-xs">Studio</span>
              </span>
              {isAutosaving && (
                <span className="studio-label flex items-center gap-0.5 text-[9px] font-mono">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  saved
                </span>
              )}
            </div>
          </div>

          {/* Center: Transport + Controls */}
          <div className="studio-toolbar flex items-center gap-2 px-2 py-1 border rounded">
            {/* Play */}
            <button
              onClick={onTogglePlay}
              className={`px-4 py-1.5 font-bold text-xs font-mono flex items-center gap-1.5 rounded transition active:scale-95 ${
                isPlaying
                  ? 'bg-[var(--color-secondary)] hover:bg-[var(--color-muted)] text-white'
                  : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
              }`}
            >
              {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              {isPlaying ? 'STOP' : 'PLAY'}
            </button>

            {/* BPM */}
            <div className="studio-divider flex items-center gap-1 pl-2 border-l">
              <span className="studio-label text-[10px] font-mono">BPM</span>
              <div className="studio-input flex items-center border rounded">
                <button
                  onClick={() => handleTempoChange(composition.tempo - 2)}
                  className="studio-control px-1.5 py-1 text-xs"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="studio-value px-1.5 font-mono font-bold text-xs min-w-7.5 text-center">
                  {composition.tempo}
                </span>
                <button
                  onClick={() => handleTempoChange(composition.tempo + 2)}
                  className="studio-control px-1.5 py-1 text-xs"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Key — fixed with proper option color */}
            <div className="studio-divider hidden sm:flex items-center gap-1 pl-2 border-l">
              <span className="studio-label text-[10px] font-mono">KEY</span>
              <select
                value={composition.key}
                onChange={(e) => handleKeyChange(e.target.value)}
                className="studio-input border rounded px-1.5 py-1 text-xs font-mono font-bold cursor-pointer"
              >
                {NOTE_NAMES.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            {/* Steps */}
            <div className="studio-divider hidden md:flex items-center gap-0.5 pl-2 border-l">
              {[16, 32, 64, 128].map((steps) => (
                <button
                  key={steps}
                  onClick={() => handleStepsCountChange(steps)}
                  data-active={composition.stepsCount === steps}
                  className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition ${
                    composition.stepsCount === steps
                      ? 'studio-segment'
                      : 'studio-control'
                  }`}
                >
                  {steps}
                </button>
              ))}
            </div>

            {/* Volume */}
            <div className="studio-divider flex items-center gap-1 pl-2 border-l">
              <button onClick={toggleMute} className="studio-control">
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : masterVol}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="studio-range w-14 h-1 cursor-pointer"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
              <button
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="studio-control studio-icon-button"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onOpenNewModal}
              aria-label="New project"
              title="New project"
              className="studio-control studio-icon-button"
            >
              <PlusCircle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenSaveModal}
              aria-label="Save project"
              title="Save project"
              className="studio-control studio-icon-button"
            >
              <Save className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenExportModal}
              aria-label="Export audio"
              title="Export audio"
              className="studio-control studio-icon-button"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {onOpenShortcutsModal && (
              <button
                onClick={onOpenShortcutsModal}
                className="studio-control px-2 py-1 text-xs font-mono transition flex items-center gap-1 rounded"
                title="Keyboard Shortcuts (?)"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onOpenClearModal}
              className="studio-control studio-icon-button hover:text-[var(--color-danger)]"
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
                data-active={isActive}
                className="studio-tab flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition whitespace-nowrap rounded-sm border-b-2 border-transparent"
              >
                <IconComp className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
