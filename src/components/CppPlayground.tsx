import { useState } from 'react';
import { CPP_DSP_PRESETS } from '../audio/cppPresets';
import { CppDspPreset } from '../types';
import { audioDsp } from '../audio/dspEngine';
import { Play, Square, Code, Sliders, Download, Cpu, CheckCircle2 } from 'lucide-react';

export function CppPlayground() {
  const [selectedPreset, setSelectedPreset] = useState<CppDspPreset>(CPP_DSP_PRESETS[0]);
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    CPP_DSP_PRESETS[0].params.forEach((p) => {
      initial[p.name] = p.defaultValue;
    });
    return initial;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSelectPreset = (preset: CppDspPreset) => {
    if (isRunning) {
      audioDsp.stopCppDsp();
      setIsRunning(false);
    }
    setSelectedPreset(preset);
    const initial: Record<string, number> = {};
    preset.params.forEach((p) => {
      initial[p.name] = p.defaultValue;
    });
    setParamValues(initial);
  };

  const handleParamChange = (paramName: string, value: number) => {
    const updated = { ...paramValues, [paramName]: value };
    setParamValues(updated);
    if (isRunning) {
      audioDsp.updateCppParams(updated);
    }
  };

  const toggleRun = () => {
    if (isRunning) {
      audioDsp.stopCppDsp();
      setIsRunning(false);
    } else {
      audioDsp.startCppDsp(selectedPreset, paramValues);
      setIsRunning(true);
    }
  };

  const exportCppFile = () => {
    const fullCppSource = `/**
 * @file ${selectedPreset.name.replace(/\s+/g, '_')}.hpp
 * @brief High-Performance C++ Audio DSP Synthesis Module
 * Mathematical Description:
 * ${selectedPreset.formula}
 */

#pragma once
#include <cmath>
#include <algorithm>
#include <cstdint>

${selectedPreset.code}

// Example JUCE / VST / PortAudio audio callback processing loop:
/*
void processAudioBlock(float* outputBuffer, int numSamples, float sampleRate) {
    ${selectedPreset.name.replace(/\s+/g, '')} voice;
    for (int i = 0; i < numSamples; ++i) {
        outputBuffer[i] = voice.processSample(440.0f, sampleRate /*, params */);
    }
}
*/
`;
    const blob = new Blob([fullCppSource], { type: 'text/x-c++src' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPreset.name.replace(/\s+/g, '_')}.hpp`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allPresets = CPP_DSP_PRESETS;

  return (
    <div id="cpp-dsp-playground" className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>C++ Audio DSP Real-Time Engine</span>
              <span className="text-[11px] font-mono uppercase bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/40">
                Native C++ DSP / Bytebeat
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Direct mathematical audio synthesis in C++ with live real-time execution, interactive parameters, and source export.
            </p>
          </div>
        </div>

        {/* Live Run / Stop Button */}
        <div className="flex items-center gap-3">
          <button
            id="btn-cpp-run-toggle"
            onClick={toggleRun}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${
              isRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            {isRunning ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop C++ DSP Audio</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run C++ DSP Live</span>
              </>
            )}
          </button>

          <button
            id="btn-export-cpp-code"
            onClick={exportCppFile}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition"
            title="Download C++ Header (.hpp)"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export C++ (.hpp)</span>
          </button>
        </div>
      </div>

      {/* Preset Selector Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {allPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSelectPreset(preset)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
              selectedPreset.id === preset.id
                ? 'bg-sky-500/20 border-sky-500/60 text-sky-300 shadow-md shadow-sky-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Main Grid: Parameters & Code View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: DSP Controls & Math */}
        <div className="lg:col-span-5 space-y-4">
          {/* Preset Description & Formula */}
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-sky-400">{selectedPreset.category}</span>
              <span className="text-[10px] font-mono text-slate-500">IEEE 754 Float32</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-100">{selectedPreset.name}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{selectedPreset.description}</p>
            {selectedPreset.formula && (
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                {selectedPreset.formula}
              </div>
            )}
          </div>

          {/* Interactive Parameters Sliders */}
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Real-Time C++ Parameters</span>
            </div>

            {selectedPreset.params.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No customizable parameters for this algorithm.</p>
            ) : (
              selectedPreset.params.map((param) => (
                <div key={param.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{param.label}</span>
                    <span className="font-mono text-sky-400">
                      {paramValues[param.name]?.toFixed(param.step < 0.01 ? 3 : param.step < 1 ? 2 : 0)}{' '}
                      {param.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={paramValues[param.name] ?? param.defaultValue}
                    onChange={(e) => handleParamChange(param.name, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                </div>
              ))
            )}
          </div>

        </div>

        {/* Right Column: C++ Source Code Viewer */}
        <div className="lg:col-span-7 bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2 font-mono text-slate-300">
              <Code className="w-4 h-4 text-sky-400" />
              <span>{selectedPreset.name.replace(/\s+/g, '_')}.cpp</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectedPreset.code);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition"
            >
              {copiedCode ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <span>Copy Code</span>
              )}
            </button>
          </div>

          <div className="flex-1 p-4 bg-slate-950 overflow-x-auto">
            <pre className="font-mono text-xs text-slate-300 leading-relaxed">
              <code>{selectedPreset.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
