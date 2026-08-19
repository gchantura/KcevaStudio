// Professional 4-Band Parametric Studio Equalizer with Live SVG Frequency Response Curve

import { useState } from 'react';
import { X, Sliders, Activity, Sparkles, RefreshCw, Volume2 } from 'lucide-react';

export interface EqBand {
  id: string;
  name: string;
  type: 'lowshelf' | 'peaking' | 'highshelf';
  freq: number;  // 20 - 20000 Hz
  gain: number;  // -18 to +18 dB
  q: number;     // 0.3 - 5.0
  color: string;
}

interface ParametricEqModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onApplyEq?: (bands: EqBand[]) => void;
}

const DEFAULT_EQ_BANDS: EqBand[] = [
  { id: 'band1', name: 'Low Shelf (Sub/Bass)', type: 'lowshelf', freq: 100, gain: 2.0, q: 0.7, color: '#38bdf8' },
  { id: 'band2', name: 'Low-Mid Bell (Warmth)', type: 'peaking', freq: 450, gain: -1.5, q: 1.2, color: '#34d399' },
  { id: 'band3', name: 'High-Mid Bell (Presence)', type: 'peaking', freq: 2800, gain: 3.0, q: 1.5, color: '#c084fc' },
  { id: 'band4', name: 'High Shelf (Air/Sparkle)', type: 'highshelf', freq: 10000, gain: 2.5, q: 0.7, color: '#fbbf24' },
];

export function ParametricEqModal({
  isOpen,
  onClose,
  title = 'Master 4-Band Parametric Studio EQ',
  onApplyEq,
}: ParametricEqModalProps) {
  const [bands, setBands] = useState<EqBand[]>(DEFAULT_EQ_BANDS);
  const [selectedBandId, setSelectedBandId] = useState<string>('band1');

  if (!isOpen) return null;

  const selectedBand = bands.find((b) => b.id === selectedBandId) || bands[0];

  const updateBand = (id: string, updates: Partial<EqBand>) => {
    const updated = bands.map((b) => (b.id === id ? { ...b, ...updates } : b));
    setBands(updated);
    if (onApplyEq) {
      onApplyEq(updated);
    }
  };

  const resetEq = () => {
    setBands(DEFAULT_EQ_BANDS);
    if (onApplyEq) {
      onApplyEq(DEFAULT_EQ_BANDS);
    }
  };

  // SVG Frequency Response Graph Dimensions (width: 600, height: 180)
  const svgW = 600;
  const svgH = 180;
  const minFreq = 20;
  const maxFreq = 20000;
  const minGain = -18;
  const maxGain = 18;

  // Logarithmic frequency to X coordinate
  const freqToX = (freq: number) => {
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logF = Math.log10(Math.max(minFreq, Math.min(maxFreq, freq)));
    return ((logF - logMin) / (logMax - logMin)) * svgW;
  };

  // Gain dB to Y coordinate
  const gainToY = (gain: number) => {
    const normalized = (gain - minGain) / (maxGain - minGain);
    return svgH - normalized * svgH;
  };

  // Generate Frequency Curve Path Points
  const numPoints = 80;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logF = logMin + (i / numPoints) * (logMax - logMin);
    const f = Math.pow(10, logF);

    // Sum dB responses of all 4 bands
    let totalDb = 0;
    bands.forEach((b) => {
      const fRatio = f / b.freq;
      if (b.type === 'peaking') {
        const dist = Math.log2(fRatio);
        const bandwidth = 1.0 / b.q;
        const response = Math.exp(-0.5 * Math.pow(dist / (bandwidth * 0.5), 2));
        totalDb += b.gain * response;
      } else if (b.type === 'lowshelf') {
        if (f < b.freq) {
          totalDb += b.gain;
        } else if (f < b.freq * 2) {
          totalDb += b.gain * (1 - (f - b.freq) / b.freq);
        }
      } else if (b.type === 'highshelf') {
        if (f > b.freq) {
          totalDb += b.gain;
        } else if (f > b.freq * 0.5) {
          totalDb += b.gain * ((f - b.freq * 0.5) / (b.freq * 0.5));
        }
      }
    });

    const x = freqToX(f);
    const y = gainToY(Math.max(minGain, Math.min(maxGain, totalDb)));
    points.push({ x, y });
  }

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const fillD = `${pathD} L ${svgW} ${svgH / 2} L 0 ${svgH / 2} Z`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">{title}</h2>
              <p className="text-xs text-slate-400">
                Parametric 4-band equalizer with real-time transfer function visualization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetEq}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live SVG Graph */}
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 relative">
          <div className="h-44 w-full relative">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full overflow-visible">
              {/* Frequency grid lines (100Hz, 1kHz, 10kHz) */}
              <line x1={freqToX(100)} y1={0} x2={freqToX(100)} y2={svgH} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={freqToX(1000)} y1={0} x2={freqToX(1000)} y2={svgH} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={freqToX(10000)} y1={0} x2={freqToX(10000)} y2={svgH} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

              {/* dB 0dB reference center line */}
              <line x1={0} y1={svgH / 2} x2={svgW} y2={svgH / 2} stroke="#475569" strokeWidth="1.5" />

              {/* Shaded transfer curve fill */}
              <path d={fillD} fill="rgba(192, 132, 252, 0.12)" />

              {/* Smooth curve line */}
              <path d={pathD} fill="none" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Draggable/Clickable Band Handles */}
              {bands.map((b) => {
                const cx = freqToX(b.freq);
                const cy = gainToY(b.gain);
                const isSelected = selectedBandId === b.id;

                return (
                  <g key={b.id} onClick={() => setSelectedBandId(b.id)} className="cursor-pointer">
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 9 : 6}
                      fill={b.color}
                      stroke="#0f172a"
                      strokeWidth={isSelected ? 3 : 2}
                      className="transition-all"
                    />
                    <text
                      x={cx}
                      y={cy - 12}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {b.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Grid Frequency Labels */}
          <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800">
            <span>20 Hz</span>
            <span>100 Hz</span>
            <span>1 kHz</span>
            <span>10 kHz</span>
            <span>20 kHz</span>
          </div>
        </div>

        {/* Selected Band Controls */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedBand.color }} />
              <h3 className="text-xs font-bold text-slate-100">{selectedBand.name}</h3>
            </div>
            <div className="flex gap-1">
              {bands.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBandId(b.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition ${
                    selectedBandId === b.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {b.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* 3 Parameter Sliders: Frequency, Gain, Q */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Frequency Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Frequency (Hz)</span>
                <span className="font-mono text-purple-400 font-bold">{Math.round(selectedBand.freq)} Hz</span>
              </div>
              <input
                type="range"
                min="20"
                max="20000"
                step="10"
                value={selectedBand.freq}
                onChange={(e) => updateBand(selectedBand.id, { freq: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg accent-purple-400 cursor-pointer"
              />
            </div>

            {/* Gain Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Gain (dB)</span>
                <span className="font-mono text-purple-400 font-bold">
                  {selectedBand.gain > 0 ? `+${selectedBand.gain.toFixed(1)}` : selectedBand.gain.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="-18"
                max="18"
                step="0.5"
                value={selectedBand.gain}
                onChange={(e) => updateBand(selectedBand.id, { gain: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg accent-purple-400 cursor-pointer"
              />
            </div>

            {/* Q Bandwidth Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Q (Bandwidth)</span>
                <span className="font-mono text-purple-400 font-bold">{selectedBand.q.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="5.0"
                step="0.1"
                value={selectedBand.q}
                onChange={(e) => updateBand(selectedBand.id, { q: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg accent-purple-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-purple-600/20"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
