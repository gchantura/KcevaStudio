import { useEffect, useRef, useState } from 'react';
import { audioDsp } from '../audio/dspEngine';
import { Activity, BarChart2, Disc3 } from 'lucide-react';

interface AudioVisualizerProps {
  isPlaying: boolean;
}

export function AudioVisualizer({ isPlaying }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visMode, setVisMode] = useState<'oscilloscope' | 'spectrum' | 'circular'>('spectrum');
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = 140);

    const handleResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = 140;
      }
    };
    window.addEventListener('resize', handleResize);

    const render = () => {
      const analyser = audioDsp.getAnalyser();

      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, width, height);

      // Subtle background grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 30) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      if (!analyser || !isPlaying) {
        // Idle ambient line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const midY = height / 2;
        ctx.moveTo(0, midY);
        for (let x = 0; x < width; x += 10) {
          const wave = Math.sin(x * 0.03 + Date.now() * 0.002) * (isPlaying ? 15 : 2);
          ctx.lineTo(x, midY + wave);
        }
        ctx.stroke();
        animationFrameId.current = requestAnimationFrame(render);
        return;
      }

      if (visMode === 'oscilloscope') {
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#38bdf8'; // sky-400
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (visMode === 'spectrum') {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barCount = Math.min(64, Math.floor(width / 6));
        const barWidth = width / barCount - 2;

        for (let i = 0; i < barCount; i++) {
          const binIndex = Math.floor(Math.pow(i / barCount, 1.6) * (bufferLength / 2));
          const value = dataArray[binIndex] || 0;
          const barHeight = (value / 255) * (height - 16);
          const x = i * (barWidth + 2);
          const y = height - barHeight - 4;

          // Gradient from Emerald to Sky to Rose for high energy
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, '#0284c7');
          gradient.addColorStop(0.6, '#38bdf8');
          gradient.addColorStop(1, '#f43f5e');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Top peak accent dot
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y - 2, barWidth, 2);
        }
      } else if (visMode === 'circular') {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) * 0.55;

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#a855f7'; // purple-500
        ctx.beginPath();

        const points = 48;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const bin = Math.floor((i % points) * (bufferLength / points) * 0.4);
          const amp = ((dataArray[bin] || 0) / 255) * 35;
          const r = radius + amp;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isPlaying, visMode]);

  return (
    <div id="visualizer-container" className="relative w-full rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-inner">
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10 bg-slate-950/70 backdrop-blur-md rounded-lg p-1 border border-slate-800 text-xs">
        <button
          id="btn-vis-spectrum"
          onClick={() => setVisMode('spectrum')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            visMode === 'spectrum' ? 'bg-sky-500/20 text-sky-400 font-medium' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Spectrum Analyzer"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Spectrum</span>
        </button>
        <button
          id="btn-vis-oscilloscope"
          onClick={() => setVisMode('oscilloscope')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            visMode === 'oscilloscope' ? 'bg-sky-500/20 text-sky-400 font-medium' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Oscilloscope Waveform"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Wave</span>
        </button>
        <button
          id="btn-vis-circular"
          onClick={() => setVisMode('circular')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            visMode === 'circular' ? 'bg-sky-500/20 text-sky-400 font-medium' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Polar Aura"
        >
          <Disc3 className="w-3.5 h-3.5" />
          <span>Polar</span>
        </button>
      </div>

      <div className="absolute top-2 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
          {isPlaying ? 'DSP Live Master Output (44.1kHz)' : 'DSP Audio Ready'}
        </span>
      </div>

      <canvas ref={canvasRef} className="w-full h-[140px] block" />
    </div>
  );
}
