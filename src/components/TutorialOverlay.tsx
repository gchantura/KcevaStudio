import React from 'react';
import { Sparkles, Check, Music, Sliders, Mic, Play } from 'lucide-react';

export const TutorialOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl max-w-md w-full text-center text-slate-100 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black">Welcome to KCEVA STUDIO</h2>
        <p className="text-xs text-slate-400">
          Here is how to get started making music in seconds:
        </p>
        <div className="space-y-2 text-left text-xs text-slate-300 font-mono bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Music className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Click any step pad to place notes & beats.</span>
          </div>
          <div className="flex items-center gap-2">
            <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Press Spacebar or click Play to listen in real-time.</span>
          </div>
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Adjust tempo, root key, and track mixer levels.</span>
          </div>
          <div className="flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Add vocal clips, custom synth lines, or stem exports.</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-sky-600/20"
        >
          <Check className="w-4 h-4" />
          <span>Got it, Let's Make Music!</span>
        </button>
      </div>
    </div>
  );
};
