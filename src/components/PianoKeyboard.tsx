import { useEffect, useState } from 'react';
import { SynthPatch } from '../types';
import { NOTE_NAMES, noteToFreq, noteToMidi, midiToNote, getScaleNotes } from '../audio/musicTheory';
import { audioDsp } from '../audio/dspEngine';
import { Play, Volume2, ArrowLeft, ArrowRight, Music, Zap } from 'lucide-react';

interface PianoKeyboardProps {
  currentKey: string;
  currentScale: string;
  activePatch: SynthPatch;
  trackName: string;
  onRecordStep?: (note: string) => void;
}

export function isRootNote(note: string, rootKey: string): boolean {
  if (!note || !rootKey) return false;
  const notePitchClass = note.replace(/\d+$/, '');
  return notePitchClass === rootKey;
}

export function getBlackKeyLeft(note: string, startOctave = 4): number {
  const match = note.match(/([A-G]#?)(\d+)$/);
  if (!match) return 24;

  const naturalName = match[1].replace('#', '');
  const octave = Number(match[2]);
  const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const whiteIndex = whiteKeys.indexOf(naturalName);

  if (whiteIndex === -1) return 24;

  const relativeWhitePosition = ((octave - startOctave) * 7) + whiteIndex;
  return relativeWhitePosition * 40 + 24;
}

// QWERTY Key mapping for 2 octaves
const KEY_MAP: Record<string, number> = {
  // Octave 1: a w s e d f t g y h u j
  a: 0,  // C
  w: 1,  // C#
  s: 2,  // D
  e: 3,  // D#
  d: 4,  // E
  f: 5,  // F
  t: 6,  // F#
  g: 7,  // G
  y: 8,  // G#
  h: 9,  // A
  u: 10, // A#
  j: 11, // B
  k: 12, // C+1
  o: 13, // C#+1
  l: 14, // D+1
  p: 15, // D#+1
  ';': 16, // E+1
};

export function PianoKeyboard({
  currentKey,
  currentScale,
  activePatch,
  trackName,
  onRecordStep,
}: PianoKeyboardProps) {
  const [octaveOffset, setOctaveOffset] = useState(4); // C4 default
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

  const scaleNotesInCurrentRange = getScaleNotes(currentKey, currentScale, octaveOffset, 2);

  const playNote = (noteStr: string) => {
    audioDsp.resumeContext();
    const freq = noteToFreq(noteStr);
    audioDsp.playSynthesizerNote(freq, activePatch, 0.4);

    setActiveNotes((prev) => new Set(prev).add(noteStr));
    setTimeout(() => {
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(noteStr);
        return next;
      });
    }, 250);

    if (onRecordStep) {
      onRecordStep(noteStr);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();
      if (KEY_MAP[key] !== undefined) {
        const semitone = KEY_MAP[key];
        const baseMidi = (octaveOffset + 1) * 12;
        const targetMidi = baseMidi + semitone;
        const noteStr = midiToNote(targetMidi);
        playNote(noteStr);
      } else if (key === 'z') {
        setOctaveOffset((o) => Math.max(1, o - 1));
      } else if (key === 'x') {
        setOctaveOffset((o) => Math.min(7, o + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [octaveOffset, activePatch]);

  // Generate 17 keys (from C to E of next octave)
  const baseMidi = (octaveOffset + 1) * 12;
  const keys = Array.from({ length: 17 }, (_, i) => {
    const midi = baseMidi + i;
    const noteStr = midiToNote(midi);
    const isBlack = noteStr.includes('#');
    const inScale = scaleNotesInCurrentRange.includes(noteStr);
    const isRoot = isRootNote(noteStr, currentKey);

    return {
      midi,
      noteStr,
      isBlack,
      inScale,
      isRoot,
      index: i,
    };
  });

  return (
    <div id="interactive-piano-keyboard" className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <span>Live Synthesizer Keyboard</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono">
                {trackName} Voice
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">
              A W S E D F T G Y H U J K • Z/X octave
            </p>
          </div>
        </div>

        {/* Octave Controls */}
        <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setOctaveOffset((o) => Math.max(1, o - 1))}
            className="p-1 text-slate-400 hover:text-white transition"
            title="Octave Down (Z)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-sky-400 font-bold px-1.5">Octave C{octaveOffset}</span>
          <button
            onClick={() => setOctaveOffset((o) => Math.min(7, o + 1))}
            className="p-1 text-slate-400 hover:text-white transition"
            title="Octave Up (X)"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Piano Keys Visualizer */}
      <div className="relative flex justify-start items-stretch h-36 select-none pt-1 overflow-x-auto overflow-y-hidden scrollbar-thin">
        <div className="flex relative min-w-170 mx-auto">
          {keys.map((k) => {
            const isPlayingThis = activeNotes.has(k.noteStr);

            if (k.isBlack) {
              // Black key sits absolutely on top
              return (
                <button
                  key={k.noteStr}
                  id={`key-${k.noteStr}`}
                  onClick={() => playNote(k.noteStr)}
                  style={{
                    left: `${getBlackKeyLeft(k.noteStr, octaveOffset)}px`,
                  }}
                  className={`piano-black-key absolute top-0 rounded-b-md z-20 transition-all font-mono text-[9px] flex flex-col justify-end items-center pb-1 shadow-md ${
                    isPlayingThis
                      ? 'bg-sky-400 text-slate-950 scale-95 shadow-sky-400/50'
                      : k.inScale
                      ? 'bg-slate-900 hover:bg-slate-800 text-sky-400 border border-sky-500/40'
                      : 'bg-slate-950 text-slate-600 border border-slate-800 hover:bg-slate-800'
                  }`}
                  title={`${k.noteStr} ${k.inScale ? '(In Scale)' : ''}`}
                >
                  {k.isRoot && <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mb-0.5" />}
                  <span>{k.noteStr}</span>
                </button>
              );
            }

            // White key
            return (
              <button
                key={k.noteStr}
                id={`key-${k.noteStr}`}
                onClick={() => playNote(k.noteStr)}
                className={`piano-white-key rounded-b-lg border z-10 transition-all font-mono text-[10px] flex flex-col justify-end items-center pb-2 shadow-sm ${
                  isPlayingThis
                    ? 'bg-sky-300 text-slate-950 scale-95 shadow-sky-400/50 border-sky-400'
                    : k.inScale
                    ? 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-sky-500/60'
                    : 'bg-slate-900/60 text-slate-500 border-slate-800/80 hover:bg-slate-800'
                }`}
                title={`${k.noteStr} ${k.inScale ? '(In Scale)' : ''}`}
              >
                {k.isRoot && <div className="w-2 h-2 rounded-full bg-sky-400 mb-1" />}
                <span className={k.inScale ? 'font-bold text-sky-300' : 'text-slate-500'}>{k.noteStr}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
