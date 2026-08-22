import { useState, useEffect } from 'react';
import { MusicComposition, SongSection } from '../types';
import { audioDsp } from '../audio/dspEngine';
import {
  Layers,
  Play,
  Square,
  Plus,
  Trash2,
  Copy,
  Clock,
  Music,
  Radio,
  Sliders,
  Sparkles,
  ChevronRight,
  Disc,
  Piano,
  Disc3,
  Zap,
  Bell,
  Drum,
  Check,
  type LucideIcon,
} from 'lucide-react';

interface SongArrangerProps {
  composition: MusicComposition;
  isPlaying: boolean;
  onUpdateComposition: (comp: MusicComposition) => void;
  onPlaySong: () => void;
  onStopSong: () => void;
}

const DEFAULT_SECTIONS: SongSection[] = [
  {
    id: 'intro',
    name: 'Intro',
    bars: 2,
    activeTracks: ['chords', 'hihat'],
    color: 'sky',
  },
  {
    id: 'verse',
    name: 'Verse 1',
    bars: 4,
    activeTracks: ['melody', 'bass', 'kick', 'hihat'],
    color: 'emerald',
  },
  {
    id: 'buildup',
    name: 'Build-Up',
    bars: 2,
    activeTracks: ['melody', 'chords', 'snare', 'hihat', 'perc'],
    color: 'amber',
  },
  {
    id: 'chorus',
    name: 'Main Drop / Chorus',
    bars: 4,
    activeTracks: ['melody', 'chords', 'bass', 'kick', 'snare', 'hihat', 'openHat', 'perc'],
    color: 'purple',
  },
  {
    id: 'breakdown',
    name: 'Breakdown',
    bars: 2,
    activeTracks: ['chords', 'perc'],
    color: 'sky',
  },
  {
    id: 'outro',
    name: 'Outro',
    bars: 2,
    activeTracks: ['melody', 'chords'],
    color: 'rose',
  },
];

const TRACK_NAMES: { id: string; name: string; icon: LucideIcon }[] = [
  { id: 'melody', name: '1. Lead Synth', icon: Music },
  { id: 'chords', name: '2. Chords & Pad', icon: Piano },
  { id: 'bass', name: '3. Bassline', icon: Radio },
  { id: 'kick', name: '4. Kick Drum', icon: Disc3 },
  { id: 'snare', name: '5. Snare Drum', icon: Zap },
  { id: 'hihat', name: '6. Closed Hat', icon: Disc },
  { id: 'openHat', name: '7. Open Hat', icon: Bell },
  { id: 'perc', name: '8. Percussion', icon: Drum },
];

export function SongArranger({
  composition,
  isPlaying,
  onUpdateComposition,
  onPlaySong,
  onStopSong,
}: SongArrangerProps) {
  const [sections, setSections] = useState<SongSection[]>(() => {
    return composition.arrangement?.sections || DEFAULT_SECTIONS;
  });

  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [currentBar, setCurrentBar] = useState<number>(1);

  // Sync arrangement changes to composition
  const updateSections = (newSections: SongSection[]) => {
    setSections(newSections);
    onUpdateComposition({
      ...composition,
      arrangement: {
        sections: newSections,
        totalBars: newSections.reduce((acc, s) => acc + s.bars, 0),
        loopArrangement: false,
      },
    });
  };

  const addSection = () => {
    const newSec: SongSection = {
      id: `section_${Date.now()}`,
      name: `Section ${sections.length + 1}`,
      bars: 4,
      activeTracks: ['melody', 'chords', 'bass', 'kick', 'snare', 'hihat'],
      color: 'sky',
    };
    updateSections([...sections, newSec]);
  };

  const duplicateSection = (index: number) => {
    const target = sections[index];
    const newSec: SongSection = {
      ...target,
      id: `section_${Date.now()}`,
      name: `${target.name} (Copy)`,
    };
    const updated = [...sections];
    updated.splice(index + 1, 0, newSec);
    updateSections(updated);
  };

  const deleteSection = (index: number) => {
    if (sections.length <= 1) return;
    const updated = sections.filter((_, i) => i !== index);
    updateSections(updated);
  };

  const toggleTrackInSection = (secIndex: number, trackId: string) => {
    const updated = [...sections];
    const target = { ...updated[secIndex] };
    if (target.activeTracks.includes(trackId)) {
      target.activeTracks = target.activeTracks.filter((t) => t !== trackId);
    } else {
      target.activeTracks = [...target.activeTracks, trackId];
    }
    updated[secIndex] = target;
    updateSections(updated);
  };

  const updateSectionBars = (secIndex: number, bars: number) => {
    const updated = [...sections];
    updated[secIndex] = { ...updated[secIndex], bars: Math.max(1, Math.min(32, bars)) };
    updateSections(updated);
  };

  const totalBars = sections.reduce((acc, s) => acc + s.bars, 0);
  const estimatedSeconds = ((totalBars * 4 * 60) / composition.tempo).toFixed(1);

  return (
    <div id="song-arranger-view" className="space-y-6">
      {/* Top Song Timeline Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-md shadow-amber-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Song Timeline & Arrangement Matrix</span>
              <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                Structure Mode
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Build a complete multi-section song structure ({totalBars} Bars • ~{estimatedSeconds}s at {composition.tempo} BPM)
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={isPlaying ? onStopSong : onPlaySong}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-md ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Song</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Song</span>
              </>
            )}
          </button>

          <button
            onClick={addSection}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Section</span>
          </button>
        </div>
      </div>

      {/* Arrangement Timeline Playlist Matrix */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-2xl overflow-x-auto space-y-4">
        {/* Timeline Horizontal Overview */}
        <div className="flex items-center gap-2 min-w-[780px] p-2 bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-x-auto">
          {sections.map((sec, idx) => {
            const widthPercent = (sec.bars / totalBars) * 100;
            const isCurrent = activeSectionIndex === idx && isPlaying;

            const bgClass =
              sec.color === 'emerald'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : sec.color === 'purple'
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                : sec.color === 'amber'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : sec.color === 'rose'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                : 'bg-sky-500/20 border-sky-500/50 text-sky-300';

            return (
              <div
                key={sec.id}
                style={{ width: `${Math.max(120, widthPercent * 7.5)}px` }}
                className={`p-2 rounded-lg border flex flex-col justify-between transition-all ${bgClass} ${
                  isCurrent ? 'ring-2 ring-white shadow-lg' : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold font-mono">
                  <span className="truncate">{sec.name}</span>
                  <span className="text-[10px] opacity-75">{sec.bars} Bars</span>
                </div>
                <div className="text-[9px] font-mono opacity-60 truncate mt-1">
                  {sec.activeTracks.length} / 8 Tracks Active
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Section Matrix: Track rows vs Section columns */}
        <div className="min-w-[780px] border border-slate-800/80 rounded-xl overflow-hidden divide-y divide-slate-800">
          {/* Header Row */}
          <div className="flex items-center bg-slate-900 text-xs font-mono text-slate-300">
            <div className="w-44 p-3 font-bold text-slate-400 border-r border-slate-800">
              Track Name
            </div>
            <div className="flex-1 flex divide-x divide-slate-800">
              {sections.map((sec, idx) => (
                <div key={sec.id} className="flex-1 p-2 flex flex-col justify-between text-center">
                  <div className="font-bold text-slate-200 text-xs flex items-center justify-center gap-1">
                    <input
                      type="text"
                      value={sec.name}
                      onChange={(e) => {
                        const updated = [...sections];
                        updated[idx].name = e.target.value;
                        updateSections(updated);
                      }}
                      className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-sky-400 text-center font-bold text-xs text-slate-200 outline-none w-24"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Bars:</span>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      value={sec.bars}
                      onChange={(e) => updateSectionBars(idx, parseInt(e.target.value) || 1)}
                      className="w-10 bg-slate-950 border border-slate-800 rounded text-center text-[10px] text-sky-400 font-mono py-0.5"
                    />
                    <button
                      onClick={() => duplicateSection(idx)}
                      className="p-1 hover:text-sky-400 text-slate-500 transition"
                      title="Duplicate Section"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {sections.length > 1 && (
                      <button
                        onClick={() => deleteSection(idx)}
                        className="p-1 hover:text-rose-400 text-slate-500 transition"
                        title="Delete Section"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 8 Track Rows */}
          {TRACK_NAMES.map((track) => (
            <div key={track.id} className="flex items-center bg-slate-950 hover:bg-slate-900/40 transition-colors">
              <div className="w-44 p-2.5 font-mono text-xs font-semibold text-slate-300 border-r border-slate-800 flex items-center gap-2">
                <track.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{track.name}</span>
              </div>

              {/* Checkboxes across sections */}
              <div className="flex-1 flex divide-x divide-slate-800/60">
                {sections.map((sec, secIdx) => {
                  const isActive = sec.activeTracks.includes(track.id);

                  return (
                    <div
                      key={sec.id}
                      onClick={() => toggleTrackInSection(secIdx, track.id)}
                      className="flex-1 h-10 flex items-center justify-center cursor-pointer hover:bg-slate-800/40 transition-colors"
                    >
                      <div
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20 font-bold'
                            : 'bg-slate-900 border-slate-800 text-transparent hover:border-slate-700'
                        }`}
                      >
                        {isActive && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
