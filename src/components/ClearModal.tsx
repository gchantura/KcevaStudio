import { Trash2, X, AlertTriangle, Sparkles, Sliders, Music, Radio } from 'lucide-react';
import { MusicComposition } from '../types';

interface ClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  composition: MusicComposition;
  onClearAll: () => void;
  onClearMelodic: () => void;
  onClearTrack: (track: 'melody' | 'bass' | 'chords' | 'drums') => void;
  onResetPatches: () => void;
}

export function ClearModal({
  isOpen,
  onClose,
  composition,
  onClearAll,
  onClearMelodic,
  onClearTrack,
  onResetPatches,
}: ClearModalProps) {
  if (!isOpen) return null;

  return (
    <div className="studio-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="studio-modal border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="clear-modal-title" className="text-base font-bold">Clear & Reset Options</h2>
              <p className="text-xs text-slate-400">Choose what you want to wipe or reset</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clear Action Cards */}
        <div className="space-y-2.5">
          {/* 1. Clear Everything */}
          <button
            onClick={() => {
              onClearAll();
              onClose();
            }}
            className="w-full text-left p-3.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 hover:border-rose-500/60 transition group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rose-200 group-hover:text-rose-100">
                Clear All 8 Music Lines (Full Wipe)
              </h3>
              <p className="text-xs text-rose-300/70 mt-0.5">
                Clears Melody, Bassline, Chords, and all 5 Drum Patterns back to silence.
              </p>
            </div>
          </button>

          {/* 2. Clear Synths / Melodies Only */}
          <button
            onClick={() => {
              onClearMelodic();
              onClose();
            }}
            className="w-full text-left p-3.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/50 transition group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 group-hover:text-sky-300">
                Clear All Melodic & Harmony Tracks
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Wipes Melody, Bass, and Chords while keeping your drum groove intact.
              </p>
            </div>
          </button>

          {/* 3. Individual Track Wipes */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => {
                onClearTrack('melody');
                onClose();
              }}
              className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-sky-950/60 border border-slate-700/60 hover:border-sky-500/50 text-center transition"
            >
              <div className="text-xs font-bold text-sky-400">Clear Melody</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Track 1 Only</div>
            </button>
            <button
              onClick={() => {
                onClearTrack('chords');
                onClose();
              }}
              className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-purple-950/60 border border-slate-700/60 hover:border-purple-500/50 text-center transition"
            >
              <div className="text-xs font-bold text-purple-400">Clear Chords</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Track 2 Only</div>
            </button>
            <button
              onClick={() => {
                onClearTrack('bass');
                onClose();
              }}
              className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-emerald-950/60 border border-slate-700/60 hover:border-emerald-500/50 text-center transition"
            >
              <div className="text-xs font-bold text-emerald-400">Clear Bass</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Track 3 Only</div>
            </button>
          </div>

          {/* 4. Clear Drums Only */}
          <button
            onClick={() => {
              onClearTrack('drums');
              onClose();
            }}
            className="w-full text-left p-3.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 transition group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 group-hover:text-amber-300">
                Clear 808 Drums Only (5 Lines)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Clears Kick, Snare, Closed Hat, Open Hat, and Percussion while preserving notes.
              </p>
            </div>
          </button>

          {/* 5. Reset Synth & FX Parameters */}
          <button
            onClick={() => {
              onResetPatches();
              onClose();
            }}
            className="w-full text-left p-3.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/50 transition group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 group-hover:text-purple-300">
                Reset Synth Patches & FX Rack
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Resets ADSR envelopes, filter cutoffs, resonance, reverb, and delay to clean factory defaults.
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
