// Web MIDI API Hardware Controller Bar & Live Note Monitor

import { useState, useEffect } from 'react';
import { midiManager, MidiDeviceInfo } from '../audio/midiInputManager';
import { audioDsp } from '../audio/dspEngine';
import { noteToFreq } from '../audio/musicTheory';
import { MusicComposition, SynthPatch } from '../types';
import { Radio, CheckCircle, AlertCircle, Sparkles, Volume2 } from 'lucide-react';

interface MidiControllerBarProps {
  composition: MusicComposition;
}

export function MidiControllerBar({ composition }: MidiControllerBarProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [lastMidiNote, setLastMidiNote] = useState<string | null>(null);
  const [lastVelocity, setLastVelocity] = useState<number>(0);
  const [targetTrack, setTargetTrack] = useState<'melody' | 'chords' | 'bass'>('melody');
  const [isMidiActive, setIsMidiActive] = useState(false);

  useEffect(() => {
    const supported = midiManager.checkSupport();
    setIsSupported(supported);

    if (supported) {
      midiManager.requestAccess().then((success) => {
        if (success) {
          setDevices(midiManager.getConnectedDevices());
        }
      });
    }

    const removeListener = midiManager.addNoteListener((note, velocity, isNoteOn) => {
      if (isNoteOn) {
        setLastMidiNote(note);
        setLastVelocity(velocity);
        setIsMidiActive(true);

        // Audition live note through selected track's synth patch
        let patch: SynthPatch = composition.leadSynthPatch;
        if (targetTrack === 'bass') patch = composition.bassSynthPatch;
        if (targetTrack === 'chords') patch = composition.chordSynthPatch;

        const freq = noteToFreq(note);
        audioDsp.playSynthesizerNote(freq, patch, 0.5, 0, velocity);
      } else {
        setIsMidiActive(false);
      }
    });

    return () => {
      removeListener();
    };
  }, [composition, targetTrack]);

  const handleRequestMidi = async () => {
    const ok = await midiManager.requestAccess();
    if (ok) {
      setDevices(midiManager.getConnectedDevices());
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div
      id="web-midi-controller-bar"
      className="bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 shadow-inner"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${devices.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className="font-semibold text-slate-200">Hardware MIDI Controller:</span>
        </div>

        {devices.length > 0 ? (
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            {devices[0].name}
          </span>
        ) : (
          <button
            id="btn-connect-web-midi"
            onClick={handleRequestMidi}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-medium text-[11px] border border-slate-700 transition"
          >
            Connect USB MIDI Keyboard
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Routing Target Track */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-mono">Routing:</span>
          <select
            value={targetTrack}
            onChange={(e) => setTargetTrack(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-sky-500"
          >
            <option value="melody">Lead Synth (Track 1)</option>
            <option value="chords">Chords / Pad (Track 2)</option>
            <option value="bass">Bassline (Track 3)</option>
          </select>
        </div>

        {/* Live Note & Velocity Activity Monitor */}
        {lastMidiNote && (
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-500">Live Note:</span>
            <span
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                isMidiActive
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/40'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {lastMidiNote}
            </span>
            <span className="text-slate-500">Vel: {lastVelocity}</span>
          </div>
        )}
      </div>
    </div>
  );
}
