import { MusicComposition, SynthPatch, FxConfig, WaveType } from '../types';
import { audioDsp } from '../audio/dspEngine';
import { VisualEnvelopeEditor } from './VisualEnvelopeEditor';
import { Sliders, Sparkles, Waves, Radio, Activity, Volume2, Layers } from 'lucide-react';

interface SynthControlsProps {
  composition: MusicComposition;
  onUpdateComposition: (updated: MusicComposition) => void;
}

export function SynthControls({ composition, onUpdateComposition }: SynthControlsProps) {
  const handleLeadPatchChange = (field: keyof SynthPatch, value: any) => {
    const updated = {
      ...composition,
      leadSynthPatch: {
        ...composition.leadSynthPatch,
        [field]: value,
      },
    };
    onUpdateComposition(updated);
  };

  const handleBassPatchChange = (field: keyof SynthPatch, value: any) => {
    const updated = {
      ...composition,
      bassSynthPatch: {
        ...composition.bassSynthPatch,
        [field]: value,
      },
    };
    onUpdateComposition(updated);
  };

  const handleChordPatchChange = (field: keyof SynthPatch, value: any) => {
    const updated = {
      ...composition,
      chordSynthPatch: {
        ...composition.chordSynthPatch,
        [field]: value,
      },
    };
    onUpdateComposition(updated);
  };

  const handleFxChange = (field: keyof FxConfig, value: number) => {
    const updatedFx = {
      ...composition.fxSettings,
      [field]: value,
    };
    const updated = {
      ...composition,
      fxSettings: updatedFx,
    };
    onUpdateComposition(updated);
    audioDsp.updateFx(updatedFx);
  };

  const waveTypes: WaveType[] = ['sawtooth', 'square', 'triangle', 'sine', 'fm'];

  return (
    <div id="synth-controls-rack" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lead Synthesizer Module */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Lead Synthesizer</h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded">
              Voice 1
            </span>
          </div>

          {/* Waveform Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Oscillator Waveform</label>
            <div className="grid grid-cols-5 gap-1">
              {waveTypes.map((wave) => (
                <button
                  key={wave}
                  onClick={() => handleLeadPatchChange('waveType', wave)}
                  className={`py-1 rounded text-[10px] font-mono capitalize transition ${
                    composition.leadSynthPatch.waveType === wave
                      ? 'bg-sky-500 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {wave}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Cutoff & Resonance */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Moog Ladder Cutoff</span>
                <span className="font-mono text-sky-400">{composition.leadSynthPatch.filterCutoff} Hz</span>
              </div>
              <input
                type="range"
                min="100"
                max="12000"
                step="50"
                value={composition.leadSynthPatch.filterCutoff}
                onChange={(e) => handleLeadPatchChange('filterCutoff', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Resonance (Q)</span>
                <span className="font-mono text-sky-400">{composition.leadSynthPatch.resonance.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.2"
                value={composition.leadSynthPatch.resonance}
                onChange={(e) => handleLeadPatchChange('resonance', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>
          </div>

          {/* Visual ADSR Envelope Editor */}
          <VisualEnvelopeEditor
            label="Lead ADSR Contour"
            color="sky"
            attack={composition.leadSynthPatch.attack}
            decay={composition.leadSynthPatch.decay}
            sustain={composition.leadSynthPatch.sustain}
            release={composition.leadSynthPatch.release}
            onChange={(field, val) => handleLeadPatchChange(field, val)}
          />
        </div>

        {/* Bass Synthesizer Module */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Sub / Acid Bass</h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
              Voice 2
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Waveform</label>
            <div className="grid grid-cols-4 gap-1">
              {(['sawtooth', 'square', 'triangle', 'sine'] as WaveType[]).map((wave) => (
                <button
                  key={wave}
                  onClick={() => handleBassPatchChange('waveType', wave)}
                  className={`py-1 rounded text-[10px] font-mono capitalize transition ${
                    composition.bassSynthPatch.waveType === wave
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {wave}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Bass Cutoff</span>
                <span className="font-mono text-emerald-400">{composition.bassSynthPatch.filterCutoff} Hz</span>
              </div>
              <input
                type="range"
                min="50"
                max="3000"
                step="20"
                value={composition.bassSynthPatch.filterCutoff}
                onChange={(e) => handleBassPatchChange('filterCutoff', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Resonance (Acid Grit)</span>
                <span className="font-mono text-emerald-400">{composition.bassSynthPatch.resonance.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="8"
                step="0.2"
                value={composition.bassSynthPatch.resonance}
                onChange={(e) => handleBassPatchChange('resonance', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>

          {/* Visual ADSR Envelope Editor */}
          <VisualEnvelopeEditor
            label="Bass ADSR Contour"
            color="emerald"
            attack={composition.bassSynthPatch.attack}
            decay={composition.bassSynthPatch.decay}
            sustain={composition.bassSynthPatch.sustain}
            release={composition.bassSynthPatch.release}
            onChange={(field, val) => handleBassPatchChange(field, val)}
          />
        </div>

        {/* Poly Chords / Master FX Module */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Master FX & Space</h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
              DSP Chain
            </span>
          </div>

          <div className="space-y-3">
            {/* Reverb */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Stereo Reverb Wet</span>
                <span className="font-mono text-purple-400">{Math.round(composition.fxSettings.reverbWet * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.02"
                value={composition.fxSettings.reverbWet}
                onChange={(e) => handleFxChange('reverbWet', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            {/* Delay */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Ping-Pong Delay Time</span>
                <span className="font-mono text-purple-400">{(composition.fxSettings.delayTime * 1000).toFixed(0)} ms</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.02"
                value={composition.fxSettings.delayTime}
                onChange={(e) => handleFxChange('delayTime', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            {/* Distortion Drive */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Tube Drive Distortion</span>
                <span className="font-mono text-purple-400">{Math.round(composition.fxSettings.drive * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={composition.fxSettings.drive}
                onChange={(e) => handleFxChange('drive', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            {/* Master Low-pass Filter */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Master Lowpass Filter</span>
                <span className="font-mono text-purple-400">{composition.fxSettings.masterLowpass} Hz</span>
              </div>
              <input
                type="range"
                min="500"
                max="20000"
                step="200"
                value={composition.fxSettings.masterLowpass}
                onChange={(e) => handleFxChange('masterLowpass', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>
          </div>

          {/* Poly Chords Envelope */}
          <VisualEnvelopeEditor
            label="Poly Chords ADSR Contour"
            color="purple"
            attack={composition.chordSynthPatch.attack}
            decay={composition.chordSynthPatch.decay}
            sustain={composition.chordSynthPatch.sustain}
            release={composition.chordSynthPatch.release}
            onChange={(field, val) => handleChordPatchChange(field, val)}
          />
        </div>
      </div>
    </div>
  );
}

