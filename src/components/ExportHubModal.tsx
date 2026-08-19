import { useState, useRef } from 'react';
import { MusicComposition } from '../types';
import { audioDsp } from '../audio/dspEngine';
import { renderAllStems, RenderedStem } from '../audio/stemsExport';
import {
  Download,
  FileAudio,
  Music,
  Code,
  FileCode2,
  Check,
  X,
  Disc3,
  Layers,
  Sparkles,
  Loader2,
  CheckCircle2,
  Play,
  Square,
  Volume2,
} from 'lucide-react';

interface ExportHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  composition: MusicComposition;
}

export function ExportHubModal({
  isOpen,
  onClose,
  composition,
}: ExportHubModalProps) {
  const [isExportingWav, setIsExportingWav] = useState(false);
  const [isExportingStems, setIsExportingStems] = useState(false);
  const [stemsProgress, setStemsProgress] = useState<string>('');
  const [renderedStems, setRenderedStems] = useState<RenderedStem[]>([]);
  const [copiedCpp, setCopiedCpp] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => {
      anchor.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleGeneratePreview = async () => {
    setIsExportingWav(true);
    setExportError(null);
    try {
      const blob = await audioDsp.exportToWav(composition);
      const url = URL.createObjectURL(blob);
      setPreviewAudioUrl(url);
      setIsPlayingPreview(true);
    } catch (err) {
      console.error('Preview render error:', err);
      setExportError('Audio preview could not be rendered. Please try again.');
    } finally {
      setIsExportingWav(false);
    }
  };

  const exportWavFile = async () => {
    setIsExportingWav(true);
    setExportError(null);
    try {
      const blob = await audioDsp.exportToWav(composition);
      downloadBlob(blob, `${composition.title.toLowerCase().replace(/\s+/g, '_')}_master.wav`);
    } catch (err) {
      console.error('WAV export error:', err);
      setExportError('WAV export failed. Please try again.');
    } finally {
      setIsExportingWav(false);
    }
  };

  const exportAllStems = async () => {
    setIsExportingStems(true);
    setExportError(null);
    setStemsProgress('Initializing offline stem rendering engine...');
    try {
      const stems = await renderAllStems(composition, (info) => {
        setStemsProgress(`Rendering: ${info.currentTrack} (${info.progressPercent}%)`);
      });
      setRenderedStems(stems);
      setStemsProgress('All 8 stems rendered successfully!');
    } catch (err) {
      console.error('Stem rendering error:', err);
      setStemsProgress('Error rendering stems.');
      setExportError('Stem export failed. Please try again.');
    } finally {
      setIsExportingStems(false);
    }
  };

  const downloadSingleStem = (stem: RenderedStem) => {
    downloadBlob(stem.blob, `${composition.title.toLowerCase().replace(/\s+/g, '_')}_${stem.name}`);
  };

  const downloadAllRenderedStems = () => {
    renderedStems.forEach((stem, i) => {
      setTimeout(() => {
        downloadSingleStem(stem);
      }, i * 200);
    });
  };

  const exportMidiFile = () => {
    const blob = audioDsp.exportToMidi(composition);
    downloadBlob(blob, `${composition.title.toLowerCase().replace(/\s+/g, '_')}.mid`);
  };

  const exportCppHeaderFile = () => {
    const cppCode = composition.cppDspCode || `// MusicStudio_DspEngine.hpp
// Real-Time C++ Audio DSP Synthesizer Class for "${composition.title}"
// Key: ${composition.key} ${composition.scale} | BPM: ${composition.tempo}
#ifndef MUSIC_STUDIO_DSP_ENGINE_HPP
#define MUSIC_STUDIO_DSP_ENGINE_HPP

#include <cmath>
#include <vector>
#include <algorithm>

namespace AudioDsp {

class SynthesizerEngine {
private:
    float sampleRate = 44100.0f;
    float phaseLead = 0.0f;
    float phaseBass = 0.0f;
    float filterState[4] = {0.0f};

public:
    SynthesizerEngine(float sr = 44100.0f) : sampleRate(sr) {}

    inline float processLeadSample(float freqHz, float cutoffHz, float resonance) {
        phaseLead += freqHz / sampleRate;
        if (phaseLead >= 1.0f) phaseLead -= 1.0f;
        float rawSaw = 2.0f * phaseLead - 1.0f;

        // One-pole IIR lowpass
        float alpha = std::min(0.99f, 2.0f * 3.14159265f * cutoffHz / sampleRate);
        filterState[0] += alpha * (rawSaw - filterState[0]);
        return filterState[0];
    }

    inline float processBassSample(float freqHz) {
        phaseBass += freqHz / sampleRate;
        if (phaseBass >= 1.0f) phaseBass -= 1.0f;
        return std::tanh((2.0f * phaseBass - 1.0f) * 1.8f);
    }
};

} // namespace AudioDsp
#endif // MUSIC_STUDIO_DSP_ENGINE_HPP
`;

    const blob = new Blob([cppCode], { type: 'text/x-c++src' });
    downloadBlob(blob, `${composition.title.toLowerCase().replace(/\s+/g, '_')}_DspEngine.hpp`);
  };

  const exportJsonProject = () => {
    const blob = new Blob([JSON.stringify(composition, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${composition.title.toLowerCase().replace(/\s+/g, '_')}_project.json`);
  };

  return (
    <div className="studio-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="studio-modal border rounded p-4 sm:p-5 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800 text-sky-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 id="export-modal-title" className="text-sm font-bold flex items-center gap-1.5">
                <span>Audio & Project Export Center</span>
                <span className="text-[9px] font-mono px-1 py-0.2 bg-sky-950 text-sky-400 border border-sky-800 rounded">
                  KCEVA
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {composition.title} • {composition.tempo} BPM • {composition.key} {composition.scale} • kceva.com
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
              onClose();
            }}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audio Preview Banner if rendered */}
        {previewAudioUrl && (
          <div className="p-3 rounded-xl bg-slate-950 border border-sky-500/50 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Exported Audio Preview Ready</div>
                <div className="text-[10px] font-mono text-slate-400">Listen to exact 16-bit 44.1kHz render</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <audio
                ref={audioPreviewRef}
                src={previewAudioUrl}
                autoPlay
                controls
                className="h-7 w-56 accent-sky-400"
              />
            </div>
          </div>
        )}

        {exportError && (
          <div role="alert" className="rounded border border-rose-500/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
            {exportError}
          </div>
        )}

        {/* Export Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 1. WAV Master Audio Export */}
          <div className="p-3 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sky-400">
                <FileAudio className="w-4 h-4" />
                <h3 className="text-xs font-bold text-slate-100">Master Mix (.wav)</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                16-bit 44.1kHz uncompressed stereo PCM master recording with offline DSP render & full FX tail.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={handleGeneratePreview}
                  disabled={isExportingWav}
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-sky-300 rounded text-xs font-semibold border border-slate-700 transition"
                  title="Render and listen before saving"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={exportWavFile}
                  disabled={isExportingWav}
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white rounded text-xs font-semibold transition"
                >
                  <Download className="w-3 h-3" />
                  <span>{isExportingWav ? 'Rendering...' : 'Download'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Multi-Track Audio Stems */}
          <div className="p-3 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-400">
                <Layers className="w-4 h-4" />
                <h3 className="text-xs font-bold text-slate-100">Multi-Track WAV Stems</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Render all 8 individual track stems (Lead, Chords, Bass, Kick, Snare, Hihat, etc.) for Ableton & FL Studio.
              </p>
            </div>
            <button
              onClick={exportAllStems}
              disabled={isExportingStems}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded text-xs font-semibold transition"
            >
              {isExportingStems ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isExportingStems ? 'Rendering 8 Stems...' : 'Render 8 WAV Stems'}</span>
            </button>
          </div>

          {/* 3. MIDI Multi-track Export */}
          <div className="p-3 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-purple-400">
                <Music className="w-4 h-4" />
                <h3 className="text-xs font-bold text-slate-100">Standard MIDI (.mid)</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Standard SMF Type 1 multi-track MIDI file with Melody, Bassline, Chords, and 808 Percussion on Ch 10.
              </p>
            </div>
            <button
              onClick={exportMidiFile}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download MIDI (.mid)</span>
            </button>
          </div>

          {/* 4. C++ DSP Source Header */}
          <div className="p-3 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400">
                <FileCode2 className="w-4 h-4" />
                <h3 className="text-xs font-bold text-slate-100">C++ DSP Source (.hpp)</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Zero-dependency C++ header file implementing the real-time DSP synthesizer class ready for JUCE / VST3 / g++.
              </p>
            </div>
            <button
              onClick={exportCppHeaderFile}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Download C++ (.hpp)</span>
            </button>
          </div>

          {/* 5. DAW Project JSON */}
          <div className="p-3 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2.5 flex flex-col justify-between sm:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-amber-400">
                  <Disc3 className="w-4 h-4" />
                  <h3 className="text-xs font-bold text-slate-100">DAW Project Backup (.json)</h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Full project state including patterns, synth ADSR, mixer channels, and arrangement structure.
                </p>
              </div>
              <button
                onClick={exportJsonProject}
                className="flex items-center justify-center gap-1.5 py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold transition whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Project JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stem Rendering Progress & Downloads List */}
        {(isExportingStems || renderedStems.length > 0) && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                {isExportingStems ? <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {stemsProgress}
              </span>
              {renderedStems.length > 0 && (
                <button
                  onClick={downloadAllRenderedStems}
                  className="px-3 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-semibold transition"
                >
                  Download All Stems ({renderedStems.length})
                </button>
              )}
            </div>

            {renderedStems.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                {renderedStems.map((stem, i) => (
                  <button
                    key={i}
                    onClick={() => downloadSingleStem(stem)}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 font-mono transition text-left"
                  >
                    <span className="truncate pr-2">{stem.name}</span>
                    <Download className="w-3 h-3 text-sky-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

