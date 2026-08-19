import React from 'react';
import { Sparkles, Play } from 'lucide-react';

interface WelcomeScreenProps {
  onCreate: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onCreate }) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md text-white z-50 p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/25">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">KCEVA</span> STUDIO
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Professional AI & DSP Music Generation Studio • kceva.com
          </p>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed font-mono">
          Create beats, chord progressions, 808 basslines, and multi-track songs with zero learning curve.
        </p>
        <button
          onClick={onCreate}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-sky-500/30 text-sm font-bold flex items-center justify-center gap-2 transition transform active:scale-95"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Launch Studio Now</span>
        </button>
      </div>
    </div>
  );
};
