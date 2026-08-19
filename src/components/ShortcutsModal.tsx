import React from 'react';
import { X, Keyboard, Play, Scissors, Move, Music, Sliders, Layers, Volume2 } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const SHORTCUT_GROUPS = [
    {
      title: 'Global Studio & Transport',
      icon: Play,
      color: 'text-emerald-400',
      items: [
        { key: 'Space', desc: 'Play / Pause (Timeline & Sequencer)' },
        { key: 'Enter / Home', desc: 'Return to Start (Bar 1 / Step 0)' },
        { key: 'Tab', desc: 'Toggle Tracks Sidebar' },
        { key: 'M', desc: 'Toggle Master Audio Mute' },
        { key: '1 - 7', desc: 'Quick Switch Modes (1: Timeline, 2: Sequencer, 3: Piano Roll...)' },
        { key: '? or Shift + /', desc: 'Toggle this Shortcuts Cheatsheet' },
      ],
    },
    {
      title: 'Song Timeline Arranger (DAW View)',
      icon: Scissors,
      color: 'text-sky-400',
      items: [
        { key: 'V', desc: 'Select & Move Tool' },
        { key: 'C or R', desc: 'Razor Cut / Split Tool' },
        { key: 'D or Ctrl+D', desc: 'Duplicate Selected Clip to Next Bar' },
        { key: 'Delete / Backspace', desc: 'Delete Selected Clip' },
        { key: 'M', desc: 'Mute / Unmute Selected Clip' },
        { key: '←  /  →', desc: 'Nudge Clip Left / Right (1 Bar)' },
        { key: '↑  /  ↓', desc: 'Transpose Pitch (+1 / -1 Semitone)' },
        { key: '+  /  -', desc: 'Zoom In / Zoom Out Timeline' },
      ],
    },
    {
      title: 'Musical Keyboard Typing',
      icon: Music,
      color: 'text-purple-400',
      items: [
        { key: 'A  S  D  F  G  H  J  K', desc: 'White Keys (C4, D4, E4, F4, G4, A4, B4, C5)' },
        { key: 'W  E  T  Y  U  O  P', desc: 'Black Keys (C#4, D#4, F#4, G#4, A#4, C#5, D#5)' },
        { key: 'Z  /  X', desc: 'Shift Octave Down / Up' },
      ],
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-950 border border-slate-800 rounded-lg max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Studio Keyboard Shortcuts Cheatsheet
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {SHORTCUT_GROUPS.map((group, idx) => {
            const Icon = group.icon;
            return (
              <div key={idx} className="bg-slate-900/60 border border-slate-800/80 rounded p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                  <Icon className={`w-4 h-4 ${group.color}`} />
                  <span className="text-slate-200">{group.title}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {group.items.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className="flex items-center justify-between p-1.5 bg-slate-950/80 border border-slate-800 rounded"
                    >
                      <span className="px-1.5 py-0.5 bg-slate-800 text-sky-300 font-bold rounded text-[11px] border border-slate-700 shadow-xs">
                        {item.key}
                      </span>
                      <span className="text-slate-400 text-[11px] text-right ml-2">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Tip: Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-sky-400 font-bold">?</kbd> anywhere to open/close</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
