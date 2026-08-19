import React, { useState } from 'react';
import { MusicComposition, CustomSoundLine } from '../types';
import { NOTE_NAMES, generateEuclideanRhythm, getScaleNotes, noteToFreq, noteToMidi, midiToNote } from '../audio/musicTheory';
import { audioDsp } from '../audio/dspEngine';
import { INSTRUMENT_PRESETS } from '../audio/instrumentLibrary';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Trash2,
  Music,
  Layers,
  Radio,
  ArrowLeft,
  ArrowRight,
  Keyboard,
  Disc3,
  Plus,
  Sliders,
  Play,
  X,
  Wand2,
  Shuffle,
  Volume1,
} from 'lucide-react';
import { PianoKeyboard } from './PianoKeyboard';

interface StepSequencerProps {
  composition: MusicComposition;
  currentStep: number;
  isPlaying: boolean;
  onUpdateComposition: (updated: MusicComposition) => void;
  selectedTrack?: string;
  onSelectTrack?: (track: string) => void;
}

export function StepSequencer({
  composition,
  currentStep,
  isPlaying,
  onUpdateComposition,
  selectedTrack: externalSelectedTrack,
  onSelectTrack: externalOnSelectTrack,
}: StepSequencerProps) {
  const [internalSelectedTrack, setInternalSelectedTrack] = useState<string>('melody');
  const selectedTrack = externalSelectedTrack || internalSelectedTrack;
  const setSelectedTrack = (track: string) => {
    setInternalSelectedTrack(track);
    if (externalOnSelectTrack) externalOnSelectTrack(track);
  };
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [activeChordStamp, setActiveChordStamp] = useState<string>('I');
  const [isAddLineOpen, setIsAddLineOpen] = useState(false);
  const [trackMutes, setTrackMutes] = useState<Record<string, boolean>>({
    melody: false,
    bass: false,
    chords: false,
    drums: false,
  });

  const handleToggleMute = (track: string) => {
    const updated = { ...trackMutes, [track]: !trackMutes[track] };
    setTrackMutes(updated);
    audioDsp.setTrackMutes(updated);
  };

  const scaleNotes = getScaleNotes(composition.key, composition.scale, 3, 2);
  const bassNotes = getScaleNotes(composition.key, composition.scale, 1, 2);

  // Active custom line (if a custom line is selected)
  const activeCustomLine = composition.customLines?.find((l) => l.id === selectedTrack);

  const auditionNote = (note: string) => {
    audioDsp.resumeContext();
    if (selectedTrack === 'chords') {
      const chordFreqs = audioDsp.getChordFrequencies(note, composition.key, composition.scale);
      audioDsp.playChordNotes(chordFreqs, composition.chordSynthPatch, 0.6);
    } else if (activeCustomLine) {
      audioDsp.playSynthesizerNote(noteToFreq(note), activeCustomLine.patch, 0.5);
    } else {
      const patch = selectedTrack === 'bass' ? composition.bassSynthPatch : composition.leadSynthPatch;
      audioDsp.playSynthesizerNote(noteToFreq(note), patch, 0.4);
    }
  };

  const toggleStep = (track: string, index: number, note: string) => {
    if (track === 'melody' || track === 'bass') {
      const key = `${track}Sequence` as 'melodySequence' | 'bassSequence';
      const sequence = [...composition[key]];
      if (sequence[index] === note) {
        sequence[index] = null;
      } else {
        sequence[index] = note;
        auditionNote(note);
      }
      onUpdateComposition({ ...composition, [key]: sequence });
    } else if (activeCustomLine) {
      const updatedLines = (composition.customLines || []).map((line) => {
        if (line.id === track) {
          const seq = [...line.sequence];
          if (seq[index] === note) {
            seq[index] = null;
          } else {
            seq[index] = note;
            auditionNote(note);
          }
          return { ...line, sequence: seq };
        }
        return line;
      });
      onUpdateComposition({ ...composition, customLines: updatedLines });
    }
  };

  const toggleChordStep = (index: number, chordName: string) => {
    const sequence = [...composition.chordSequence];
    if (sequence[index] === chordName) {
      sequence[index] = null;
    } else {
      sequence[index] = chordName;
      auditionNote(chordName);
    }
    onUpdateComposition({ ...composition, chordSequence: sequence });
  };

  // 1-Click Instant Randomizer / Groove Generator for beginners
  const handleRandomizeTrack = (track: string) => {
    if (track === 'chords') {
      const diatonicProgressions = [
        ['i', null, null, null, 'VI', null, null, null, 'III', null, null, null, 'VII', null, null, null],
        ['i', null, null, null, 'iv', null, null, null, 'v', null, null, null, 'VI', null, null, null],
        ['I', null, null, null, 'V', null, null, null, 'vi', null, null, null, 'IV', null, null, null],
        ['i', null, null, null, 'iv', null, null, null, 'i', null, null, null, 'v', null, null, null],
        ['Imaj7', null, null, null, 'vi7', null, null, null, 'ii7', null, null, null, 'V7', null, null, null],
      ];
      const prog = diatonicProgressions[Math.floor(Math.random() * diatonicProgressions.length)];
      const newChordSeq = new Array(composition.stepsCount).fill(null);
      for (let i = 0; i < composition.stepsCount; i++) {
        newChordSeq[i] = prog[i % 16];
      }
      onUpdateComposition({ ...composition, chordSequence: newChordSeq });
      return;
    }

    const notes = track === 'bass' ? bassNotes : scaleNotes;
    const newSeq: (string | null)[] = new Array(composition.stepsCount).fill(null);

    // Create a rhythmic pattern with 50% density
    for (let i = 0; i < composition.stepsCount; i++) {
      if (i % 2 === 0 || Math.random() > 0.6) {
        const randomNote = notes[Math.floor(Math.random() * notes.length)];
        newSeq[i] = randomNote;
      }
    }

    if (track === 'melody' || track === 'bass') {
      onUpdateComposition({ ...composition, [`${track}Sequence`]: newSeq });
    } else if (activeCustomLine) {
      const updatedLines = (composition.customLines || []).map((l) =>
        l.id === track ? { ...l, sequence: newSeq } : l
      );
      onUpdateComposition({ ...composition, customLines: updatedLines });
    }
  };

  // 1-Click Auto Fill Drum Patterns
  const handleAutoFillDrums = (preset: 'club_house' | 'trap_beat' | 'chill_groove') => {
    const steps = composition.stepsCount;
    const newPattern = {
      kick: new Array(steps).fill(false),
      snare: new Array(steps).fill(false),
      hihat: new Array(steps).fill(false),
      openHat: new Array(steps).fill(false),
      perc: new Array(steps).fill(false),
    };

    if (preset === 'club_house') {
      // 4-on-the-floor kick, offbeat hi-hat, clap on 4 & 12
      for (let i = 0; i < steps; i++) {
        if (i % 4 === 0) newPattern.kick[i] = true;
        if (i % 4 === 2) newPattern.openHat[i] = true;
        if (i % 2 === 0) newPattern.hihat[i] = true;
        if (i % 8 === 4) newPattern.snare[i] = true;
      }
    } else if (preset === 'trap_beat') {
      for (let i = 0; i < steps; i++) {
        if (i === 0 || i === 10 || (steps > 16 && (i === 16 || i === 26))) newPattern.kick[i] = true;
        if (i === 4 || i === 12 || (steps > 16 && (i === 20 || i === 28))) newPattern.snare[i] = true;
        if (i % 2 === 0 || i % 3 === 0) newPattern.hihat[i] = true;
      }
    } else {
      for (let i = 0; i < steps; i++) {
        if (i === 0 || i === 6 || (steps > 16 && (i === 16 || i === 22))) newPattern.kick[i] = true;
        if (i === 4 || i === 12 || (steps > 16 && (i === 20 || i === 28))) newPattern.snare[i] = true;
        if (i % 2 === 0) newPattern.hihat[i] = true;
        if (i % 8 === 6) newPattern.perc[i] = true;
      }
    }

    onUpdateComposition({ ...composition, drumPattern: newPattern });
  };

  const [isEuclideanOpen, setIsEuclideanOpen] = useState(false);
  const [euclidPulses, setEuclidPulses] = useState(5);
  const [euclidRotation, setEuclidRotation] = useState(0);

  const applyEuclideanRhythm = (target: string) => {
    const steps = composition.stepsCount;
    const rhythm = generateEuclideanRhythm(euclidPulses, steps, euclidRotation);

    if (target === 'drums') {
      const pattern = { ...composition.drumPattern };
      pattern.hihat = rhythm;
      onUpdateComposition({ ...composition, drumPattern: pattern });
    } else if (target === 'melody' || target === 'bass') {
      const notes = target === 'bass' ? bassNotes : scaleNotes;
      const key = `${target}Sequence` as 'melodySequence' | 'bassSequence';
      const newSeq = rhythm.map((hit, idx) => {
        if (!hit) return null;
        return notes[idx % notes.length];
      });
      onUpdateComposition({ ...composition, [key]: newSeq });
    } else if (activeCustomLine) {
      const updatedLines = (composition.customLines || []).map((l) => {
        if (l.id === target) {
          const newSeq = rhythm.map((hit, idx) => {
            if (!hit) return null;
            return scaleNotes[idx % scaleNotes.length];
          });
          return { ...l, sequence: newSeq };
        }
        return l;
      });
      onUpdateComposition({ ...composition, customLines: updatedLines });
    }
    setIsEuclideanOpen(false);
  };

  const applyArpeggiator = (pattern: 'up' | 'down' | 'updown' | 'random') => {
    const notes = scaleNotes.slice(0, 7);
    const steps = composition.stepsCount;
    const newSeq: (string | null)[] = new Array(steps).fill(null);

    let arpIdx = 0;
    let dir = 1;
    for (let i = 0; i < steps; i++) {
      if (pattern === 'random') {
        newSeq[i] = notes[Math.floor(Math.random() * notes.length)];
      } else if (pattern === 'up') {
        newSeq[i] = notes[arpIdx % notes.length];
        arpIdx++;
      } else if (pattern === 'down') {
        newSeq[i] = notes[notes.length - 1 - (arpIdx % notes.length)];
        arpIdx++;
      } else if (pattern === 'updown') {
        newSeq[i] = notes[arpIdx];
        arpIdx += dir;
        if (arpIdx >= notes.length - 1) dir = -1;
        if (arpIdx <= 0) dir = 1;
      }
    }

    if (selectedTrack === 'melody' || selectedTrack === 'bass') {
      onUpdateComposition({ ...composition, [`${selectedTrack}Sequence`]: newSeq });
    } else if (activeCustomLine) {
      const updatedLines = (composition.customLines || []).map((l) =>
        l.id === selectedTrack ? { ...l, sequence: newSeq } : l
      );
      onUpdateComposition({ ...composition, customLines: updatedLines });
    }
  };

  const applyHumanize = () => {
    const steps = composition.stepsCount;
    const currentVels = composition.melodyVelocities || new Array(steps).fill(100);
    const humanizedVels = currentVels.map((v, i) => {
      const isDownbeat = i % 4 === 0;
      const base = isDownbeat ? 112 : 92;
      const variance = Math.floor(Math.random() * 16) - 8;
      return Math.max(40, Math.min(127, base + variance));
    });

    onUpdateComposition({
      ...composition,
      melodyVelocities: humanizedVels,
      bassVelocities: humanizedVels,
      chordVelocities: humanizedVels.map((v) => Math.max(50, v - 10)),
    });
  };

  const shiftPattern = (direction: 'left' | 'right') => {
    const shiftArray = <T,>(arr: T[]): T[] => {
      if (!arr || arr.length === 0) return arr;
      const res = [...arr];
      if (direction === 'right') {
        const last = res.pop()!;
        res.unshift(last);
      } else {
        const first = res.shift()!;
        res.push(first);
      }
      return res;
    };

    if (selectedTrack === 'melody') {
      onUpdateComposition({ ...composition, melodySequence: shiftArray(composition.melodySequence) });
    } else if (selectedTrack === 'bass') {
      onUpdateComposition({ ...composition, bassSequence: shiftArray(composition.bassSequence) });
    } else if (selectedTrack === 'chords') {
      onUpdateComposition({ ...composition, chordSequence: shiftArray(composition.chordSequence) });
    } else if (selectedTrack === 'drums') {
      onUpdateComposition({
        ...composition,
        drumPattern: {
          kick: shiftArray(composition.drumPattern.kick),
          snare: shiftArray(composition.drumPattern.snare),
          hihat: shiftArray(composition.drumPattern.hihat),
          openHat: shiftArray(composition.drumPattern.openHat),
          perc: shiftArray(composition.drumPattern.perc),
        },
      });
    } else if (activeCustomLine) {
      const updatedLines = (composition.customLines || []).map((l) =>
        l.id === selectedTrack ? { ...l, sequence: shiftArray(l.sequence) } : l
      );
      onUpdateComposition({ ...composition, customLines: updatedLines });
    }
  };

  const clearTrack = (track: string) => {
    if (track === 'drums') {
      onUpdateComposition({
        ...composition,
        drumPattern: {
          kick: new Array(composition.stepsCount).fill(false),
          snare: new Array(composition.stepsCount).fill(false),
          hihat: new Array(composition.stepsCount).fill(false),
          openHat: new Array(composition.stepsCount).fill(false),
          perc: new Array(composition.stepsCount).fill(false),
        },
      });
    } else if (track === 'chords') {
      onUpdateComposition({
        ...composition,
        chordSequence: new Array(composition.stepsCount).fill(null),
      });
    } else if (track === 'melody' || track === 'bass') {
      onUpdateComposition({
        ...composition,
        [`${track}Sequence`]: new Array(composition.stepsCount).fill(null),
      });
    } else if (activeCustomLine) {
      const updatedLines = (composition.customLines || []).map((line) => {
        if (line.id === track) {
          return { ...line, sequence: new Array(composition.stepsCount).fill(null) };
        }
        return line;
      });
      onUpdateComposition({ ...composition, customLines: updatedLines });
    }
  };

  const handleAddNewSoundLine = (presetId: string) => {
    const preset = INSTRUMENT_PRESETS.find((p) => p.id === presetId) || INSTRUMENT_PRESETS[0];
    const newId = `custom_line_${Date.now()}`;
    const colors = ['#38bdf8', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#14b8a6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newLine: CustomSoundLine = {
      id: newId,
      name: preset.name,
      type: 'synth',
      color: randomColor,
      patch: { ...preset.patch },
      sequence: new Array(composition.stepsCount).fill(null),
      volume: 0.8,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      soundPresetId: preset.id,
    };

    const updatedLines = [...(composition.customLines || []), newLine];
    onUpdateComposition({ ...composition, customLines: updatedLines });
    setSelectedTrack(newId);
    setIsAddLineOpen(false);
  };

  const handleDeleteCustomLine = (lineId: string) => {
    const updatedLines = (composition.customLines || []).filter((l) => l.id !== lineId);
    onUpdateComposition({ ...composition, customLines: updatedLines });
    setSelectedTrack('melody');
  };

  const toggleDrumStep = (drumType: 'kick' | 'snare' | 'hihat' | 'openHat' | 'perc', stepIndex: number) => {
    const updatedPattern = {
      ...composition.drumPattern,
      [drumType]: [...composition.drumPattern[drumType]],
    };
    updatedPattern[drumType][stepIndex] = !updatedPattern[drumType][stepIndex];
    if (updatedPattern[drumType][stepIndex]) {
      audioDsp.resumeContext();
      audioDsp.playDrumSound(drumType);
    }
    onUpdateComposition({ ...composition, drumPattern: updatedPattern });
  };

  const diatonicChords = [
    { degree: 'I', label: 'I (Tonic)', name: 'I' },
    { degree: 'ii', label: 'ii (Minor 2nd)', name: 'ii' },
    { degree: 'iii', label: 'iii (Minor 3rd)', name: 'iii' },
    { degree: 'IV', label: 'IV (Subdominant)', name: 'IV' },
    { degree: 'V', label: 'V (Dominant 5th)', name: 'V' },
    { degree: 'vi', label: 'vi (Relative Minor)', name: 'vi' },
    { degree: 'Imaj7', label: 'Imaj7 (Lush Major 7th)', name: 'Imaj7' },
    { degree: 'V7', label: 'V7 (Dominant 7th)', name: 'V7' },
  ];

  const totalBars = Math.ceil(composition.stepsCount / 16);

  return (
    <div id="step-sequencer" className="min-w-0 max-w-full space-y-4">
      {/* Visual Track Selector Ribbon */}
      <div className="bg-slate-900 border border-slate-800 p-3 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main 4 Musical Lines + Dynamic Lines */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'melody', label: '1. Lead Melody', icon: Music, color: 'bg-sky-500 text-slate-950 border-sky-300' },
              { id: 'chords', label: '2. Chords & Pad', icon: Sparkles, color: 'bg-purple-500 text-slate-950 border-purple-300' },
              { id: 'bass', label: '3. Bass & 808', icon: Radio, color: 'bg-emerald-500 text-slate-950 border-emerald-300' },
              { id: 'drums', label: '4. Drums (5 Tracks)', icon: Disc3, color: 'bg-amber-500 text-slate-950 border-amber-300' },
            ].map((t) => {
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrack(t.id)}
                  className={`px-4 py-2 text-xs font-black transition-all flex items-center gap-2 border ${
                    selectedTrack === t.id
                      ? `${t.color} shadow-lg scale-105`
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}

            {/* Custom Added Lines */}
            {composition.customLines?.map((line, idx) => (
              <div key={line.id} className="flex items-center">
                <button
                  onClick={() => setSelectedTrack(line.id)}
                  className={`px-3 py-2 text-xs font-black transition-all flex items-center gap-1.5 border ${
                    selectedTrack === line.id
                      ? 'bg-pink-600 text-white border-pink-400 shadow-lg scale-105'
                      : 'bg-slate-950 text-pink-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <Music className="w-3 h-3 text-pink-400" />
                  <span>{5 + idx}. {line.name}</span>
                </button>
                <button
                  onClick={() => handleDeleteCustomLine(line.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 bg-slate-950 hover:bg-rose-950 border border-slate-800 border-l-0"
                  title="Remove Line"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* + Add Line Button */}
            <button
              onClick={() => setIsAddLineOpen(!isAddLineOpen)}
              className="px-3 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-950/30"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD SOUND LINE</span>
            </button>
          </div>

          {/* Creative Studio Production Tools */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            {/* Keyboard Test Sound Banner Toggle Button */}
            {selectedTrack !== 'drums' && (
              <button
                onClick={() => setShowKeyboard(!showKeyboard)}
                className={`px-2.5 py-1.5 border rounded font-bold flex items-center gap-1.5 transition ${
                  showKeyboard
                    ? 'bg-slate-950 text-sky-400 border-sky-800/80 hover:bg-slate-900'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title={showKeyboard ? 'Hide Test Sound Keyboard' : 'Show Test Sound Keyboard'}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>{showKeyboard ? 'Hide Keys' : 'Test Keys'}</span>
              </button>
            )}

            {/* Euclidean Polyrhythm Tool */}
            <button
              onClick={() => setIsEuclideanOpen(!isEuclideanOpen)}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-sky-950 text-sky-400 border border-slate-800 hover:border-sky-800 rounded font-bold flex items-center gap-1 transition"
              title="Euclidean Polyrhythm Pulse Generator"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Euclidean</span>
            </button>

            {/* Arpeggiator (for melody, bass, synth lines) */}
            {selectedTrack !== 'drums' && selectedTrack !== 'chords' && (
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5">
                <span className="text-[9px] text-slate-400 font-bold px-1.5">ARP:</span>
                <button
                  onClick={() => applyArpeggiator('up')}
                  className="px-1.5 py-0.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-[10px] flex items-center gap-0.5"
                  title="Arpeggiate Up"
                >
                  <ArrowRight className="w-2.5 h-2.5 -rotate-45" /> Up
                </button>
                <button
                  onClick={() => applyArpeggiator('down')}
                  className="px-1.5 py-0.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-[10px] flex items-center gap-0.5"
                  title="Arpeggiate Down"
                >
                  <ArrowRight className="w-2.5 h-2.5 rotate-45" /> Down
                </button>
                <button
                  onClick={() => applyArpeggiator('random')}
                  className="px-1.5 py-0.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-[10px] flex items-center gap-0.5"
                  title="Random Arp"
                >
                  <Shuffle className="w-2.5 h-2.5" /> Rand
                </button>
              </div>
            )}

            {/* Shift Pattern Left / Right */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5">
              <button
                onClick={() => shiftPattern('left')}
                className="px-1.5 py-0.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-[10px]"
                title="Shift Pattern Left 1 Step"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <span className="text-[9px] text-slate-400 px-1 font-bold">Shift</span>
              <button
                onClick={() => shiftPattern('right')}
                className="px-1.5 py-0.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-[10px]"
                title="Shift Pattern Right 1 Step"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Humanize Velocity & Swing */}
            <button
              onClick={applyHumanize}
              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded text-xs font-semibold flex items-center gap-1 transition"
              title="Apply human groove dynamics & velocity variance"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Humanize</span>
            </button>

            {/* Auto Drum Beat Fillers or Randomizer */}
            {selectedTrack === 'drums' ? (
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 border border-slate-800 rounded">
                <button
                  onClick={() => handleAutoFillDrums('club_house')}
                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded"
                >
                  House
                </button>
                <button
                  onClick={() => handleAutoFillDrums('trap_beat')}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded"
                >
                  Trap
                </button>
                <button
                  onClick={() => handleAutoFillDrums('chill_groove')}
                  className="px-2 py-0.5 bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold rounded"
                >
                  Chill
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleRandomizeTrack(selectedTrack)}
                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded flex items-center gap-1 shadow-sm transition"
                title="Generate Random Catchy Pattern"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Randomize</span>
              </button>
            )}

            <button
              onClick={() => clearTrack(selectedTrack)}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-900 rounded transition flex items-center gap-1 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Euclidean Polyrhythm Modal / Inline Tool */}
        {isEuclideanOpen && (
          <div className="bg-slate-950 border border-sky-500/60 rounded p-3 space-y-2 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Euclidean Polyrhythm Generator ({selectedTrack})
              </span>
              <button onClick={() => setIsEuclideanOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">
                  Pulses (Hits): <span className="text-sky-400 font-bold">{euclidPulses}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max={composition.stepsCount}
                  value={euclidPulses}
                  onChange={(e) => setEuclidPulses(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">
                  Rotation Offset: <span className="text-amber-400 font-bold">{euclidRotation}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={composition.stepsCount - 1}
                  value={euclidRotation}
                  onChange={(e) => setEuclidRotation(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => applyEuclideanRhythm(selectedTrack)}
                  className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold transition flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Euclidean Rhythm</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Sound Line Selector Popup */}
        {isAddLineOpen && (
          <div className="bg-slate-950 border-2 border-emerald-500/60 p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                SELECT AN INSTRUMENT TO ADD A NEW TRACK:
              </span>
              <button onClick={() => setIsAddLineOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {INSTRUMENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleAddNewSoundLine(preset.id)}
                  className="p-2.5 bg-slate-900 hover:bg-emerald-950/80 border border-slate-800 hover:border-emerald-400 text-left transition flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-slate-200">{preset.name}</span>
                  <span className="text-[9px] font-mono text-emerald-400 uppercase mt-1">{preset.category}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Helper Piano Keys for Melody & Bass - Collapsible */}
        {selectedTrack !== 'drums' && (
          showKeyboard ? (
            <div className="bg-slate-950 border border-slate-800 p-3 space-y-2 relative transition-all">
              {selectedTrack === 'chords' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-purple-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      CLICK A CHORD TO HEAR OR STAMP IT:
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 hidden sm:inline">
                        Key: {composition.key} {composition.scale}
                      </span>
                      <button
                        onClick={() => setShowKeyboard(false)}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded text-[10px] font-mono flex items-center gap-1"
                        title="Hide Chord Keyboard"
                      >
                        <X className="w-3 h-3 text-rose-400" />
                        <span>Hide</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {diatonicChords.map((chord) => (
                      <button
                        key={chord.degree}
                        onClick={() => {
                          setActiveChordStamp(chord.degree);
                          auditionNote(chord.degree);
                        }}
                        className={`p-2.5 border text-center transition flex flex-col items-center justify-center ${
                          activeChordStamp === chord.degree
                            ? 'bg-purple-600 text-white border-purple-400 shadow-md font-bold scale-105'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                      >
                        <span className="text-sm font-mono font-black">{chord.degree}</span>
                        <span className="text-[10px] text-slate-400 truncate">{chord.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between text-xs font-mono pb-1">
                    <span className="text-sky-400 font-bold">CLICK KEYS TO TEST SOUND:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 hidden sm:inline">Highlighted keys match scale ({composition.key} {composition.scale})</span>
                      <button
                        onClick={() => setShowKeyboard(false)}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded text-[10px] font-mono flex items-center gap-1"
                        title="Hide Keyboard Banner"
                      >
                        <X className="w-3 h-3 text-rose-400" />
                        <span>Hide</span>
                      </button>
                    </div>
                  </div>
                  <PianoKeyboard
                    currentKey={composition.key}
                    currentScale={composition.scale}
                    activePatch={selectedTrack === 'bass' ? composition.bassSynthPatch : composition.leadSynthPatch}
                    trackName={selectedTrack}
                    onRecordStep={(note) => auditionNote(note)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/60 border border-slate-800 text-xs font-mono">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                <span>Test Sound Keyboard is hidden</span>
              </span>
              <button
                onClick={() => setShowKeyboard(true)}
                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-800 rounded text-[10px] font-bold flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                <span>Show Sound Test Keys</span>
              </button>
            </div>
          )
        )}
      </div>

      {/* Visual Step Sequencer Grid with Big Glowing Step Pads */}
      <div className="w-full max-w-full min-w-0 bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-2xl overflow-x-auto">
        {/* Bar & Step Ruler */}
        <div
          className="min-w-[720px] grid gap-1.5 font-mono text-[10px] mb-1"
          style={{
            gridTemplateColumns: `repeat(${composition.stepsCount}, minmax(28px, 1fr))`,
          }}
        >
          {Array.from({ length: totalBars }).map((_, barIdx) => (
            <div
              key={barIdx}
              className="bg-slate-950 border border-slate-800 text-slate-400 font-bold px-2 py-1 text-center tracking-wider"
              style={{ gridColumn: `span ${Math.min(16, composition.stepsCount - barIdx * 16)}` }}
            >
              BAR {barIdx + 1}
            </div>
          ))}
        </div>

        {/* Step Numbers & Playhead Marker */}
        <div
          className="min-w-[720px] grid gap-1.5 font-mono text-[10px] text-center text-slate-400 mb-2"
          style={{
            gridTemplateColumns: `repeat(${composition.stepsCount}, minmax(28px, 1fr))`,
          }}
        >
          {Array.from({ length: composition.stepsCount }).map((_, stepIdx) => {
            const isCurrent = isPlaying && currentStep === stepIdx;
            const isBeatStart = stepIdx % 4 === 0;

            return (
              <div
                key={stepIdx}
                className={`py-1 font-bold transition-all ${
                  isCurrent
                    ? 'bg-sky-500 text-slate-950 shadow-lg scale-110'
                    : isBeatStart
                    ? 'text-white bg-slate-950 border border-slate-800'
                    : 'text-slate-600'
                }`}
              >
                {stepIdx + 1}
              </div>
            );
          })}
        </div>

        {/* ================= DRUM MACHINE GRID ================= */}
        {selectedTrack === 'drums' ? (
          <div className="w-max min-w-[720px] space-y-2">
            {[
              { id: 'kick', name: 'Kick 808', color: 'bg-amber-500 border-amber-300 text-slate-950' },
              { id: 'snare', name: 'Snare / Clap', color: 'bg-rose-500 border-rose-300 text-white' },
              { id: 'hihat', name: 'Closed Hat', color: 'bg-yellow-400 border-yellow-200 text-slate-950' },
              { id: 'openHat', name: 'Open Hat', color: 'bg-cyan-400 border-cyan-200 text-slate-950' },
              { id: 'perc', name: 'Percussion', color: 'bg-emerald-400 border-emerald-200 text-slate-950' },
            ].map((drum) => {
              const drumKey = drum.id as 'kick' | 'snare' | 'hihat' | 'openHat' | 'perc';
              return (
                <div key={drum.id} className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      audioDsp.resumeContext();
                      audioDsp.playDrumSound(drumKey);
                    }}
                    className="w-32 py-2 px-3 bg-slate-950 border border-slate-800 hover:border-slate-600 text-slate-200 font-bold text-xs font-mono flex items-center justify-between shrink-0 transition"
                  >
                    <span>{drum.name}</span>
                    <Volume1 className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <div
                    className="flex-1 grid gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${composition.stepsCount}, minmax(28px, 1fr))`,
                    }}
                  >
                    {Array.from({ length: composition.stepsCount }).map((_, stepIdx) => {
                      const isActive = composition.drumPattern[drumKey][stepIdx];
                      const isCurrent = isPlaying && currentStep === stepIdx;
                      const isBeatStart = stepIdx % 4 === 0;

                      return (
                        <button
                          key={stepIdx}
                          onClick={() => toggleDrumStep(drumKey, stepIdx)}
                          className={`h-9 border transition-all flex items-center justify-center font-bold text-xs font-mono ${
                            isActive
                              ? `${drum.color} shadow-md scale-105`
                              : isBeatStart
                              ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-500'
                              : 'bg-slate-950/60 border-slate-900 hover:bg-slate-800/80 text-transparent'
                          } ${isCurrent ? 'ring-2 ring-white z-10' : ''}`}
                        >
                          {isActive ? '●' : isBeatStart ? `${Math.floor(stepIdx / 4) + 1}` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : selectedTrack === 'chords' ? (
          /* ================= CHORD TRACK GRID ================= */
          <div className="w-max min-w-[720px] space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-32 py-3 px-3 bg-slate-950 border border-slate-800 text-purple-400 font-black text-xs font-mono shrink-0">
                CHORD LINE
              </div>

              <div
                className="flex-1 grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${composition.stepsCount}, minmax(28px, 1fr))`,
                }}
              >
                {Array.from({ length: composition.stepsCount }).map((_, stepIdx) => {
                  const chordVal = composition.chordSequence[stepIdx];
                  const isActive = Boolean(chordVal && chordVal !== 'REST');
                  const isCurrent = isPlaying && currentStep === stepIdx;
                  const isBeatStart = stepIdx % 4 === 0;

                  return (
                    <button
                      key={stepIdx}
                      onClick={() => toggleChordStep(stepIdx, activeChordStamp)}
                      className={`h-11 border transition-all flex flex-col items-center justify-center font-mono font-bold text-xs ${
                        isActive
                          ? 'bg-purple-600 border-purple-300 text-white shadow-lg scale-105'
                          : isBeatStart
                          ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-600'
                          : 'bg-slate-950/60 border-slate-900 hover:bg-slate-800/80 text-transparent'
                      } ${isCurrent ? 'ring-2 ring-white z-10' : ''}`}
                    >
                      {isActive ? (Array.isArray(chordVal) ? chordVal.join(' ') : chordVal) : isBeatStart ? `${Math.floor(stepIdx / 4) + 1}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ================= MELODIC & BASS NOTE GRID ================= */
          <div className="w-max min-w-[720px] space-y-1.5 pr-1">
            {(selectedTrack === 'bass' ? bassNotes : scaleNotes)
              .slice()
              .reverse()
              .map((note) => {
                const isRoot = note.startsWith(composition.key);

                return (
                  <div key={note} className="flex items-center gap-3">
                    <button
                      onClick={() => auditionNote(note)}
                      className={`w-32 py-1.5 px-3 border text-xs font-mono font-bold flex items-center justify-between shrink-0 transition ${
                        isRoot
                          ? 'bg-slate-950 text-sky-400 border-l-4 border-l-sky-400 border-slate-800 hover:bg-slate-900'
                          : 'bg-slate-950 text-slate-300 border-slate-900 hover:bg-slate-800'
                      }`}
                    >
                      <span>{note}</span>
                      {isRoot && <span className="text-[9px] text-sky-400">ROOT</span>}
                    </button>

                    <div
                      className="flex-1 grid gap-1.5"
                      style={{
                        gridTemplateColumns: `repeat(${composition.stepsCount}, minmax(28px, 1fr))`,
                      }}
                    >
                      {Array.from({ length: composition.stepsCount }).map((_, stepIdx) => {
                        let isActive = false;
                        if (selectedTrack === 'melody' || selectedTrack === 'bass') {
                          const trackSeq = composition[`${selectedTrack}Sequence` as 'melodySequence' | 'bassSequence'];
                          isActive = trackSeq[stepIdx] === note;
                        } else if (activeCustomLine) {
                          isActive = activeCustomLine.sequence[stepIdx] === note;
                        }

                        const isCurrent = isPlaying && currentStep === stepIdx;
                        const isBeatStart = stepIdx % 4 === 0;

                        return (
                          <button
                            key={stepIdx}
                            onClick={() => toggleStep(selectedTrack, stepIdx, note)}
                            className={`h-7 border transition-all flex items-center justify-center font-mono font-bold text-[10px] ${
                              isActive
                                ? selectedTrack === 'melody'
                                  ? 'bg-sky-500 border-sky-200 text-slate-950 shadow-md scale-105'
                                  : selectedTrack === 'bass'
                                  ? 'bg-emerald-500 border-emerald-200 text-slate-950 shadow-md scale-105'
                                  : 'bg-pink-500 border-pink-200 text-slate-950 shadow-md scale-105'
                                : isBeatStart
                                ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-600'
                                : 'bg-slate-950/60 border-slate-900 hover:bg-slate-800/80'
                            } ${isCurrent ? 'ring-2 ring-white z-10' : ''}`}
                          >
                            {isActive ? note : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
