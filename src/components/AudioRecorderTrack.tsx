// Interactive Microphone / Line-In Audio Recording Track

import { useState, useEffect, useRef } from 'react';
import { audioRecorderManager, RecordedTake } from '../audio/audioRecorderManager';
import { audioDsp } from '../audio/dspEngine';
import {
  Mic,
  MicOff,
  Disc,
  Square,
  Play,
  Trash2,
  Download,
  Volume2,
  Sliders,
  CheckCircle2,
  Sparkles,
  Layers,
  Radio,
} from 'lucide-react';

interface AudioRecorderTrackProps {
  isPlaying: boolean;
}

export function AudioRecorderTrack({ isPlaying }: AudioRecorderTrackProps) {
  const [hasMicAccess, setHasMicAccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [recordDuration, setRecordDuration] = useState(0);
  const [takes, setTakes] = useState<RecordedTake[]>([]);
  const [activeTakeId, setActiveTakeId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const activeTake = takes.find((t) => t.id === activeTakeId) || takes[0] || null;

  // Poll input level meter when mic is active
  useEffect(() => {
    let animFrame: number;
    const checkLevel = () => {
      if (hasMicAccess) {
        setInputLevel(audioRecorderManager.getInputLevel());
      }
      animFrame = requestAnimationFrame(checkLevel);
    };
    animFrame = requestAnimationFrame(checkLevel);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [hasMicAccess]);

  const handleEnableMic = async () => {
    const success = await audioRecorderManager.requestMicAccess();
    setHasMicAccess(success);
  };

  const handleStartRecord = () => {
    if (!hasMicAccess) return;
    const ok = audioRecorderManager.startRecording();
    if (ok) {
      setIsRecording(true);
      setRecordDuration(0);
      timerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 0.1);
      }, 100);
    }
  };

  const handleStopRecord = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const newTake = await audioRecorderManager.stopRecording();
    setIsRecording(false);
    if (newTake) {
      setTakes(audioRecorderManager.getAllTakes());
      setActiveTakeId(newTake.id);
    }
  };

  const handleAuditionTake = () => {
    audioDsp.resumeContext();
    const ctx = (audioDsp as any).audioCtx;
    if (ctx) {
      audioRecorderManager.playActiveTake(ctx.destination);
    }
  };

  const handleDeleteTake = (id: string) => {
    audioRecorderManager.deleteTake(id);
    setTakes(audioRecorderManager.getAllTakes());
    setActiveTakeId(audioRecorderManager.getActiveTake()?.id || null);
  };

  const handleDownloadTake = (take: RecordedTake) => {
    const url = URL.createObjectURL(take.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${take.name.toLowerCase().replace(/\s+/g, '_')}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdateVolume = (vol: number) => {
    if (!activeTake) return;
    audioRecorderManager.updateTakeConfig(activeTake.id, { volume: vol });
    setTakes(audioRecorderManager.getAllTakes());
  };

  const handleUpdatePan = (pan: number) => {
    if (!activeTake) return;
    audioRecorderManager.updateTakeConfig(activeTake.id, { pan });
    setTakes(audioRecorderManager.getAllTakes());
  };

  return (
    <div id="audio-recorder-track-view" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/30 text-rose-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Live Vocal & Instrument Audio Recorder
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                Line-In / Mic
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Record acoustic guitars, vocals, or hardware synthesizers directly into your project loop.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {!hasMicAccess ? (
            <button
              id="btn-enable-mic"
              onClick={handleEnableMic}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20"
            >
              <Mic className="w-4 h-4" />
              <span>Enable Microphone / Line-In</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {isRecording ? (
                <button
                  id="btn-stop-audio-rec"
                  onClick={handleStopRecord}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Recording ({recordDuration.toFixed(1)}s)</span>
                </button>
              ) : (
                <button
                  id="btn-start-audio-rec"
                  onClick={handleStartRecord}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition"
                >
                  <Disc className="w-4 h-4 text-rose-400" />
                  <span>Record New Take</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live Input Meter & Calibration */}
      {hasMicAccess && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
            <span className="text-xs font-semibold text-slate-200">
              {isRecording ? 'RECORDING LIVE AUDIO STREAM...' : 'Microphone Live & Calibrated'}
            </span>
          </div>

          {/* Real-time Level Meter Bar */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-[10px] font-mono text-slate-500">IN:</span>
            <div className="flex-1 h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 flex">
              <div
                className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
                style={{ width: `${Math.min(100, inputLevel * 120)}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400 w-10 text-right">
              {Math.round(inputLevel * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Recorded Takes List & Waveform Display */}
      {takes.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recorded Audio Takes ({takes.length})
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {takes.map((take) => {
              const isSelected = activeTake?.id === take.id;
              return (
                <div
                  key={take.id}
                  onClick={() => setActiveTakeId(take.id)}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-rose-500/50 shadow-lg ring-1 ring-rose-500/30'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 font-mono text-xs">
                        WAV
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{take.name}</h4>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Duration: {take.durationSec.toFixed(1)}s
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAuditionTake();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold border border-sky-500/40 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Audition</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadTake(take);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="Download Take"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTake(take.id);
                        }}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                        title="Delete Take"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Waveform Visualization Bars */}
                  <div className="h-12 bg-slate-950/80 rounded-lg p-2 flex items-center gap-0.5 border border-slate-800/80 overflow-hidden">
                    {take.waveformPeaks.map((peak, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-gradient-to-t from-rose-500 to-amber-400 rounded-full"
                        style={{ height: `${Math.max(10, peak * 100)}%` }}
                      />
                    ))}
                  </div>

                  {/* Volume & Pan Slider for Active Take */}
                  {isSelected && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold text-slate-400 w-12">Gain:</span>
                        <input
                          type="range"
                          min="0"
                          max="1.5"
                          step="0.05"
                          value={take.volume}
                          onChange={(e) => handleUpdateVolume(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-slate-800 rounded accent-rose-400"
                        />
                        <span className="text-[11px] font-mono text-rose-400 w-10 text-right">
                          {Math.round(take.volume * 100)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold text-slate-400 w-12">Pan:</span>
                        <input
                          type="range"
                          min="-1"
                          max="1"
                          step="0.05"
                          value={take.pan}
                          onChange={(e) => handleUpdatePan(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-slate-800 rounded accent-purple-400"
                        />
                        <span className="text-[11px] font-mono text-purple-400 w-10 text-right">
                          {take.pan === 0 ? 'C' : take.pan < 0 ? `L${Math.round(Math.abs(take.pan) * 100)}` : `R${Math.round(take.pan * 100)}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/60 text-slate-400 mx-auto flex items-center justify-center">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">No Audio Takes Recorded Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Enable your microphone above and click &quot;Record New Take&quot; to capture live acoustic vocals, guitar riffs, or synth inputs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
