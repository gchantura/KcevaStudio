import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Volume2,
  Sliders,
  Radio,
  Music,
  Activity,
  Layers,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MusicComposition, CustomSoundLine } from '../types';
import { audioDsp } from '../audio/dspEngine';

interface DjConsoleDeckProps {
  composition: MusicComposition;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onUpdateComposition: (comp: MusicComposition) => void;
}

export const DjConsoleDeck: React.FC<DjConsoleDeckProps> = ({
  composition,
  isPlaying,
  onTogglePlay,
  onUpdateComposition,
}) => {
  // Deck A State (Active Project)
  const [deckAPlaying, setDeckAPlaying] = useState(isPlaying);
  const [deckABpm, setDeckABpm] = useState(composition.tempo);
  const [deckAPitch, setDeckAPitch] = useState(0); // -16% to +16%
  const [deckAVolume, setDeckAVolume] = useState(0.85);
  const [deckAFilter, setDeckAFilter] = useState(0); // -100 to +100
  const [deckAEq, setDeckAEq] = useState({ high: 0, mid: 0, low: 0 });

  // Deck B State (Remix Stems & Vocals)
  const [deckBPlaying, setDeckBPlaying] = useState(false);
  const [deckBBpm, setDeckBBpm] = useState(composition.tempo);
  const [deckBPitch, setDeckBPitch] = useState(0);
  const [deckBVolume, setDeckBVolume] = useState(0.85);
  const [deckBFilter, setDeckBFilter] = useState(0);
  const [deckBEq, setDeckBEq] = useState({ high: 0, mid: 0, low: 0 });

  // Crossfader State
  const [crossfader, setCrossfader] = useState(0.5); // 0 (Deck A) to 1 (Deck B)

  // Feedback notification when adding FX to song
  const [addedNotification, setAddedNotification] = useState<string | null>(null);

  useEffect(() => {
    setDeckAPlaying(isPlaying);
  }, [isPlaying]);

  // Handle Scratch FX
  const handleScratch = (direction: 'forward' | 'backward') => {
    audioDsp.triggerDjScratch(direction, 1.2);
  };

  // Add DJ Drop / FX to Project as a new Track Line
  const handleAddFxToProject = (fxName: string, fxType: string) => {
    const newId = `fx_${Date.now()}`;
    const seq = new Array(composition.stepsCount).fill(null);
    seq[0] = 'C4';
    if (composition.stepsCount >= 16) seq[8] = 'C4';

    const newLine: CustomSoundLine = {
      id: newId,
      name: `FX - ${fxName}`,
      type: 'synth',
      color: '#38bdf8',
      patch: {
        waveType: fxType === 'sub_drop' ? 'sub_808' : fxType === 'laser' ? 'sawtooth' : 'noise',
        attack: 0.01,
        decay: 0.35,
        sustain: 0.1,
        release: 0.4,
        volume: 0.85,
        filterCutoff: 3200,
        resonance: 2.0,
      },
      sequence: seq,
      volume: 0.85,
      pan: 0,
      isMuted: false,
      isSoloed: false,
    };

    onUpdateComposition({
      ...composition,
      customLines: [...(composition.customLines || []), newLine],
    });

    setAddedNotification(`Added "${fxName}" as new song track!`);
    setTimeout(() => setAddedNotification(null), 3000);
  };

  // Performance FX Pads definitions
  const PERFORMANCE_PADS = [
    { name: 'Sub Drop 808', type: 'sub_drop', note: 'Deep Sub Drop', fn: () => audioDsp.playSynthesizerNote(40, { waveType: 'sub_808', attack: 0.01, decay: 0.8, sustain: 0.0, release: 0.5, volume: 1.0, filterCutoff: 1000, resonance: 1.0 }) },
    { name: 'Tape Stop', type: 'tape_stop', note: 'Vinyl Brake', fn: () => audioDsp.triggerDjScratch('backward', 2.0) },
    { name: 'Laser Zap', type: 'laser', note: 'Electro Pitch Drop', fn: () => audioDsp.playSynthesizerNote(880, { waveType: 'sawtooth', attack: 0.005, decay: 0.2, sustain: 0.0, release: 0.1, volume: 0.8, filterCutoff: 6000, resonance: 2.0, filterEnvAmount: -40 }) },
    { name: 'Noise Riser', type: 'riser', note: 'White Noise Sweep', fn: () => audioDsp.playSynthesizerNote(300, { waveType: 'noise', attack: 0.5, decay: 0.8, sustain: 0.5, release: 0.4, volume: 0.7, filterCutoff: 4000, resonance: 1.5 }) },
    { name: 'Airhorn Stabs', type: 'airhorn', note: 'Club Horn', fn: () => {
      audioDsp.playSynthesizerNote(440, { waveType: 'square', attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.1, volume: 0.9, filterCutoff: 3000, resonance: 1.0 });
      setTimeout(() => audioDsp.playSynthesizerNote(440, { waveType: 'square', attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.1, volume: 0.9, filterCutoff: 3000, resonance: 1.0 }), 120);
    }},
    { name: 'Scratch Burst', type: 'scratch', note: 'Turntable Scratch', fn: () => handleScratch('forward') },
  ];

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Console Top Info Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm bg-sky-400" />
          <h2 className="text-sm font-bold text-slate-100">Live DJ Performance Console</h2>
          <span className="text-xs text-slate-500 font-mono">| Direct Song Integration</span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded">
            <span className="text-slate-500">BPM:</span>
            <span className="text-sky-400 font-bold">{composition.tempo}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded">
            <span className="text-slate-500">KEY:</span>
            <span className="text-amber-400 font-bold">{composition.key} {composition.scale}</span>
          </div>
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1 font-bold rounded flex items-center gap-1.5 text-xs transition ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause Mix' : 'Play Live Mix'}</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {addedNotification && (
        <div className="p-2.5 rounded bg-sky-950 border border-sky-800 text-sky-200 text-xs font-mono flex items-center justify-between animate-in fade-in duration-200">
          <span>{addedNotification}</span>
          <span className="text-[10px] text-sky-400">View in Studio Tracks</span>
        </div>
      )}

      {/* Dual Decks & Central Mixer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* ================= DECK A (Active Song) ================= */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-sky-500 text-slate-950 font-bold text-[10px] rounded-sm">
                DECK A
              </span>
              <span className="text-xs font-bold text-slate-200 truncate max-w-[160px]">
                {composition.title} (Live Song)
              </span>
            </div>
            <span className="text-xs font-mono text-sky-400 font-bold">
              {(deckABpm * (1 + deckAPitch / 100)).toFixed(1)} BPM
            </span>
          </div>

          {/* Waveform View */}
          <div className="h-16 bg-slate-950 border border-slate-800 rounded relative overflow-hidden flex items-center px-2">
            <div className="flex-1 flex items-center justify-around h-full py-2">
              {Array.from({ length: 40 }).map((_, i) => {
                const h = Math.abs(Math.sin(i * 0.35)) * 80 + 15;
                return (
                  <div
                    key={i}
                    className="w-1 bg-sky-500/70 rounded-xs"
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white" />
          </div>

          {/* Quick Scratch Controls */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleScratch('backward')}
              className="dj-scratch-button bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-xs font-mono text-slate-300 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Scratch Rev</span>
            </button>
            <button
              onClick={() => handleScratch('forward')}
              className="dj-scratch-button bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-xs font-mono text-slate-300 transition"
            >
              <span>Scratch Fwd</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pitch & Level */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-950/60 p-2 border border-slate-800 rounded">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Pitch</span>
                <span>{deckAPitch >= 0 ? `+${deckAPitch}%` : `${deckAPitch}%`}</span>
              </div>
              <input
                type="range"
                min="-16"
                max="16"
                step="0.5"
                value={deckAPitch}
                onChange={(e) => setDeckAPitch(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Gain</span>
                <span>{Math.round(deckAVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.2"
                step="0.05"
                value={deckAVolume}
                onChange={(e) => setDeckAVolume(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
              />
            </div>
          </div>
        </div>

        {/* ================= CENTRAL MIXER ================= */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded p-3 flex flex-col justify-between space-y-3">
          <div className="text-center text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800 pb-1">
            Mixer & Crossfader
          </div>

          {/* EQ Knobs / Sliders */}
          <div className="space-y-2 text-[10px] font-mono">
            <div>
              <div className="flex justify-between text-slate-400 mb-0.5">
                <span>HPF / LPF</span>
                <span>{deckAFilter > 0 ? `HPF ${deckAFilter}` : deckAFilter < 0 ? `LPF ${Math.abs(deckAFilter)}` : 'Flat'}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={deckAFilter}
                onChange={(e) => setDeckAFilter(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
              />
            </div>
          </div>

          {/* Crossfader */}
          <div className="pt-2 border-t border-slate-800 space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span className="text-sky-400">Deck A</span>
              <span className="text-slate-500">Crossfade</span>
              <span className="text-purple-400">Deck B</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={crossfader}
              onChange={(e) => setCrossfader(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-200"
            />
          </div>
        </div>

        {/* ================= DECK B (Remix Stems) ================= */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-purple-500 text-slate-950 font-bold text-[10px] rounded-sm">
                DECK B
              </span>
              <span className="text-xs font-bold text-slate-200 truncate max-w-[160px]">
                Remix Stems & Drops
              </span>
            </div>
            <span className="text-xs font-mono text-purple-400 font-bold">
              {(deckBBpm * (1 + deckBPitch / 100)).toFixed(1)} BPM
            </span>
          </div>

          {/* Waveform View */}
          <div className="h-16 bg-slate-950 border border-slate-800 rounded relative overflow-hidden flex items-center px-2">
            <div className="flex-1 flex items-center justify-around h-full py-2">
              {Array.from({ length: 40 }).map((_, i) => {
                const h = Math.abs(Math.cos(i * 0.4)) * 75 + 20;
                return (
                  <div
                    key={i}
                    className="w-1 bg-purple-500/70 rounded-xs"
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white" />
          </div>

          {/* Quick Scratch Controls */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleScratch('backward')}
              className="dj-scratch-button bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-xs font-mono text-slate-300 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Scratch Rev</span>
            </button>
            <button
              onClick={() => handleScratch('forward')}
              className="dj-scratch-button bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-xs font-mono text-slate-300 transition"
            >
              <span>Scratch Fwd</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pitch & Level */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-950/60 p-2 border border-slate-800 rounded">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Pitch</span>
                <span>{deckBPitch >= 0 ? `+${deckBPitch}%` : `${deckBPitch}%`}</span>
              </div>
              <input
                type="range"
                min="-16"
                max="16"
                step="0.5"
                value={deckBPitch}
                onChange={(e) => setDeckBPitch(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-400"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Gain</span>
                <span>{Math.round(deckBVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.2"
                step="0.05"
                value={deckBVolume}
                onChange={(e) => setDeckBVolume(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= LIVE PERFORMANCE SAMPLER & DROP STAMPER ================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Live Club Performance Sampler & Drop Stamper
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Preview or add</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {PERFORMANCE_PADS.map((pad, idx) => (
            <div
              key={idx}
              className="bg-slate-950 border border-slate-800 rounded p-2.5 flex flex-col justify-between gap-2 hover:border-slate-700 transition"
            >
              <div className="min-h-14 grid grid-cols-[2rem_1fr_2rem] items-center gap-2">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    pad.fn();
                  }}
                  aria-label={`Play ${pad.name}`}
                  title={`Play ${pad.name}`}
                  className="studio-icon-button w-full bg-slate-900 hover:bg-sky-700 text-sky-400 hover:text-white rounded transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>
                <div className="min-w-0 flex flex-col items-center gap-1 text-xs font-bold text-slate-200 text-center">
                  <span className="truncate max-w-full">{pad.name}</span>
                  <span className="text-[9px] text-slate-500 font-mono truncate max-w-full">{pad.note}</span>
                </div>
                <button
                  onClick={() => handleAddFxToProject(pad.name, pad.type)}
                  aria-label={`Add ${pad.name} to song`}
                  title={`Add ${pad.name} to song`}
                  className="studio-icon-button w-full bg-slate-900 hover:bg-emerald-700 text-emerald-400 hover:text-white rounded transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
