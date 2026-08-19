import { useState, useRef, useEffect, MouseEvent } from 'react';
import { MusicComposition, PianoRollTool, ChordStampType } from '../types';
import {
  NOTE_NAMES,
  SCALES,
  getAllChromaticNotes,
  getScaleNotes,
  isNoteInScale,
  isBlackKey,
  noteToFreq,
  noteToMidi,
  midiToNote,
  getChordNotesFromRoot,
  humanizeVelocities,
} from '../audio/musicTheory';
import { audioDsp } from '../audio/dspEngine';
import {
  Pencil,
  Paintbrush,
  Eraser,
  Sparkles,
  Wand2,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  Sliders,
  Flame,
  Volume2,
  Layers,
  Music,
  Radio,
  ChevronDown,
  Repeat,
  Shuffle,
  Activity,
  Grid,
} from 'lucide-react';

interface PianoRollProProps {
  composition: MusicComposition;
  currentStep: number;
  isPlaying: boolean;
  onUpdateComposition: (comp: MusicComposition) => void;
  initialTrack?: 'melody' | 'bass' | 'chords';
}

export function PianoRollPro({
  composition,
  currentStep,
  isPlaying,
  onUpdateComposition,
  initialTrack = 'melody',
}: PianoRollProProps) {
  const [selectedTrack, setSelectedTrack] = useState<'melody' | 'bass' | 'chords'>(initialTrack);
  const [activeTool, setActiveTool] = useState<PianoRollTool>('pencil');
  const [selectedChordStamp, setSelectedChordStamp] = useState<ChordStampType>('maj');
  const [isFolded, setIsFolded] = useState(false); // Fold to Scale vs Chromatic
  const [activeOctave, setActiveOctave] = useState<number>(3);
  const [bottomLane, setBottomLane] = useState<'velocity' | 'duration' | 'probability'>('velocity');
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);
  const [isPainting, setIsPainting] = useState(false);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  const sequenceKey = selectedTrack === 'chords' ? 'chordSequence' : `${selectedTrack}Sequence`;
  const velocitiesKey = selectedTrack === 'chords' ? 'chordVelocities' : `${selectedTrack}Velocities`;
  const durationsKey = selectedTrack === 'chords' ? 'chordDurations' : `${selectedTrack}Durations`;
  const probabilitiesKey = selectedTrack === 'chords' ? 'chordProbabilities' : `${selectedTrack}Probabilities`;

  // Initialize track velocities/durations/probabilities if missing
  useEffect(() => {
    let needsUpdate = false;
    const updated = { ...composition };

    if (!updated.melodyVelocities || updated.melodyVelocities.length !== updated.stepsCount) {
      updated.melodyVelocities = new Array(updated.stepsCount).fill(100);
      needsUpdate = true;
    }
    if (!updated.melodyDurations || updated.melodyDurations.length !== updated.stepsCount) {
      updated.melodyDurations = new Array(updated.stepsCount).fill(1);
      needsUpdate = true;
    }
    if (!updated.melodyProbabilities || updated.melodyProbabilities.length !== updated.stepsCount) {
      updated.melodyProbabilities = new Array(updated.stepsCount).fill(100);
      needsUpdate = true;
    }

    if (!updated.bassVelocities || updated.bassVelocities.length !== updated.stepsCount) {
      updated.bassVelocities = new Array(updated.stepsCount).fill(105);
      needsUpdate = true;
    }
    if (!updated.bassDurations || updated.bassDurations.length !== updated.stepsCount) {
      updated.bassDurations = new Array(updated.stepsCount).fill(1);
      needsUpdate = true;
    }

    if (!updated.chordVelocities || updated.chordVelocities.length !== updated.stepsCount) {
      updated.chordVelocities = new Array(updated.stepsCount).fill(90);
      needsUpdate = true;
    }
    if (!updated.chordDurations || updated.chordDurations.length !== updated.stepsCount) {
      updated.chordDurations = new Array(updated.stepsCount).fill(4);
      needsUpdate = true;
    }

    if (needsUpdate) {
      onUpdateComposition(updated);
    }
  }, [composition.stepsCount]);

  // Determine note range to display
  const chromaticNotes = getAllChromaticNotes(
    selectedTrack === 'bass' ? 1 : 2,
    selectedTrack === 'bass' ? 3 : 4
  );

  const scaleNotesOnly = getScaleNotes(
    composition.key,
    composition.scale,
    selectedTrack === 'bass' ? 1 : 2,
    selectedTrack === 'bass' ? 3 : 4
  );

  const displayNotes = (isFolded ? scaleNotesOnly : chromaticNotes).slice().reverse();

  // Audition single note
  const auditionNote = (note: string) => {
    audioDsp.resumeContext();
    if (selectedTrack === 'chords') {
      const chordFreqs = audioDsp.getChordFrequencies(note, composition.key, composition.scale);
      audioDsp.playChordNotes(chordFreqs, composition.chordSynthPatch, 0.6);
    } else {
      const patch = selectedTrack === 'bass' ? composition.bassSynthPatch : composition.leadSynthPatch;
      audioDsp.playSynthesizerNote(noteToFreq(note), patch, 0.4);
    }
  };

  // Toggle step / Note action based on active tool
  const handleStepClick = (stepIndex: number, note: string) => {
    const seqKey = sequenceKey;
    const sequence = [...composition[seqKey]];
    const velsKey = velocitiesKey;
    const vels = [...(composition[velsKey] || new Array(composition.stepsCount).fill(100))];

    if (activeTool === 'eraser') {
      sequence[stepIndex] = null;
    } else if (activeTool === 'chord_stamp' && selectedTrack === 'chords') {
      sequence[stepIndex] = note;
      auditionNote(note);
    } else {
      // Toggle or set
      if (sequence[stepIndex] === note) {
        sequence[stepIndex] = null;
      } else {
        sequence[stepIndex] = note;
        auditionNote(note);
      }
    }

    onUpdateComposition({
      ...composition,
      [seqKey]: sequence,
      [velsKey]: vels,
    });
  };

  const handleStepMouseEnter = (stepIndex: number, note: string, e: MouseEvent) => {
    if (e.buttons === 1 && activeTool === 'brush') {
      const seqKey = sequenceKey;
      const sequence = [...composition[seqKey]];
      sequence[stepIndex] = note;
      auditionNote(note);
      onUpdateComposition({
        ...composition,
        [seqKey]: sequence,
      });
    }
  };

  // Transpose Track
  const handleTranspose = (semitones: number) => {
    const seqKey = sequenceKey;
    const sequence = [...composition[seqKey]];
    const updated = sequence.map((note) => {
      if (!note || note === 'REST') return note;
      const midi = noteToMidi(note) + semitones;
      return midiToNote(Math.max(12, Math.min(108, midi)));
    });
    onUpdateComposition({
      ...composition,
      [seqKey]: updated,
    });
  };

  // Invert Track (Flips pitch upside down around root)
  const handleInvertPitch = () => {
    const seqKey = sequenceKey;
    const sequence = [...composition[seqKey]];
    const rootMidi = noteToMidi(`${composition.key}4`);

    const updated = sequence.map((note) => {
      if (!note || note === 'REST') return note;
      const m = noteToMidi(note);
      const invertedMidi = rootMidi - (m - rootMidi);
      return midiToNote(Math.max(24, Math.min(96, invertedMidi)));
    });

    onUpdateComposition({
      ...composition,
      [seqKey]: updated,
    });
  };

  // Shift Pattern
  const handleShift = (steps: number) => {
    const seqKey = sequenceKey;
    const arr = [...composition[seqKey]];
    if (steps > 0) {
      const popped = arr.pop()!;
      arr.unshift(popped);
    } else {
      const shifted = arr.shift()!;
      arr.push(shifted);
    }
    onUpdateComposition({ ...composition, [seqKey]: arr });
  };

  // Reverse Pattern (Plays backwards)
  const handleReverse = () => {
    const seqKey = sequenceKey;
    const sequence = [...composition[seqKey]].reverse();
    onUpdateComposition({
      ...composition,
      [seqKey]: sequence,
    });
  };

  // Humanize Velocities
  const handleHumanize = () => {
    const velsKey = velocitiesKey;
    const currentVels = composition[velsKey] || new Array(composition.stepsCount).fill(100);
    const humanized = humanizeVelocities(currentVels, 15);
    onUpdateComposition({
      ...composition,
      [velsKey]: humanized,
    });
  };

  // Auto Arpeggiator Fill
  const handleAutoArp = (mode: 'up' | 'down' | 'random' = 'up') => {
    const notes = selectedTrack === 'bass' ? getScaleNotes(composition.key, composition.scale, 1, 2) : getScaleNotes(composition.key, composition.scale, 3, 2);
    const seqKey = sequenceKey;
    const newSeq: (string | null)[] = [];

    for (let i = 0; i < composition.stepsCount; i++) {
      if (mode === 'up') {
        newSeq.push(notes[i % notes.length]);
      } else if (mode === 'down') {
        newSeq.push(notes[(notes.length - 1 - (i % notes.length))]);
      } else {
        newSeq.push(notes[Math.floor(Math.random() * notes.length)]);
      }
    }

    onUpdateComposition({
      ...composition,
      [seqKey]: newSeq,
    });
  };

  // Legato Fill (fill spaces between notes with sustained length)
  const handleLegatoFill = () => {
    const durKey = durationsKey;
    const seqKey = sequenceKey;
    const seq = composition[seqKey];
    const newDurs = new Array(composition.stepsCount).fill(1);

    let lastNoteIndex = -1;
    for (let i = 0; i < composition.stepsCount; i++) {
      if (seq[i]) {
        if (lastNoteIndex !== -1) {
          const gap = i - lastNoteIndex;
          newDurs[lastNoteIndex] = Math.min(8, gap);
        }
        lastNoteIndex = i;
      }
    }
    if (lastNoteIndex !== -1) {
      newDurs[lastNoteIndex] = composition.stepsCount - lastNoteIndex;
    }

    onUpdateComposition({
      ...composition,
      [durKey]: newDurs,
    });
  };

  // Clear active track
  const handleClear = () => {
    const seqKey = sequenceKey;
    onUpdateComposition({
      ...composition,
      [seqKey]: new Array(composition.stepsCount).fill(null),
    });
  };

  // Bottom Lane drag handler for Velocity / Duration / Probability
  const handleLaneChange = (stepIdx: number, valueRatio: number) => {
    if (bottomLane === 'velocity') {
      const velsKey = velocitiesKey;
      const vels = [...(composition[velsKey] || new Array(composition.stepsCount).fill(100))];
      vels[stepIdx] = Math.max(1, Math.min(127, Math.round(valueRatio * 127)));
      onUpdateComposition({ ...composition, [velsKey]: vels });
    } else if (bottomLane === 'duration') {
      const durKey = durationsKey;
      const durs = [...(composition[durKey] || new Array(composition.stepsCount).fill(1))];
      durs[stepIdx] = Math.max(1, Math.min(8, Math.round(valueRatio * 8)));
      onUpdateComposition({ ...composition, [durKey]: durs });
    } else {
      const probKey = probabilitiesKey;
      const probs = [...(composition[probKey] || new Array(composition.stepsCount).fill(100))];
      probs[stepIdx] = Math.max(0, Math.min(100, Math.round(valueRatio * 100)));
      onUpdateComposition({ ...composition, [probKey]: probs });
    }
  };

  const trackThemeColor =
    selectedTrack === 'melody'
      ? {
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          active: 'bg-sky-500 text-white shadow-sky-500/40 border-sky-400',
          lane: 'bg-sky-500',
        }
      : selectedTrack === 'chords'
      ? {
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          active: 'bg-purple-500 text-white shadow-purple-500/40 border-purple-400',
          lane: 'bg-purple-500',
        }
      : {
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          active: 'bg-emerald-500 text-white shadow-emerald-500/40 border-emerald-400',
          lane: 'bg-emerald-500',
        };

  return (
    <div id="pro-piano-roll-container" className="space-y-4">
      {/* Top Track & Pro Editing Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-md space-y-3">
        {/* Row 1: Track Selector + Transport Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
          {/* Track Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              id="roll-tab-melody"
              onClick={() => setSelectedTrack('melody')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedTrack === 'melody'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>1. Lead Melody</span>
            </button>
            <button
              id="roll-tab-chords"
              onClick={() => setSelectedTrack('chords')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedTrack === 'chords'
                  ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2. Chords & Pad</span>
            </button>
            <button
              id="roll-tab-bass"
              onClick={() => setSelectedTrack('bass')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedTrack === 'bass'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>3. Bassline</span>
            </button>
          </div>

          {/* Scale & Key Badge */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Scale Lock:</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-sky-400 font-bold border border-slate-700">
              {composition.key} {composition.scale}
            </span>
            {/* Scale Fold Toggle */}
            <button
              id="btn-scale-fold"
              onClick={() => setIsFolded(!isFolded)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                isFolded
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Fold: Filter piano roll to only notes in current musical scale"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>{isFolded ? 'Folded (Scale Only)' : 'Chromatic (All Keys)'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Pro Tool Palette & Transform Engine */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tool Selector: Pencil, Brush, Eraser, Chord Stamp */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded border border-slate-800">
            <button
              id="tool-pencil"
              onClick={() => setActiveTool('pencil')}
              className={`p-1.5 rounded transition ${
                activeTool === 'pencil' ? 'bg-slate-800 text-sky-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Draw Tool (Click step to place/remove note)"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              id="tool-brush"
              onClick={() => setActiveTool('brush')}
              className={`p-1.5 rounded transition ${
                activeTool === 'brush' ? 'bg-slate-800 text-sky-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Paint Brush (Click & drag to paint notes)"
            >
              <Paintbrush className="w-3.5 h-3.5" />
            </button>
            <button
              id="tool-eraser"
              onClick={() => setActiveTool('eraser')}
              className={`p-1.5 rounded transition ${
                activeTool === 'eraser' ? 'bg-rose-950 text-rose-400 border border-rose-900' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Eraser Tool (Click to delete notes)"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
            {selectedTrack === 'chords' && (
              <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
                <button
                  id="tool-chord-stamp"
                  onClick={() => setActiveTool('chord_stamp')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition ${
                    activeTool === 'chord_stamp'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Chord Stamp Mode"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Chord Stamp:</span>
                </button>
                <select
                  value={selectedChordStamp}
                  onChange={(e) => setSelectedChordStamp(e.target.value as ChordStampType)}
                  className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-purple-300 font-mono outline-none"
                >
                  <option value="maj">Major Triad</option>
                  <option value="min">Minor Triad</option>
                  <option value="maj7">Maj 7th</option>
                  <option value="min7">Min 7th</option>
                  <option value="7th">Dominant 7th</option>
                  <option value="sus4">Sus4</option>
                  <option value="add9">Add9</option>
                  <option value="dim">Diminished</option>
                  <option value="power">Power 5th</option>
                </select>
              </div>
            )}
          </div>

          {/* Transform & Generation Suite */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Transposition */}
            <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5 text-xs font-mono">
              <span className="text-[10px] text-slate-500 px-1.5 uppercase font-bold">Pitch:</span>
              <button
                onClick={() => handleTranspose(-1)}
                className="px-1.5 py-0.5 hover:bg-slate-800 text-slate-300 rounded font-semibold transition"
                title="Transpose Down 1 Semitone"
              >
                -1
              </button>
              <button
                onClick={() => handleTranspose(1)}
                className="px-1.5 py-0.5 hover:bg-slate-800 text-slate-300 rounded font-semibold transition"
                title="Transpose Up 1 Semitone"
              >
                +1
              </button>
              <button
                onClick={() => handleTranspose(12)}
                className="px-1.5 py-0.5 hover:bg-slate-800 text-sky-400 rounded font-bold transition"
                title="Transpose Up 1 Octave (+12 st)"
              >
                +8va
              </button>
              <button
                onClick={() => handleTranspose(-12)}
                className="px-1.5 py-0.5 hover:bg-slate-800 text-sky-400 rounded font-bold transition"
                title="Transpose Down 1 Octave (-12 st)"
              >
                -8vb
              </button>
            </div>

            {/* Quick Shift */}
            <div className="flex items-center bg-slate-950 rounded border border-slate-800 p-0.5 text-xs font-mono">
              <span className="text-[10px] text-slate-500 px-1.5 uppercase font-bold">Shift:</span>
              <button
                onClick={() => handleShift(-1)}
                className="p-1 hover:bg-slate-800 text-slate-300 rounded transition"
                title="Shift Pattern Left 1 Step"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleShift(1)}
                className="p-1 hover:bg-slate-800 text-slate-300 rounded transition"
                title="Shift Pattern Right 1 Step"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Arpeggiator Quick Button */}
            <button
              onClick={() => handleAutoArp('up')}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded text-xs font-medium border border-slate-800 transition"
              title="Generate Arpeggiated Scale Melody"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Arp</span>
            </button>

            {/* Humanize / Jitter */}
            <button
              onClick={handleHumanize}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded text-xs font-medium border border-slate-800 transition"
              title="Humanize: Add analog micro-velocity variance"
            >
              <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Humanize</span>
            </button>

            {/* Clear Track */}
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded text-xs font-medium border border-slate-800 hover:border-rose-900 transition"
              title="Clear all notes in active track"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Piano Roll Visual Canvas */}
      <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          {/* Step Measure Header Bar */}
          <div
            className="grid text-[10px] font-mono text-slate-400 py-1 bg-slate-900 border-b border-slate-800 select-none min-w-175"
            style={{
              gridTemplateColumns: `112px repeat(${composition.stepsCount}, minmax(24px, 1fr))`,
            }}
          >
            <div className="text-center text-slate-500 font-bold border-r border-slate-800">
              Keys / Notes
            </div>
            {Array.from({ length: composition.stepsCount }).map((_, i) => {
              const isBarStart = i % 4 === 0;
              const barNum = Math.floor(i / 16) + 1;
              const beatNum = (Math.floor((i % 16) / 4)) + 1;
              const subBeat = (i % 4) + 1;
              const isCurrent = isPlaying && currentStep === i;

              return (
                <div
                  key={i}
                  className={`text-center py-0.5 border-r border-slate-800/60 transition-colors ${
                    isCurrent
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : isBarStart
                      ? 'text-slate-200 font-bold bg-slate-950/60'
                      : 'text-slate-500'
                  }`}
                >
                  {isBarStart ? `${barNum}.${beatNum}` : `${subBeat}`}
                </div>
              );
            })}
          </div>

          {/* Note Rows Container */}
          <div
            ref={gridContainerRef}
            className="max-h-115 overflow-y-auto min-w-175 divide-y divide-slate-900/60 select-none"
          >
            {displayNotes.map((note) => {
              const isRoot = note.startsWith(composition.key);
              const inScale = isNoteInScale(note, composition.key, composition.scale);
              const isBlack = isBlackKey(note);

              return (
                <div
                  key={note}
                  className={`grid items-center group transition-colors ${
                    isRoot
                      ? 'bg-sky-950/20'
                      : isBlack
                      ? 'bg-slate-950/90'
                      : inScale
                      ? 'bg-slate-900/40'
                      : 'bg-slate-950/40 opacity-70'
                  }`}
                  style={{
                    gridTemplateColumns: `112px repeat(${composition.stepsCount}, minmax(24px, 1fr))`,
                  }}
                >
                  {/* Interactive Piano Key on Left */}
                  <button
                    id={`key-audition-${note}`}
                    onClick={() => auditionNote(note)}
                    onMouseEnter={() => setHoveredNote(note)}
                    onMouseLeave={() => setHoveredNote(null)}
                    className={`h-6 text-xs font-mono px-2 flex items-center justify-between border-r border-slate-800 transition active:scale-95 text-left cursor-pointer ${
                      isBlack
                        ? 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-900 text-slate-100 hover:bg-slate-800'
                    } ${isRoot ? 'border-l-2 border-l-sky-400 font-bold text-sky-300' : ''}`}
                    title={`Audition Note ${note} (${noteToFreq(note).toFixed(1)} Hz)`}
                  >
                    <span className="font-semibold flex items-center gap-1">
                      {note}
                      {isRoot && (
                        <span className="text-[8px] px-1 bg-sky-950 text-sky-400 rounded font-mono">
                          1
                        </span>
                      )}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono group-hover:text-slate-300">
                      {inScale ? '●' : '○'}
                    </span>
                  </button>

                  {/* 16 / 32 / 64 Step Note Grid */}
                  {Array.from({ length: composition.stepsCount }).map((_, stepIdx) => {
                    const trackSeq = composition[sequenceKey];
                    const isActive = trackSeq[stepIdx] === note;
                    const isCurrent = isPlaying && currentStep === stepIdx;
                    const isBeatStart = stepIdx % 4 === 0;

                    return (
                      <div
                        key={stepIdx}
                        id={`piano-cell-${selectedTrack}-${note}-${stepIdx}`}
                        onClick={() => handleStepClick(stepIdx, note)}
                        onMouseEnter={(e) => handleStepMouseEnter(stepIdx, note, e)}
                        className={`h-6 border-r border-slate-800/40 relative cursor-pointer transition-colors flex items-center justify-center ${
                          isActive
                            ? `${trackThemeColor.active} text-white font-bold shadow-sm z-10`
                            : isCurrent
                            ? 'bg-sky-500/20'
                            : isBeatStart
                            ? 'bg-slate-900/50 hover:bg-slate-800'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {isActive && (
                          <span className="text-[8px] font-mono select-none pointer-events-none truncate px-0.5">
                            {note}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Bottom Parameter Automation Lane (Velocity Stalks) */}
          <div className="border-t border-slate-800 bg-slate-950 p-2 space-y-1.5 select-none min-w-175">
            <div className="flex items-center justify-between text-xs font-mono">
              {/* Lane Mode Selector */}
              <div className="flex items-center gap-1 bg-slate-900 rounded p-0.5 border border-slate-800">
                <button
                  onClick={() => setBottomLane('velocity')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                    bottomLane === 'velocity'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Velocity
                </button>
                <button
                  onClick={() => setBottomLane('duration')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                    bottomLane === 'duration'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Duration
                </button>
                <button
                  onClick={() => setBottomLane('probability')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                    bottomLane === 'probability'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Chance %
                </button>
              </div>

              <div className="text-slate-500 text-[10px]">
                Click & drag stalks to shape per-step expression
              </div>
            </div>

            {/* Interactive Stalks Canvas */}
            <div
              className="grid items-end h-14 bg-slate-900/60 rounded p-1 border border-slate-800"
              style={{
                gridTemplateColumns: `112px repeat(${composition.stepsCount}, minmax(24px, 1fr))`,
              }}
            >
              <div className="text-[10px] font-mono text-slate-500 text-center font-bold">
                STALKS
              </div>
              {Array.from({ length: composition.stepsCount }).map((_, stepIdx) => {
                const isCurrent = isPlaying && currentStep === stepIdx;
                  const hasNote = Boolean(composition[sequenceKey][stepIdx]);

                let valueRatio = 0.8;
                let label = '100';

                if (bottomLane === 'velocity') {
                  const vels = composition[velocitiesKey];
                  const vel = vels ? vels[stepIdx] : 100;
                  valueRatio = vel / 127;
                  label = `${vel}`;
                } else if (bottomLane === 'duration') {
                  const durs = composition[durationsKey];
                  const dur = durs ? durs[stepIdx] : 1;
                  valueRatio = dur / 8;
                  label = `${dur}s`;
                } else {
                  const probs = composition[probabilitiesKey];
                  const prob = probs ? probs[stepIdx] : 100;
                  valueRatio = prob / 100;
                  label = `${prob}%`;
                }

                return (
                  <div
                    key={stepIdx}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickY = e.clientY - rect.top;
                      const ratio = Math.max(0.1, Math.min(1.0, 1.0 - clickY / rect.height));
                      handleLaneChange(stepIdx, ratio);
                    }}
                    className={`h-full flex flex-col justify-end items-center px-0.5 cursor-ns-resize group border-r border-slate-800/30 ${
                      isCurrent ? 'bg-sky-500/10' : ''
                    }`}
                  >
                    <div
                      className={`w-full max-w-2.5 rounded-t transition-all ${
                        hasNote
                          ? `${trackThemeColor.lane} shadow-sm group-hover:brightness-125`
                          : 'bg-slate-700/40 group-hover:bg-slate-600'
                      }`}
                      style={{ height: `${Math.max(10, valueRatio * 100)}%` }}
                    />
                    <span className="text-[8px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
