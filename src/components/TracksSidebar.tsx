import React, { useState } from 'react';
import { MusicComposition, CustomSoundLine } from '../types';
import { audioDsp } from '../audio/dspEngine';
import { noteToFreq } from '../audio/musicTheory';
import {
  Mic,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Volume2,
  VolumeX,
  Play,
  Music,
  Sparkles,
  Radio,
  Disc3,
  Sliders,
  RotateCcw,
  Headphones,
} from 'lucide-react';

interface TracksSidebarProps {
  composition: MusicComposition;
  trackMutes?: Record<string, boolean>;
  trackSolos?: Record<string, boolean>;
  selectedTrackId?: string;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onVolumeChange: (id: string, value: number) => void;
  onSelectTrack?: (id: string) => void;
  onOpenVocalPicker: (id: string) => void;
  onAddTrack?: () => void;
  onAddVocal?: () => void;
  onDeleteCustomLine?: (id: string) => void;
  onClearTrack?: (id: string) => void;
}

export const TracksSidebar: React.FC<TracksSidebarProps> = ({
  composition,
  trackMutes = {},
  trackSolos = {},
  selectedTrackId = 'melody',
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onSelectTrack,
  onOpenVocalPicker,
  onAddTrack,
  onAddVocal,
  onDeleteCustomLine,
  onClearTrack,
}) => {
  const [isDrumsExpanded, setIsDrumsExpanded] = useState(true);

  // Helper counts
  const melodyActiveNotes = composition.melodySequence.filter((n) => n && n !== 'REST').length;
  const chordActiveNotes = composition.chordSequence.filter((n) => n && n !== 'REST').length;
  const bassActiveNotes = composition.bassSequence.filter((n) => n && n !== 'REST').length;
  const drumActiveSteps =
    composition.drumPattern.kick.filter(Boolean).length +
    composition.drumPattern.snare.filter(Boolean).length +
    composition.drumPattern.hihat.filter(Boolean).length +
    composition.drumPattern.openHat.filter(Boolean).length +
    composition.drumPattern.perc.filter(Boolean).length;

  const totalTracks = 4 + (composition.customLines?.length || 0);

  const getTrackMuteState = (id: string): boolean => {
    if (trackMutes[id] !== undefined) return trackMutes[id];
    const custom = composition.customLines?.find((l) => l.id === id);
    if (custom) return custom.isMuted;
    return false;
  };

  const getTrackSoloState = (id: string): boolean => {
    if (trackSolos[id] !== undefined) return trackSolos[id];
    const custom = composition.customLines?.find((l) => l.id === id);
    if (custom) return custom.isSoloed;
    return false;
  };

  const getTrackVolume = (id: string): number => {
    if (id === 'melody') return composition.leadSynthPatch?.volume ?? 0.8;
    if (id === 'chords') return composition.chordSynthPatch?.volume ?? 0.7;
    if (id === 'bass') return composition.bassSynthPatch?.volume ?? 0.85;
    if (id === 'drums') return composition.drumVolume ?? 0.85;
    const custom = composition.customLines?.find((l) => l.id === id);
    if (custom) return custom.volume ?? 0.8;
    return 0.8;
  };

  const auditionTrackSound = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    audioDsp.resumeContext();
    if (trackId === 'melody') {
      audioDsp.playSynthesizerNote(noteToFreq('C4'), composition.leadSynthPatch, 0.4);
    } else if (trackId === 'chords') {
      const firstChord = composition.chordSequence.find((chord) => chord !== null && chord !== 'REST') || 'I';
      const freqs = audioDsp.getChordFrequencies(firstChord, composition.key, composition.scale);
      audioDsp.playChordNotes(freqs, composition.chordSynthPatch, 0.6);
    } else if (trackId === 'bass') {
      audioDsp.playSynthesizerNote(noteToFreq('C2'), composition.bassSynthPatch, 0.4);
    } else if (trackId === 'drums' || trackId === 'kick') {
      audioDsp.playDrumSound('kick');
    } else {
      const custom = composition.customLines?.find((l) => l.id === trackId);
      if (custom) {
        audioDsp.playSynthesizerNote(noteToFreq('C4'), custom.patch, 0.4);
      }
    }
  };

  const auditionDrumSound = (drumType: 'kick' | 'snare' | 'hihat' | 'openHat' | 'perc', e: React.MouseEvent) => {
    e.stopPropagation();
    audioDsp.resumeContext();
    audioDsp.playDrumSound(drumType);
  };

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 text-slate-200 flex flex-col shrink-0 select-none h-screen sticky top-0 overflow-hidden font-sans shadow-2xl">
      {/* Sidebar Header with Quick Add Actions */}
      <div className="px-3.5 py-2.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Track Stems</h2>
            <p className="text-[9px] text-slate-500 font-mono">{totalTracks} studio tracks</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddTrack}
            title="Add New Synth Track"
            className="px-2 py-1 rounded bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white text-[11px] font-mono font-bold transition flex items-center gap-1 border border-sky-500/30"
          >
            <Plus className="w-3 h-3" />
            <span>Synth</span>
          </button>
          <button
            onClick={onAddVocal}
            title="Add Vocal Clip Track"
            className="px-2 py-1 rounded bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-[11px] font-mono font-bold transition flex items-center gap-1 border border-purple-500/30"
          >
            <Mic className="w-3 h-3" />
            <span>Voice</span>
          </button>
        </div>
      </div>

      {/* Tracks List with Audition, Volume, Pan, Mute, Solo */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {/* 1. Lead Melody */}
        <div
          onClick={() => onSelectTrack && onSelectTrack('melody')}
          className={`p-2.5 rounded border transition cursor-pointer ${
            selectedTrackId === 'melody'
              ? 'bg-slate-900 border-sky-500 ring-1 ring-sky-500/50 shadow-md shadow-sky-950/40'
              : 'bg-slate-900/60 border-slate-800/90 hover:bg-slate-900 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => auditionTrackSound('melody', e)}
                title="Audition Lead Melody Sound"
                className="w-5 h-5 rounded bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 flex items-center justify-center transition"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
              </button>
              <div>
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                  1. Lead Synth
                </span>
                <span className="text-[9px] font-mono text-sky-400/80 block">
                  {composition.leadSynthPatch?.waveType || 'sawtooth'} • {melodyActiveNotes} notes
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute('melody');
                }}
                title="Mute Track"
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                  getTrackMuteState('melody')
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                M
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSolo('melody');
                }}
                title="Solo Track"
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                  getTrackSoloState('melody')
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                S
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Volume2 className="w-3 h-3 text-slate-500 shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(getTrackVolume('melody') * 100)}
              onChange={(e) => onVolumeChange('melody', Number(e.target.value) / 100)}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
            />
            <span className="text-[9px] font-mono text-slate-400 w-6 text-right">
              {Math.round(getTrackVolume('melody') * 100)}%
            </span>
          </div>
        </div>

        {/* 2. Chords & Pad */}
        <div
          onClick={() => onSelectTrack && onSelectTrack('chords')}
          className={`p-2.5 rounded border transition cursor-pointer ${
            selectedTrackId === 'chords'
              ? 'bg-slate-900 border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-950/40'
              : 'bg-slate-900/60 border-slate-800/90 hover:bg-slate-900 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => auditionTrackSound('chords', e)}
                title="Audition Chords & Pad Sound"
                className="w-5 h-5 rounded bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-slate-950 flex items-center justify-center transition"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
              </button>
              <div>
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                  2. Chords & Pad
                </span>
                <span className="text-[9px] font-mono text-purple-400/80 block">
                  Poly Harmony • {chordActiveNotes} chords
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute('chords');
                }}
                title="Mute Track"
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                  getTrackMuteState('chords')
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                M
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSolo('chords');
                }}
                title="Solo Track"
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                  getTrackSoloState('chords')
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                S
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Volume2 className="w-3 h-3 text-slate-500 shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(getTrackVolume('chords') * 100)}
              onChange={(e) => onVolumeChange('chords', Number(e.target.value) / 100)}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-400"
            />
            <span className="text-[9px] font-mono text-slate-400 w-6 text-right">
              {Math.round(getTrackVolume('chords') * 100)}%
            </span>
          </div>
        </div>

        {/* 3. Bass & 808 */}
        <div
          onClick={() => onSelectTrack && onSelectTrack('bass')}
          className={`p-2.5 rounded border transition cursor-pointer ${
            selectedTrackId === 'bass'
              ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/40'
              : 'bg-slate-900/60 border-slate-800/90 hover:bg-slate-900 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => auditionTrackSound('bass', e)}
                title="Audition Bass / 808 Sound"
                className="w-5 h-5 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 flex items-center justify-center transition"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
              </button>
              <div>
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  3. Bass & 808
                </span>
                <span className="text-[9px] font-mono text-emerald-400/80 block">
                  Low Sub-End • {bassActiveNotes} notes
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute('bass');
                }}
                title="Mute Track"
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                  getTrackMuteState('bass')
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                M
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSolo('bass');
                }}
                title="Solo Track"
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                  getTrackSoloState('bass')
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                S
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Volume2 className="w-3 h-3 text-slate-500 shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(getTrackVolume('bass') * 100)}
              onChange={(e) => onVolumeChange('bass', Number(e.target.value) / 100)}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-400"
            />
            <span className="text-[9px] font-mono text-slate-400 w-6 text-right">
              {Math.round(getTrackVolume('bass') * 100)}%
            </span>
          </div>
        </div>

        {/* 4. Drums (5 Tracks with dropdown triggers) */}
        <div
          onClick={() => onSelectTrack && onSelectTrack('drums')}
          className={`p-2.5 rounded border transition cursor-pointer ${
            selectedTrackId === 'drums'
              ? 'bg-slate-900 border-amber-500 ring-1 ring-amber-500/50 shadow-md shadow-amber-950/40'
              : 'bg-slate-900/60 border-slate-800/90 hover:bg-slate-900 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDrumsExpanded(!isDrumsExpanded);
                }}
                className="text-slate-400 hover:text-white p-0.5"
                title="Expand / Collapse Drum Voices"
              >
                {isDrumsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              <div>
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  4. Drum Kit (5 Voices)
                </span>
                <span className="text-[9px] font-mono text-amber-400/80 block">
                  808 Groove • {drumActiveSteps} hits
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute('drums');
                }}
                title="Mute Drums"
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                  getTrackMuteState('drums')
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                M
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSolo('drums');
                }}
                title="Solo Drums"
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                  getTrackSoloState('drums')
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                S
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Volume2 className="w-3 h-3 text-slate-500 shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(getTrackVolume('drums') * 100)}
              onChange={(e) => onVolumeChange('drums', Number(e.target.value) / 100)}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
            />
            <span className="text-[9px] font-mono text-slate-400 w-6 text-right">
              {Math.round(getTrackVolume('drums') * 100)}%
            </span>
          </div>

          {/* Sub-Drums list with direct test audition triggers */}
          {isDrumsExpanded && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 pl-1">
              {[
                { id: 'kick', name: 'Kick Drum' },
                { id: 'snare', name: 'Snare Snap' },
                { id: 'hihat', name: 'Closed HiHat' },
                { id: 'openHat', name: 'Open HiHat' },
                { id: 'perc', name: 'Percussion' },
              ].map((d) => (
                <div key={d.id} className="flex items-center justify-between text-[11px] py-1 px-1.5 rounded bg-slate-950/60 border border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => auditionDrumSound(d.id as any, e)}
                      className="p-1 rounded bg-slate-800 hover:bg-amber-500 text-slate-400 hover:text-slate-950 transition"
                      title={`Test ${d.name}`}
                    >
                      <Play className="w-2 h-2 fill-current" />
                    </button>
                    <span className="text-slate-300 font-mono text-[10px]">{d.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMute(d.id);
                    }}
                    className={`px-1.5 py-0.5 text-[9px] font-mono rounded font-bold transition ${
                      getTrackMuteState(d.id) ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {getTrackMuteState(d.id) ? 'MUTED' : 'MUTE'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom User Tracks */}
        {composition.customLines && composition.customLines.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
              <span>Custom Audio Lines</span>
              <span className="text-sky-400 font-mono">{composition.customLines.length} active</span>
            </div>
            {composition.customLines.map((line, idx) => (
              <div
                key={line.id}
                onClick={() => onSelectTrack && onSelectTrack(line.id)}
                className={`p-2.5 rounded border transition cursor-pointer ${
                  selectedTrackId === line.id
                    ? 'bg-slate-900 border-sky-500 ring-1 ring-sky-500/50 shadow-md shadow-sky-950/40'
                    : 'bg-slate-900/60 border-slate-800/90 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <button
                      onClick={(e) => auditionTrackSound(line.id, e)}
                      title={`Audition ${line.name}`}
                      className="w-5 h-5 rounded bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-slate-950 flex items-center justify-center transition shrink-0"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                    </button>
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-100 truncate block">
                        {5 + idx}. {line.name}
                      </span>
                      <span className="text-[9px] font-mono text-pink-400/80 block truncate">
                        {line.type === 'voice' ? 'Vocal Sample' : 'Custom Synth'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {line.type === 'voice' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenVocalPicker(line.id);
                        }}
                        title="Pick vocal sample"
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-sky-600 text-sky-400 hover:text-white text-[9px] font-mono transition"
                      >
                        Sample
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMute(line.id);
                      }}
                      className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                        line.isMuted ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      M
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSolo(line.id);
                      }}
                      className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                        line.isSoloed ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      S
                    </button>
                    {onDeleteCustomLine && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomLine(line.id);
                        }}
                        title="Delete Track"
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Volume2 className="w-3 h-3 text-slate-500 shrink-0" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round((line.volume ?? 0.8) * 100)}
                    onChange={(e) => onVolumeChange(line.id, Number(e.target.value) / 100)}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
                  />
                  <span className="text-[9px] font-mono text-slate-400 w-6 text-right">
                    {Math.round((line.volume ?? 0.8) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clean Bottom Quick Action Bar */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-2">
        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
          <span className="text-sky-400 font-bold">{composition.tempo} BPM</span>
          <span>•</span>
          <span className="text-amber-400 font-bold">{composition.key}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddTrack}
            className="py-1 px-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>Track</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

