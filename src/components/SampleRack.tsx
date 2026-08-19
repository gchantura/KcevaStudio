// Interactive Sample Rack & Drum Machine Component

import { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react';
import { sampleManager, CustomSample } from '../audio/sampleManager';
import { audioDsp } from '../audio/dspEngine';
import {
  Disc3,
  Upload,
  RotateCcw,
  Volume2,
  Sliders,
  Play,
  Trash2,
  Radio,
  Sparkles,
  Music,
  CheckCircle2,
} from 'lucide-react';

interface SampleRackProps {
  isPlaying: boolean;
}

const PAD_CONFIGS = [
  { key: 'kick', label: 'Kick Drum', defaultType: '808 Sub Kick', color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
  { key: 'snare', label: 'Snare Drum', defaultType: 'Analog Snare', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  { key: 'hihat', label: 'Closed Hi-Hat', defaultType: 'Crisp Metallic Hat', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  { key: 'openHat', label: 'Open Hi-Hat', defaultType: 'Sustained Sizzle', color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
  { key: 'perc', label: 'Perc / Rimshot', defaultType: 'Resonant Rim', color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
  { key: 'clap', label: 'Hand Clap', defaultType: 'Multi-layer Clap', color: 'border-pink-500/40 text-pink-400 bg-pink-500/10' },
  { key: 'crash', label: 'Crash Cymbal', defaultType: 'Stereo Wash', color: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10' },
  { key: 'tom', label: 'Low Tom', defaultType: 'Tonal Floor Tom', color: 'border-teal-500/40 text-teal-400 bg-teal-500/10' },
];

export function SampleRack({ isPlaying }: SampleRackProps) {
  const [pads, setPads] = useState<Record<string, CustomSample>>(sampleManager.getAllPads());
  const [selectedPadKey, setSelectedPadKey] = useState<string>('kick');
  const [activeTrigger, setActiveTrigger] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPad = pads[selectedPadKey] || sampleManager.getPad(selectedPadKey);

  const refreshPads = () => {
    setPads(sampleManager.getAllPads());
  };

  const handleAudition = (padKey: string) => {
    audioDsp.resumeContext();
    setActiveTrigger(padKey);
    setTimeout(() => setActiveTrigger(null), 150);

    // If it's a drum key supported by playDrumSound:
    if (['kick', 'snare', 'hihat', 'openHat', 'perc'].includes(padKey)) {
      audioDsp.playDrumSound(padKey as any, 0, 110);
    } else {
      // Play through sample manager fallback
      const ctx = (audioDsp as any).audioCtx;
      if (ctx) {
        sampleManager.playSample(padKey, ctx.destination, 0, 110);
      }
    }
  };

  const handleFileDrop = async (padKey: string, e: DragEvent) => {
    e.preventDefault();
    setDragOverKey(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const success = await sampleManager.loadUserFile(padKey, file);
      if (success) {
        refreshPads();
        handleAudition(padKey);
      }
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const success = await sampleManager.loadUserFile(selectedPadKey, file);
      if (success) {
        refreshPads();
        handleAudition(selectedPadKey);
      }
    }
  };

  const handleUpdateParam = (key: keyof CustomSample, value: any) => {
    if (!selectedPadKey) return;
    sampleManager.updatePadConfig(selectedPadKey, { [key]: value });
    refreshPads();
  };

  const handleClearPad = (padKey: string) => {
    sampleManager.clearPad(padKey);
    refreshPads();
  };

  return (
    <div id="sample-drum-rack-view" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 text-rose-400">
              <Disc3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Custom Sample Pad & Drum Machine Rack
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Web Audio High-Fi Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Drag and drop your own .WAV, .MP3, or .OGG samples onto pads, or tweak pitch, volume, pan, and reverse playback.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="audio/*"
            className="hidden"
          />
          <button
            id="btn-upload-selected-sample"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-semibold transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Load File into [{selectedPadKey.toUpperCase()}]</span>
          </button>
        </div>
      </div>

      {/* Grid of 8 Drum / Sample Pads */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PAD_CONFIGS.map((padConfig) => {
          const pad = pads[padConfig.key] || sampleManager.getPad(padConfig.key);
          const hasCustomSample = pad?.buffer !== null;
          const isSelected = selectedPadKey === padConfig.key;
          const isTriggered = activeTrigger === padConfig.key;
          const isDragOver = dragOverKey === padConfig.key;

          return (
            <div
              key={padConfig.key}
              id={`sample-pad-${padConfig.key}`}
              onClick={() => {
                setSelectedPadKey(padConfig.key);
                handleAudition(padConfig.key);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverKey(padConfig.key);
              }}
              onDragLeave={() => setDragOverKey(null)}
              onDrop={(e) => handleFileDrop(padConfig.key, e)}
              className={`relative cursor-pointer p-4 rounded-xl border transition-all select-none flex flex-col justify-between h-32 ${
                isSelected
                  ? 'ring-2 ring-sky-400 bg-slate-800/90 shadow-lg'
                  : 'bg-slate-900/80 hover:bg-slate-850'
              } ${
                isTriggered
                  ? 'scale-98 brightness-125 border-sky-400 shadow-sky-500/20 shadow-lg'
                  : ''
              } ${isDragOver ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-500/10' : padConfig.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">{padConfig.label}</span>
                {hasCustomSample ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-2.5 h-2.5" /> WAV
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500">DSP Synth</span>
                )}
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-200 truncate">
                  {pad?.name || padConfig.defaultType}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                  <span>Pitch: {pad?.pitchOffset ? `${pad.pitchOffset > 0 ? '+' : ''}${pad.pitchOffset}st` : '0st'}</span>
                  <span>Vol: {Math.round((pad?.volume || 0.9) * 100)}%</span>
                  {pad?.isReversed && <span className="text-amber-400">REV</span>}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                <span className="flex items-center gap-1 text-slate-400 hover:text-white">
                  <Play className="w-2.5 h-2.5 text-sky-400" /> Audition
                </span>
                <span className="text-[9px] text-slate-500">Drag WAV here</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Pad Deep Editor Panel */}
      {selectedPad && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 font-mono font-bold text-xs">
                {selectedPadKey.toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">{selectedPad.name}</h3>
                <p className="text-xs text-slate-400">
                  {selectedPad.buffer ? 'Custom Loaded Sample File' : 'Real-time Algorithmic DSP Synthesis Model'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-audition-selected-pad"
                onClick={() => handleAudition(selectedPadKey)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 text-white font-bold text-xs hover:bg-sky-400 transition shadow-md shadow-sky-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Audition Pad</span>
              </button>

              {selectedPad.buffer && (
                <button
                  id="btn-clear-selected-pad"
                  onClick={() => handleClearPad(selectedPadKey)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-medium text-xs transition"
                  title="Reset to default synthesis model"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset to Synth</span>
                </button>
              )}
            </div>
          </div>

          {/* Sound Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Pitch Offset */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Pitch Transposition</span>
                <span className="font-mono text-sky-400">
                  {selectedPad.pitchOffset > 0 ? `+${selectedPad.pitchOffset}` : selectedPad.pitchOffset} st
                </span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={selectedPad.pitchOffset || 0}
                onChange={(e) => handleUpdateParam('pitchOffset', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded accent-sky-400 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>-1 Oct</span>
                <span>0</span>
                <span>+1 Oct</span>
              </div>
            </div>

            {/* 2. Output Volume */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Pad Gain</span>
                <span className="font-mono text-emerald-400">{Math.round((selectedPad.volume || 0.9) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={selectedPad.volume !== undefined ? selectedPad.volume : 0.9}
                onChange={(e) => handleUpdateParam('volume', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>Mute</span>
                <span>100%</span>
                <span>Boost 150%</span>
              </div>
            </div>

            {/* 3. Stereo Pan */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Stereo Panning</span>
                <span className="font-mono text-purple-400">
                  {selectedPad.pan === 0
                    ? 'Center'
                    : selectedPad.pan < 0
                    ? `L ${Math.round(Math.abs(selectedPad.pan) * 100)}`
                    : `R ${Math.round(selectedPad.pan * 100)}`}
                </span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={selectedPad.pan || 0}
                onChange={(e) => handleUpdateParam('pan', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>L100</span>
                <span>C</span>
                <span>R100</span>
              </div>
            </div>

            {/* 4. Reverse Playback & Sample Trim */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Reverse & FX</span>
                <button
                  id="btn-toggle-pad-reverse"
                  onClick={() => handleUpdateParam('isReversed', !selectedPad.isReversed)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                    selectedPad.isReversed
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {selectedPad.isReversed ? 'REVERSED ON' : 'NORMAL'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Plays the sample waveform in reverse direction for backward cymbals and swell transitions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
