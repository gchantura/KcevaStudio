export type WaveType =
  | 'sine'
  | 'square'
  | 'sawtooth'
  | 'triangle'
  | 'noise'
  | 'fm'
  | 'karplus'
  | 'supersaw'
  | 'organ'
  | 'piano'
  | 'rhodes'
  | 'formant_vocal'
  | 'acid_303'
  | 'sub_808'
  | 'bell'
  | 'brass'
  | 'strings'
  | 'pluck'
  | 'lead_sync';

export interface SynthPatch {
  waveType: WaveType;
  osc2Wave?: WaveType;
  osc2Detune?: number;    // -100 to +100 cents
  osc2Octave?: number;    // -2, -1, 0, 1, 2
  oscMix?: number;        // 0 (Osc1 only) to 1 (Osc2 only)
  unisonVoices?: number;  // 1 to 7 voices
  unisonDetune?: number;  // 0 to 50 cents
  attack: number;         // 0.001 - 2.0s
  decay: number;          // 0.01 - 3.0s
  sustain: number;        // 0.0 - 1.0
  release: number;        // 0.01 - 4.0s
  filterCutoff: number;   // 20 - 20000 Hz
  resonance: number;      // 0.1 - 20
  filterEnvAmount?: number; // -100% to +100%
  filterAttack?: number;
  filterDecay?: number;
  lfoRate?: number;       // 0.1 - 20 Hz
  lfoDepth?: number;      // 0.0 - 1.0
  lfoTarget?: 'filter' | 'pitch' | 'volume' | 'pan';
  lfoWave?: 'sine' | 'triangle' | 'square' | 'sawtooth';
  detune?: number;        // -100 to 100 cents
  drive?: number;         // 0.0 - 1.0
  volume: number;         // 0.0 - 1.0
  pan?: number;           // -1 (L) to +1 (R)
  formantVowel?: 'a' | 'e' | 'i' | 'o' | 'u';
  subBassGlide?: number;  // 0 - 0.5s glide
}

export interface CustomSoundLine {
  id: string;
  name: string;
  type: 'synth' | 'sampler' | 'drum' | 'voice';
  color: string;
  patch: SynthPatch;
  sequence: (string | null)[];
  velocities?: number[];
  durations?: number[];
  probabilities?: number[];
  volume: number;
  pan: number;
  isMuted: boolean;
  isSoloed: boolean;
  soundPresetId?: string;
  sampleUrl?: string; // optional URL for recorded or sample vocal
}

export interface DrumStep {
  kick: boolean;
  snare: boolean;
  hihat: boolean;
  openHat: boolean;
  perc: boolean;
}

export interface FxConfig {
  reverbWet: number;       // 0 - 1
  reverbDecay: number;     // 0.1 - 10s
  reverbDamp?: number;     // 0 - 1
  delayTime: number;       // 0.05 - 1.0s
  delayFeedback: number;   // 0 - 0.9
  delayWet: number;        // 0 - 1
  delayPingPong?: boolean; // Stereo ping pong
  drive: number;           // 0 - 1 (distortion)
  distortionType?: 'tube' | 'fuzz' | 'clip';
  bitDepth: number;        // 4 - 16 (bitcrusher, 16 is clean)
  chorusWet?: number;      // 0 - 1
  masterLowpass: number;   // 200 - 20000 Hz
  masterHighpass: number;  // 20 - 1000 Hz
  compressorThreshold?: number; // -40 to 0 dB
  compressorRatio?: number;     // 1 to 20
  flangerWet?: number;     // 0 - 1
}

export interface ChannelStripState {
  volume: number;      // 0.0 - 1.25 (default 0.8)
  pan: number;         // -1.0 to 1.0 (0 center)
  isMuted: boolean;
  isSoloed: boolean;
  eqLow: number;       // -12 to +12 dB
  eqMid: number;       // -12 to +12 dB
  eqHigh: number;      // -12 to +12 dB
  reverbSend: number;  // 0.0 - 1.0
  delaySend: number;   // 0.0 - 1.0
  color: string;
  name: string;
}

export interface SongSection {
  id: string;
  name: string;      // e.g. "Intro", "Verse 1", "Chorus", "Drop", "Outro"
  bars: number;      // 1, 2, 4, 8 bars
  activeTracks: string[]; // ['melody', 'bass', 'chords', 'drums', 'kick', 'snare', 'hihat', 'openHat', 'perc']
  color: string;
}

export interface SongArrangement {
  sections: SongSection[];
  totalBars: number;
  loopArrangement: boolean;
}

export type SongArrangementSection = SongSection;

export interface MusicComposition {
  id: string;
  title: string;
  description: string;
  genre: string;
  tempo: number;
  key: string;
  scale: string;
  swing?: number; // 0 to 75%
  stepsCount: number; // 16, 32, 64, or 128
  melodySequence: (string | null)[];
  melodyVelocities?: number[]; // 0 - 127
  melodyDurations?: number[];  // in steps (1, 2, 3, 4)
  melodyProbabilities?: number[]; // 0 - 100%
  bassSequence: (string | null)[];
  bassVelocities?: number[];
  bassDurations?: number[];
  chordSequence: (string | string[] | null)[];  // single chord name, array of stacked chords, or null
  chordVelocities?: number[];
  chordDurations?: number[];
  drumPattern: {
    kick: boolean[];
    snare: boolean[];
    hihat: boolean[];
    openHat: boolean[];
    perc: boolean[];
  };
  drumVelocities?: {
    kick: number[];
    snare: number[];
    hihat: number[];
    openHat: number[];
    perc: number[];
  };
  leadSynthPatch: SynthPatch;
  bassSynthPatch: SynthPatch;
  chordSynthPatch: SynthPatch;
  drumVolume?: number;
  customLines?: CustomSoundLine[];
  mixerChannels?: Record<string, ChannelStripState>;
  arrangement?: SongArrangement;
  fxSettings: FxConfig;
  cppDspCode?: string;
}

export interface CppDspPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  code: string;
  formula: string;
  params: {
    name: string;
    label: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    unit: string;
  }[];
}

export interface InstrumentSoundPreset {
  id: string;
  name: string;
  category: 'Pianos & Keys' | 'Synths & Leads' | 'Bass & 808' | 'Vocal & Voices' | 'Pads & Atmos' | 'Brass & Plucks' | 'Club FX';
  description: string;
  icon: string;
  patch: SynthPatch;
  tags: string[];
}

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: number;
  composition: MusicComposition;
}

export type ViewTab =
  | 'timeline'
  | 'studio'
  | 'piano_roll'
  | 'sound_explorer'
  | 'mixer'
  | 'dj_deck'
  | 'samples'
  | 'audio_rec'
  | 'arranger'
  | 'synths'
  | 'cpp_dsp'
  | 'presets';

export type PianoRollTool = 'pencil' | 'brush' | 'eraser' | 'slice' | 'chord_stamp';
export type ChordStampType = 'maj' | 'min' | '7th' | 'min7' | 'maj7' | 'sus4' | 'dim' | 'add9' | 'power';

export interface TimelineClip {
  id: string;
  name: string;
  trackId: string;
  startBar: number;     // e.g. 1.0, 2.5
  durationBars: number; // e.g. 2.0, 4.0
  color: string;
  type: 'audio' | 'vocal' | 'midi' | 'fx' | 'drum_loop';
  speed: number;        // Playback speed multiplier: 0.5 (half-time), 0.75, 1.0 (normal), 1.25, 1.5, 2.0 (double)
  pitchOffset: number;  // Semitones: -12 to +12
  volume: number;       // 0.0 to 1.5
  isMuted?: boolean;
  isReversed?: boolean;
  trimStartOffset?: number; // 0 to 1
  sampleUrl?: string;
  audioBuffer?: AudioBuffer | null;
  waveformPoints?: number[];
  midiNotes?: { note: string; start: number; duration: number }[];
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'audio' | 'vocal' | 'synth' | 'bass' | 'drums' | 'fx';
  color: string;
  volume: number;
  pan: number;
  isMuted: boolean;
  isSoloed: boolean;
  isLocked: boolean;
  clips: TimelineClip[];
}

export interface TimelineArrangement {
  totalBars: number;
  bpm: number;
  timeSignature: [number, number]; // [4, 4]
  tracks: TimelineTrack[];
}

