import { useState, useEffect } from 'react';
import { MusicComposition, ChannelStripState } from '../types';
import { audioDsp } from '../audio/dspEngine';
import { ParametricEqModal, EqBand } from './ParametricEqModal';
import {
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  Sparkles,
  Music,
  Layers,
  Activity,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface ProMixerProps {
  composition: MusicComposition;
  isPlaying: boolean;
  onUpdateComposition: (comp: MusicComposition) => void;
}

const DEFAULT_CHANNELS: Record<string, ChannelStripState> = {
  melody: {
    volume: 0.85,
    pan: 0,
    isMuted: false,
    isSoloed: false,
    eqLow: 0,
    eqMid: 1.5,
    eqHigh: 2.0,
    reverbSend: 0.35,
    delaySend: 0.25,
    color: 'sky',
    name: '1. Lead Synth',
  },
  chords: {
    volume: 0.75,
    pan: -0.2,
    isMuted: false,
    isSoloed: false,
    eqLow: -1.0,
    eqMid: 0.5,
    eqHigh: 1.0,
    reverbSend: 0.5,
    delaySend: 0.3,
    color: 'purple',
    name: '2. Chords Pad',
  },
  bass: {
    volume: 0.9,
    pan: 0,
    isMuted: false,
    isSoloed: false,
    eqLow: 3.0,
    eqMid: -1.5,
    eqHigh: -3.0,
    reverbSend: 0.05,
    delaySend: 0.0,
    color: 'emerald',
    name: '3. Bassline',
  },
  kick: {
    volume: 0.95,
    pan: 0,
    isMuted: false,
    isSoloed: false,
    eqLow: 2.5,
    eqMid: -2.0,
    eqHigh: 0,
    reverbSend: 0.0,
    delaySend: 0.0,
    color: 'amber',
    name: '4. Kick',
  },
  snare: {
    volume: 0.8,
    pan: 0.05,
    isMuted: false,
    isSoloed: false,
    eqLow: -2.0,
    eqMid: 2.0,
    eqHigh: 1.5,
    reverbSend: 0.3,
    delaySend: 0.15,
    color: 'amber',
    name: '5. Snare',
  },
  hihat: {
    volume: 0.7,
    pan: -0.3,
    isMuted: false,
    isSoloed: false,
    eqLow: -6.0,
    eqMid: 0,
    eqHigh: 3.5,
    reverbSend: 0.15,
    delaySend: 0.2,
    color: 'amber',
    name: '6. Closed Hat',
  },
  openHat: {
    volume: 0.75,
    pan: 0.3,
    isMuted: false,
    isSoloed: false,
    eqLow: -6.0,
    eqMid: 0,
    eqHigh: 4.0,
    reverbSend: 0.4,
    delaySend: 0.25,
    color: 'amber',
    name: '7. Open Hat',
  },
  perc: {
    volume: 0.65,
    pan: 0.2,
    isMuted: false,
    isSoloed: false,
    eqLow: -2.0,
    eqMid: 1.0,
    eqHigh: 1.0,
    reverbSend: 0.35,
    delaySend: 0.4,
    color: 'amber',
    name: '8. Percussion',
  },
};

export function ProMixer({ composition, isPlaying, onUpdateComposition }: ProMixerProps) {
  const [channels, setChannels] = useState<Record<string, ChannelStripState>>(() => {
    return composition.mixerChannels || DEFAULT_CHANNELS;
  });

  const [meterLevels, setMeterLevels] = useState<Record<string, number>>({});
  const [masterVol, setMasterVol] = useState(0.85);
  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const [eqModalTitle, setEqModalTitle] = useState('Master 4-Band Parametric Studio EQ');

  // Synchronize all channels with audio engine on mount or when channels change
  useEffect(() => {
    (Object.entries(channels) as [string, ChannelStripState][]).forEach(([trackId, ch]) => {
      audioDsp.setChannelVolume(trackId, ch.isMuted ? 0 : ch.volume);
      audioDsp.setChannelPan(trackId, ch.pan);
      audioDsp.setChannelEq(trackId, { low: ch.eqLow, mid: ch.eqMid, high: ch.eqHigh });
      audioDsp.setChannelSends(trackId, { reverbSend: ch.reverbSend, delaySend: ch.delaySend });
    });
  }, []);

  // Sync mixer state changes with dspEngine
  const updateChannel = (trackId: string, updates: Partial<ChannelStripState>) => {
    const updatedChannels = {
      ...channels,
      [trackId]: {
        ...channels[trackId],
        ...updates,
      },
    };
    setChannels(updatedChannels);
    onUpdateComposition({
      ...composition,
      mixerChannels: updatedChannels,
    });

    if (updates.volume !== undefined || updates.isMuted !== undefined) {
      audioDsp.setChannelVolume(trackId, updatedChannels[trackId].isMuted ? 0 : updatedChannels[trackId].volume);
    }
    if (updates.pan !== undefined) {
      audioDsp.setChannelPan(trackId, updates.pan);
    }
    if (updates.eqLow !== undefined || updates.eqMid !== undefined || updates.eqHigh !== undefined) {
      const cur = updatedChannels[trackId];
      audioDsp.setChannelEq(trackId, { low: cur.eqLow, mid: cur.eqMid, high: cur.eqHigh });
    }
    if (updates.reverbSend !== undefined || updates.delaySend !== undefined) {
      const cur = updatedChannels[trackId];
      audioDsp.setChannelSends(trackId, { reverbSend: cur.reverbSend, delaySend: cur.delaySend });
    }
    if (updates.isMuted !== undefined || updates.isSoloed !== undefined) {
      const mutes: Record<string, boolean> = {};
      const solos: Record<string, boolean> = {};
      Object.entries(updatedChannels).forEach(([k, v]) => {
        const strip = v as ChannelStripState;
        mutes[k] = strip.isMuted;
        solos[k] = strip.isSoloed;
      });
      audioDsp.setTrackMutes(mutes);
      audioDsp.setTrackSolos(solos);
    }
  };

  // Peak Meter animation loop
  useEffect(() => {
    let animFrame: number;
    const updateMeters = () => {
      if (isPlaying) {
        const newLevels: Record<string, number> = {};
        Object.keys(channels).forEach((trackId) => {
          const ch = channels[trackId];
          if (ch.isMuted) {
            newLevels[trackId] = 0;
          } else {
            // Simulated realistic activity based on volume
            const base = ch.volume * (0.4 + Math.random() * 0.5);
            newLevels[trackId] = Math.min(1.0, base);
          }
        });
        setMeterLevels(newLevels);
      } else {
        setMeterLevels({});
      }
      animFrame = requestAnimationFrame(updateMeters);
    };

    animFrame = requestAnimationFrame(updateMeters);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, channels]);

  const channelKeys = ['melody', 'chords', 'bass', 'kick', 'snare', 'hihat', 'openHat', 'perc'];

  return (
    <div id="pro-mixer-console" className="space-y-6">
      {/* Mixer Top Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-purple-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>8-Channel Studio Mixing Console</span>
              <span className="text-[10px] font-mono uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
                Analog Warmth & EQ
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Individual channel gain faders, pan pots, 3-band tone shaping & FX sends
            </p>
          </div>
        </div>

        {/* Top Actions: Visual EQ & Global Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEqModalTitle('Master 4-Band Parametric Studio EQ');
              setIsEqModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold transition shadow-sm"
            title="Open Master 4-Band Parametric Visual Equalizer"
          >
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>4-Band Visual EQ</span>
          </button>

          <button
            onClick={() => {
              setChannels(DEFAULT_CHANNELS);
              onUpdateComposition({ ...composition, mixerChannels: DEFAULT_CHANNELS });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
            title="Reset Mixer Channels to Factory Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Mix</span>
          </button>
        </div>
      </div>

      {/* Mixer Channel Strips Rack (8 Tracks + 1 Master Bus) */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-2xl overflow-x-auto">
        <div className="flex items-stretch gap-3 min-w-[860px]">
          {/* 8 Track Channels */}
          {channelKeys.map((trackId, idx) => {
            const ch = channels[trackId] || DEFAULT_CHANNELS[trackId];
            const level = meterLevels[trackId] || 0;

            const badgeColor =
              ch.color === 'sky'
                ? 'text-sky-400 bg-sky-500/10 border-sky-500/30'
                : ch.color === 'purple'
                ? 'text-purple-400 bg-purple-500/10 border-purple-500/30'
                : ch.color === 'emerald'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/30';

            return (
              <div
                key={trackId}
                id={`mixer-strip-${trackId}`}
                className="flex-1 min-w-[96px] max-w-[128px] bg-slate-900/80 border border-slate-800/90 rounded-xl p-2.5 flex flex-col justify-between space-y-3 shadow-lg"
              >
                {/* Channel Header */}
                <div className="text-center space-y-1">
                  <div className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border truncate ${badgeColor}`}>
                    {ch.name}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">CH {idx + 1}</div>
                </div>

                {/* 3-Band Parametric EQ Knobs */}
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 space-y-1.5 text-[9px] font-mono">
                  <div className="text-center text-slate-400 font-bold uppercase text-[8px] pb-0.5 border-b border-slate-800">
                    3-Band EQ
                  </div>

                  {/* High Shelf */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">HI</span>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={ch.eqHigh}
                      onChange={(e) => updateChannel(trackId, { eqHigh: parseFloat(e.target.value) })}
                      className="w-12 h-1 bg-slate-800 rounded accent-sky-400"
                    />
                    <span className="text-slate-400 w-6 text-right">{ch.eqHigh > 0 ? `+${ch.eqHigh}` : ch.eqHigh}</span>
                  </div>

                  {/* Mid Bell */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">MID</span>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={ch.eqMid}
                      onChange={(e) => updateChannel(trackId, { eqMid: parseFloat(e.target.value) })}
                      className="w-12 h-1 bg-slate-800 rounded accent-purple-400"
                    />
                    <span className="text-slate-400 w-6 text-right">{ch.eqMid > 0 ? `+${ch.eqMid}` : ch.eqMid}</span>
                  </div>

                  {/* Low Shelf */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">LOW</span>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={ch.eqLow}
                      onChange={(e) => updateChannel(trackId, { eqLow: parseFloat(e.target.value) })}
                      className="w-12 h-1 bg-slate-800 rounded accent-emerald-400"
                    />
                    <span className="text-slate-400 w-6 text-right">{ch.eqLow > 0 ? `+${ch.eqLow}` : ch.eqLow}</span>
                  </div>
                </div>

                {/* FX Sends: Reverb & Delay */}
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 space-y-1.5 text-[9px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">REV</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={ch.reverbSend}
                      onChange={(e) => updateChannel(trackId, { reverbSend: parseFloat(e.target.value) })}
                      className="w-12 h-1 bg-slate-800 rounded accent-indigo-400"
                    />
                    <span className="text-slate-400 w-6 text-right">{Math.round(ch.reverbSend * 100)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">DLY</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={ch.delaySend}
                      onChange={(e) => updateChannel(trackId, { delaySend: parseFloat(e.target.value) })}
                      className="w-12 h-1 bg-slate-800 rounded accent-teal-400"
                    />
                    <span className="text-slate-400 w-6 text-right">{Math.round(ch.delaySend * 100)}%</span>
                  </div>
                </div>

                {/* Pan Pot */}
                <div className="space-y-1 text-center font-mono text-[10px]">
                  <div className="flex items-center justify-between text-slate-400 text-[9px]">
                    <span>L</span>
                    <span className="text-slate-200 font-bold">
                      {ch.pan === 0 ? 'C' : ch.pan < 0 ? `L${Math.abs(Math.round(ch.pan * 100))}` : `R${Math.round(ch.pan * 100)}`}
                    </span>
                    <span>R</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={ch.pan}
                    onChange={(e) => updateChannel(trackId, { pan: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded accent-sky-400"
                    title="Pan Slider"
                  />
                </div>

                {/* Solo [S] & Mute [M] */}
                <div className="grid grid-cols-2 gap-1 font-mono font-bold text-xs">
                  <button
                    id={`btn-solo-${trackId}`}
                    onClick={() => updateChannel(trackId, { isSoloed: !ch.isSoloed })}
                    className={`py-1 rounded transition border ${
                      ch.isSoloed
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                    title="Solo this channel"
                  >
                    S
                  </button>
                  <button
                    id={`btn-mute-${trackId}`}
                    onClick={() => updateChannel(trackId, { isMuted: !ch.isMuted })}
                    className={`py-1 rounded transition border ${
                      ch.isMuted
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                    title="Mute this channel"
                  >
                    M
                  </button>
                </div>

                {/* Long-throw Volume Fader + Vertical VU Peak Meter */}
                <div className="flex items-center justify-center gap-2 h-36 bg-slate-950/90 rounded-xl p-2 border border-slate-800/90">
                  {/* Long Fader */}
                  <div className="h-full flex flex-col justify-center items-center">
                    <input
                      type="range"
                      min="0"
                      max="1.25"
                      step="0.01"
                      value={ch.isMuted ? 0 : ch.volume}
                      onChange={(e) => updateChannel(trackId, { volume: parseFloat(e.target.value) })}
                      className="h-28 -rotate-90 w-28 accent-sky-400 cursor-pointer"
                    />
                  </div>

                  {/* VU Peak Meter Bar */}
                  <div className="w-3 h-28 bg-slate-950 rounded-sm border border-slate-800 overflow-hidden flex flex-col justify-end p-0.5">
                    <div
                      className={`w-full rounded-sm transition-all duration-75 ${
                        level > 0.9
                          ? 'bg-rose-500 shadow-rose-500/50 shadow-sm'
                          : level > 0.7
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ height: `${Math.max(2, level * 100)}%` }}
                    />
                  </div>
                </div>

                {/* dB Readout */}
                <div className="text-center font-mono text-[10px] text-slate-400 font-bold">
                  {ch.volume === 0 ? '-inf dB' : `${((ch.volume - 1) * 12).toFixed(1)} dB`}
                </div>
              </div>
            );
          })}

          {/* Master Bus Channel Strip */}
          <div className="w-32 bg-slate-900 border-2 border-indigo-500/40 rounded-xl p-3 flex flex-col justify-between space-y-3 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="text-xs font-mono uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/50">
                Master Bus
              </div>
              <div className="text-[10px] font-mono text-slate-500">Stereo Out</div>
            </div>

            {/* Master Limiter / Output Status */}
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-emerald-400">
                <Zap className="w-3 h-3" />
                <span>Limiter ON</span>
              </div>
              <div className="text-[9px] font-mono text-slate-400">44.1kHz • 16-Bit</div>
            </div>

            {/* Master Volume Fader & Meter */}
            <div className="flex items-center justify-center gap-3 h-36 bg-slate-950/90 rounded-xl p-2 border border-slate-800">
              <input
                type="range"
                min="0"
                max="1.25"
                step="0.01"
                value={masterVol}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setMasterVol(v);
                  audioDsp.setMasterVolume(v);
                }}
                className="h-28 -rotate-90 w-28 accent-indigo-400 cursor-pointer"
              />

              {/* Master Stereo Meter */}
              <div className="flex gap-1">
                <div className="w-2 h-28 bg-slate-950 rounded-sm border border-slate-800 overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full bg-emerald-400 rounded-sm"
                    style={{ height: `${isPlaying ? Math.min(100, masterVol * 80 + Math.random() * 15) : 0}%` }}
                  />
                </div>
                <div className="w-2 h-28 bg-slate-950 rounded-sm border border-slate-800 overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full bg-emerald-400 rounded-sm"
                    style={{ height: `${isPlaying ? Math.min(100, masterVol * 80 + Math.random() * 15) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="text-center font-mono text-xs text-indigo-300 font-bold">
              {((masterVol - 1) * 12).toFixed(1)} dB
            </div>
          </div>
        </div>
      </div>

      {/* Parametric EQ Modal */}
      <ParametricEqModal
        isOpen={isEqModalOpen}
        onClose={() => setIsEqModalOpen(false)}
        title={eqModalTitle}
        onApplyEq={(bands) => {
          // Adjust DSP master filters based on EQ bands
          const lowShelf = bands.find((b) => b.type === 'lowshelf');
          const highShelf = bands.find((b) => b.type === 'highshelf');
          if (highShelf) {
            audioDsp.setMasterFilter(Math.max(500, Math.min(20000, highShelf.freq * (1 + highShelf.gain / 18))));
          }
        }}
      />
    </div>
  );
}
