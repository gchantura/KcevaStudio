import { MusicComposition, FxConfig, SynthPatch, CustomSoundLine } from '../types';

// Simple synth patch for beginners
const basicSynthPatch: SynthPatch = {
  waveType: 'sawtooth',
  attack: 0.01,
  decay: 0.2,
  sustain: 0.7,
  release: 0.3,
  filterCutoff: 3500,
  resonance: 2,
  volume: 0.8,
};

export function defaultProject(): MusicComposition {
  return {
    id: crypto.randomUUID(),
    title: 'New Song',
    description: 'Starter project',
    genre: 'Pop',
    tempo: 120,
    key: 'C',
    scale: 'Major (Ionian)',
    stepsCount: 16,
    melodySequence: Array(16).fill(null),
    bassSequence: Array(16).fill(null),
    chordSequence: ['C3', null, null, null, 'G3', null, null, null, 'A3', null, null, null, 'F3', null, null, null],
    drumPattern: {
      kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      snare: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      hihat: Array(16).fill(true),
      openHat: Array(16).fill(false),
      perc: Array(16).fill(false),
    },
    leadSynthPatch: basicSynthPatch,
    bassSynthPatch: { ...basicSynthPatch, waveType: 'square', volume: 0.6 },
    chordSynthPatch: { ...basicSynthPatch, waveType: 'triangle', volume: 0.5 },
    fxSettings: {
      reverbWet: 0.2,
      reverbDecay: 2.5,
      delayTime: 0.25,
      delayFeedback: 0.3,
      delayWet: 0.2,
      drive: 0.1,
      bitDepth: 16,
      masterLowpass: 18000,
      masterHighpass: 30,
    } as FxConfig,
    cppDspCode: undefined,
    arrangement: undefined,
    customLines: [],
    mixerChannels: undefined,
  } as MusicComposition;
}

/** Utility to create a default custom sound line (track) */
export function createDefaultCustomLine(id: string, name: string): CustomSoundLine {
  return {
    id,
    name,
    type: 'synth',
    color: '#ff7f50', // friendly accent color
    patch: { ...basicSynthPatch },
    sequence: Array(16).fill(null),
    volume: 0.8,
    pan: 0,
    isMuted: false,
    isSoloed: false,
    sampleUrl: undefined,
  };
}
