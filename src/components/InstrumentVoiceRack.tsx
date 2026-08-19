import React, { useState } from 'react';
import {
  Piano,
  Disc,
  Sparkles,
  Radio,
  Layers,
  Bell,
  Zap,
  Activity,
  Flame,
  Gamepad2,
  Sun,
  Volume2,
  Wind,
  Mic,
  Cpu,
  Cloud,
  Music,
  TrendingUp,
  Play,
  Plus,
  Check,
  Search,
  Sliders,
  Volume1,
} from 'lucide-react';
import { MusicComposition, InstrumentSoundPreset, CustomSoundLine } from '../types';
import { INSTRUMENT_PRESETS } from '../audio/instrumentLibrary';
import { audioDsp } from '../audio/dspEngine';
import { noteToFreq } from '../audio/musicTheory';

interface InstrumentVoiceRackProps {
  composition: MusicComposition;
  onUpdateComposition: (comp: MusicComposition) => void;
}

const CATEGORIES = [
  'All Sounds',
  'Pianos & Keys',
  'Synths & Leads',
  'Bass & 808',
  'Vocal & Voices',
  'Pads & Atmos',
  'Brass & Plucks',
  'Club FX',
] as const;

export const InstrumentVoiceRack: React.FC<InstrumentVoiceRackProps> = ({
  composition,
  onUpdateComposition,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Sounds');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<InstrumentSoundPreset>(INSTRUMENT_PRESETS[0]);
  const [auditionNote, setAuditionNote] = useState('C4');
  const [assignedTarget, setAssignedTarget] = useState<string | null>(null);

  // Filter presets
  const filteredPresets = INSTRUMENT_PRESETS.filter((p) => {
    const matchesCat = selectedCategory === 'All Sounds' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  // Audition playback
  const handleAudition = (preset: InstrumentSoundPreset, note = auditionNote) => {
    audioDsp.resumeContext();
    const freq = noteToFreq(note);
    audioDsp.playSynthesizerNote(freq, preset.patch, 1.2, 0, 110);
  };

  // Assign to existing track
  const handleAssignTo = (target: 'lead' | 'bass' | 'chord') => {
    let updated: MusicComposition;
    if (target === 'lead') {
      updated = { ...composition, leadSynthPatch: { ...selectedPreset.patch } };
    } else if (target === 'bass') {
      updated = { ...composition, bassSynthPatch: { ...selectedPreset.patch } };
    } else {
      updated = { ...composition, chordSynthPatch: { ...selectedPreset.patch } };
    }
    onUpdateComposition(updated);
    setAssignedTarget(target);
    setTimeout(() => setAssignedTarget(null), 2000);
  };

  // Create a brand new sound line from this instrument!
  const handleCreateNewSoundLine = () => {
    const newId = `track_${Date.now()}`;
    const colors = ['#38bdf8', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#14b8a6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newLine: CustomSoundLine = {
      id: newId,
      name: selectedPreset.name,
      type: 'synth',
      color: randomColor,
      patch: { ...selectedPreset.patch },
      sequence: new Array(composition.stepsCount).fill(null),
      volume: 0.8,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      soundPresetId: selectedPreset.id,
    };

    const existingLines = composition.customLines || [];
    const updated: MusicComposition = {
      ...composition,
      customLines: [...existingLines, newLine],
    };
    onUpdateComposition(updated);
    setAssignedTarget('new_line');
    setTimeout(() => setAssignedTarget(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Easy Instructions for Beginners */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/30 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-purple-950/50">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              INSTRUMENT & VOICE SOUND LIBRARY
              <span className="text-xs font-mono font-normal text-purple-300 bg-purple-900/50 px-2 py-0.5 border border-purple-500/40">
                40+ HD Instruments
              </span>
            </h2>
            <p className="text-xs text-slate-300 font-mono mt-0.5">
              Click any sound card to audition • Click <span className="text-sky-300 font-bold">"Use for Lead"</span>, <span className="text-emerald-300 font-bold">"Use for Bass"</span>, or <span className="text-purple-300 font-bold">"+ Add New Track"</span>!
            </p>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search piano, 808, vocal, synth..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-purple-500/40 text-xs font-mono text-white placeholder-slate-500 focus:border-purple-400 focus:outline-none shadow-inner"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 text-xs font-mono font-black whitespace-nowrap transition-all border ${
              selectedCategory === cat
                ? 'bg-purple-600 text-white border-purple-300 shadow-lg shadow-purple-950/40 scale-105'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Sound Cards Grid + Selected Sound Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Sound Cards (Left) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[640px] overflow-y-auto pr-1">
          {filteredPresets.map((preset) => {
            const isSelected = selectedPreset.id === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  setSelectedPreset(preset);
                  handleAudition(preset);
                }}
                className={`p-4 border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-purple-950/50 border-purple-400 shadow-xl shadow-purple-950/40 ring-2 ring-purple-400 scale-[1.02]'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-600 hover:bg-slate-850'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">{preset.name}</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-950 border border-slate-800 text-purple-300">
                      {preset.patch.waveType.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                  <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">
                    {preset.category}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAudition(preset);
                    }}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-md transition transform active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>PREVIEW</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Sound Inspector & 1-Click Assignment (Right) */}
        <div className="lg:col-span-5 bg-slate-900 border-2 border-purple-500/40 p-5 space-y-5 flex flex-col justify-between shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider">
                  SELECTED INSTRUMENT
                </span>
                <h3 className="text-xl font-black text-white">{selectedPreset.name}</h3>
                <p className="text-xs text-slate-300 mt-1">{selectedPreset.description}</p>
              </div>

              <button
                onClick={() => handleAudition(selectedPreset)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                PLAY SOUND
              </button>
            </div>

            {/* Test Octave Keyboard */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono font-bold text-slate-300">CLICK KEYS TO TEST PITCH:</span>
              <div className="grid grid-cols-7 gap-1">
                {['C3', 'E3', 'G3', 'C4', 'E4', 'G4', 'C5'].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setAuditionNote(n);
                      handleAudition(selectedPreset, n);
                    }}
                    className={`py-2.5 text-xs font-mono font-bold border transition-all ${
                      auditionNote === n
                        ? 'bg-purple-600 text-white border-purple-300 scale-105 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-purple-500/50 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Sound Architecture Details */}
            <div className="bg-slate-950 p-3.5 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">SYNTHESIS ENGINE DETAILS</span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Waveform:</span>
                  <span className="text-sky-400 font-bold">{selectedPreset.patch.waveType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Filter:</span>
                  <span className="text-amber-400 font-bold">{selectedPreset.patch.filterCutoff || 2500} Hz</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Envelope:</span>
                  <span className="text-emerald-400 font-bold">{selectedPreset.patch.attack}s / {selectedPreset.patch.release}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Voices:</span>
                  <span className="text-purple-400 font-bold">{selectedPreset.patch.unisonVoices || 1} Unison</span>
                </div>
              </div>
            </div>
          </div>

          {/* 1-Click Assignment Buttons */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <span className="text-xs font-mono text-slate-300 font-bold">ASSIGN THIS SOUND TO A TRACK:</span>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleAssignTo('lead')}
                className={`py-2.5 px-2 text-xs font-mono font-bold border transition-all flex items-center justify-center gap-1 ${
                  assignedTarget === 'lead'
                    ? 'bg-sky-500 text-slate-950 border-sky-300 font-black scale-105'
                    : 'bg-slate-950 hover:bg-sky-950 text-sky-400 border-slate-800'
                }`}
              >
                {assignedTarget === 'lead' ? <Check className="w-3.5 h-3.5" /> : null}
                LEAD SYNTH
              </button>

              <button
                onClick={() => handleAssignTo('bass')}
                className={`py-2.5 px-2 text-xs font-mono font-bold border transition-all flex items-center justify-center gap-1 ${
                  assignedTarget === 'bass'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-black scale-105'
                    : 'bg-slate-950 hover:bg-emerald-950 text-emerald-400 border-slate-800'
                }`}
              >
                {assignedTarget === 'bass' ? <Check className="w-3.5 h-3.5" /> : null}
                BASS SYNTH
              </button>

              <button
                onClick={() => handleAssignTo('chord')}
                className={`py-2.5 px-2 text-xs font-mono font-bold border transition-all flex items-center justify-center gap-1 ${
                  assignedTarget === 'chord'
                    ? 'bg-purple-500 text-slate-950 border-purple-300 font-black scale-105'
                    : 'bg-slate-950 hover:bg-purple-950 text-purple-400 border-slate-800'
                }`}
              >
                {assignedTarget === 'chord' ? <Check className="w-3.5 h-3.5" /> : null}
                CHORDS PAD
              </button>
            </div>

            {/* + Add as New Track */}
            <button
              onClick={handleCreateNewSoundLine}
              className={`w-full py-3.5 font-bold font-mono text-xs flex items-center justify-center gap-2 border transition-all ${
                assignedTarget === 'new_line'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-400 shadow-xl shadow-purple-950/50'
              }`}
            >
              <Plus className="w-4 h-4" />
              {assignedTarget === 'new_line' ? 'NEW TRACK CREATED!' : '+ ADD AS NEW SOUND TRACK TO SEQUENCER'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
