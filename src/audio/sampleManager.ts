// High-Fidelity Audio Sample & Drum Kit Manager with Drag-and-Drop and Procedural Fallbacks

export interface CustomSample {
  id: string;
  name: string;
  buffer: AudioBuffer | null;
  pitchOffset: number; // in semitones (-12 to +12)
  volume: number;      // 0 to 1
  pan: number;         // -1 to 1
  isReversed: boolean;
  trimStart: number;   // 0 to 1
  trimEnd: number;     // 0 to 1
}

class SampleManager {
  private audioCtx: AudioContext | null = null;
  private samplePool: Map<string, AudioBuffer> = new Map();
  private customPads: Record<string, CustomSample> = {};

  constructor() {
    this.initDefaultPads();
  }

  private initDefaultPads() {
    const padKeys = ['kick', 'snare', 'hihat', 'openHat', 'perc', 'clap', 'crash', 'tom'];
    padKeys.forEach((key) => {
      this.customPads[key] = {
        id: key,
        name: `${key.toUpperCase()} (Default)`,
        buffer: null,
        pitchOffset: 0,
        volume: 0.9,
        pan: 0,
        isReversed: false,
        trimStart: 0,
        trimEnd: 1,
      };
    });
  }

  public setContext(ctx: AudioContext) {
    this.audioCtx = ctx;
  }

  // Load custom user audio file from drag & drop or input
  public async loadUserFile(padKey: string, file: File): Promise<boolean> {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
      
      this.customPads[padKey] = {
        ...this.customPads[padKey],
        id: padKey,
        name: file.name.replace(/\.[^/.]+$/, ''),
        buffer: audioBuffer,
      };
      this.samplePool.set(padKey, audioBuffer);
      return true;
    } catch (err) {
      console.error('Failed to decode user audio file:', err);
      return false;
    }
  }

  // Play sample buffer through Web Audio node graph
  public playSample(
    padKey: string,
    destinationNode: AudioNode,
    time = 0,
    velocity = 100
  ): boolean {
    const pad = this.customPads[padKey];
    if (!pad || !pad.buffer || !this.audioCtx) return false;

    const ctx = this.audioCtx;
    const startTime = time > 0 ? time : ctx.currentTime;
    const source = ctx.createBufferSource();
    
    // Reverse buffer if requested
    if (pad.isReversed) {
      const revBuffer = this.getReversedBuffer(pad.buffer);
      source.buffer = revBuffer;
    } else {
      source.buffer = pad.buffer;
    }

    // Pitch playback rate
    const playbackRate = Math.pow(2, pad.pitchOffset / 12);
    source.playbackRate.setValueAtTime(playbackRate, startTime);

    // Gain & Velocity scaling
    const gainNode = ctx.createGain();
    const velScale = Math.max(0.1, Math.min(1.2, velocity / 100));
    gainNode.gain.setValueAtTime(pad.volume * velScale, startTime);

    source.connect(gainNode);
    gainNode.connect(destinationNode);

    const duration = pad.buffer.duration;
    const offset = pad.trimStart * duration;
    const playLength = (pad.trimEnd - pad.trimStart) * duration;

    source.start(startTime, offset, playLength);
    return true;
  }

  public getPad(padKey: string): CustomSample | undefined {
    return this.customPads[padKey];
  }

  public getAllPads(): Record<string, CustomSample> {
    return { ...this.customPads };
  }

  public updatePadConfig(padKey: string, updates: Partial<CustomSample>) {
    if (this.customPads[padKey]) {
      this.customPads[padKey] = {
        ...this.customPads[padKey],
        ...updates,
      };
    }
  }

  public clearPad(padKey: string) {
    this.customPads[padKey] = {
      id: padKey,
      name: `${padKey.toUpperCase()} (Default)`,
      buffer: null,
      pitchOffset: 0,
      volume: 0.9,
      pan: 0,
      isReversed: false,
      trimStart: 0,
      trimEnd: 1,
    };
    this.samplePool.delete(padKey);
  }

  private getReversedBuffer(buffer: AudioBuffer): AudioBuffer {
    if (!this.audioCtx) return buffer;
    const numChannels = buffer.numberOfChannels;
    const rev = this.audioCtx.createBuffer(numChannels, buffer.length, buffer.sampleRate);
    for (let c = 0; c < numChannels; c++) {
      const srcData = buffer.getChannelData(c);
      const dstData = rev.getChannelData(c);
      for (let i = 0; i < buffer.length; i++) {
        dstData[i] = srcData[buffer.length - 1 - i];
      }
    }
    return rev;
  }
}

export const sampleManager = new SampleManager();
