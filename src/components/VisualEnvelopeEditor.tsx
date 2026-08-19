// Interactive Visual SVG ADSR Envelope Curve Shaper

interface VisualEnvelopeEditorProps {
  attack: number;   // 0.005 - 1.0s
  decay: number;    // 0.01 - 2.0s
  sustain: number;  // 0.0 - 1.0 (level)
  release: number;  // 0.01 - 3.0s
  color?: string;
  label?: string;
  onChange: (field: 'attack' | 'decay' | 'sustain' | 'release', value: number) => void;
}

export function VisualEnvelopeEditor({
  attack,
  decay,
  sustain,
  release,
  color = 'sky',
  label = 'ADSR Envelope',
  onChange,
}: VisualEnvelopeEditorProps) {
  // SVG coordinates calculation (width: 280, height: 90)
  const w = 280;
  const h = 90;
  const padding = 10;
  const drawW = w - padding * 2;
  const drawH = h - padding * 2;

  // Normalized time proportions
  const maxTotalTime = 4.0;
  const aNorm = Math.min(1.0, attack / maxTotalTime) * 0.28;
  const dNorm = Math.min(1.0, decay / maxTotalTime) * 0.28;
  const rNorm = Math.min(1.0, release / maxTotalTime) * 0.28;
  const sLength = 0.16; // sustain visual hold

  // Points
  const p0 = { x: padding, y: h - padding };
  const p1 = { x: padding + aNorm * drawW, y: padding };
  const p2 = { x: padding + (aNorm + dNorm) * drawW, y: h - padding - sustain * drawH };
  const p3 = { x: padding + (aNorm + dNorm + sLength) * drawW, y: h - padding - sustain * drawH };
  const p4 = { x: Math.min(w - padding, padding + (aNorm + dNorm + sLength + rNorm) * drawW), y: h - padding };

  const pathD = `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y}`;
  const fillD = `${pathD} L ${p4.x} ${h - padding} L ${p0.x} ${h - padding} Z`;

  const colorMap: Record<string, { stroke: string; fill: string; dot: string }> = {
    sky: { stroke: '#38bdf8', fill: 'rgba(56, 189, 248, 0.15)', dot: '#0284c7' },
    emerald: { stroke: '#34d399', fill: 'rgba(52, 211, 153, 0.15)', dot: '#059669' },
    purple: { stroke: '#c084fc', fill: 'rgba(192, 132, 252, 0.15)', dot: '#9333ea' },
    amber: { stroke: '#fbbf24', fill: 'rgba(251, 191, 36, 0.15)', dot: '#d97706' },
  };

  const scheme = colorMap[color] || colorMap.sky;

  return (
    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-slate-300">{label}</span>
        <span className="font-mono text-[10px] text-slate-400">
          A: {attack.toFixed(2)}s | D: {decay.toFixed(2)}s | S: {Math.round(sustain * 100)}% | R: {release.toFixed(2)}s
        </span>
      </div>

      {/* SVG Curve Display */}
      <div className="w-full bg-slate-900/90 rounded-lg p-1 border border-slate-800/80 flex items-center justify-center">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20 overflow-visible">
          {/* Subtle Gridlines */}
          <line x1={padding} y1={padding} x2={w - padding} y2={padding} stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1={padding} y1={h / 2} x2={w - padding} y2={h / 2} stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1={padding} y1={h - padding} x2={w - padding} y2={h - padding} stroke="#475569" strokeWidth="1" />

          {/* Area Fill */}
          <path d={fillD} fill={scheme.fill} />

          {/* Envelope Contour Line */}
          <path d={pathD} fill="none" stroke={scheme.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Keypoint Nodes */}
          <circle cx={p1.x} cy={p1.y} r="3.5" fill={scheme.stroke} />
          <circle cx={p2.x} cy={p2.y} r="3.5" fill={scheme.stroke} />
          <circle cx={p3.x} cy={p3.y} r="3.5" fill={scheme.stroke} />
          <circle cx={p4.x} cy={p4.y} r="3.5" fill={scheme.stroke} />
        </svg>
      </div>

      {/* 4 Precision Sliders */}
      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
        <div>
          <span className="text-slate-400 font-mono">A ({attack.toFixed(2)}s)</span>
          <input
            type="range"
            min="0.005"
            max="1.0"
            step="0.01"
            value={attack}
            onChange={(e) => onChange('attack', parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded accent-sky-400 mt-1 cursor-pointer"
          />
        </div>
        <div>
          <span className="text-slate-400 font-mono">D ({decay.toFixed(2)}s)</span>
          <input
            type="range"
            min="0.01"
            max="1.5"
            step="0.02"
            value={decay}
            onChange={(e) => onChange('decay', parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded accent-sky-400 mt-1 cursor-pointer"
          />
        </div>
        <div>
          <span className="text-slate-400 font-mono">S ({Math.round(sustain * 100)}%)</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={sustain}
            onChange={(e) => onChange('sustain', parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded accent-sky-400 mt-1 cursor-pointer"
          />
        </div>
        <div>
          <span className="text-slate-400 font-mono">R ({release.toFixed(2)}s)</span>
          <input
            type="range"
            min="0.01"
            max="2.5"
            step="0.05"
            value={release}
            onChange={(e) => onChange('release', parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded accent-sky-400 mt-1 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
